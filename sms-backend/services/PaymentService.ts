import { Op } from 'sequelize'
import { Payment, Unit, Tenant, Property, Agent, StkRequest } from '@models/index'
import { PaymentMethod } from '@models/Payment'
import { StkStatus } from '@models/StkRequest'
import { AppError } from '@middleware/errorHandler'
import { logger } from '@config/logger'
import { redisGetJson } from '@config/redis'

// ── Core fee calculation — single source of truth ─────────────────────────────
// Waltern Tech charges 0.5% of gross, floored to nearest KES 1
export function calculateWalternFee(grossAmount: number): number {
  return Math.floor(grossAmount * 0.005)
}

export interface ManualPaymentDto {
  unit_id: string
  tenant_id?: string
  gross_amount: number
  month: number
  year: number
  payment_method: PaymentMethod
  mpesa_receipt?: string
  payer_phone?: string
  notes?: string
}

export class PaymentService {

  private async assertAgentOwnsUnit(agentId: string, unitId: string): Promise<Unit> {
    const unit = await Unit.findByPk(unitId, {
      include: [{ model: Property, as: 'property' }],
    })
    if (!unit) throw new AppError('Unit not found', 404)
    if ((unit.property as Property).agent_id !== agentId) {
      throw new AppError('Access denied', 403)
    }
    return unit
  }

  async list(agentId: string, filters: Record<string, unknown>): Promise<Payment[]> {
    const where: Record<string, unknown> = { agent_id: agentId }

    if (filters.month && filters.year) {
      where['month'] = Number(filters.month)
      where['year'] = Number(filters.year)
    } else if (filters.month) {
      // month passed as YYYY-MM
      const [y, m] = (filters.month as string).split('-').map(Number)
      where['month'] = m
      where['year'] = y
    }

    if (filters.unitId) where['unit_id'] = filters.unitId
    if (filters.propertyId) where['property_id'] = filters.propertyId
    if (filters.payment_method) where['payment_method'] = filters.payment_method

    return Payment.findAll({
      where,
      include: [
        { model: Unit, as: 'unit', attributes: ['id', 'unit_number'] },
        { model: Tenant, as: 'tenant', attributes: ['id', 'full_name', 'phone'] },
        { model: Property, as: 'property', attributes: ['id', 'name'] },
      ],
      order: [['created_at', 'DESC']],
      limit: 100,
    })
  }

  async createManual(agentId: string, userId: string, dto: ManualPaymentDto): Promise<Payment> {
    const unit = await this.assertAgentOwnsUnit(agentId, dto.unit_id)
    const property = unit.property as Property

    // Idempotency — block duplicate M-Pesa receipts
    if (dto.mpesa_receipt) {
      const existing = await Payment.findOne({ where: { mpesa_receipt: dto.mpesa_receipt } })
      if (existing) throw new AppError('Payment with this M-Pesa receipt already recorded', 409)
    }

    // ── Fee calculation ──────────────────────────────────────────────────────
    const waltern_fee = calculateWalternFee(dto.gross_amount)
    const agent_amount = dto.gross_amount - waltern_fee

    const payment = await Payment.create({
      unit_id: dto.unit_id,
      tenant_id: dto.tenant_id ?? null,
      property_id: property.id,
      agent_id: agentId,
      gross_amount: dto.gross_amount,
      waltern_fee,
      agent_amount,
      month: dto.month,
      year: dto.year,
      payment_method: dto.payment_method,
      mpesa_receipt: dto.mpesa_receipt ?? null,
      payer_phone: dto.payer_phone ?? null,
      split_confirmed: false,
      recorded_by: userId,
      confirmed_at: new Date(),
    })

    logger.info(
      `Payment recorded — unit: ${unit.unit_number}, gross: ${dto.gross_amount}, ` +
      `waltern_fee: ${waltern_fee}, agent_amount: ${agent_amount}`
    )

    return payment
  }

  /**
   * Voids a payment — used to correct a mistaken manual entry (e.g. wrong
   * amount typed in, wrong unit selected). The record is never deleted —
   * it stays in the database flagged as voided with a reason, so the
   * financial audit trail remains intact. Voided payments are excluded
   * from collection totals and the owner's payment status board, but
   * remain visible (struck through) in the payment history table.
   *
   * Only manually-recorded payments (cash/bank) can be voided — M-Pesa
   * STK push and Paybill payments represent real money that has already
   * moved and cannot be undone by the agent.
   */
  async voidPayment(agentId: string, paymentId: string, reason: string): Promise<Payment> {
    const payment = await Payment.findOne({ where: { id: paymentId, agent_id: agentId } })
    if (!payment) throw new AppError('Payment not found', 404)

    if (payment.is_voided) {
      throw new AppError('Payment is already voided', 400)
    }

    if (payment.payment_method !== PaymentMethod.CASH && payment.payment_method !== PaymentMethod.BANK) {
      throw new AppError(
        'Only manually recorded cash or bank payments can be voided — M-Pesa transactions cannot be undone',
        400
      )
    }

    if (!reason?.trim()) {
      throw new AppError('A reason is required to void a payment', 400)
    }

    await payment.update({
      is_voided: true,
      voided_reason: reason.trim(),
      voided_at: new Date(),
    })

    logger.info(`Payment voided — id: ${paymentId}, reason: ${reason}`)
    return payment
  }

