import cron from 'node-cron'
import { logger } from '@config/logger'
import { IntaSendService } from '@services/IntaSendService'

/**
 * B2C Retry Cron — runs every 10 minutes.
 * Retries failed IntaSend disbursements up to 3 times.
 * After 3 failures, payment stays as 'failed' and admin must resolve manually.
 */
export function startB2CRetryCron(): void {
  cron.schedule('*/10 * * * *', async () => {
    try {
      const svc = new IntaSendService()
      await svc.retryFailedDisbursements()
    } catch (err) {
      logger.error('[B2CRetryCron] Error:', err)
    }
  })
  logger.info('[B2CRetryCron] Scheduled — every 10 minutes')
}
