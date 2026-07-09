import { Property, Unit, Owner, Payment, Maintenance, UnitTypeGroup } from '@models/index'
import { UnitStatus } from '@models/Unit'
import { AppError } from '@middleware/errorHandler'
import { logger } from '@config/logger'

export interface CreatePropertyDto {
  owner_id: string
  name: string
  location: string
  default_rent?: number
  color_hex?: string
  payment_method?: string
}

export interface UpdatePropertyDto {
  name?: string
  location?: string
  default_rent?: number
  color_hex?: string
  payment_method?: string
  is_active?: boolean
}

export class PropertyService {

  async list(agentId: string): Promise<Property[]> {
    return Property.findAll({
      where: { agent_id: agentId, is_active: true },
      include: [
        { model: Owner, as: 'owner', attributes: ['id', 'full_name', 'phone'] },
        { model: Unit, as: 'units', attributes: ['id', 'unit_number', 'status', 'floor'] },
        { model: UnitTypeGroup, as: 'unit_type_groups', attributes: ['id', 'name', 'rent_amount'] },
      ],
      order: [['created_at', 'DESC']],
    })
  }

  /**
   * Creates a property shell only. Rent tiers and units are added
   * afterward by the owner via RentService.createUnitTypeGroup —
   * this allows properties with mixed rent amounts (e.g. 20 units
   * @ KES 30, 10 units @ KES 12, 10 units @ KES 50).
   */
  async create(agentId: string, dto: CreatePropertyDto): Promise<Property> {
    const owner = await Owner.findOne({ where: { id: dto.owner_id, agent_id: agentId } })
    if (!owner) throw new AppError('Owner not found or does not belong to you', 404)

    const property = await Property.create({
      agent_id: agentId,
      owner_id: dto.owner_id,
      name: dto.name,
      location: dto.location,
      default_rent: dto.default_rent ?? 0,
      color_hex: dto.color_hex ?? '2563EB',
      payment_method: dto.payment_method ?? 'kopokopo',
      is_active: true,
    })

    logger.info(`Property created — id: ${property.id}, owner: ${dto.owner_id}`)
    return this.get(agentId, property.id)
  }

  async get(agentId: string, id: string): Promise<Property> {
    const property = await Property.findOne({
      where: { id, agent_id: agentId },
      include: [
        { model: Owner, as: 'owner', attributes: ['id', 'full_name', 'phone', 'email', 'mpesa_number'] },
        {
          model: UnitTypeGroup, as: 'unit_type_groups',
          attributes: ['id', 'name', 'rent_amount', 'sort_order'],
          order: [['sort_order', 'ASC']],
        },
        {
          model: Unit, as: 'units',
          attributes: ['id', 'unit_number', 'status', 'floor', 'unit_type_group_id'],
        },
      ],
    })
    if (!property) throw new AppError('Property not found', 404)
    return property
  }

  async update(agentId: string, id: string, dto: UpdatePropertyDto): Promise<Property> {
    const property = await Property.findOne({ where: { id, agent_id: agentId } })
    if (!property) throw new AppError('Property not found', 404)
    await property.update(dto)
    return this.get(agentId, id)
  }

  async remove(agentId: string, id: string): Promise<void> {
    const property = await Property.findOne({
      where: { id, agent_id: agentId },
      include: [{
        model: Unit, as: 'units',
        where: { status: UnitStatus.OCCUPIED },
        required: false,
      }],
    })
    if (!property) throw new AppError('Property not found', 404)

    const occupiedUnits = (property.units as Unit[]) ?? []
    if (occupiedUnits.length > 0) {
      throw new AppError(
        `Cannot delete property with ${occupiedUnits.length} occupied unit(s) — vacate all tenants first`,
        400
      )
    }

    await property.update({ is_active: false })
    logger.info(`Property deactivated — id: ${id}`)
  }

  /**
   * Per-property collection summary. total_expected sums each occupied
   * unit's rent from its UnitTypeGroup (or default_rent if ungrouped) —
   * correctly handling properties with mixed rent tiers.
   */
  async summary(agentId: string, propertyId: string, month?: string): Promise<object> {
    const property = await Property.findOne({
      where: { id: propertyId, agent_id: agentId },
    })
    if (!property) throw new AppError('Property not found', 404)

    const now = new Date()
    const [year, mon] = month
      ? month.split('-').map(Number)
      : [now.getFullYear(), now.getMonth() + 1]

    const units = await Unit.findAll({
      where: { property_id: propertyId },
      include: [{ model: UnitTypeGroup, as: 'unit_type_group', attributes: ['rent_amount'] }],
    })

    const totalUnits = units.length
    const occupiedUnits = units.filter((u: Unit) => u.status === UnitStatus.OCCUPIED)
    const vacantUnits = totalUnits - occupiedUnits.length

    const totalExpected = occupiedUnits.reduce((sum: number, u: Unit) => {
      const group = u.unit_type_group as UnitTypeGroup | undefined
      return sum + (group?.rent_amount ?? property.default_rent)
    }, 0)

    const payments = await Payment.findAll({
      where: { property_id: propertyId, month: mon, year },
    })
    const totalCollected = payments.reduce((sum: number, p: Payment) => sum + p.gross_amount, 0)
    const walternFee = payments.reduce((sum: number, p: Payment) => sum + p.waltern_fee, 0)

    const maintenance = await Maintenance.findAll({
      where: { property_id: propertyId, month: mon, year },
    })
    const maintenanceCost = maintenance.reduce((sum: number, m: Maintenance) => sum + m.amount, 0)

    return {
      property: { id: property.id, name: property.name },
      period: { month: mon, year },
      units: { total: totalUnits, occupied: occupiedUnits.length, vacant: vacantUnits },
      financials: {
        expected: totalExpected,
        collected: totalCollected,
        waltern_fee: walternFee,
        maintenance: maintenanceCost,
        net_to_owner: totalCollected - walternFee - maintenanceCost,
        collection_rate: totalExpected > 0
          ? Math.round((totalCollected / totalExpected) * 100)
          : 0,
      },
    }
  }
}