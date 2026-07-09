import { Op } from 'sequelize'
import { Agent, User, Property, Payment, Tenant, Unit } from '@models/index'
import { UserRole } from '@shared-types/auth.types'
import { AppError } from '@middleware/errorHandler'
import { logger } from '@config/logger'

export class AdminService {

  async platformSummary(month?: string): Promise<object> {
    const now = new Date()
    const [year, mon] = month
      ? month.split('-').map(Number)
      : [now.getFullYear(), now.getMonth() + 1]

    const [
      totalAgents, totalProperties, totalUnits, occupiedUnits,
      monthlyPayments, allTimePayments,
    ] = await Promise.all([
      User.count({ where: { role: UserRole.AGENT } }),
      Property.count({ where: { is_active: true } }),
      Unit.count(),
      Unit.count({ where: { status: 'occupied' } }),
      Payment.findAll({ where: { month: mon, year, is_voided: false } }),
      Payment.findAll({ where: { is_voided: false }, attributes: ['waltern_fee'] }),
    ])

    const monthlyGross = monthlyPayments.reduce((s, p) => s + p.gross_amount, 0)
    const monthlyCommission = monthlyPayments.reduce((s, p) => s + p.waltern_fee, 0)
    const allTimeCommission = allTimePayments.reduce((s: number, p) => s + p.waltern_fee, 0)

    return {
      period: { month: mon, year },
      agents: { total: totalAgents },
      properties: { total: totalProperties },
      units: { total: totalUnits, occupied: occupiedUnits, vacant: totalUnits - occupiedUnits },
      financials: {
        monthly_gross: monthlyGross,
        monthly_commission: monthlyCommission,
        all_time_commission: allTimeCommission,
        transaction_count: monthlyPayments.length,
      },
    }
  }

  async listAgents(month?: string): Promise<object[]> {
    const now = new Date()
    const [year, mon] = month
      ? month.split('-').map(Number)
      : [now.getFullYear(), now.getMonth() + 1]

    const users = await User.findAll({
      where: { role: UserRole.AGENT },
      include: [{ model: Agent, as: 'agent' }],
      order: [['created_at', 'DESC']],
    })

    const result = await Promise.all(users.map(async (user: User) => {
      const agent = user.agent as Agent | undefined
      if (!agent) return null

      const [properties, payments] = await Promise.all([
        Property.count({ where: { agent_id: agent.id, is_active: true } }),
        Payment.findAll({
          where: { agent_id: agent.id, month: mon, year, is_voided: false },
          attributes: ['gross_amount', 'waltern_fee'],
        }),
      ])

      const monthlyGross = payments.reduce((s, p) => s + p.gross_amount, 0)
      const monthlyCommission = payments.reduce((s, p) => s + p.waltern_fee, 0)

      return {
        userId: user.id,
        agentId: agent.id,
        fullName: user.full_name,
        email: user.email,
        phone: user.phone,
        businessName: agent.business_name,
        paybillNumber: agent.paybill_number,
        isActive: user.is_active,
        joinedAt: user.created_at,
        stats: {
          properties,
          transactions: payments.length,
          monthly_gross: monthlyGross,
          monthly_commission: monthlyCommission,
        },
      }
    }))

    return result.filter(Boolean) as object[]
  }

  async agentCommission(agentId: string, month?: string): Promise<object> {
    const now = new Date()
    const [year, mon] = month
      ? month.split('-').map(Number)
      : [now.getFullYear(), now.getMonth() + 1]

    const agent = await Agent.findByPk(agentId, {
      include: [{ model: User, as: 'user' }],
    })
    if (!agent) throw new AppError('Agent not found', 404)

    const user = agent.user as User

    const payments = await Payment.findAll({
      where: { agent_id: agentId, month: mon, year, is_voided: false },
      include: [
        { model: Property, as: 'property', attributes: ['id', 'name'] },
        { model: Unit, as: 'unit', attributes: ['id', 'unit_number'] },
        { model: Tenant, as: 'tenant', attributes: ['id', 'full_name'] },
      ],
      order: [['created_at', 'DESC']],
    })

    const totalGross = payments.reduce((s, p) => s + p.gross_amount, 0)
    const totalCommission = payments.reduce((s, p) => s + p.waltern_fee, 0)

    return {
      agent: {
        id: agent.id,
        name: user?.full_name,
        email: user?.email,
        businessName: agent.business_name,
      },
      period: { month: mon, year },
      summary: { total_gross: totalGross, total_commission: totalCommission, transactions: payments.length },
      payments,
    }
  }

