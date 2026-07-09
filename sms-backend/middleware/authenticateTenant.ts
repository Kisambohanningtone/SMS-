import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { env } from '@config/env'

interface TenantJwtPayload {
  tenantId: string
  type: 'tenant'
}

/**
 * Separate auth middleware for the tenant mobile app.
 * Tenant JWTs carry only { tenantId, type } — distinct from agent/admin
 * tokens which carry { id, agentId, role, email }. This separation
 * prevents a tenant token from ever being usable on agent/admin routes
 * and vice versa, even though both are signed with the same JWT_SECRET.
 */
export function authenticateTenant(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ success: false, message: 'Authentication required' })
    return
  }

  const token = authHeader.slice(7)
  try {
    const payload = jwt.verify(token, env.jwt.secret) as TenantJwtPayload

    if (payload.type !== 'tenant' || !payload.tenantId) {
      res.status(401).json({ success: false, message: 'Invalid token type' })
      return
    }

    req.tenant = { tenantId: payload.tenantId }
    next()
  } catch {
    res.status(401).json({ success: false, message: 'Invalid or expired token' })
  }
}
