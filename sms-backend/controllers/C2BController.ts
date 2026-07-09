import { Request, Response, NextFunction } from 'express'
import { C2BService } from '@services/C2BService'
import { logger } from '@config/logger'

const svc = new C2BService()

/**
 * POST /webhooks/c2b/validate
 * Safaricom calls this BEFORE processing payment — must respond within 5s.
 */
export async function c2bValidate(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    logger.info('C2B validation received:', JSON.stringify(req.body))
    const result = await svc.validate(req.body)
    res.json(result)
  } catch (err) {
    // Never reject Safaricom with a non-200 — they'll retry endlessly
    logger.error('C2B validate error:', err)
    res.json({ ResultCode: '0', ResultDesc: 'Accepted' })
  }
}

/**
 * POST /webhooks/c2b/confirm
 * Safaricom calls this AFTER payment is processed — money has moved.
 * Must respond 200 immediately, process async.
 */
export async function c2bConfirm(req: Request, res: Response, next: NextFunction): Promise<void> {
  // Respond immediately — Safaricom times out after 5s
  res.json({ ResultCode: '0', ResultDesc: 'Success' })

  // Process asynchronously
  try {
    logger.info('C2B confirmation received:', JSON.stringify(req.body))
    await svc.handleConfirmation(req.body)
  } catch (err) {
    logger.error('C2B confirmation processing error:', err)
    // Don't throw — we already responded 200
  }
}

/**
 * POST /api/agents/register-paybill
 * Called by agent during onboarding to register their Paybill with Safaricom.
 */
export async function registerPaybill(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { paybill_number } = req.body
    if (!paybill_number) {
      res.status(400).json({ success: false, message: 'paybill_number is required' })
      return
    }

    // Get fresh Daraja token
    const { DarajaService } = await import('@services/DarajaService')
    const daraja = new DarajaService()
    const token = await daraja.getOAuthToken()

    await svc.registerUrls(paybill_number, token)

    res.json({
      success: true,
      message: `Paybill ${paybill_number} registered with Safaricom — C2B webhooks active`,
    })
  } catch (err) {
    next(err)
  }
}