  async deactivateAgent(agentId: string): Promise<void> {
    const agent = await Agent.findByPk(agentId, {
      include: [{ model: User, as: 'user' }],
    })
    if (!agent) throw new AppError('Agent not found', 404)
    const user = agent.user as User
    if (!user) throw new AppError('Agent user account not found', 404)
    await user.update({ is_active: false })
    logger.info(`Agent deactivated — agentId: ${agentId}, email: ${user.email}`)
  }

  async reactivateAgent(agentId: string): Promise<void> {
    const agent = await Agent.findByPk(agentId, {
      include: [{ model: User, as: 'user' }],
    })
    if (!agent) throw new AppError('Agent not found', 404)
    const user = agent.user as User
    if (!user) throw new AppError('Agent user account not found', 404)
    await user.update({ is_active: true })
    logger.info(`Agent reactivated — agentId: ${agentId}, email: ${user.email}`)
  }

  async recentPayments(limit = 50): Promise<Payment[]> {
    return Payment.findAll({
      where: { is_voided: false },
      include: [
        { model: Agent, as: 'agent', attributes: ['id', 'business_name'] },
        { model: Property, as: 'property', attributes: ['id', 'name'] },
        { model: Unit, as: 'unit', attributes: ['id', 'unit_number'] },
        { model: Tenant, as: 'tenant', attributes: ['id', 'full_name', 'phone'] },
      ],
      order: [['created_at', 'DESC']],
      limit,
    })
  }

  /**
   * Deactivate agent with reason, admin who did it, and timestamp.
   */
  async deactivateAgentWithReason(
    adminId: string,
    agentId: string,
    reason: string
  ): Promise<void> {
    if (!reason?.trim()) throw new AppError('A reason is required to deactivate an agent', 400)

    const agent = await Agent.findByPk(agentId, {
      include: [{ model: User, as: 'user' }],
    })
    if (!agent) throw new AppError('Agent not found', 404)

    const user = agent.user as User
    if (!user) throw new AppError('Agent user account not found', 404)
    if (!user.is_active) throw new AppError('Agent is already deactivated', 400)

    await user.update({
      is_active: false,
      deactivation_reason: reason.trim(),
      deactivated_by: adminId,
      deactivated_at: new Date(),
    })

    logger.info(
      `Agent deactivated — agentId: ${agentId}, email: ${user.email}, ` +
      `reason: ${reason}, by admin: ${adminId}`
    )
  }

  /**
   * Reactivate a deactivated agent — clears deactivation fields.
   */
  async reactivateAgentById(agentId: string): Promise<void> {
    const agent = await Agent.findByPk(agentId, {
      include: [{ model: User, as: 'user' }],
    })
    if (!agent) throw new AppError('Agent not found', 404)

    const user = agent.user as User
    if (!user) throw new AppError('Agent user account not found', 404)

    await user.update({
      is_active: true,
      deactivation_reason: null,
      deactivated_by: null,
      deactivated_at: null,
    })

    logger.info(`Agent reactivated — agentId: ${agentId}, email: ${user.email}`)
  }

  /**
   * Reset an agent's password — admin sets a temporary password.
   */
  async resetAgentPassword(agentId: string, newPassword: string): Promise<void> {
    if (!newPassword || newPassword.length < 8) {
      throw new AppError('New password must be at least 8 characters', 400)
    }

    const agent = await Agent.findByPk(agentId, {
      include: [{ model: User, as: 'user' }],
    })
    if (!agent) throw new AppError('Agent not found', 404)

    const user = agent.user as User
    const bcrypt = require('bcrypt')
    const password_hash = await bcrypt.hash(newPassword, 12)
    await user.update({ password_hash })

    logger.info(`Password reset by admin — agentId: ${agentId}, email: ${user.email}`)
  }

