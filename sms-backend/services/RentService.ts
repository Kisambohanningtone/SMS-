import { UnitTypeGroup, Unit, Property, Owner, Payment, Tenant } from '@models/index'
import { UnitStatus } from '@models/Unit'
import { AppError } from '@middleware/errorHandler'
import { logger } from '@config/logger'

export interface CreateUnitTypeGroupDto {
  name: string
  rent_amount: number
  unit_count: number
  unit_prefix?: string
  starting_number?: number
  sort_order?: number
}

export interface UpdateRentDto {
  rent_amount: number
}

export type PaymentStatus = 'paid' | 'partial' | 'unpaid' | 'vacant'

export class RentService {

  /**
   * Verifies the requesting user is authorised to modify rent configuration
   * for this property — either:
   *   (a) the verified property OWNER (their Owner record's user_id matches
   *       the logged-in user, and that Owner record is the property's owner), OR
   *   (b) the AGENT who manages this property (property.agent_id matches
   *       the agent record linked to the logged-in user)
   *
   * In practice, most properties are configured by the agent during
   * onboarding — owners rarely log in themselves. Both roles are trusted
   * to set rent; tenants and other agents are not.
   */
  private async assertCanManageRent(userId: string, propertyId: string): Promise<Property> {
    const property = await Property.findByPk(propertyId)
    if (!property) throw new AppError('Property not found', 404)

    // Allow: the agent managing this property
    const { Agent } = await import('@models/index')
    const agent = await Agent.findOne({ where: { user_id: userId } })
    if (agent && agent.id === property.agent_id) return property

    // Allow: the verified owner of this property
    const owner = await Owner.findOne({ where: { user_id: userId } })
    if (owner && owner.id === property.owner_id) return property

    throw new AppError('Access denied — only the managing agent or property owner can modify rent', 403)
  }

  private async assertAgentOwnsProperty(agentId: string, propertyId: string): Promise<Property> {
    const property = await Property.findOne({ where: { id: propertyId, agent_id: agentId } })
    if (!property) throw new AppError('Property not found or access denied', 404)
    return property
  }

  // ── Owner: define the rent strategy for a property ───────────────────────────
  /**
   * Creates a new rent tier (e.g. "Bedsitter — 20 units @ KES 30") and
   * auto-generates the units assigned to it. Owner-only.
   */
  async createUnitTypeGroup(
    userId: string,
    propertyId: string,
    dto: CreateUnitTypeGroupDto
  ): Promise<UnitTypeGroup> {
    await this.assertCanManageRent(userId, propertyId)

    if (dto.rent_amount < 0) throw new AppError('Rent amount cannot be negative', 400)
    if (dto.unit_count < 1 || dto.unit_count > 200) {
      throw new AppError('Unit count must be between 1 and 200', 400)
    }

    const group = await UnitTypeGroup.create({
      property_id: propertyId,
      name: dto.name,
      rent_amount: dto.rent_amount,
      sort_order: dto.sort_order ?? 0,
    })

    // Auto-generate units for this tier
    const prefix = dto.unit_prefix ?? dto.name
    const start = dto.starting_number ?? 1
    const units = []
    for (let i = 0; i < dto.unit_count; i++) {
      units.push({
        property_id: propertyId,
        unit_type_group_id: group.id,
        unit_number: `${prefix} ${start + i}`,
        status: UnitStatus.VACANT,
      })
    }
    await Unit.bulkCreate(units)

    logger.info(
      `UnitTypeGroup created — property: ${propertyId}, name: ${dto.name}, ` +
      `rent: ${dto.rent_amount}, units: ${dto.unit_count}`
    )
    return group
  }

  /**
   * Updates the rent for an existing tier. Every unit in this group
   * picks up the new rent_amount immediately on next read — no per-unit
   * update needed, no separate sync step. The agent dashboard reflects
   * this the moment it next queries unit data.
   */
  async updateRent(userId: string, groupId: string, dto: UpdateRentDto): Promise<UnitTypeGroup> {
    const group = await UnitTypeGroup.findByPk(groupId)
    if (!group) throw new AppError('Rent tier not found', 404)

    await this.assertCanManageRent(userId, group.property_id)

    if (dto.rent_amount < 0) throw new AppError('Rent amount cannot be negative', 400)

    const oldRent = group.rent_amount
    await group.update({ rent_amount: dto.rent_amount })

    logger.info(
      `Rent updated — group: ${group.name} (${groupId}), ` +
      `${oldRent} -> ${dto.rent_amount}`
    )
    return group.reload()
  }

