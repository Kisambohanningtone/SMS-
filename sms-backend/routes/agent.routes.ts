import { Router } from 'express'
import { authenticate } from '@middleware/authenticate'
import { getProfile, updateProfile, getStats, getCommission } from '@controllers/AgentController'

const router = Router()
router.use(authenticate)

router.get('/profile', getProfile)
router.patch('/profile', updateProfile)
router.get('/stats', getStats)
router.get('/commission', getCommission)

export default router
