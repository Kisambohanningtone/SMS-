import { Router } from 'express'
import { requestReset, verifyOtp, resetPassword } from '@controllers/PasswordResetController'
import Joi from 'joi'
import { validate } from '@middleware/validate'

const router = Router()

router.post('/forgot-password',
  validate(Joi.object({ email: Joi.string().optional(), phone: Joi.string().optional() })),
  requestReset
)
router.post('/verify-reset-otp',
  validate(Joi.object({ email: Joi.string().email().required(), otp: Joi.string().length(6).required() })),
  verifyOtp
)
router.post('/reset-password',
  validate(Joi.object({ resetToken: Joi.string().required(), newPassword: Joi.string().min(8).required() })),
  resetPassword
)

export default router
