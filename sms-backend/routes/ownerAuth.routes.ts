import { Router } from 'express'
import { authenticateOwner } from '@middleware/authenticateOwner'
import {
  ownerLogin, ownerChangePassword, ownerGetProfile,
  ownerGetProperties, ownerGetPropertyDetail,
  ownerUpdateRent, ownerGetPayments, ownerGetReports,
} from '@controllers/OwnerController'

const router = Router()

// Public
router.post('/login', ownerLogin)

// Protected — requires owner JWT
router.use(authenticateOwner)
router.post('/change-password', ownerChangePassword)
router.get('/profile', ownerGetProfile)
router.get('/properties', ownerGetProperties)
router.get('/properties/:id', ownerGetPropertyDetail)
router.patch('/rent-groups/:groupId', ownerUpdateRent)
router.get('/payments', ownerGetPayments)
router.get('/reports', ownerGetReports)

export default router
