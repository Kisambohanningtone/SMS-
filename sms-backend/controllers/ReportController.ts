/**
 * ReportController
 *
 * Handles HTTP layer for owner report generation, PDF delivery,
 * WhatsApp dispatch, and the public owner portal (token-authenticated, no login).
 */
import { Request, Response, NextFunction } from 'express'
import { ReportService } from '@services/ReportService'
import path from 'path'
import { env } from '@config/env'

const svc = new ReportService()

/** GET /api/reports?propertyId=uuid — list all reports for agent */
export async function listReports(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await svc.list(req.user!.agentId!, req.query as Record<string, unknown>)
    res.json({ success: true, data })
  } catch (err) { next(err) }
}

/**
 * POST /api/reports/generate
 * Calculates all figures, generates PDF via Puppeteer, creates signed owner token.
 * Body: { propertyId, monthYear: "YYYY-MM" }
 */
export async function generateReport(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await svc.generate(req.user!.agentId!, req.body)
    res.status(201).json({ success: true, data })
  } catch (err) { next(err) }
}

/**
 * POST /api/reports/:id/send
 * Sends PDF report link to property owner via WhatsApp.
 */
export async function sendReport(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await svc.sendToOwner(req.user!.agentId!, req.params.id)
    res.json({ success: true, data })
  } catch (err) { next(err) }
}

/**
 * GET /owner/report/:token  (public — no authentication required)
 * Owner views their statement via a signed JWT link — valid for 30 days.
 * This route is registered WITHOUT the authenticate middleware.
 */
export async function getOwnerPortal(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await svc.getByOwnerToken(req.params.token)
    if (!data) {
      res.status(404).json({ success: false, message: 'Report not found or link expired' })
      return
    }
    res.json({ success: true, data })
  } catch (err) { next(err) }
}
export async function deleteReport(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await svc.deleteReport(req.user!.agentId!, req.params.id)
    res.json({ success: true, message: 'Report deleted' })
  } catch (err) { next(err) }
}
