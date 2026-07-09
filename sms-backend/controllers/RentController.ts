/**
 * RentController
 *
 * Handles HTTP layer for rent tier configuration (UnitTypeGroup) and
 * the agent-facing payment status board.
 *
 * Permission model:
 *  - createGroup / updateRent / deleteGroup -> OWNER only (enforced in RentService)
 *  - listGroups / getPaymentBoard -> AGENT (their own properties) or OWNER
 */
import { Request, Response, NextFunction } from 'express'
import { RentService } from '@services/RentService'

const svc = new RentService()

/** POST /api/properties/:propertyId/rent-groups — owner defines a new rent tier */
export async function createUnitTypeGroup(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await svc.createUnitTypeGroup(req.user!.id, req.params.propertyId, req.body)
    res.status(201).json({ success: true, data })
  } catch (err) { next(err) }
}

/** GET /api/properties/:propertyId/rent-groups — list rent tiers */
export async function listUnitTypeGroups(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await svc.listUnitTypeGroups(req.params.propertyId)
    res.json({ success: true, data })
  } catch (err) { next(err) }
}

/** PATCH /api/rent-groups/:groupId — owner updates rent amount for a tier */
export async function updateRent(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await svc.updateRent(req.user!.id, req.params.groupId, req.body)
    res.json({ success: true, data })
  } catch (err) { next(err) }
}

/** DELETE /api/rent-groups/:groupId — owner removes an empty rent tier */
export async function deleteUnitTypeGroup(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await svc.deleteUnitTypeGroup(req.user!.id, req.params.groupId)
    res.json({ success: true, message: 'Rent tier deleted' })
  } catch (err) { next(err) }
}

/**
 * GET /api/properties/:propertyId/payment-status?month=YYYY-MM
 * Agent dashboard — who has paid, who hasn't, who's partial.
 */
export async function getPaymentStatusBoard(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await svc.getPaymentStatusBoard(
      req.user!.agentId!,
      req.params.propertyId,
      req.query.month as string | undefined
    )
    res.json({ success: true, data })
  } catch (err) { next(err) }
}
