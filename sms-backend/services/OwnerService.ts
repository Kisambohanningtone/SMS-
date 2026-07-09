import bcrypt from 'bcrypt'
import { Owner, Property, Unit, UnitTypeGroup, Payment, Tenant } from '@models/index'
import { AppError } from '@middleware/errorHandler'
import { logger } from '@config/logger'
import { NotificationService } from '@services/NotificationService'

const notif = new NotificationService()

export class OwnerService {

  // ── Authentication ─────────────────────────────────────────────────────────

  async login(phone: string, password: string): Promise<Owner> {
    // Find all owners with this phone, pick the one whose password matches
    const { Op } = require('sequelize')
    const owners = await Owner.findAll({
      where: { phone, password_hash: { [Op.ne]: null } },
      order: [['created_at', 'DESC']],
    })
    if (!owners.length) {
      throw new AppError('Invalid phone number or password', 401)
    }
    // Try each owner until we find one whose password matches
    let owner = null
    for (const o of owners) {
      const valid = await bcrypt.compare(password, o.password_hash as string)
      if (valid) { owner = o; break }
    }
    if (!owner) {
      throw new AppError('Invalid phone number or password', 401)
    }
    const valid = await bcrypt.compare(password, owner.password_hash as string)
    if (!valid) throw new AppError('Invalid phone number or password', 401)

    await owner.update({ last_login_at: new Date() })
    logger.info(`Owner login — ownerId: ${owner.id}, phone: ${phone}`)
    return owner
  }

  async changePassword(ownerId: string, currentPassword: string, newPassword: string): Promise<void> {
    const owner = await Owner.findByPk(ownerId)
    if (!owner || !owner.password_hash) throw new AppError('Owner not found', 404)

    const valid = await bcrypt.compare(currentPassword, owner.password_hash)
    if (!valid) throw new AppError('Current password is incorrect', 401)
    if (newPassword.length < 6) throw new AppError('New password must be at least 6 characters', 400)

    const password_hash = await bcrypt.hash(newPassword, 12)
    await owner.update({ password_hash, must_change_password: false })
    logger.info(`Owner changed password — ownerId: ${ownerId}`)
  }

  // ── Profile ────────────────────────────────────────────────────────────────

  async getProfile(ownerId: string): Promise<Owner> {
    const owner = await Owner.findByPk(ownerId, {
      attributes: { exclude: ['password_hash'] },
    })
    if (!owner) throw new AppError('Owner not found', 404)
    return owner
  }

  // ── Properties ─────────────────────────────────────────────────────────────

  async getProperties(ownerId: string): Promise<Property[]> {
    return Property.findAll({
      where: { owner_id: ownerId, is_active: true },
      include: [
        {
          model: UnitTypeGroup, as: 'unit_type_groups',
          attributes: ['id', 'name', 'rent_amount', 'sort_order'],
          include: [{
            model: Unit, as: 'units',
            attributes: ['id', 'unit_number', 'status'],
            include: [{
              model: Tenant, as: 'tenants',
              attributes: ['id', 'full_name', 'phone', 'lease_start'],
              where: { is_active: true },
              required: false,
            }],
          }],
        },
      ],
      order: [['created_at', 'DESC']],
    })
  }

  async getPropertyDetail(ownerId: string, propertyId: string): Promise<Property> {
    const property = await Property.findOne({
      where: { id: propertyId, owner_id: ownerId, is_active: true },
      include: [
        {
          model: UnitTypeGroup, as: 'unit_type_groups',
          include: [{
            model: Unit, as: 'units',
            include: [{
              model: Tenant, as: 'tenants',
              where: { is_active: true },
              required: false,
            }],
          }],
        },
      ],
    })
    if (!property) throw new AppError('Property not found', 404)
    return property
  }

  // ── Rent management ────────────────────────────────────────────────────────

  /**
   * Owner updates the rent amount for a unit type group.
   * This is the ONLY place rent can be changed — agents have no access to this.
   */
  async updateRentAmount(ownerId: string, groupId: string, rentAmount: number): Promise<UnitTypeGroup> {
    if (rentAmount < 1) throw new AppError('Rent amount must be at least KES 1', 400)

    // Verify ownership — only the owner of the property can update rent
    const group = await UnitTypeGroup.findByPk(groupId, {
      include: [{ model: Property, as: 'property' }],
    })
    if (!group) throw new AppError('Rent group not found', 404)

    const property = group.property as Property
    if (property.owner_id !== ownerId) {
      throw new AppError('Access denied — this rent group does not belong to your property', 403)
    }

    await group.update({ rent_amount: rentAmount })
    logger.info(`Rent updated by owner — groupId: ${groupId}, newAmount: ${rentAmount}, ownerId: ${ownerId}`)
    return group
  }

