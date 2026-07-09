/**
 * ReminderController
 *
 * Handles HTTP layer for WhatsApp/SMS reminder dispatch, bulk sends, logs, and retries.
 * All dispatch logic (Africa's Talking SDK, template rendering) lives in ReminderService.
 */
import { Request, Response, NextFunction } from 'express'
import { ReminderService } from '@services/ReminderService'
import { ReminderChannel } from '@models/ReminderLog'

const svc = new ReminderService()

/**
 * POST /api/reminders/send
 * Send a reminder to a single tenant via WhatsApp, SMS, or both.
 */
export async function sendReminder(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { tenantId, channel, message } = req.body
    const data = await svc.send(req.user!.agentId!, {
      tenantIds: [tenantId],
      channel: channel as ReminderChannel,
      customMessage: message,
    })
    res.json({ success: true, data })
  } catch (err) { next(err) }
}

/**
 * POST /api/reminders/bulk
 * Send reminders to all overdue/partial tenants for a property or entire portfolio.
 */
export async function sendBulkReminders(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await svc.sendBulkOverdue(req.user!.agentId!, req.query.month as string | undefined)
    res.json({ success: true, data })
  } catch (err) { next(err) }
}

/**
 * GET /api/reminders/logs?status=failed&tenantId=uuid
 * Retrieve reminder dispatch logs with optional filters.
 */
export async function getLogs(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await svc.logs(req.user!.agentId!, req.query as Record<string, unknown>)
    res.json({ success: true, data })
  } catch (err) { next(err) }
}

/**
 * POST /api/reminders/retry/:logId
 * Retry a previously failed reminder dispatch.
 */
export async function retryReminder(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await svc.retry(req.user!.agentId!, req.params.logId)
    res.json({ success: true, data })
  } catch (err) { next(err) }
}

/** DELETE /api/reminders/logs/:logId — delete a single reminder log entry */
export async function deleteLog(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { ReminderLog } = await import('@models/index')
    const log = await ReminderLog.findByPk(req.params.logId)
    if (!log) { res.status(404).json({ success: false, message: 'Log not found' }); return }
    await log.destroy()
    res.json({ success: true, message: 'Log deleted' })
  } catch (err) { next(err) }
}

/** DELETE /api/reminders/logs — clear all reminder logs for this agent */
export async function clearLogs(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { ReminderLog, Property, Unit } = await import('@models/index')
    const { Op } = await import('sequelize')
    const properties = await Property.findAll({ where: { agent_id: req.user!.agentId! }, attributes: ['id'] })
    const propertyIds = properties.map((p: any) => p.id)
    const deleted = await ReminderLog.destroy({ where: { property_id: { [Op.in]: propertyIds } } })
    res.json({ success: true, message: deleted + ' reminder logs cleared' })
  } catch (err) { next(err) }
}
