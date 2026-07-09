import cron from 'node-cron'
import { Op } from 'sequelize'
import { StkRequest } from '@models/models'
import { StkStatus } from '@types/unit.types'
import { logger } from '@config/logger'

export function startStkCleanupCron(): void {
  // Run every 2 minutes
  cron.schedule('*/2 * * * *', async () => {
    try {
      const expired = await StkRequest.update(
        { status: StkStatus.EXPIRED },
        {
          where: {
            status: StkStatus.PENDING,
            expiresAt: { [Op.lt]: new Date() },
          },
        }
      )

      if (expired[0] > 0) {
        logger.info(`[StkCleanup] Expired ${expired[0]} stale STK requests`)
      }
    } catch (err) {
      logger.error('[StkCleanup] Error:', err)
    }
  }, { timezone: 'Africa/Nairobi' })

  logger.info('[StkCleanup] Scheduled — every 2 minutes')
}