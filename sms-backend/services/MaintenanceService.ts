import { Maintenance, Property } from '@models/index'
import { AppError } from '@middleware/errorHandler'
import { logger } from '@config/logger'

export interface CreateMaintenanceDto {
  property_id: string
  unit_id?: string
  description: string
  amount: number
  month: number
  year: number
  receipt_url?: string
}

export class MaintenanceService {
  private async assertOwnership(agentId: string, propertyId: string): Promise<void> {
    const property = await Property.findOne({ where: { id: propertyId, agent_id: agentId } })
    if (!property) throw new AppError('Property not found or access denied', 404)
  }

  async list(agentId: string, filters: Record<string, unknown>): Promise<Maintenance[]> {
    const where: Record<string, unknown> = {}

    if (filters.propertyId) {
      await this.assertOwnership(agentId, filters.propertyId as string)
      where['property_id'] = filters.propertyId
    }
    if (filters.month) where['month'] = filters.month
    if (filters.year) where['year'] = filters.year

    // Filter by agent's properties
    const agentProperties = await Property.findAll({
      where: { agent_id: agentId },
      attributes: ['id'],
    })
    const propertyIds = agentProperties.map((p) => p.id)

    return Maintenance.findAll({
      where: { ...where, property_id: propertyIds },
      include: [{ model: Property, as: 'property', attributes: ['id', 'name'] }],
      order: [['created_at', 'DESC']],
    })
  }

  async create(agentId: string, dto: CreateMaintenanceDto): Promise<Maintenance> {
    await this.assertOwnership(agentId, dto.property_id)

    const item = await Maintenance.create({
      ...dto,
      created_by: agentId,
    })

    logger.info(`Maintenance item created — propertyId: ${dto.property_id}, amount: ${dto.amount}`)
    return item
  }

  async update(
    agentId: string,
    id: string,
    data: Partial<CreateMaintenanceDto>
  ): Promise<Maintenance> {
    const item = await Maintenance.findByPk(id, {
      include: [{ model: Property, as: 'property' }],
    })

    if (!item) throw new AppError('Maintenance item not found', 404)
    await this.assertOwnership(agentId, item.property_id)

    await item.update(data)
    return item.reload()
  }

  async remove(agentId: string, id: string): Promise<void> {
    const item = await Maintenance.findByPk(id)
    if (!item) throw new AppError('Maintenance item not found', 404)
    await this.assertOwnership(agentId, item.property_id)
    await item.destroy()
    logger.info(`Maintenance item deleted — id: ${id}`)
  }
}
