/**
 * TenantController
 *
 * Handles HTTP layer for tenant CRUD and vacate operations,
 * plus tenant mobile app authentication (login, change password, own profile).
 */
import { Request, Response, NextFunction } from 'express'
import { TenantService } from '@services/TenantService'
import jwt from 'jsonwebtoken'
import { env } from '@config/env'
import { DarajaService } from '@services/DarajaService'

const svc = new TenantService()
const daraja = new DarajaService()

/** GET /api/tenants?isActive=true — list all tenants for the agent */
export async function listTenants(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await svc.list(req.user!.agentId!, req.query as Record<string, unknown>)
    res.json({ success: true, data })
  } catch (err) { next(err) }
}

/**
 * POST /api/tenants — add new tenant to a vacant unit.
 * Returns the tenant AND a one-time temporary password for mobile login.
 * Agent shares this password with the tenant manually.
 */
export async function createTenant(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { tenant, temporaryPassword } = await svc.create(req.user!.agentId!, req.body)
    res.status(201).json({
      success: true,
      data: tenant,
      temporaryPassword,
      message: `Tenant created. Share this temporary password with them for mobile app login: ${temporaryPassword}`,
    })
  } catch (err) { next(err) }
}

/** GET /api/tenants/:id — get tenant with unit and recent payments */
export async function getTenant(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await svc.get(req.user!.agentId!, req.params.id)
    res.json({ success: true, data })
  } catch (err) { next(err) }
}

/** PATCH /api/tenants/:id — update tenant details */
export async function updateTenant(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await svc.update(req.user!.agentId!, req.params.id, req.body)
    res.json({ success: true, data })
  } catch (err) { next(err) }
}

/** DELETE /api/tenants/:id — vacate tenant, mark unit vacant */
export async function deactivateTenant(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await svc.vacate(req.user!.agentId!, req.params.id)
    res.json({ success: true, message: 'Tenant vacated and unit marked vacant' })
  } catch (err) { next(err) }
}

// ── Tenant mobile app authentication ──────────────────────────────────────

/** POST /api/tenant-auth/login — tenant logs in with phone + password */
export async function tenantLogin(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { phone, password } = req.body
    if (!phone || !password) {
      res.status(400).json({ success: false, message: 'Phone and password are required' })
      return
    }

    const tenant = await svc.login(phone, password)

    const accessToken = jwt.sign(
      { tenantId: tenant.id, type: 'tenant' },
      env.jwt.secret,
      { expiresIn: '30d' }
    )

    res.json({
      success: true,
      data: {
        accessToken,
        tenant: {
          id: tenant.id,
          fullName: tenant.full_name,
          phone: tenant.phone,
          mustChangePassword: tenant.must_change_password,
        },
      },
    })
  } catch (err) { next(err) }
}

/** POST /api/tenant-auth/change-password — tenant changes their password */
export async function tenantChangePassword(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { currentPassword, newPassword } = req.body
    await svc.changePassword(req.tenant!.tenantId, currentPassword, newPassword)
    res.json({ success: true, message: 'Password changed successfully' })
  } catch (err) { next(err) }
}

/** GET /api/tenant-auth/profile — tenant's own lease + property info */
export async function tenantGetProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await svc.getOwnProfile(req.tenant!.tenantId)
    res.json({ success: true, data })
  } catch (err) { next(err) }
}

/** GET /api/tenant-auth/payments — tenant's own payment history */
export async function tenantGetPayments(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await svc.getOwnPayments(req.tenant!.tenantId)
    res.json({ success: true, data })
  } catch (err) { next(err) }
}

/**
 * POST /api/tenant-auth/pay — tenant initiates their own rent payment.
 * Pulls the tenant's unit and agent automatically — tenant only sends amount.
 */
export async function tenantPayRent(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { amount } = req.body
    if (!amount || amount < 1) {
      res.status(400).json({ success: false, message: 'Amount must be at least KES 1' })
      return
    }

    const tenant = await svc.getOwnProfile(req.tenant!.tenantId)
    const unit = tenant.unit as any
    const property = unit.property as any

    const data = await daraja.initiateStkPush({
      phoneNumber: tenant.phone,
      amount,
      unitId: unit.id,
      tenantId: tenant.id,
      agentId: property.agent_id,
      accountReference: `RENT-${unit.id.slice(0, 8).toUpperCase()}`,
      transactionDesc: 'Rent Payment',
    })

    res.json({ success: true, data })
  } catch (err) { next(err) }
}
