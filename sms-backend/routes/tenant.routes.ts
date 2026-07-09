import { Router } from 'express'
import { authenticate } from '@middleware/authenticate'
import {
  listTenants, createTenant, getTenant,
  updateTenant, deactivateTenant
} from '@controllers/TenantController'

const router = Router()
router.use(authenticate)

router.get('/', listTenants)
router.post('/', createTenant)
router.get('/:id', getTenant)
router.patch('/:id', updateTenant)
router.delete('/:id', deactivateTenant)

export default router