  /** List all rent tiers for a property — owner or agent can view */
  async listUnitTypeGroups(propertyId: string): Promise<UnitTypeGroup[]> {
    return UnitTypeGroup.findAll({
      where: { property_id: propertyId },
      order: [['sort_order', 'ASC'], ['created_at', 'ASC']],
      include: [{ model: Unit, as: 'units', attributes: ['id', 'unit_number', 'status'] }],
    })
  }

  async deleteUnitTypeGroup(userId: string, groupId: string): Promise<void> {
    const group = await UnitTypeGroup.findByPk(groupId, {
      include: [{ model: Unit, as: 'units' }],
    })
    if (!group) throw new AppError('Rent tier not found', 404)

    await this.assertCanManageRent(userId, group.property_id)

    const allUnits = (group.units as Unit[]) ?? []
    const occupied = allUnits.filter(u => u.status === UnitStatus.OCCUPIED)
    if (occupied.length > 0) {
      throw new AppError(
        `Cannot delete "${group.name}" — ${occupied.length} of its ${allUnits.length} unit(s) ` +
        `are occupied. Vacate all tenants in this tier first.`,
        400
      )
    }

    await group.destroy()
    logger.info(`UnitTypeGroup deleted — id: ${groupId}, units affected: ${allUnits.length}`)
  }

  // ── Agent: read-only payment status dashboard ─────────────────────────────────
  /**
   * Returns every unit in the property with its current rent (from the
   * unit's group, or the property default_rent if ungrouped), and the
   * payment status for the given month — paid / partial / unpaid / vacant.
   *
   * This is the view an agent sees: "C45 has paid, C78 has not paid,
   * C21 paid partially, C30 has a rent balance."
   */
  async getPaymentStatusBoard(
    agentId: string,
    propertyId: string,
    month?: string
  ): Promise<object> {
    const property = await this.assertAgentOwnsProperty(agentId, propertyId)

    const now = new Date()
    const [year, mon] = month
      ? month.split('-').map(Number)
      : [now.getFullYear(), now.getMonth() + 1]

    const units = await Unit.findAll({
      where: { property_id: propertyId },
      include: [
        { model: UnitTypeGroup, as: 'unit_type_group', attributes: ['id', 'name', 'rent_amount'] },
        { model: Tenant, as: 'tenants', where: { is_active: true }, required: false, attributes: ['id', 'full_name', 'phone'] },
      ],
      order: [['unit_number', 'ASC']],
    })

    const payments = await Payment.findAll({
      where: { property_id: propertyId, month: mon, year },
    })
    const paidByUnit = new Map<string, number>()
    for (const p of payments) {
      paidByUnit.set(p.unit_id, (paidByUnit.get(p.unit_id) ?? 0) + p.gross_amount)
    }

    const board = units.map(unit => {
      const group = unit.unit_type_group as UnitTypeGroup | undefined
      const rentDue = group?.rent_amount ?? property.default_rent
      const paid = paidByUnit.get(unit.id) ?? 0
      const tenant = (unit.tenants as Tenant[] | undefined)?.[0]

      let status: PaymentStatus
      if (unit.status === UnitStatus.VACANT) {
        status = 'vacant'
      } else if (paid <= 0) {
        status = 'unpaid'
      } else if (paid < rentDue) {
        status = 'partial'
      } else {
        status = 'paid'
      }

      return {
        unit_id: unit.id,
        unit_number: unit.unit_number,
        floor: unit.floor,
        rent_type: group?.name ?? 'Default',
        rent_due: rentDue,
        amount_paid: paid,
        balance: Math.max(rentDue - paid, 0),
        status,
        tenant: tenant ? { id: tenant.id, name: tenant.full_name, phone: tenant.phone } : null,
      }
    })

    const summary = {
      total_units: board.length,
      paid: board.filter(u => u.status === 'paid').length,
      partial: board.filter(u => u.status === 'partial').length,
      unpaid: board.filter(u => u.status === 'unpaid').length,
      vacant: board.filter(u => u.status === 'vacant').length,
      total_expected: board.reduce((s: number, u: typeof board[number]) => s + (u.status !== 'vacant' ? u.rent_due : 0), 0),
      total_collected: board.reduce((s: number, u: typeof board[number]) => s + u.amount_paid, 0),
    }

    return {
      property: { id: property.id, name: property.name },
      period: { month: mon, year },
      summary,
      units: board,
    }
  }
}
