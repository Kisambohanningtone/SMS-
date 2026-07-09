import { Request, Response } from 'express'
import { KopoKopoService } from '@services/KopoKopoService'
import { PaymentService } from '@services/PaymentService'
import { logger } from '@config/logger'

const kopoKopoSvc = new KopoKopoService()
const paymentSvc = new PaymentService()

export class WebhookController {
  /**
   * KopoKopo payment received webhook
   * Fires when a tenant pays via M-Pesa to the agent's Buy Goods till
   * This is where the 0.5% commission split is confirmed and recorded
   */
  kopokopoPayment = async (req: Request, res: Response): Promise<void> => {
    // Always respond 200 immediately — KopoKopo retries on non-200
    res.status(200).json({ success: true })

    try {
      const payload = req.body
      logger.info('KopoKopo webhook received', { id: payload?.id })
      await kopoKopoSvc.handleWebhook(payload)
    } catch (error) {
      logger.error('KopoKopo webhook processing error:', error)
    }
  }

  /**
   * Daraja STK Push callback
   * Fires when the M-Pesa STK Push prompt is completed or cancelled by tenant
   */
  darajaStk = async (req: Request, res: Response): Promise<void> => {
    res.status(200).json({ ResultCode: 0, ResultDesc: 'Success' })

    try {
      const { Body } = req.body
      logger.info('Daraja STK callback received', {
        checkoutRequestId: Body?.stkCallback?.CheckoutRequestID,
        resultCode: Body?.stkCallback?.ResultCode,
      })
      await paymentSvc.handleStkCallback(Body.stkCallback)
    } catch (error) {
      logger.error('Daraja STK callback error:', error)
    }
  }

  darajaB2cResult = async (req: Request, res: Response): Promise<void> => {
    res.status(200).json({ ResultCode: 0, ResultDesc: 'Success' })
    logger.info('Daraja B2C result received', req.body)
  }

  darajaB2cTimeout = async (req: Request, res: Response): Promise<void> => {
    res.status(200).json({ ResultCode: 0, ResultDesc: 'Success' })
    logger.warn('Daraja B2C timeout received', req.body)
  }
}