import { Request, Response, NextFunction } from 'express'
import { AuthService } from '@services/AuthService'

const svc = new AuthService()

export class AuthController {
  register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await svc.register(req.body)
      res.status(201).json({ success: true, data: result })
    } catch (err) { next(err) }
  }

  login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { email, password } = req.body
      const result = await svc.login(email, password)
      res.cookie('refreshToken', result.refreshToken, {
        httpOnly: true, secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict', maxAge: 30 * 24 * 60 * 60 * 1000,
      })
      res.json({ success: true, data: { accessToken: result.accessToken, user: result.user } })
    } catch (err) { next(err) }
  }

  refresh = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const token = req.cookies?.refreshToken || req.body?.refreshToken
      if (!token) { res.status(401).json({ success: false, message: 'Refresh token required' }); return }
      const result = await svc.refresh(token)
      res.json({ success: true, data: result })
    } catch (err) { next(err) }
  }

  logout = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await svc.logout(req.user!.id)
      res.clearCookie('refreshToken')
      res.json({ success: true, message: 'Logged out' })
    } catch (err) { next(err) }
  }

  me = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = await svc.getMe(req.user!.id)
      res.json({ success: true, data: user })
    } catch (err) { next(err) }
  }

  changePassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { currentPassword, newPassword } = req.body
      await svc.changePassword(req.user!.id, currentPassword, newPassword)
      res.json({ success: true, message: 'Password updated' })
    } catch (err) { next(err) }
  }
}

export async function registerAdmin(req: import('express').Request, res: import('express').Response, next: import('express').NextFunction): Promise<void> {
  try {
    const data = await svc.registerAdmin(req.body)
    res.status(201).json({ success: true, data })
  } catch (err) { next(err) }
}
