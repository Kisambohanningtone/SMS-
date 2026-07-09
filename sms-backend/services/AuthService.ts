import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { User, Agent } from '@models/index'
import { UserRole } from '@models/User'
import { env } from '@config/env'
import { logger } from '@config/logger'
import { AppError } from '@middleware/errorHandler'
import { redisSet, redisGet, redisDel } from '@config/redis'
import { LoginResult, RegisterDto, JwtPayload } from '@shared-types/auth.types'

const SALT_ROUNDS = 12
const REFRESH_TTL = 30 * 24 * 60 * 60 // 30 days in seconds

function signAccess(payload: Omit<JwtPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload as object, env.jwt.secret, {
    expiresIn: env.jwt.expiresIn as jwt.SignOptions['expiresIn'],
  })
}

function signRefresh(userId: string): string {
  return jwt.sign({ id: userId }, env.jwt.refreshSecret, {
    expiresIn: env.jwt.refreshExpiresIn as jwt.SignOptions['expiresIn'],
  })
}

function refreshKey(userId: string): string {
  return `auth:refresh:${userId}`
}

export class AuthService {

  async register(dto: RegisterDto): Promise<LoginResult> {
    const existing = await User.findOne({ where: { email: dto.email.toLowerCase() } })
    if (existing) throw new AppError('Email already registered', 409)

    const password_hash = await bcrypt.hash(dto.password, SALT_ROUNDS)

    const user = await User.create({
      email: dto.email.toLowerCase().trim(),
      password_hash,
      full_name: `${dto.firstName} ${dto.lastName}`.trim(),
      phone: dto.phone,
      role: UserRole.AGENT,
      is_active: true,
    })

    const agent = await Agent.create({
      user_id: user.id,
      business_name: dto.businessName ?? `${dto.firstName}'s Properties`,
    })

    logger.info(`New agent registered — userId: ${user.id}, agentId: ${agent.id}`)
    return this._buildLoginResult(user, agent.id)
  }

  async login(email: string, password: string): Promise<LoginResult> {
    const user = await User.findOne({
      where: { email: email.toLowerCase().trim() },
      include: [{ model: Agent, as: 'agent' }],
    })

    // Timing-safe: always run bcrypt even if user not found
    const hash = user?.password_hash ?? '$2b$12$invalidhashfortimingsafety000000000000000000000'
    const valid = await bcrypt.compare(password, hash)

    if (!user || !valid) throw new AppError('Invalid email or password', 401)
    if (!user.is_active) throw new AppError('Account deactivated — contact support', 403)

    const agent = user.agent as Agent | undefined
    // Track last login time
    await user.update({ last_login_at: new Date() } as any)
    logger.info(`Login — userId: ${user.id}`)
    return this._buildLoginResult(user, agent?.id)
  }

  async refresh(refreshToken: string): Promise<{ accessToken: string }> {
    let payload: { id: string }
    try {
      payload = jwt.verify(refreshToken, env.jwt.refreshSecret) as { id: string }
    } catch {
      throw new AppError('Invalid or expired refresh token', 401)
    }

    const stored = await redisGet(refreshKey(payload.id))
    if (!stored || stored !== refreshToken) {
      throw new AppError('Refresh token revoked — please login again', 401)
    }

    const user = await User.findByPk(payload.id, {
      include: [{ model: Agent, as: 'agent' }],
    })
    if (!user || !user.is_active) throw new AppError('User not found or deactivated', 401)

    const agent = user.agent as Agent | undefined
    const accessToken = signAccess({
      id: user.id,
      agentId: agent?.id,
      role: user.role as unknown as import('@shared-types/auth.types').UserRole,
      email: user.email,
    })

    return { accessToken }
  }

  async logout(userId: string): Promise<void> {
    await redisDel(refreshKey(userId))
    logger.info(`Logout — userId: ${userId}`)
  }

  async getMe(userId: string): Promise<unknown> {
    const user = await User.findByPk(userId, {
      include: [{ model: Agent, as: 'agent' }],
    })
    if (!user) throw new AppError('User not found', 404)
    return user.toJSON()
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    const user = await User.findByPk(userId)
    if (!user) throw new AppError('User not found', 404)

    const valid = await bcrypt.compare(currentPassword, user.password_hash)
    if (!valid) throw new AppError('Current password is incorrect', 400)

    if (newPassword.length < 8) throw new AppError('New password must be at least 8 characters', 400)

    const password_hash = await bcrypt.hash(newPassword, SALT_ROUNDS)
    await user.update({ password_hash })
    await redisDel(refreshKey(userId))
    logger.info(`Password changed — userId: ${userId}`)
  }

  private async _buildLoginResult(user: User, agentId?: string): Promise<LoginResult> {
    const role = user.role as unknown as import('@shared-types/auth.types').UserRole

    const accessToken = signAccess({ id: user.id, agentId, role, email: user.email })
    const refreshToken = signRefresh(user.id)
    await redisSet(refreshKey(user.id), refreshToken, REFRESH_TTL)

    const nameParts = user.full_name.split(' ')
    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: nameParts[0] ?? '',
        lastName: nameParts.slice(1).join(' ') ?? '',
        role,
        agentId,
      },
    }
  }
  /**
   * Register a new admin account — only callable by existing admins.
   * Creates a User with ADMIN role, no Agent record.
   */
  async registerAdmin(dto: { full_name: string; email: string; password: string; phone?: string }): Promise<{ id: string; full_name: string; email: string; role: string }> {
    const bcrypt = require('bcrypt')
    const existing = await User.findOne({ where: { email: dto.email } })
    if (existing) throw new AppError('Email already registered', 409)
    if (dto.password.length < 8) throw new AppError('Password must be at least 8 characters', 400)
    const password_hash = await bcrypt.hash(dto.password, 12)
    const user = await User.create({
      full_name: dto.full_name,
      email: dto.email,
      phone: dto.phone ?? null,
      password_hash,
      role: UserRole.ADMIN,
      is_active: true,
    })
    logger.info('Admin registered — userId: ' + user.id + ', email: ' + user.email)
    return { id: user.id, full_name: user.full_name, email: user.email, role: user.role }
  }

}