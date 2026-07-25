import { Router } from 'express'
import { authenticate } from '@middleware/authenticate'
import { getEffectiveDue, getLedger } from '@controllers/CreditController'

const router = Router()
router.use(authenticate)
router.get('/tenants/:tenantId/credit', getEffectiveDue)
router.get('/tenants/:tenantId/credit/ledger', getLedger)
export default router
