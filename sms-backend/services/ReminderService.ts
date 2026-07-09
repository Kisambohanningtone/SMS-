import { Op } from 'sequelize'
import {
  Tenant, Unit, Property, Payment, ReminderLog, Agent,
} from '@models/index'
import { ReminderChannel, ReminderStatus, ReminderTrigger } from '@models/ReminderLog'
import { UnitStatus } from '@models/Unit'
import { UnitTypeGroup } from '@models/UnitTypeGroup'
import { NotificationService } from './NotificationService'
import { AppError } from '@middleware/errorHandler'
import { logger } from '@config/logger'

export interface SendReminderInput {
  tenantIds: string[]
  channel: ReminderChannel
  customMessage?: string
}

export interface ReminderResult {
  sent: number
  failed: number
  skipped: number
  details: Array<{ tenantId: string; status: string; error?: string }>
}

const DEFAULT_WA_TEMPLATE =
  'Dear [Tenant Name], this is a reminder that your rent of [Amount Due] ' +
  'for [Unit Number] at [Property Name] for [Month] is outstanding. ' +
  'Please pay via M-Pesa Paybill. Thank you.'

const DEFAULT_SMS_TEMPLATE =
  '[Property Name] - [Unit Number]: Rent [Amount Due] for [Month] is due. ' +
  'Pay via M-Pesa Paybill. -Waltern Tech'

export class ReminderService {
  private notif = new NotificationService()

  /**
   * Send reminders to specific tenants — triggered manually by agent.
   */
  async send(agentId: string, input: SendReminderInput): Promise<ReminderResult> {
    const agent = await Agent.findByPk(agentId)
    if (!agent) throw new AppError('Agent not found', 404)

    const result: ReminderResult = { sent: 0, failed: 0, skipped: 0, details: [] }

    for (const tenantId of input.tenantIds) {
      const tenant = await Tenant.findByPk(tenantId, {
        include: [{
          model: Unit, as: 'unit',
          include: [
            { model: Property, as: 'property' },
            { model: UnitTypeGroup, as: 'unit_type_group' },
          ],
        }],
      })

      if (!tenant || !tenant.is_active) {
        result.skipped++
        result.details.push({ tenantId, status: 'skipped', error: 'Tenant not found or inactive' })
        continue
      }

      const unit = tenant.unit as Unit
      const property = unit?.property as Property
      const group = unit?.unit_type_group as UnitTypeGroup

      if (!unit || !property) {
        result.skipped++
        result.details.push({ tenantId, status: 'skipped', error: 'Unit or property not found' })
        continue
      }

      // Build message
      const now = new Date()
      const monthName = now.toLocaleString('en-KE', { month: 'long', year: 'numeric' })
      const rentDue = group?.rent_amount ?? property.default_rent

      const template = input.channel === ReminderChannel.SMS
        ? (agent.reminder_template_sms || DEFAULT_SMS_TEMPLATE)
        : (agent.reminder_template_wa || DEFAULT_WA_TEMPLATE)

      const message = input.customMessage ?? this.notif.renderTemplate(template, {
        tenantName: tenant.full_name,
        unitNumber: unit.unit_number,
        propertyName: property.name,
        amountDue: rentDue,
        month: monthName,
      })

      // Create log entry first
      const log = await ReminderLog.create({
        tenant_id: tenantId,
        unit_id: unit.id,
        property_id: property.id,
        channel: input.channel,
        status: ReminderStatus.PENDING,
        triggered_by: ReminderTrigger.MANUAL,
        message_body: message,
      })

      try {
        let msgResult
        // Fall back to SMS if WhatsApp channel is requested but not configured
        const useWhatsApp = input.channel === ReminderChannel.WHATSAPP
          && !!(process.env.AT_WHATSAPP_SENDER?.trim())
        if (useWhatsApp) {
          msgResult = await this.notif.sendWhatsApp(tenant.phone, message)
        } else {
          msgResult = await this.notif.sendSms(tenant.phone, message)
        }

        await log.update({
          status: ReminderStatus.DELIVERED,
          provider_message_id: msgResult.messageId,
        })

        result.sent++
        result.details.push({ tenantId, status: 'sent' })
      } catch (err) {
        const errorMsg = (err as Error).message
        await log.update({ status: ReminderStatus.FAILED, error_message: errorMsg })
        result.failed++
        result.details.push({ tenantId, status: 'failed', error: errorMsg })
        logger.error(`Reminder failed for tenant ${tenantId}:`, err)
      }
    }

    logger.info(
      `Reminders sent — agent: ${agentId}, sent: ${result.sent}, ` +
      `failed: ${result.failed}, skipped: ${result.skipped}`
    )
    return result
  }

