import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import cookieParser from 'cookie-parser'
import rateLimit from 'express-rate-limit'

import { env } from '@config/env'
import { logger } from '@config/logger'
import { errorHandler, notFound } from '@middleware/errorHandler'

import authRoutes from '@routes/auth.routes'
import agentRoutes from '@routes/agent.routes'
import propertyRoutes from '@routes/property.routes'
import unitRoutes from '@routes/unit.routes'
import tenantRoutes from '@routes/tenant.routes'
import ownerRoutes from '@routes/owner.routes'
import paymentRoutes from '@routes/payment.routes'
import maintenanceRoutes from '@routes/maintenance.routes'
import reminderRoutes from '@routes/reminder.routes'
import reportRoutes from '@routes/report.routes'
import webhookRoutes from '@routes/webhook.routes'
import c2bRoutes from '@routes/c2b.routes'
import adminRoutes from '@routes/admin.routes'
import rentRoutes from '@routes/rent.routes'
import tenantAuthRoutes from '@routes/tenantAuth.routes'
import ownerAuthRoutes from '@routes/ownerAuth.routes'

const app = express()
app.set('trust proxy', 1) // Required for Render/Cloudflare — enables correct IP detection behind proxy

// ── Security ────────────────────────────────────────────────────────────────
app.use(helmet())
app.use(cors({
  origin: [env.cors.frontendUrl, env.cors.adminUrl],
  credentials: true,
}))

// ── Rate limiting ────────────────────────────────────────────────────────────
app.use('/api', rateLimit({
  windowMs: env.rateLimit.windowMs,
  max: env.rateLimit.max,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests — slow down' },
}))

// ── Body parsing ─────────────────────────────────────────────────────────────
// Webhooks need raw body for signature verification — mount before json()
app.use('/webhooks', express.raw({ type: 'application/json' }), (req, _res, next) => {
  if (Buffer.isBuffer(req.body)) req.body = JSON.parse(req.body.toString())
  next()
})
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))
app.use(cookieParser())

// ── HTTP logging ─────────────────────────────────────────────────────────────
app.use(morgan(env.app.isDev ? 'dev' : 'combined', {
  stream: { write: (msg) => logger.http(msg.trim()) },
}))

// ── Health check ─────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'sms-backend', timestamp: new Date().toISOString() })
})

// ── API Routes ────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes)
app.use('/api/agents', agentRoutes)
app.use('/api/properties', propertyRoutes)
app.use('/api/units', unitRoutes)
app.use('/api/tenants', tenantRoutes)
app.use('/api/tenant-auth', tenantAuthRoutes)
app.use('/api/owner-auth', ownerAuthRoutes)
app.use('/api/owners', ownerRoutes)
app.use('/api/payments', paymentRoutes)
app.use('/api/maintenance', maintenanceRoutes)
app.use('/api/reminders', reminderRoutes)
app.use('/api/reports', reportRoutes)

// Owner portal (public, token-gated)
app.use('/owner/report', reportRoutes)

// Webhooks (no API auth — webhook controllers handle their own verification)
app.use('/webhooks', webhookRoutes)
app.use('/webhooks/c2b', c2bRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api', rentRoutes)

// ── 404 + Error handling ──────────────────────────────────────────────────────
app.use(notFound)
app.use(errorHandler)

export default app
