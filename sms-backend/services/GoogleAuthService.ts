import jwt from 'jsonwebtoken'
/**
 * GoogleAuthService — PRD 3.11
 *
 * Verifies Google ID tokens server-side using Google's tokeninfo endpoint.
 * Never trust the client — always verify the token with Google's servers.
 *
 * Flow:
 *   1. Frontend: user clicks "Sign in with Google" → gets Google ID token
 *   2. Frontend: POST /api/auth/google { idToken }
 *   3. Backend: verify token with Google → extract email, name, google_id
 *   4. Backend: find or create user → issue JWT
 *
 * DB columns used: users.google_id, users.auth_provider
 */
import axios from 'axios'
import { env } from '@config/env'
import { logger } from '@config/logger'
import { AppError } from '@middleware/errorHandler'
import { sequelize } from '@config/db'

interface GooglePayload {
  sub:            string   // Google user ID
  email:          string
  email_verified: boolean
  name:           string
  given_name:     string
  family_name:    string
  picture:        string
}

export class GoogleAuthService {

  /**
   * Verify Google ID token and return/create user + JWT
   */
  async authenticate(idToken: string): Promise<{
    accessToken: string
    user: Record<string, unknown>
    isNewUser: boolean
  }> {
    // 1. Verify token with Google
    const payload = await this._verifyToken(idToken)

    if (!payload.email_verified) {
      throw new AppError('Google account email is not verified', 400)
    }

    // 2. Find existing user by google_id or email
    const [rows] = await sequelize.query(`
      SELECT u.*, a.id as agent_id, a.business_name
      FROM users u
      LEFT JOIN agents a ON a.user_id = u.id
      WHERE u.google_id = :googleId
         OR LOWER(TRIM(u.email)) = LOWER(TRIM(:email))
      LIMIT 1
    `, {
      replacements: { googleId: payload.sub, email: payload.email },
      type: 'SELECT' as any,
    }) as any[]

    let user = (rows as any)[0]
    let isNewUser = false

    if (user) {
      // Update google_id if signing in with Google for the first time
      if (!user.google_id) {
        await sequelize.query(`
          UPDATE users SET google_id = :googleId, auth_provider = 'google', updated_at = NOW()
          WHERE id = :userId
        `, { replacements: { googleId: payload.sub, userId: user.id } })
      }

      if (!user.is_active) {
        throw new AppError('Account deactivated. Contact support.', 403)
      }
    } else {
      // 3. Create new user + agent
      isNewUser = true
      const [newUserRows] = await sequelize.query(`
        INSERT INTO users (id, email, full_name, role, is_active, auth_provider, google_id, created_at, updated_at)
        VALUES (gen_random_uuid(), :email, :name, 'agent', true, 'google', :googleId, NOW(), NOW())
        RETURNING id, email, full_name, role
      `, {
        replacements: {
          email:    payload.email.toLowerCase().trim(),
          name:     payload.name,
          googleId: payload.sub,
        },
        type: 'SELECT' as any,
      }) as any[]

      const newUser = (newUserRows as any)[0]

      // Create agent profile
      await sequelize.query(`
        INSERT INTO agents (id, user_id, agent_fee_percent, waltern_fee_percent, report_auto_send_day, created_at, updated_at)
        VALUES (gen_random_uuid(), :userId, 10.00, 0.50, 5, NOW(), NOW())
      `, { replacements: { userId: newUser.id } })

      // Re-fetch with agent
      const [refreshed] = await sequelize.query(`
        SELECT u.*, a.id as agent_id, a.business_name
        FROM users u LEFT JOIN agents a ON a.user_id = u.id
        WHERE u.id = :userId
      `, { replacements: { userId: newUser.id }, type: 'SELECT' as any }) as any[]
      user = (refreshed as any)[0]

      logger.info(`New user via Google OAuth: ${payload.email}`)
    }

    // 4. Issue JWT
    // jwt signing inline — same pattern as AuthService.ts
    const signAccess  = (p: object) => jwt.sign(p, env.jwt.secret, { expiresIn: (env.jwt as any).accessExpiry ?? '7d' })
    const signRefresh = (id: string) => jwt.sign({ id }, (env.jwt as any).refreshSecret ?? env.jwt.secret, { expiresIn: '30d' })
    const jwtPayload = {
      id:      user.id,
      email:   user.email,
      role:    user.role,
      agentId: user.agent_id ?? undefined,
    }
    const accessToken  = signAccess(jwtPayload)
    const refreshToken = signRefresh(user.id)

    // Store refresh token in Redis
    const { redisSet } = await import('@config/redis')
    await redisSet(`auth:refresh:${user.id}`, refreshToken, 30 * 24 * 60 * 60)

    logger.info(`Google OAuth login: ${user.email} (new: ${isNewUser})`)

    return {
      accessToken,
      user: {
        id:           user.id,
        email:        user.email,
        firstName:    user.full_name?.split(' ')[0] ?? '',
        lastName:     user.full_name?.split(' ').slice(1).join(' ') ?? '',
        role:         user.role,
        agentId:      user.agent_id ?? null,
        businessName: user.business_name ?? null,
        authProvider: 'google',
      },
      isNewUser,
    }
  }

  private async _verifyToken(idToken: string): Promise<GooglePayload> {
    try {
      const { data } = await axios.get(
        `https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`,
        { timeout: 5000 }
      )

      // Verify audience matches our client ID
      if (env.google.clientId && data.aud !== env.google.clientId) {
        throw new AppError('Invalid Google token audience', 401)
      }

      return data as GooglePayload
    } catch (err: any) {
      if (err instanceof AppError) throw err
      logger.error('Google token verification failed:', err.message)
      throw new AppError('Invalid or expired Google token', 401)
    }
  }
}
