import { Router } from 'express'
import { authLimiter, stkLimiter, reminderLimiter } from '@middleware/rateLimiter'

import authRoutes from './auth.routes'
import agentRoutes from './agent.routes'
import propertyRoutes from './property.routes'
import unitRoutes from './unit.routes'
import tenantRoutes from './tenant.routes'
import ownerRoutes from './owner.routes'
import paymentRoutes from './payment.routes'
import maintenanceRoutes from './maintenance.routes'
import reminderRoutes from './reminder.routes'
import reportRoutes from './report.routes'
import webhookRoutes from './webhook.routes'
import healthRoutes from './health'
import kopokopoRoutes from './kopokopo.routes'
import rentRoutes from './rent.routes'

const router = Router()

// ── Public ────────────────────────────────────────────────────────────────────
router.use('/health', healthRoutes)
router.use('/api/auth', authLimiter, authRoutes)

// ── Webhooks (no session auth — handlers verify their own signatures) ──────────
router.use('/webhooks', webhookRoutes)
router.use('/api/kopokopo', kopokopoRoutes)

// ── Owner portal (public token-gated) ────────────────────────────────────────
router.use('/owner/report', reportRoutes)

// ── Protected API ──────────────────────────────────────────────────────────────
router.use('/api/agents', agentRoutes)
router.use('/api/properties', propertyRoutes)
router.use('/api', rentRoutes)
router.use('/api/units', unitRoutes)
router.use('/api/tenants', tenantRoutes)
router.use('/api/owners', ownerRoutes)
router.use('/api/payments', paymentRoutes)
router.use('/api/maintenance', maintenanceRoutes)
router.use('/api/reminders', reminderLimiter, reminderRoutes)
router.use('/api/reports', reportRoutes)

export default router
