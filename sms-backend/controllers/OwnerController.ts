import { Request, Response, NextFunction } from 'express'
import { OwnerService } from '@services/OwnerService'
import jwt from 'jsonwebtoken'
import { env } from '@config/env'

const svc = new OwnerService()

/** POST /api/owner-auth/login */
export async function ownerLogin(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { phone, password } = req.body
    if (!phone || !password) {
      res.status(400).json({ success: false, message: 'Phone and password are required' })
      return
    }
    const owner = await svc.login(phone, password)
    const accessToken = jwt.sign(
      { ownerId: owner.id, type: 'owner' },
      env.jwt.secret,
      { expiresIn: '30d' }
    )
    res.json({
      success: true,
      data: {
        accessToken,
        owner: {
          id: owner.id,
          fullName: owner.full_name,
          phone: owner.phone,
          email: owner.email,
          mustChangePassword: owner.must_change_password,
        },
      },
    })
  } catch (err) { next(err) }
}

/** POST /api/owner-auth/change-password */
export async function ownerChangePassword(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { currentPassword, newPassword } = req.body
    await svc.changePassword(req.owner!.ownerId, currentPassword, newPassword)
    res.json({ success: true, message: 'Password changed successfully' })
  } catch (err) { next(err) }
}

/** GET /api/owner-auth/profile */
export async function ownerGetProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await svc.getProfile(req.owner!.ownerId)
    res.json({ success: true, data })
  } catch (err) { next(err) }
}

/** GET /api/owner-auth/properties */
export async function ownerGetProperties(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await svc.getProperties(req.owner!.ownerId)
    res.json({ success: true, data })
  } catch (err) { next(err) }
}

/** GET /api/owner-auth/properties/:id */
export async function ownerGetPropertyDetail(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await svc.getPropertyDetail(req.owner!.ownerId, req.params.id)
    res.json({ success: true, data })
  } catch (err) { next(err) }
}

/** PATCH /api/owner-auth/rent-groups/:groupId */
export async function ownerUpdateRent(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { rentAmount } = req.body
    if (!rentAmount) {
      res.status(400).json({ success: false, message: 'rentAmount is required' })
      return
    }
    const data = await svc.updateRentAmount(req.owner!.ownerId, req.params.groupId, Number(rentAmount))
    res.json({ success: true, data })
  } catch (err) { next(err) }
}

/** GET /api/owner-auth/payments?month=YYYY-MM */
export async function ownerGetPayments(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await svc.getPayments(req.owner!.ownerId, req.query.month as string | undefined)
    res.json({ success: true, data })
  } catch (err) { next(err) }
}

/** GET /api/owners — list owners for this agent */
export async function listOwners(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await svc.list(req.user!.agentId!)
    res.json({ success: true, data })
  } catch (err) { next(err) }
}

/** POST /api/owners — create owner, returns temporary password */
export async function createOwner(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { owner, temporaryPassword } = await svc.create(req.user!.agentId!, req.body)
    res.status(201).json({
      success: true,
      data: owner,
      temporaryPassword,
      message: `Owner created. Share this temporary password for the Owner Portal: ${temporaryPassword}`,
    })
  } catch (err) { next(err) }
}

/** PATCH /api/owners/:id — update owner details */
export async function updateOwner(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await svc.update(req.user!.agentId!, req.params.id, req.body)
    res.json({ success: true, data })
  } catch (err) { next(err) }
}

export async function ownerGetReports(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await svc.getReports(req.owner!.ownerId)
    res.json({ success: true, data })
  } catch (err) { next(err) }
}
