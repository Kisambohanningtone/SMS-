import cron from 'node-cron'
import { Agent, Property } from '@models/index'
import { ReminderService } from '@services/ReminderService'
import { logger } from '@config/logger'

const reminderSvc = new ReminderService()

/**
 * Reminder cron — runs daily at 08:00 Nairobi time (UTC+3 = 05:00 UTC).
 *
 * For each agent, checks their reminder_schedule:
 *   day1: 1  → send reminder on 1st of month
 *   day2: 7  → send reminder on 7th of month
 *   day3: 15 → send reminder on 15th of month
 *
 * Agents can customise these days in their profile settings.
 */
export function startReminderCron(): void {
  // '0 5 * * *' = 05:00 UTC = 08:00 Nairobi time, every day
  cron.schedule('0 5 * * *', async () => {
    const today = new Date()
    const dayOfMonth = today.getDate()

    logger.info(`[ReminderCron] Running — day ${dayOfMonth} of month`)

    try {
      const agents = await Agent.findAll({
        include: [{ association: 'user', where: { is_active: true }, required: true }],
      })

      for (const agent of agents) {
        try {
          const schedule = agent.reminder_schedule as {
            day1?: number; day2?: number; day3?: number
          }

          const reminderDays = [
            schedule?.day1 ?? 1,
            schedule?.day2 ?? 7,
            schedule?.day3 ?? 15,
          ]

          if (!reminderDays.includes(dayOfMonth)) continue

          logger.info(`[ReminderCron] Processing agent ${agent.id} — day ${dayOfMonth}`)

          const result = await reminderSvc.sendBulkOverdue(agent.user_id)

          logger.info(
            `[ReminderCron] Agent ${agent.id} — sent: ${result.sent}, ` +
            `failed: ${result.failed}, skipped: ${result.skipped}`
          )
        } catch (agentErr) {
          logger.error(`[ReminderCron] Failed for agent ${agent.id}:`, agentErr)
          // Continue with next agent — one failure should not stop others
        }
      }

      logger.info('[ReminderCron] Complete')
    } catch (err) {
      logger.error('[ReminderCron] Fatal error:', err)
    }
  }, {
    timezone: 'Africa/Nairobi',
  })

  logger.info('[ReminderCron] Scheduled — daily at 08:00 Nairobi time')
}
