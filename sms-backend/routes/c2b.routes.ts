import { Router } from 'express'
import { authenticate } from '@middleware/authenticate'
import { c2bValidate, c2bConfirm, registerPaybill } from '@controllers/C2BController'

const router = Router()

// Safaricom webhook endpoints — NO auth (Safaricom doesn't send JWT)
// These must be publicly accessible at your domain URL
router.post('/validate', c2bValidate)
router.post('/confirm', c2bConfirm)

// Agent onboarding — register their Paybill with Safaricom
router.post('/register', authenticate, registerPaybill)

export default router
