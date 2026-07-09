import { Router } from 'express'
import { WebhookController } from '@controllers/WebhookController'
import { kopokopoIpWhitelist, kopokopoSignature } from '@middleware/webhookIp'

const router = Router()
const ctrl = new WebhookController()

// KopoKopo — verify source IP + HMAC signature before processing
router.post('/kopokopo/payment', kopokopoIpWhitelist, kopokopoSignature, ctrl.kopokopoPayment)

// Daraja callbacks — Safaricom does not sign payloads, IP not practical to
// whitelist (changes frequently); rely on checkout_request_id matching a
// known pending StkRequest as the trust boundary (handled in service layer)
router.post('/daraja/stk', ctrl.darajaStk)
router.post('/daraja/b2c/result', ctrl.darajaB2cResult)
router.post('/daraja/b2c/timeout', ctrl.darajaB2cTimeout)

export default router
