/**
 * UnitController
 *
 * Handles HTTP layer for unit CRUD and per-unit payment status.
 * Units belong to properties — propertyId always scoped through agent ownership.
 */
import { Request, Response, NextFunction } from 'express'
import { UnitService } from '@services/UnitService'

const svc = new UnitService()

/** GET /api/units/property/:propertyId?month=YYYY-MM — list all units with live status */
export async function listUnits(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await svc.list(req.user!.agentId!, req.params.propertyId, req.query.month as string | undefined)
    res.json({ success: true, data })
  } catch (err) { next(err) }
}

/** POST /api/units/property/:propertyId — create a single unit */
export async function createUnit(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await svc.generate(req.user!.agentId!, req.params.propertyId, { count: 1, ...req.body })
    res.status(201).json({ success: true, data })
  } catch (err) { next(err) }
}

/** GET /api/units/:id/status — get unit with tenant and recent payments */
export async function getUnitStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await svc.get(req.user!.agentId!, req.params.id)
    res.json({ success: true, data })
  } catch (err) { next(err) }
}

/** PATCH /api/units/:id — update unit fields (rent amount, notes, floor) */
export async function updateUnit(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await svc.update(req.user!.agentId!, req.params.id, req.body)
    res.json({ success: true, data })
  } catch (err) { next(err) }
}

/** DELETE /api/units/:id — delete unit (blocked if active tenant exists) */
export async function deleteUnit(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await svc.remove(req.user!.agentId!, req.params.id)
    res.json({ success: true, message: 'Unit deleted successfully' })
  } catch (err) { next(err) }
}