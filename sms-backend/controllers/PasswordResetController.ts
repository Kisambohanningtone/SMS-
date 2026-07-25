import { Request, Response, NextFunction } from 'express'
import { PasswordResetService } from '@services/PasswordResetService'

const svc = new PasswordResetService()

export async function requestReset(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email, phone } = req.body
    const result = await svc.requestReset(email ?? phone)
    res.json({ success: true, ...result })
  } catch (err) { next(err) }
}

export async function verifyOtp(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email, otp } = req.body
    const data = await svc.verifyOtp(email, otp)
    res.json({ success: true, data })
  } catch (err) { next(err) }
}

export async function resetPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { resetToken, newPassword } = req.body
    await svc.resetPassword(resetToken, newPassword)
    res.json({ success: true, message: 'Password updated successfully. Please log in.' })
  } catch (err) { next(err) }
}
