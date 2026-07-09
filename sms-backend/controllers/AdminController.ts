import { Request, Response, NextFunction } from 'express'
import { AdminService } from '@services/AdminService'

const svc = new AdminService()

export async function getPlatformSummary(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await svc.platformSummary(req.query.month as string | undefined)
    res.json({ success: true, data })
  } catch (err) { next(err) }
}

export async function getDashboardStats(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await svc.dashboardStats()
    res.json({ success: true, data })
  } catch (err) { next(err) }
}

export async function getRecentActivity(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const limit = req.query.limit ? Number(req.query.limit) : 30
    const data = await svc.recentActivity(limit)
    res.json({ success: true, data })
  } catch (err) { next(err) }
}

export async function listAgents(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await svc.listAgents(req.query.month as string | undefined)
    res.json({ success: true, data })
  } catch (err) { next(err) }
}

export async function getAgentProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await svc.getAgentProfile(req.params.agentId)
    res.json({ success: true, data })
  } catch (err) { next(err) }
}

export async function getAgentCommission(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await svc.agentCommission(req.params.agentId, req.query.month as string | undefined)
    res.json({ success: true, data })
  } catch (err) { next(err) }
}

export async function deactivateAgent(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await svc.deactivateAgentWithReason(req.user!.id, req.params.agentId, req.body.reason)
    res.json({ success: true, message: 'Agent deactivated' })
  } catch (err) { next(err) }
}

export async function reactivateAgent(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await svc.reactivateAgentById(req.params.agentId)
    res.json({ success: true, message: 'Agent reactivated' })
  } catch (err) { next(err) }
}

export async function resetAgentPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await svc.resetAgentPassword(req.params.agentId, req.body.newPassword)
    res.json({ success: true, message: 'Password reset successfully' })
  } catch (err) { next(err) }
}

export async function searchUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { q, role } = req.query as { q?: string; role?: string }
    if (!q?.trim()) {
      res.json({ success: true, data: [] })
      return
    }
    const data = await svc.searchUsers(q, role)
    res.json({ success: true, data })
  } catch (err) { next(err) }
}

export async function getRecentPayments(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const limit = req.query.limit ? Number(req.query.limit) : 50
    const data = await svc.recentPayments(limit)
    res.json({ success: true, data })
  } catch (err) { next(err) }
}

export async function listOwners(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await svc.listOwners()
    res.json({ success: true, data })
  } catch (err) { next(err) }
}

export async function deleteOwner(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await svc.deleteOwner(req.params.ownerId)
    res.json({ success: true, message: 'Owner deleted' })
  } catch (err) { next(err) }
}

export async function deleteAgent(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await svc.deleteAgent(req.params.agentId)
    res.json({ success: true, message: 'Agent and all associated data permanently deleted' })
  } catch (err) { next(err) }
}
