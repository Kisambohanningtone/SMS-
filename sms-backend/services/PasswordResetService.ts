/**
 * PasswordResetService — PRD 3.12 OTP Password Recovery
 *
 * Flow:
 *   1. POST /api/auth/forgot-password { email/phone }
 *      → generate 6-digit OTP, hash it, store in Redis 5min
 *      → send via AT SMS
 *   2. POST /api/auth/verify-reset-otp { email, otp }
 *      → verify hashed OTP, issue single-use reset JWT (15min)
 *   3. POST /api/auth/reset-password { resetToken, newPassword }
 *      → verify JWT, update password, invalidate token
 *
 * Security:
 *   - OTP is SHA-256 hashed before Redis storage
 *   - Max 5 verify attempts per OTP (rate limited in Redis)
 *   - Reset JWT is single-use (deleted from Redis on use)
 *   - All email lookups are case-insensitive
 */
import crypto from 'crypto'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcrypt'
import axios from 'axios'
import { env } from '@config/env'
import { redisSet, redisGet, redisDel } from '@config/redis'
import { logger } from '@config/logger'
import { AppError } from '@middleware/errorHandler'

const OTP_TTL      = 5 * 60       // 5 minutes
const RESET_TTL    = 15 * 60      // 15 minutes
const MAX_ATTEMPTS = 5

const otpKey        = (email: string) => `pwd_reset:otp:${email}`
const attemptsKey   = (email: string) => `pwd_reset:attempts:${email}`
const resetTokenKey = (jti: string)   => `pwd_reset:token:${jti}`

function hashOtp(otp: string): string {
  return crypto.createHash('sha256').update(otp).digest('hex')
}

export class PasswordResetService {

  async requestReset(identifier: string): Promise<{ message: string; devOtp?: string }> {
    // Find user by email or phone (case-insensitive)
    const { sequelize } = await import('@config/db')
    const [rows] = await sequelize.query(`
      SELECT id, email, phone, full_name FROM users
      WHERE LOWER(TRIM(email)) = LOWER(TRIM(:identifier))
         OR phone = :identifier
         AND is_active = true
      LIMIT 1
    `, { replacements: { identifier }, type: 'SELECT' as any }) as any[]

    const user = (rows as any)[0]

    // Security: same response whether user exists or not
    if (!user) {
      return { message: 'If your account exists, you will receive a reset code shortly.' }
    }

    // Generate 6-digit OTP
    const otp = String(crypto.randomBytes(4).readUInt32BE(0) % 1_000_000).padStart(6, '0')
    const hashedOtp = hashOtp(otp)

    // Store hashed OTP in Redis
    await redisSet(otpKey(user.email), hashedOtp, OTP_TTL)
    await redisDel(attemptsKey(user.email))

    // Send via AT SMS
    const sent = await this._sendSms(user.phone, otp, user.full_name)
    if (!sent && env.app.isProd) {
      await redisDel(otpKey(user.email))
      throw new AppError('Failed to send reset code. Try again.', 502)
    }

    logger.info(`Password reset OTP sent to ${user.email}`)

    return {
      message: 'Reset code sent to your registered phone number. Valid for 5 minutes.',
      ...(env.app.isDev && { devOtp: otp }),
    }
  }

  async verifyOtp(email: string, otp: string): Promise<{ resetToken: string }> {
    const normEmail = email.toLowerCase().trim()

    // Check attempt count
    const attemptsRaw = await redisGet(attemptsKey(normEmail))
    const attempts = attemptsRaw ? parseInt(attemptsRaw) : 0
    if (attempts >= MAX_ATTEMPTS) {
      throw new AppError('Too many attempts. Request a new reset code.', 429)
    }

    const storedHash = await redisGet(otpKey(normEmail))
    if (!storedHash) {
      throw new AppError('Reset code expired or not found. Request a new one.', 401)
    }

    // Timing-safe compare
    const inputHash = hashOtp(otp.trim())
    const match = crypto.timingSafeEqual(
      Buffer.from(inputHash),
      Buffer.from(storedHash)
    )

    if (!match) {
      // Increment attempts
      await redisSet(attemptsKey(normEmail), String(attempts + 1), OTP_TTL)
      throw new AppError(`Incorrect code. ${MAX_ATTEMPTS - attempts - 1} attempts remaining.`, 401)
    }

    // OTP valid — delete it (single use)
    await redisDel(otpKey(normEmail))
    await redisDel(attemptsKey(normEmail))

    // Issue single-use reset JWT
    const jti = crypto.randomUUID()
    const resetToken = jwt.sign(
      { email: normEmail, jti, purpose: 'password_reset' },
      env.jwt.secret,
      { expiresIn: '15m' }
    )

    // Store token ID in Redis (single-use enforcement)
    await redisSet(resetTokenKey(jti), '1', RESET_TTL)

    logger.info(`Password reset OTP verified for ${normEmail}`)
    return { resetToken }
  }

  async resetPassword(resetToken: string, newPassword: string): Promise<void> {
    // Verify JWT
    let payload: { email: string; jti: string; purpose: string }
    try {
      payload = jwt.verify(resetToken, env.jwt.secret) as typeof payload
    } catch {
      throw new AppError('Reset link expired or invalid. Request a new one.', 401)
    }

    if (payload.purpose !== 'password_reset') {
      throw new AppError('Invalid reset token', 401)
    }

    // Check single-use — token must be in Redis
    const valid = await redisGet(resetTokenKey(payload.jti))
    if (!valid) {
      throw new AppError('Reset link already used. Request a new one.', 401)
    }

    // Delete token immediately (single use)
    await redisDel(resetTokenKey(payload.jti))

    // Validate new password
    if (newPassword.length < 8) {
      throw new AppError('Password must be at least 8 characters', 400)
    }

    // Update password
    const { sequelize } = await import('@config/db')
    const hash = await bcrypt.hash(newPassword, 12)
    await sequelize.query(`
      UPDATE users SET password_hash = :hash, updated_at = NOW()
      WHERE LOWER(TRIM(email)) = :email
    `, { replacements: { hash, email: payload.email } })

    logger.info(`Password reset completed for ${payload.email}`)
  }

  private async _sendSms(phone: string | null, otp: string, name: string): Promise<boolean> {
    if (!phone) return false

    const message = `Hi ${name?.split(' ')[0] ?? 'there'}, your NyumbaDesk password reset code is: ${otp}\n\nValid for 5 minutes. Do not share.`

    try {
      const res = await axios.post(
        'https://api.africastalking.com/version1/messaging',
        new URLSearchParams({ username: env.africastalking.username, to: phone, message }),
        {
          headers: {
            apiKey: env.africastalking.apiKey,
            'Content-Type': 'application/x-www-form-urlencoded',
            Accept: 'application/json',
          },
          timeout: 10_000,
        }
      )
      const recipient = res.data?.SMSMessageData?.Recipients?.[0]
      return recipient?.statusCode === 101 || recipient?.status === 'Success'
    } catch (err: any) {
      logger.error('Password reset SMS failed:', err.message)
      return false
    }
  }
}
