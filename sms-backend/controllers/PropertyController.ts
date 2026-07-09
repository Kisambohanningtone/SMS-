/**
 * PropertyController
 *
 * Handles HTTP layer for property CRUD and per-property payment summaries.
 * An agent can only access their own properties — agentId enforced in every service call.
 */
import { Request, Response, NextFunction } from 'express'
import { PropertyService } from '@services/PropertyService'

const svc = new PropertyService()

/** GET /api/properties — list all properties for the authenticated agent */
export async function listProperties(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await svc.list(req.user!.agentId!)
    res.json({ success: true, data })
  } catch (err) { next(err) }
}

/** POST /api/properties — create property + auto-generate units */
export async function createProperty(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await svc.create(req.user!.agentId!, req.body)
    res.status(201).json({ success: true, data })
  } catch (err) { next(err) }
}

/** GET /api/properties/:id — get single property with units */
export async function getProperty(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await svc.get(req.user!.agentId!, req.params.id)
    res.json({ success: true, data })
  } catch (err) { next(err) }
}

/** PATCH /api/properties/:id — update property fields */
export async function updateProperty(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await svc.update(req.user!.agentId!, req.params.id, req.body)
    res.json({ success: true, data })
  } catch (err) { next(err) }
}

/** DELETE /api/properties/:id — delete property (blocks if active tenants exist) */
export async function deleteProperty(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await svc.remove(req.user!.agentId!, req.params.id)
    res.json({ success: true, message: 'Property deleted successfully' })
  } catch (err) { next(err) }
}

/** GET /api/properties/:id/summary?month=YYYY-MM — rent collection summary for property */
export async function getPropertySummary(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await svc.summary(req.user!.agentId!, req.params.id, req.query.month as string | undefined)
    res.json({ success: true, data })
  } catch (err) { next(err) }
}