  /**
   * Get single agent profile with full details.
   */
  async getAgentProfile(agentId: string): Promise<object> {
    const agent = await Agent.findByPk(agentId, {
      include: [{ model: User, as: 'user' }],
    })
    if (!agent) throw new AppError('Agent not found', 404)

    const user = agent.user as User

    const [properties, totalPayments, allTimeCommission] = await Promise.all([
      Property.findAll({
        where: { agent_id: agentId, is_active: true },
        include: [{ model: Unit, as: 'units', attributes: ['id', 'status'] }],
      }),
      Payment.count({ where: { agent_id: agentId, is_voided: false } }),
      Payment.sum('waltern_fee', { where: { agent_id: agentId, is_voided: false } }),
    ])

    return {
      agent: {
        id: agent.id,
        fullName: user?.full_name,
        email: user?.email,
        phone: user?.phone,
        businessName: agent.business_name,
        paybillNumber: agent.paybill_number,
        isActive: user?.is_active,
        joinedAt: user?.created_at,
        lastLoginAt: (user as any)?.last_login_at,
        deactivationReason: (user as any)?.deactivation_reason,
        deactivatedAt: (user as any)?.deactivated_at,
      },
      stats: {
        totalProperties: properties.length,
        totalUnits: properties.reduce((s: number, p: any) => s + (p.units?.length ?? 0), 0),
        occupiedUnits: properties.reduce((s: number, p: any) =>
          s + (p.units?.filter((u: any) => u.status === 'occupied').length ?? 0), 0),
        totalTransactions: totalPayments,
        allTimeCommission: allTimeCommission ?? 0,
      },
    }
  }

  /**
   * Search users across all roles — agents, owners, tenants.
   */
  async searchUsers(query: string, role?: string): Promise<object[]> {
    const { Op } = require('sequelize')

    const where: Record<string, unknown> = {
      [Op.or]: [
        { full_name: { [Op.iLike]: `%${query}%` } },
        { email: { [Op.iLike]: `%${query}%` } },
        { phone: { [Op.iLike]: `%${query}%` } },
      ],
    }

    if (role) where['role'] = role

    const users = await User.findAll({
      where,
      attributes: ['id', 'full_name', 'email', 'phone', 'role', 'is_active', 'created_at', 'last_login_at'],
      limit: 50,
      order: [['created_at', 'DESC']],
    })

    return users.map(u => u.toJSON())
  }

  /**
   * Platform-wide stats for dashboard — agents, landlords, tenants, properties.
   */
  async dashboardStats(): Promise<object> {
    const { Owner, Tenant } = require('@models/index')
    const { UserRole } = require('@shared-types/auth.types')

    const [
      totalAgents, activeAgents, deactivatedAgents,
      totalOwners, totalTenants, totalProperties,
      totalTransactions,
    ] = await Promise.all([
      User.count({ where: { role: UserRole.AGENT } }),
      User.count({ where: { role: UserRole.AGENT, is_active: true } }),
      User.count({ where: { role: UserRole.AGENT, is_active: false } }),
      User.count({ where: { role: UserRole.OWNER } }),
      Tenant.count({ where: { is_active: true } }),
      Property.count({ where: { is_active: true } }),
      Payment.count({ where: { is_voided: false } }),
    ])

    return {
      agents: { total: totalAgents, active: activeAgents, deactivated: deactivatedAgents },
      owners: { total: totalOwners },
      tenants: { total: totalTenants },
      properties: { total: totalProperties },
      transactions: { total: totalTransactions },
    }
  }

