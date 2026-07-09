import cron from 'node-cron'
import { Agent, Property } from '@models/index'
import { ReportService } from '@services/ReportService'
import { logger } from '@config/logger'

const reportSvc = new ReportService()

/**
 * Report cron — runs on the 5th of every month at 09:00 Nairobi time.
 *
 * Generates and sends the previous month's statement to every property owner.
 * Agents can configure their preferred send day (report_auto_send_day on Agent model).
 *
 * Example: on June 5th, this generates May statements for all properties.
 */
export function startReportCron(): void {
  // '0 6 * * *' = 06:00 UTC = 09:00 Nairobi, every day
  // We check inside whether today matches each agent's preferred send day
  cron.schedule('0 6 * * *', async () => {
    const today = new Date()
    const dayOfMonth = today.getDate()

    logger.info(`[ReportCron] Running — day ${dayOfMonth} of month`)

    try {
      const agents = await Agent.findAll({
        include: [{ association: 'user', where: { is_active: true }, required: true }],
      })

      for (const agent of agents) {
        try {
          const sendDay = agent.report_auto_send_day ?? 5
          if (dayOfMonth !== sendDay) continue

          logger.info(`[ReportCron] Processing agent ${agent.id}`)

          // Generate report for previous month
          const now = new Date()
          const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
          const monthYear = `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, '0')}`

          const properties = await Property.findAll({
            where: { agent_id: agent.id, is_active: true },
          })

          for (const property of properties) {
            try {
              const report = await reportSvc.generate(agent.user_id, {
                propertyId: property.id,
                monthYear,
              })

              // Send to owner via WhatsApp
              await reportSvc.sendToOwner(agent.user_id, report.id)

              logger.info(
                `[ReportCron] Report generated and sent — ` +
                `property: ${property.name}, period: ${monthYear}`
              )
            } catch (propErr) {
              logger.error(
                `[ReportCron] Failed for property ${property.id}:`,
                propErr
              )
            }
          }
        } catch (agentErr) {
          logger.error(`[ReportCron] Failed for agent ${agent.id}:`, agentErr)
        }
      }

      logger.info('[ReportCron] Complete')
    } catch (err) {
      logger.error('[ReportCron] Fatal error:', err)
    }
  }, {
    timezone: 'Africa/Nairobi',
  })

  logger.info('[ReportCron] Scheduled — monthly on each agent\'s configured send day at 09:00 Nairobi time')
}
