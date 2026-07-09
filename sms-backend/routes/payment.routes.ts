import { Router } from 'express'
import { authenticate } from '@middleware/authenticate'
import { validate } from '@middleware/validate'
import { stkLimiter } from '@middleware/rateLimiter'
import {
  listPayments, createManualPayment, getSummary,
  initiateStkPush, pollStkStatus, voidPayment, deletePayment
} from '@controllers/PaymentController'
import { manualPaymentSchema, stkPushSchema } from '@shared-types/payment.schemas'

const router = Router()
router.use(authenticate)

router.get('/', listPayments)
router.post('/manual', validate(manualPaymentSchema), createManualPayment)
router.get('/summary', getSummary)
router.patch('/:id/void', voidPayment)
router.delete('/:id', deletePayment)
router.post('/stk-push', stkLimiter, validate(stkPushSchema), initiateStkPush)
router.get('/stk-push/:checkoutRequestId/status', pollStkStatus)

export default router
