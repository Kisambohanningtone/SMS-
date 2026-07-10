import 'reflect-metadata'
import 'tsconfig-paths/register'
import '@models/index'
import { connectDatabase, syncDatabase } from '@config/db'
import { connectRedis } from '@config/redis'
import { env } from '@config/env'
import { logger } from '@config/logger'
import { startReminderCron } from './jobs/reminderCron'
import { startReportCron } from './jobs/reportCron'
import dotenv from 'dotenv';

dotenv.config();

import app from './app';
import { sequelize } from './config/db';

async function bootstrap(): Promise<void> {
  logger.info(`Starting SMS Backend [${env.app.nodeEnv}]`)

  // ── Connect infrastructure ───────────────────────────────────────────────
  await connectDatabase()
  await connectRedis()

  // ── Sync DB schema in development (use migrations in production) ─────────
  if (env.app.isDev) {
    await syncDatabase()
  }

  // ── Start cron jobs ──────────────────────────────────────────────────────
  startReminderCron()   // Daily 08:00 Nairobi — send overdue reminders
  startReportCron()     // Monthly on agent's chosen day — generate + send owner statements

  // ── Start HTTP server ────────────────────────────────────────────────────
  const server = app.listen(env.app.port, '0.0.0.0', () => {
    logger.info(`Server listening on http://localhost:${env.app.port}`)
    logger.info(`Health: http://localhost:${env.app.port}/health`)
  })

  // ── Graceful shutdown ────────────────────────────────────────────────────
  const shutdown = (signal: string) => {
    logger.warn(`${signal} received — shutting down gracefully`)
    server.close(() => {
      logger.info('HTTP server closed')
      process.exit(0)
    })
    setTimeout(() => {
      logger.error('Forced shutdown after timeout')
      process.exit(1)
    }, 10_000)
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'))
  process.on('SIGINT', () => shutdown('SIGINT'))

  process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled promise rejection:', reason)
  })

  process.on('uncaughtException', (err) => {
    logger.error('Uncaught exception:', err)
    process.exit(1)
  })
}

bootstrap().catch((err) => {
  console.error('Bootstrap failed:', err)
  process.exit(1)
})
