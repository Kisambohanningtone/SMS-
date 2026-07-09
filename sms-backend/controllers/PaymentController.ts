/**
 * PaymentController
 *
 * Handles HTTP layer for payment recording, STK Push initiation and status polling,
 * and per-agent/per-unit payment summaries.
 *
 * The 0.5% Waltern commission is computed automatically inside PaymentService
 * — this controller never touches fee calculations directly.
 */
import { Request, Response, NextFunction } from 'express'
import { PaymentService } from '@services/PaymentService'
import { DarajaService } from '@services/DarajaService'

const svc = new PaymentService()
const daraja = new DarajaService()

/** GET /api/payments?month=YYYY-MM&unitId=uuid — list payments with optional filters */
export async function listPayments(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await svc.list(req.user!.agentId!, req.query as Record<string, unknown>)
    res.json({ success: true, data })
  } catch (err) { next(err) }
}

/**
 * POST /api/payments/manual
 * Record a payment manually — for bank transfers or cash payments.
 * Automatically calculates 0.5% Waltern fee and updates unit status.
 */
export async function createManualPayment(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await svc.createManual(req.user!.agentId!, req.user!.id, req.body)
    res.status(201).json({ success: true, data })
  } catch (err) { next(err) }
}

/** GET /api/payments/summary?month=YYYY-MM — rent collection dashboard summary */
export async function getSummary(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await svc.summary(req.user!.agentId!, req.query.month as string | undefined)
    res.json({ success: true, data })
  } catch (err) { next(err) }
}

/**
 * PATCH /api/payments/:id/void
 * Voids a mistaken manual payment entry. Cash/bank only — M-Pesa
 * transactions cannot be voided since real money already moved.
 * The record is kept, flagged as voided, never deleted.
 */
export async function voidPayment(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await svc.voidPayment(req.user!.agentId!, req.params.id, req.body.reason)
    res.json({ success: true, data })
  } catch (err) { next(err) }
}

/**
 * POST /api/payments/stk-push
 * Triggers an M-Pesa STK Push prompt on the tenant's phone.
 * Returns checkoutRequestId — poll /stk-push/:id/status every 5s.
 */
export async function initiateStkPush(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await daraja.initiateStkPush({
      ...req.body,
      agentId: req.user!.agentId!,
      accountReference: `RENT-${req.body.unitId?.slice(0, 8).toUpperCase()}`,
      transactionDesc: 'Rent Payment',
    })
    res.json({ success: true, data })
  } catch (err) { next(err) }
}

/**
 * GET /api/payments/stk-push/:checkoutRequestId/status
 * Poll this endpoint every 5 seconds after initiating STK push.
 * Returns: pending | success | failed | expired
 */
export async function pollStkStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await svc.stkStatus(req.params.checkoutRequestId)
    res.json({ success: true, data })
  } catch (err) { next(err) }
}
/** DELETE /api/payments/:id — permanently delete a voided payment record */
export async function deletePayment(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const payment = await (await import('@models/index')).Payment.findOne({
      where: { id: req.params.id, agent_id: req.user!.agentId! }
    })
    if (!payment) { res.status(404).json({ success: false, message: 'Payment not found' }); return }
    if (!payment.is_voided) {
      res.status(400).json({ success: false, message: 'Only voided payments can be permanently deleted' })
      return
    }
    await payment.destroy()
    res.json({ success: true, message: 'Payment deleted' })
  } catch (err) { next(err) }
}
