/**
 * MaintenanceController
 *
 * Handles HTTP layer for property maintenance records.
 * Maintenance costs are deducted from the owner's net payout in monthly reports.
 */
import { Request, Response, NextFunction } from 'express'
import { MaintenanceService } from '@services/MaintenanceService'

const svc = new MaintenanceService()

/** GET /api/maintenance?propertyId=uuid — list maintenance items */
export async function listMaintenance(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await svc.list(req.user!.agentId!, req.query as Record<string, unknown>)
    res.json({ success: true, data })
  } catch (err) { next(err) }
}

/** POST /api/maintenance — log a maintenance expense */
export async function createMaintenance(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await svc.create(req.user!.agentId!, req.body)
    res.status(201).json({ success: true, data })
  } catch (err) { next(err) }
}

/** PATCH /api/maintenance/:id — update maintenance item */
export async function updateMaintenance(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await svc.update(req.user!.agentId!, req.params.id, req.body)
    res.json({ success: true, data })
  } catch (err) { next(err) }
}

/** DELETE /api/maintenance/:id — remove maintenance item */
export async function deleteMaintenance(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await svc.remove(req.user!.agentId!, req.params.id)
    res.json({ success: true, message: 'Maintenance item deleted' })
  } catch (err) { next(err) }
}