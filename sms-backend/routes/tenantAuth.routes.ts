import { Router } from 'express'
import { authenticateTenant } from '@middleware/authenticateTenant'
import {
  tenantLogin, tenantChangePassword, tenantGetProfile, tenantGetPayments, tenantPayRent,
} from '@controllers/TenantController'

const router = Router()

// Public — tenant login
router.post('/login', tenantLogin)

// Protected — requires tenant JWT
router.use(authenticateTenant)
router.post('/change-password', tenantChangePassword)
router.get('/profile', tenantGetProfile)
router.get('/payments', tenantGetPayments)
router.post('/pay', tenantPayRent)

export default router
