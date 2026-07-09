import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { env } from '@config/env'

interface OwnerJwtPayload {
  ownerId: string
  type: 'owner'
}

export function authenticateOwner(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ success: false, message: 'Authentication required' })
    return
  }
  const token = authHeader.slice(7)
  try {
    const payload = jwt.verify(token, env.jwt.secret) as OwnerJwtPayload
    if (payload.type !== 'owner' || !payload.ownerId) {
      res.status(401).json({ success: false, message: 'Invalid token type' })
      return
    }
    req.owner = { ownerId: payload.ownerId }
    next()
  } catch {
    res.status(401).json({ success: false, message: 'Invalid or expired token' })
  }
}
