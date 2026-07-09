import { Router, Request, Response } from 'express'
import { sequelize } from '@config/db'
import { getRedis } from '@config/redis'
import { logger } from '@config/logger'

const router = Router()

router.get('/', async (_req: Request, res: Response) => {
  const health: Record<string, unknown> = {
    status: 'ok',
    service: 'sms-backend',
    version: process.env.npm_package_version ?? '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    environment: process.env.NODE_ENV,
  }

  // Check DB
  try {
    await sequelize.authenticate()
    health['database'] = 'connected'
  } catch {
    health['database'] = 'disconnected'
    health['status'] = 'degraded'
  }

  // Check Redis
  try {
    const redis = getRedis()
    await redis.ping()
    health['redis'] = 'connected'
  } catch {
    health['redis'] = 'disconnected'
    health['status'] = 'degraded'
  }

  const statusCode = health['status'] === 'ok' ? 200 : 503
  if (statusCode === 503) logger.warn('Health check degraded', health)

  res.status(statusCode).json(health)
})

export default router