  /**
   * Recent activity feed — cross-platform events.
   */
  async recentActivity(limit = 30): Promise<object[]> {
    // Pull recent payments as activity events
    const payments = await Payment.findAll({
      where: { is_voided: false },
      include: [
        { model: Agent, as: 'agent', attributes: ['id', 'business_name'] },
        { model: Tenant, as: 'tenant', attributes: ['id', 'full_name'] },
        { model: Property, as: 'property', attributes: ['id', 'name'] },
      ],
      order: [['created_at', 'DESC']],
      limit,
    })

    // Pull recent registrations
    const recentUsers = await User.findAll({
      attributes: ['id', 'full_name', 'email', 'role', 'is_active', 'created_at'],
      order: [['created_at', 'DESC']],
      limit: 10,
    })

    const paymentEvents = payments.map((p: any) => ({
      type: 'payment',
      id: p.id,
      title: `Payment received — KES ${p.gross_amount.toLocaleString()}`,
      subtitle: `${(p.tenant as any)?.full_name ?? 'Unknown'} → ${(p.property as any)?.name}`,
      meta: `Agent: ${(p.agent as any)?.business_name ?? '—'}`,
      timestamp: p.created_at,
      amount: p.gross_amount,
      fee: p.waltern_fee,
    }))

    const registrationEvents = recentUsers.map((u: any) => ({
      type: 'registration',
      id: u.id,
      title: `New ${u.role} registered`,
      subtitle: u.full_name,
      meta: u.email,
      timestamp: u.created_at,
    }))

    return [...paymentEvents, ...registrationEvents]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit)
  }
  /**
   * List all owners across the platform with their property count.
   */
  async listOwners(): Promise<object[]> {
    const { Owner, Property, User } = require('@models/index')
    const owners = await Owner.findAll({
      include: [{ model: Property, as: 'properties', attributes: ['id', 'name'] }],
      order: [['created_at', 'DESC']],
    })
    return owners.map((o: any) => ({
      id: o.id,
      fullName: o.full_name,
      phone: o.phone,
      email: o.email,
      agentId: o.agent_id,
      propertyCount: o.properties?.length ?? 0,
      properties: o.properties?.map((p: any) => ({ id: p.id, name: p.name })) ?? [],
      joinedAt: o.created_at,
      hasPortalAccess: !!o.password_hash,
    }))
  }

  async deleteOwner(ownerId: string): Promise<void> {
    const { Owner, Property } = require('@models/index')
    const owner = await Owner.findByPk(ownerId)
    if (!owner) throw new AppError('Owner not found', 404)
    // Unlink properties from this owner before deleting
    await Property.update({ owner_id: null }, { where: { owner_id: ownerId } })
    await owner.destroy()
    logger.info('Owner deleted by admin — ownerId: ' + ownerId)
  }

  /**
   * Permanently delete an agent and ALL their data.
   * Cascades in correct order to avoid FK constraint violations:
   * STK requests → Payments → ReminderLogs → OwnerReports → Units → 
   * UnitTypeGroups → Tenants → Properties → Owners → Agent → User
   */
  async deleteAgent(agentId: string): Promise<void> {
    const {
      Agent, User, Property, Unit, UnitTypeGroup, Tenant,
      Payment, Owner, StkRequest, OwnerReport, ReminderLog,
    } = require('@models/index')

    const agent = await Agent.findByPk(agentId, {
      include: [{ model: User, as: 'user' }],
    })
    if (!agent) throw new AppError('Agent not found', 404)

    const user = agent.user as any
    const properties = await Property.findAll({ where: { agent_id: agentId }, attributes: ['id'] })
    const propertyIds = properties.map((p: any) => p.id)

    if (propertyIds.length > 0) {
      const units = await Unit.findAll({ where: { property_id: propertyIds }, attributes: ['id'] })
      const unitIds = units.map((u: any) => u.id)

      if (unitIds.length > 0) {
        await Tenant.update({ unit_id: null }, { where: { unit_id: unitIds } }).catch(() => {})
        await Tenant.destroy({ where: { unit_id: unitIds } }).catch(() => {})
        await ReminderLog.destroy({ where: { unit_id: unitIds } }).catch(() => {})
      }

      await StkRequest.destroy({ where: { agent_id: agentId } }).catch(() => {})
      await Payment.destroy({ where: { agent_id: agentId } }).catch(() => {})
      await OwnerReport.destroy({ where: { property_id: propertyIds } }).catch(() => {})
      await Unit.destroy({ where: { property_id: propertyIds } }).catch(() => {})
      await UnitTypeGroup.destroy({ where: { property_id: propertyIds } }).catch(() => {})
      await Property.destroy({ where: { agent_id: agentId } }).catch(() => {})
    }

    await Owner.update({ agent_id: null }, { where: { agent_id: agentId } }).catch(() => {})
    await agent.destroy()
    if (user) await user.destroy()

    logger.info('Agent permanently deleted — agentId: ' + agentId)
  }

}