  /**
   * Send reminders to ALL overdue tenants for this agent's properties.
   * Called by the daily cron job OR manually by the agent.
   */
  async sendBulkOverdue(agentId: string, month?: string): Promise<ReminderResult> {
    const now = new Date()
    const [year, mon] = month
      ? month.split('-').map(Number)
      : [now.getFullYear(), now.getMonth() + 1]

    const agent = await Agent.findByPk(agentId)
    if (!agent) throw new AppError('Agent not found', 404)

    // Get all occupied units for this agent
    const properties = await Property.findAll({
      where: { agent_id: agent.id, is_active: true },
    })
    const propertyIds = properties.map(p => p.id)

    const occupiedUnits = await Unit.findAll({
      where: { property_id: propertyIds, status: UnitStatus.OCCUPIED },
      include: [{ model: Tenant, as: 'tenants', where: { is_active: true }, required: true }],
    })

    // Find which units have NOT paid this month
    const paidUnitIds = (await Payment.findAll({
      where: { agent_id: agent.id, month: mon, year },
      attributes: ['unit_id'],
    })).map(p => p.unit_id)

    const overdueUnits = occupiedUnits.filter(u => !paidUnitIds.includes(u.id))

    if (overdueUnits.length === 0) {
      logger.info(`Bulk reminder — no overdue tenants for agent ${agentId} in ${mon}/${year}`)
      return { sent: 0, failed: 0, skipped: 0, details: [] }
    }

    // Collect all overdue tenant IDs
    const tenantIds = overdueUnits.flatMap(u =>
      ((u.tenants as Tenant[]) ?? []).map(t => t.id)
    )

    // Channel selection — prefer agent setting, but fall back to SMS
    // if WhatsApp is preferred but AT_WHATSAPP_SENDER is not configured.
    // This way reminders always go out even if WhatsApp isn't approved yet.
    const schedule = agent.reminder_schedule as { channels?: string[] }
    const whatsAppConfigured = !!(process.env.AT_WHATSAPP_SENDER?.trim())
    const prefersWhatsApp = !schedule?.channels?.includes('sms')
    const channel = (prefersWhatsApp && whatsAppConfigured)
      ? ReminderChannel.WHATSAPP
      : ReminderChannel.SMS

    logger.info(`Bulk reminder — ${tenantIds.length} overdue tenants, channel: ${channel}`)
    return this.send(agentId, { tenantIds, channel })
  }

  /**
   * Get reminder logs — for agent dashboard history view.
   */
  async logs(agentId: string, filters: Record<string, unknown>): Promise<ReminderLog[]> {
    const properties = await Property.findAll({ where: { agent_id: agentId } })
    const propertyIds = properties.map(p => p.id)

    const where: Record<string, unknown> = { property_id: propertyIds }
    if (filters.status) where['status'] = filters.status
    if (filters.channel) where['channel'] = filters.channel

    return ReminderLog.findAll({
      where,
      include: [
        { model: Tenant, as: 'tenant', attributes: ['id', 'full_name', 'phone'] },
        { model: Unit, as: 'unit', attributes: ['id', 'unit_number'] },
      ],
      order: [['created_at', 'DESC']],
      limit: 100,
    })
  }

  /**
   * Retry a failed reminder.
   */
  async retry(agentId: string, logId: string): Promise<ReminderResult> {
    const log = await ReminderLog.findByPk(logId, {
      include: [{ model: Tenant, as: 'tenant' }],
    })
    if (!log) throw new AppError('Reminder log not found', 404)
    if (log.status !== ReminderStatus.FAILED) {
      throw new AppError('Only failed reminders can be retried', 400)
    }

    const tenant = log.tenant as Tenant
    return this.send(agentId, {
      tenantIds: [tenant.id],
      channel: log.channel,
    })
  }
}
