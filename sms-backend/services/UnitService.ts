import { Unit, Property, Tenant, Payment } from '@models/index'
import { UnitStatus } from '@models/Unit'
import { AppError } from '@middleware/errorHandler'
import { logger } from '@config/logger'

export interface GenerateUnitsDto {
  count: number
  prefix?: string
  startNumber?: number
  floor?: string
}

export class UnitService {
  private async assertAgentOwnsProperty(agentId: string, propertyId: string): Promise<Property> {
    const property = await Property.findOne({ where: { id: propertyId, agent_id: agentId } })
    if (!property) throw new AppError('Property not found or access denied', 404)
    return property
  }

  async list(agentId: string, propertyId: string, month?: string): Promise<Unit[]> {
    await this.assertAgentOwnsProperty(agentId, propertyId)

    return Unit.findAll({
      where: { property_id: propertyId },
      include: [
        {
          model: Tenant,
          as: 'tenants',
          where: { is_active: true },
          required: false,
          attributes: ['id', 'full_name', 'phone'],
        },
      ],
      order: [['unit_number', 'ASC']],
    })
  }

  async generate(agentId: string, propertyId: string, dto: GenerateUnitsDto): Promise<Unit[]> {
    await this.assertAgentOwnsProperty(agentId, propertyId)

    const { count, prefix = 'Unit', startNumber = 1, floor } = dto
    const units: Unit[] = []

    for (let i = 0; i < count; i++) {
      const unit_number = `${prefix} ${startNumber + i}`
      const [unit] = await Unit.findOrCreate({
        where: { property_id: propertyId, unit_number },
        defaults: {
          property_id: propertyId,
          unit_number,
          floor: floor ?? null,
          status: UnitStatus.VACANT,
        },
      })
      units.push(unit)
    }

    logger.info(`Generated ${units.length} units for property ${propertyId}`)
    return units
  }

  async get(agentId: string, id: string): Promise<Unit> {
    const unit = await Unit.findByPk(id, {
      include: [
        { model: Property, as: 'property' },
        {
          model: Tenant,
          as: 'tenants',
          where: { is_active: true },
          required: false,
        },
        { model: Payment, as: 'payments', limit: 6, order: [['created_at', 'DESC']] },
      ],
    })
    if (!unit) throw new AppError('Unit not found', 404)

    const property = unit.property as Property
    if (property.agent_id !== agentId) throw new AppError('Access denied', 403)

    return unit
  }

  async update(agentId: string, id: string, data: Partial<Unit>): Promise<Unit> {
    const unit = await Unit.findByPk(id, {
      include: [{ model: Property, as: 'property' }],
    })
    if (!unit) throw new AppError('Unit not found', 404)

    const property = unit.property as Property
    if (property.agent_id !== agentId) throw new AppError('Access denied', 403)

    await unit.update(data)
    return unit.reload()
  }

  async remove(agentId: string, id: string): Promise<void> {
    const unit = await Unit.findByPk(id, {
      include: [
        { model: Property, as: 'property' },
        { model: Tenant, as: 'tenants', where: { is_active: true }, required: false },
      ],
    })
    if (!unit) throw new AppError('Unit not found', 404)

    const property = unit.property as Property
    if (property.agent_id !== agentId) throw new AppError('Access denied', 403)

    const activeTenants = (unit.tenants as Tenant[]) ?? []
    if (activeTenants.length > 0) {
      throw new AppError('Cannot delete unit with active tenant — vacate first', 400)
    }

    const paymentCount = await Payment.count({ where: { unit_id: id } })
    if (paymentCount > 0) {
      throw new AppError(
        `Cannot delete unit — it has ${paymentCount} payment record(s) on file. ` +
        `Units with payment history are kept for accounting records.`,
        400
      )
    }

    await unit.destroy()
    logger.info(`Unit deleted — id: ${id}`)
  }
}
