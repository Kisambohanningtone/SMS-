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

/**
 * GET /api/reports/:id/preview — PRD 3.2
 * Returns computed report figures for preview modal.
 * Does NOT generate PDF or send WhatsApp — preview only.
 */
export async function previewReport(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const report = await svc.getById(req.params.id, req.user!.agentId!)
    if (!report) {
      res.status(404).json({ success: false, message: 'Report not found' })
      return
    }
    res.json({
      success: true,
      data: {
        id: report.id,
        property: {
          id: report.property?.id,
          name: report.property?.name,
          location: report.property?.location,
        },
        owner: {
          full_name: report.owner?.full_name,
          phone: report.owner?.phone,
          email: report.owner?.email,
        },
        period: {
          month: report.month,
          year: report.year,
          label: new Date(report.year, report.month - 1)
            .toLocaleString('en-KE', { month: 'long', year: 'numeric' }),
        },
        financials: {
          total_expected:   report.total_expected,
          total_collected:  report.total_collected,
          waltern_fee:      report.waltern_fee_total,
          agent_fee:        report.agent_fee_amount,
          maintenance:      report.maintenance_total,
          net_to_owner:     report.net_to_owner,
          collection_rate:  report.collection_rate,
        },
        pdf_url:   report.pdf_url,
        sent_at:   report.sent_at,
        createdAt: report.created_at,
      },
    })
  } catch (err) { next(err) }
}
