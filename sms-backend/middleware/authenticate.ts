import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { env } from '@config/env'
import { JwtPayload } from '@shared-types/auth.types'

export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ success: false, message: 'Authentication required' })
    return
  }

  const token = authHeader.slice(7)
  try {
    const payload = jwt.verify(token, env.jwt.secret) as JwtPayload
    req.user = {
      id: payload.id,
      agentId: payload.agentId,
      role: payload.role,
      email: payload.email,
    }
    next()
  } catch {
    res.status(401).json({ success: false, message: 'Invalid or expired token' })
  }
}
