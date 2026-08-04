import { Router } from 'express'
import { AuthController } from '@controllers/AuthController'
import { authenticate } from '@middleware/authenticate'
import { validate } from '@middleware/validate'
import { registerSchema, loginSchema, changePasswordSchema } from '@shared-types/auth.schemas'

const router = Router()
const ctrl = new AuthController()
// PRD 3.11 — Google OAuth
import { googleAuth } from '@controllers/AuthController'

router.post('/register', validate(registerSchema), ctrl.register)
router.post('/login',    validate(loginSchema),    ctrl.login)
router.post('/refresh',  ctrl.refresh)
router.post('/logout',   authenticate, ctrl.logout)
router.get('/me',        authenticate, ctrl.me)
router.patch('/change-password', authenticate, validate(changePasswordSchema), ctrl.changePassword)
// PRD 3.11
router.post('/google', googleAuth)

export default router
