import { Request, Response, NextFunction } from 'express'
import { UserRole } from '@shared-types/auth.types'

export function requireRole(...roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required' })
      return
    }
    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        message: `Access denied. Required role: ${roles.join(' or ')}`,
      })
      return
    }
    next()
  }
}

export const requireAgent = requireRole(UserRole.AGENT)
export const requireAdmin = requireRole(UserRole.ADMIN)
export const requireSuperAdmin = requireRole(UserRole.SUPER_ADMIN)
export const requireAgentOrAdmin = requireRole(UserRole.AGENT, UserRole.ADMIN)
