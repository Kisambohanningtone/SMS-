import { Tenant, Unit, Property, Payment } from '@models/index'
import { UnitStatus } from '@models/Unit'
import { AppError } from '@middleware/errorHandler'
import { logger } from '@config/logger'
import bcrypt from 'bcrypt'
import crypto from 'crypto'

export interface CreateTenantDto {
  unit_id: string
  full_name: string
  phone: string
  national_id?: string
  lease_start: string
  deposit_amount?: number
  deposit_paid?: boolean
}

export interface TenantCreateResult {
  tenant: Tenant
  temporaryPassword: string
}

export class TenantService {
  private async assertAgentOwnsUnit(agentId: string, unitId: string): Promise<Unit> {
    const unit = await Unit.findByPk(unitId, {
      include: [{ model: Property, as: 'property' }],
    })
    if (!unit) throw new AppError('Unit not found', 404)
    if ((unit.property as Property).agent_id !== agentId) {
      throw new AppError('Access denied', 403)
    }
    return unit
  }

  async list(agentId: string, filters: Record<string, unknown>): Promise<Tenant[]> {
    const agentProperties = await Property.findAll({
      where: { agent_id: agentId },
      attributes: ['id'],
    })
    const propertyIds = agentProperties.map((p) => p.id)
    const agentUnits = await Unit.findAll({
      where: { property_id: propertyIds },
      attributes: ['id'],
    })
    const unitIds = agentUnits.map((u) => u.id)
    const where: Record<string, unknown> = { unit_id: unitIds }
    if (filters.isActive !== undefined) where['is_active'] = filters.isActive === 'true'
    return Tenant.findAll({
      where,
      attributes: { exclude: ["password_hash"] },
      include: [
        {
          model: Unit,
          as: 'unit',
          include: [{ model: Property, as: 'property', attributes: ['id', 'name'] }],
        },
      ],
      order: [['full_name', 'ASC']],
    })
  }

  /**
   * Creates a tenant AND generates a temporary password for mobile app login.
   * The agent sees this password once (in the API response) to share with
   * the tenant manually (WhatsApp, SMS, in person). Tenant is forced to
   * change it on first mobile login via must_change_password flag.
   */
  async create(agentId: string, dto: CreateTenantDto): Promise<TenantCreateResult> {
    const unit = await this.assertAgentOwnsUnit(agentId, dto.unit_id)
    if (unit.status === UnitStatus.OCCUPIED) {
      throw new AppError('Unit is already occupied — vacate existing tenant first', 400)
    }

    // Generate a simple, readable temporary password (6 digits)
    const temporaryPassword = crypto.randomInt(100000, 999999).toString()
    const password_hash = await bcrypt.hash(temporaryPassword, 12)

    const tenant = await Tenant.create({
      ...dto,
      is_active: true,
      password_hash,
      must_change_password: true,
    })
    await unit.update({ status: UnitStatus.OCCUPIED })

    logger.info(`Tenant created — unitId: ${dto.unit_id}, tenantId: ${tenant.id}`)
    return { tenant, temporaryPassword }
  }

  async get(agentId: string, id: string): Promise<Tenant> {
    const tenant = await Tenant.findByPk(id, {
      attributes: { exclude: ["password_hash"] },
      include: [
        {
          model: Unit,
          as: 'unit',
          include: [{ model: Property, as: 'property' }],
        },
        { model: Payment, as: 'payments', limit: 6, order: [['created_at', 'DESC']] },
      ],
    })
    if (!tenant) throw new AppError('Tenant not found', 404)
    const property = (tenant.unit as Unit).property as Property
    if (property.agent_id !== agentId) throw new AppError('Access denied', 403)
    return tenant
  }

  async update(agentId: string, id: string, data: Partial<CreateTenantDto>): Promise<Tenant> {
    const tenant = await Tenant.findByPk(id, {
      include: [{ model: Unit, as: 'unit', include: [{ model: Property, as: 'property' }] }],
    })
    if (!tenant) throw new AppError('Tenant not found', 404)
    const property = (tenant.unit as Unit).property as Property
    if (property.agent_id !== agentId) throw new AppError('Access denied', 403)
    await tenant.update(data)
    return tenant.reload()
  }

  async vacate(agentId: string, id: string): Promise<void> {
    const tenant = await Tenant.findByPk(id, {
      include: [{ model: Unit, as: 'unit', include: [{ model: Property, as: 'property' }] }],
    })
    if (!tenant) throw new AppError('Tenant not found', 404)
    const unit = tenant.unit as Unit
    const property = unit.property as Property
    if (property.agent_id !== agentId) throw new AppError('Access denied', 403)
    await tenant.update({ is_active: false, lease_end: new Date().toISOString().split('T')[0] })
    await unit.update({ status: UnitStatus.VACANT })
    logger.info(`Tenant vacated — tenantId: ${id}, unitId: ${unit.id}`)

    // Notify owner via SMS when their tenant leaves
    try {
      const { OwnerService } = require('@services/OwnerService')
      const ownerSvc = new OwnerService()
      await ownerSvc.notifyVacancy(
        property.owner_id,
        unit.unit_number,
        property.name,
        tenant.full_name
      )
    } catch (err) {
      logger.error('Failed to send vacancy notification to owner:', err)
    }
  }

  // ── Tenant mobile app authentication ──────────────────────────────────────

  /**
   * Tenant login — by phone number + password.
   * Phone is the unique identifier since tenants don't have email.
   */
  async login(phone: string, password: string): Promise<Tenant> {
    const tenant = await Tenant.findOne({
      where: { phone, is_active: true },
      include: [{ model: Unit, as: 'unit', include: [{ model: Property, as: 'property' }] }],
    })
    if (!tenant || !tenant.password_hash) {
      throw new AppError('Invalid phone number or password', 401)
    }

    const valid = await bcrypt.compare(password, tenant.password_hash)
    if (!valid) throw new AppError('Invalid phone number or password', 401)

    await tenant.update({ last_login_at: new Date() })
    logger.info(`Tenant login — tenantId: ${tenant.id}, phone: ${phone}`)
    return tenant
  }

  /**
   * Tenant changes their own password — required on first login.
   */
  async changePassword(tenantId: string, currentPassword: string, newPassword: string): Promise<void> {
    const tenant = await Tenant.findByPk(tenantId)
    if (!tenant || !tenant.password_hash) throw new AppError('Tenant not found', 404)

    const valid = await bcrypt.compare(currentPassword, tenant.password_hash)
    if (!valid) throw new AppError('Current password is incorrect', 401)

    if (newPassword.length < 6) {
      throw new AppError('New password must be at least 6 characters', 400)
    }

    const password_hash = await bcrypt.hash(newPassword, 12)
    await tenant.update({ password_hash, must_change_password: false })
    logger.info(`Tenant changed password — tenantId: ${tenantId}`)
  }

  /**
   * Get tenant's own profile + lease info for mobile app home screen.
   */
  async getOwnProfile(tenantId: string): Promise<Tenant> {
    const tenant = await Tenant.findByPk(tenantId, {
      attributes: { exclude: ["password_hash"] },
      include: [
        {
          model: Unit, as: 'unit',
          include: [{ model: Property, as: 'property' }],
        },
      ],
    })
    if (!tenant) throw new AppError('Tenant not found', 404)
    return tenant
  }

  /**
   * Get tenant's own payment history for mobile app.
   */
  async getOwnPayments(tenantId: string): Promise<Payment[]> {
    return Payment.findAll({
      where: { tenant_id: tenantId, is_voided: false },
      order: [['created_at', 'DESC']],
      limit: 50,
    })
  }
}