  async summary(agentId: string, month?: string): Promise<object> {
    const now = new Date()
    const [year, mon] = month
      ? month.split('-').map(Number)
      : [now.getFullYear(), now.getMonth() + 1]

    const payments = await Payment.findAll({
      where: { agent_id: agentId, month: mon, year, is_voided: false },
    })

    const properties = await Property.findAll({
      where: { agent_id: agentId, is_active: true },
      include: [{ model: Unit, as: 'units' }],
    })

    const totalUnits = properties.reduce((s: number, p: Property) => s + ((p.units as Unit[])?.length ?? 0), 0)
    const paidUnits = new Set(payments.map(p => p.unit_id)).size
    const totalCollected = payments.reduce((s: number, p: Payment) => s + p.gross_amount, 0)
    const walternTotal = payments.reduce((s: number, p: Payment) => s + p.waltern_fee, 0)
    const agentTotal = payments.reduce((s: number, p: Payment) => s + p.agent_amount, 0)

    return {
      period: { month: mon, year },
      payments: { count: payments.length, paid_units: paidUnits },
      units: { total: totalUnits, paid: paidUnits, outstanding: totalUnits - paidUnits },
      financials: {
        gross_collected: totalCollected,
        waltern_fee: walternTotal,
        agent_earnings: agentTotal,
      },
    }
  }

  async stkStatus(checkoutRequestId: string): Promise<object> {
    // Check Redis first — faster
    const cached = await redisGetJson<{ status: string }>(
      `stk:request:${checkoutRequestId}`
    )
    if (cached) return cached

    // Fall back to DB
    const request = await StkRequest.findOne({
      where: { checkout_request_id: checkoutRequestId },
    })
    if (!request) throw new AppError('STK request not found', 404)

    return {
      checkoutRequestId,
      status: request.status,
      mpesaReceipt: request.mpesa_receipt ?? null,
      resultDesc: request.result_desc ?? null,
    }
  }

  async handleStkCallback(stkCallback: {
    CheckoutRequestID: string
    ResultCode: number
    ResultDesc: string
    CallbackMetadata?: { Item: Array<{ Name: string; Value: unknown }> }
  }): Promise<void> {
    const { CheckoutRequestID, ResultCode, ResultDesc, CallbackMetadata } = stkCallback

    const request = await StkRequest.findOne({
      where: { checkout_request_id: CheckoutRequestID },
    })

    if (!request) {
      logger.warn(`STK callback for unknown request: ${CheckoutRequestID}`)
      return
    }

    if (ResultCode === 0) {
      // Success — extract receipt
      const items = CallbackMetadata?.Item ?? []
      const receipt = items.find(i => i.Name === 'MpesaReceiptNumber')?.Value as string
      const amount = items.find(i => i.Name === 'Amount')?.Value as number

      await request.update({
        status: StkStatus.SUCCESS,
        result_code: ResultCode,
        result_desc: ResultDesc,
        mpesa_receipt: receipt,
      })

      // Auto-record payment
      if (receipt && amount) {
        const waltern_fee = calculateWalternFee(amount)
        await Payment.create({
          unit_id: request.unit_id,
          tenant_id: request.tenant_id,
          property_id: (await Unit.findByPk(request.unit_id, {
            include: [{ model: Property, as: 'property' }],
          }))?.property_id ?? '',
          agent_id: request.agent_id,
          gross_amount: amount,
          waltern_fee,
          agent_amount: amount - waltern_fee,
          month: new Date().getMonth() + 1,
          year: new Date().getFullYear(),
          payment_method: PaymentMethod.MPESA_STK,
          mpesa_receipt: receipt,
          split_confirmed: false,
          confirmed_at: new Date(),
        })
        logger.info(`STK payment auto-recorded — receipt: ${receipt}, amount: ${amount}`)
      }
    } else {
      await request.update({
        status: ResultCode === 1032 ? StkStatus.CANCELLED : StkStatus.FAILED,
        result_code: ResultCode,
        result_desc: ResultDesc,
      })
      logger.warn(`STK failed — ${CheckoutRequestID}: ${ResultDesc}`)
    }
  }
}