  // ── Payments ───────────────────────────────────────────────────────────────

  async getPayments(ownerId: string, month?: string): Promise<object> {
    const properties = await Property.findAll({
      where: { owner_id: ownerId, is_active: true },
      attributes: ['id', 'name'],
    })
    const propertyIds = properties.map(p => p.id)

    const where: Record<string, unknown> = { property_id: propertyIds, is_voided: false }
    if (month) {
      const [year, mon] = month.split('-').map(Number)
      where['month'] = mon
      where['year'] = year
    }

    const payments = await Payment.findAll({
      where,
      include: [
        { model: Property, as: 'property', attributes: ['id', 'name'] },
        { model: Unit, as: 'unit', attributes: ['id', 'unit_number'] },
        { model: Tenant, as: 'tenants', attributes: ['id', 'full_name'] },
      ],
      order: [['created_at', 'DESC']],
      limit: 100,
    })

    const totalGross = payments.reduce((s, p) => s + p.gross_amount, 0)
    const totalWalternFee = payments.reduce((s, p) => s + p.waltern_fee, 0)
    const totalAgentFee = payments.reduce((s, p) => s + (p.gross_amount - p.waltern_fee - p.agent_amount), 0)
    const netToOwner = totalGross - totalWalternFee - totalAgentFee

    return {
      summary: { totalGross, totalWalternFee, totalAgentFee, netToOwner, count: payments.length },
      payments,
    }
  }

  // ── Notifications ──────────────────────────────────────────────────────────

  /**
   * Called by TenantService.vacate() — notifies owner via SMS when
   * their tenant leaves.
   */
  async notifyVacancy(ownerId: string, unitNumber: string, propertyName: string, tenantName: string): Promise<void> {
    const owner = await Owner.findByPk(ownerId)
    if (!owner?.phone) return

    const message =
      `Waltern Tech: Your tenant ${tenantName} has vacated unit ${unitNumber} ` +
      `at ${propertyName}. The unit is now vacant. ` +
      `Please log in to the Owner Portal for details.`

    try {
      await notif.sendSms(owner.phone, message)
      logger.info(`Vacancy SMS sent to owner ${ownerId} for unit ${unitNumber}`)
    } catch (err) {
      logger.error(`Failed to send vacancy SMS to owner ${ownerId}:`, err)
    }
  }

  // ── Setup password (called when agent creates owner) ──────────────────────

  async setupPassword(ownerId: string, temporaryPassword: string): Promise<void> {
    const password_hash = await bcrypt.hash(temporaryPassword, 12)
    await Owner.update(
      { password_hash, must_change_password: true },
      { where: { id: ownerId } }
    )
  }

  // ── Agent-facing owner management ─────────────────────────────────────────

  async list(agentId: string): Promise<Owner[]> {
    return Owner.findAll({
      where: { agent_id: agentId },
      attributes: { exclude: ['password_hash'] },
      order: [['full_name', 'ASC']],
    })
  }

  async create(agentId: string, dto: {
    full_name: string
    phone: string
    email?: string
    mpesa_number?: string
  }): Promise<{ owner: Owner; temporaryPassword: string }> {
    const crypto = require('crypto')
    const temporaryPassword = crypto.randomInt(100000, 999999).toString()
    const password_hash = await bcrypt.hash(temporaryPassword, 12)

    const owner = await Owner.create({
      ...dto,
      agent_id: agentId,
      must_change_password: true,
    })
    await Owner.update({ password_hash }, { where: { id: owner.id } })
    await owner.reload()

    logger.info(`Owner created — ownerId: ${owner.id}, agentId: ${agentId}`)
    return { owner, temporaryPassword }
  }

  async update(agentId: string, ownerId: string, dto: {
    full_name?: string
    phone?: string
    email?: string
    mpesa_number?: string
  }): Promise<Owner> {
    const owner = await Owner.findOne({ where: { id: ownerId, agent_id: agentId } })
    if (!owner) throw new AppError('Owner not found', 404)
    await owner.update(dto)
    return owner.reload()
  }
  async getReports(ownerId: string): Promise<object[]> {
    const { OwnerReport, Property } = require('@models/index')
    const properties = await Property.findAll({
      where: { owner_id: ownerId, is_active: true },
      attributes: ['id'],
    })
    const propertyIds = properties.map((p: any) => p.id)
    if (!propertyIds.length) return []
    return OwnerReport.findAll({
      where: { property_id: propertyIds },
      include: [{ model: Property, as: 'property', attributes: ['id', 'name', 'location'] }],
      order: [['created_at', 'DESC']],
    })
  }

}