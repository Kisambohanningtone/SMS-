import { UserRole } from './auth.types'

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string
        agentId?: string
        role: UserRole
        email: string
      }
      tenant?: {
        tenantId: string
      }
      owner?: {
        ownerId: string
      }
    }
  }
}

export {}
