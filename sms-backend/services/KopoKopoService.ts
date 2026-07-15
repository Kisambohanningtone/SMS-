import axios from 'axios'
import { env } from '@config/env'
import { logger } from '@config/logger'
import { AppError } from '@middleware/errorHandler'
import { redisGet, redisSet, REDIS_KEYS } from '@config/redis'
import { Payment, Unit, Property, Tenant, Agent } from '@models/index'
import { PaymentMethod } from '@models/Payment'
import { calculateWalternFee } from './PaymentService'

export interface KopoKopoWebhookPayload {
  topic: string
  id: string
  created_at: string
  event: {
    type: string
    resource: {
      id: string
      reference: string
      origination_time: string
      amount: number
      currency: string
      sender_phone_number: string
      till_number: string
      status: string
      system: string
    }
  }
}

export class KopoKopoService {

  async getOAuthToken(): Promise<string> {
    const cached = await redisGet(REDIS_KEYS.kopokopoToken)
    if (cached) return cached

    if (!env.kopokopo.clientId || !env.kopokopo.clientSecret) {
      throw new AppError('KopoKopo credentials not configured', 501)
    }

    const { data } = await axios.post(
      `${env.kopokopo.baseUrl}/oauth/token`,
      new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: env.kopokopo.clientId,
        client_secret: env.kopokopo.clientSecret,
      }),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    )

    const token = data.access_token as string
    await redisSet(REDIS_KEYS.kopokopoToken, token, Math.max(Number(data.expires_in ?? 3600) - 100, 60))
    logger.info('KopoKopo OAuth token refreshed')
    return token
  }

  /**
   * OPTION A CORE — Register agent till + configure 0.5%/99.5% split
   * Called when agent saves their till number in Settings page.
   */
  async registerTillWithSplit(tillNumber: string, agentId: string): Promise<{
    success: boolean
    webhookUrl: string
    splitConfigured: boolean
  }> {
    const token = await this.getOAuthToken()
    const baseUrl = process.env.APP_BASE_URL ?? 'https://sms-backend-5rw8.onrender.com'

    // Step 1: Subscribe to webhook events for this till
    try {
      await axios.post(
        `${env.kopokopo.baseUrl}/api/v1/webhook_subscriptions`,
        {
          event_type: 'buygoods_transaction_received',
          url: `${baseUrl}/webhooks/kopokopo`,
          scope: 'till',
          scope_reference: tillNumber,
        },
        { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
      )
      logger.info(`KopoKopo webhook subscribed for till: ${tillNumber}`)
    } catch (err: any) {
      if (err.response?.status !== 422) {
        logger.error(`KopoKopo webhook subscription failed for till ${tillNumber}:`, err.response?.data)
        throw new AppError('Failed to subscribe to KopoKopo webhook', 502)
      }
      logger.info(`KopoKopo webhook already subscribed for till: ${tillNumber}`)
    }

    // Step 2: Configure 0.5% split to Waltern Tech
    let splitConfigured = false
    try {
      await axios.post(
        `${env.kopokopo.baseUrl}/api/v1/transfer_subscriptions`,
        {
          till_number: tillNumber,
          transfer_config: {
            till_number: (env.kopokopo as any).walternTillNumber ?? '247247',
            percentage: 0.5,
          },
        },
        { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
      )
      splitConfigured = true
      logger.info(`Split configured for till ${tillNumber} — 0.5% to Waltern, 99.5% to agent`)
    } catch (err: any) {
      logger.warn(`Split auto-config failed for till ${tillNumber} — manual setup needed:`, err.response?.data)
    }

    return { success: true, webhookUrl: `${baseUrl}/webhooks/kopokopo`, splitConfigured }
  }

  /**
   * Main webhook handler — fires when tenant pays into any agent till.
   * Matches by phone → unit → records payment OR parks in pending_payments.
   */
  async handleWebhook(payload: KopoKopoWebhookPayload): Promise<void> {
    if (
      payload.event?.type !== 'Buy Goods Transaction Received' &&
      payload.event?.type !== 'buygoods_transaction_received'
    ) {
      logger.info(`KopoKopo webhook ignored — type: ${payload.event?.type}`)
      return
    }

    const resource = payload.event.resource
    const { reference, amount, sender_phone_number, till_number } = resource

    // Idempotency
    const existing = await Payment.findOne({ where: { kopokopo_payment_ref: reference } })
    if (existing) {
      logger.info(`KopoKopo duplicate ignored — reference: ${reference}`)
      return
    }

    const agent = await Agent.findOne({ where: { kopokopo_till_number: till_number } })
    if (!agent) {
      logger.warn(`KopoKopo — no agent for till: ${till_number}`)
      return
    }

    const grossAmount = Math.round(Number(amount))
    const walternFee  = calculateWalternFee(grossAmount)
    const agentAmount = grossAmount - walternFee
    const now         = new Date()

    // Try to match tenant by phone
    const tenant = await Tenant.findOne({
      where: { phone: sender_phone_number, is_active: true },
      include: [{ model: Unit, as: 'unit' }],
    })

    const unit = (tenant as any)?.unit as Unit | undefined

    if (unit) {
      await Payment.create({
        unit_id:              unit.id,
        tenant_id:            tenant!.id,
        property_id:          unit.property_id,
        agent_id:             agent.id,
        gross_amount:         grossAmount,
        waltern_fee:          walternFee,
        agent_amount:         agentAmount,
        month:                now.getMonth() + 1,
        year:                 now.getFullYear(),
        payment_method:       PaymentMethod.KOPOKOPO,
        kopokopo_payment_ref: reference,
        payer_phone:          sender_phone_number,
        split_confirmed:      true,
        confirmed_at:         now,
      })
      logger.info(`KopoKopo payment recorded — unit: ${unit.unit_number}, KES ${grossAmount}, fee: KES ${walternFee}`)
    } else {
      // Park in pending_payments for agent to assign manually
      const { sequelize } = await import('@config/db')
      await sequelize.query(`
        INSERT INTO pending_payments
          (agent_id, gross_amount, waltern_fee, agent_amount, payment_method,
           kopokopo_payment_ref, payer_phone, till_number, raw_payload)
        VALUES
          (:agentId, :grossAmount, :walternFee, :agentAmount, 'kopokopo',
           :reference, :payerPhone, :tillNumber, :rawPayload)
        ON CONFLICT (kopokopo_payment_ref) DO NOTHING
      `, {
        replacements: {
          agentId:    agent.id,
          grossAmount,
          walternFee,
          agentAmount,
          reference,
          payerPhone: sender_phone_number,
          tillNumber: till_number,
          rawPayload: JSON.stringify(payload),
        },
      })
      logger.warn(`KopoKopo payment PARKED — no tenant matched phone ${sender_phone_number}, KES ${grossAmount}, ref: ${reference}`)
    }
  }
}
