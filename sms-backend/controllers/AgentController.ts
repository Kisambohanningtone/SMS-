/**
 * AgentController
 *
 * Handles HTTP layer for agent profile, stats, and commission data.
 * All business logic lives in AgentService.
 * Named function exports consumed directly by Express routes.
 */
import { Request, Response, NextFunction } from 'express'
import { AgentService } from '@services/AgentService'

const svc = new AgentService()

/**
 * GET /api/agents/profile
 * Returns the authenticated agent's full profile.
 */
export async function getProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await svc.getByUserId(req.user!.id)
    res.json({ success: true, data })
  } catch (err) { next(err) }
}

/**
 * PATCH /api/agents/profile
 * Updates agent profile fields — name, phone, business name, KopoKopo creds, schedule.
 */
export async function updateProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await svc.update(req.user!.agentId!, req.body)
    res.json({ success: true, data })
  } catch (err) { next(err) }
}

/**
 * GET /api/agents/stats?month=YYYY-MM
 * Returns payment stats for the agent for a given month (defaults to current).
 */
export async function getStats(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await svc.stats(req.user!.agentId!, req.query.month as string | undefined)
    res.json({ success: true, data })
  } catch (err) { next(err) }
}

/**
 * GET /api/agents/commission?month=YYYY-MM
 * Returns Waltern Tech 0.5% commission breakdown for the month.
 */
export async function getCommission(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await svc.commissionSummary(req.user!.agentId!, req.query.month as string | undefined)
    res.json({ success: true, data })
  } catch (err) { next(err) }
}