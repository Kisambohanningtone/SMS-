import { Agent, User, Payment, Property, Unit } from '@models/index'
import { AppError } from '@middleware/errorHandler'
import { logger } from '@config/logger'
import { calculateWalternFee } from './PaymentService'

export interface UpdateAgentDto {
  business_name?: string
  phone?: string
  paybill_number?: string
  kopokopo_till_number?: string
  kopokopo_client_id?: string
  kopokopo_client_secret?: string
  mpesa_number?: string
  reminder_schedule?: {
    day1: number
    day2: number
    day3: number
    channels: Array<'whatsapp' | 'sms'>
  }
  reminder_template_wa?: string
  reminder_template_sms?: string
  agent_fee_percent?: number
  report_auto_send_day?: number
}

export class AgentService {

  async getByUserId(userId: string): Promise<object> {
    const user = await User.findByPk(userId, {
      include: [{ model: Agent, as: 'agent' }],
    })
    if (!user) throw new AppError('User not found', 404)
    if (!user.agent) throw new AppError('Agent profile not found', 404)

    return user.toJSON()
  }

  async update(agentId: string, dto: UpdateAgentDto): Promise<Agent> {
    const agent = await Agent.findByPk(agentId)
    if (!agent) throw new AppError('Agent not found', 404)

    // Validate fee percent range
    if (dto.agent_fee_percent !== undefined) {
      if (dto.agent_fee_percent < 0 || dto.agent_fee_percent > 30) {
        throw new AppError('Agent fee percent must be between 0 and 30', 400)
      }
    }

    await agent.update(dto)
    logger.info(`Agent updated — id: ${agentId}`)
    return agent.reload()
  }

  async stats(agentId: string, month?: string): Promise<object> {
    const now = new Date()
    const [year, mon] = month
      ? month.split('-').map(Number)
      : [now.getFullYear(), now.getMonth() + 1]

    const [properties, payments] = await Promise.all([
      Property.findAll({
        where: { agent_id: agentId, is_active: true },
        include: [{ model: Unit, as: 'units' }],
      }),
      Payment.findAll({
        where: { agent_id: agentId, month: mon, year },
      }),
    ])

    const totalUnits = properties.reduce(
      (sum, p) => sum + ((p.units as Unit[])?.length ?? 0), 0
    )
    const occupiedUnits = properties.reduce(
      (sum, p) => sum + ((p.units as Unit[])?.filter(u => u.status === 'occupied').length ?? 0), 0
    )
    const grossCollected = payments.reduce((sum: number, p: Payment) => sum + p.gross_amount, 0)
    const agentEarnings = payments.reduce((sum: number, p: Payment) => sum + p.agent_amount, 0)
    const walternFees = payments.reduce((sum: number, p: Payment) => sum + p.waltern_fee, 0)

    return {
      period: { month: mon, year },
      portfolio: {
        properties: properties.length,
        total_units: totalUnits,
        occupied_units: occupiedUnits,
        vacant_units: totalUnits - occupiedUnits,
        occupancy_rate: totalUnits > 0
          ? Math.round((occupiedUnits / totalUnits) * 100)
          : 0,
      },
      financials: {
        gross_collected: grossCollected,
        agent_earnings: agentEarnings,
        waltern_fees: walternFees,
        payments_count: payments.length,
      },
    }
  }

  async commissionSummary(agentId: string, month?: string): Promise<object> {
    const now = new Date()
    const [year, mon] = month
      ? month.split('-').map(Number)
      : [now.getFullYear(), now.getMonth() + 1]

    const payments = await Payment.findAll({
      where: { agent_id: agentId, month: mon, year },
      include: [
        { model: Unit, as: 'unit', attributes: ['unit_number'] },
        { model: Property, as: 'property', attributes: ['name'] },
      ],
      order: [['created_at', 'DESC']],
    })

    const totalGross = payments.reduce((sum: number, p: Payment) => sum + p.gross_amount, 0)
    const totalWalternFee = payments.reduce((sum: number, p: Payment) => sum + p.waltern_fee, 0)

    return {
      period: { month: mon, year },
      summary: {
        total_gross: totalGross,
        waltern_commission: totalWalternFee,
        waltern_rate: '0.5%',
        payment_count: payments.length,
      },
      breakdown: payments.map(p => ({
        id: p.id,
        unit: (p.unit as Unit)?.unit_number,
        property: (p.property as Property)?.name,
        gross: p.gross_amount,
        waltern_fee: p.waltern_fee,
        date: p.created_at,
      })),
    }
  }
}
