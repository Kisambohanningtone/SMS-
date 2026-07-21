import { Router } from 'express'
import { authenticate } from '@middleware/authenticate'
import { requireAdmin, requireSuperAdmin } from '@middleware/role'
import {
  getPlatformSummary, getDashboardStats, getRecentActivity,
  listAgents, getAgentProfile, getAgentCommission,
  deactivateAgent, reactivateAgent, resetAgentPassword,
  searchUsers, getRecentPayments, listOwners, deleteOwner, deleteAgent,
} from '@controllers/AdminController'
import { registerAdmin } from '@controllers/AuthController'

const router = Router()
router.use(authenticate)
router.use(requireAdmin)

// Dashboard
router.get('/summary', getPlatformSummary)
router.get('/stats', getDashboardStats)
router.get('/activity', getRecentActivity)

// Agents
router.get('/agents', listAgents)
router.get('/agents/:agentId', getAgentProfile)
router.get('/agents/:agentId/commission', getAgentCommission)
router.patch('/agents/:agentId/deactivate', deactivateAgent)
router.patch('/agents/:agentId/reactivate', reactivateAgent)
router.delete('/agents/:agentId', deleteAgent)
router.post('/agents/:agentId/reset-password', resetAgentPassword)

// Users search
router.get('/users/search', searchUsers)
router.post('/register-admin', requireSuperAdmin, registerAdmin)
router.get('/owners', listOwners)

// Payments
router.get('/payments/recent', getRecentPayments)
router.delete('/owners/:ownerId', deleteOwner)

export default router
