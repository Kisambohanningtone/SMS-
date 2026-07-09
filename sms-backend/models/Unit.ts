import {
  Table, Column, Model, DataType, PrimaryKey, Default,
  AllowNull, ForeignKey, CreatedAt, UpdatedAt,
} from 'sequelize-typescript'
import { v4 as uuidv4 } from 'uuid'
import { Property } from './Property'
import { UnitTypeGroup } from './UnitTypeGroup'

export enum UnitStatus {
  OCCUPIED = 'occupied',
  VACANT = 'vacant',
}

@Table({ tableName: 'units', timestamps: true, underscored: true })
export class Unit extends Model {
  @PrimaryKey
  @Default(() => uuidv4())
  @Column(DataType.UUID)
  declare id: string

  @AllowNull(false)
  @ForeignKey(() => Property)
  @Column(DataType.UUID)
  declare property_id: string

  /**
   * Determines this unit's rent via the group's rent_amount.
   * Nullable for backward compatibility — units without a group
   * fall back to a flat rent set directly on the unit (rare).
   */
  @ForeignKey(() => UnitTypeGroup)
  @Column(DataType.UUID)
  declare unit_type_group_id: string | null

  @AllowNull(false)
  @Column(DataType.STRING(20))
  declare unit_number: string

  @Column(DataType.STRING(20))
  declare floor: string

  @Default(UnitStatus.VACANT)
  @Column(DataType.ENUM(...Object.values(UnitStatus)))
  declare status: UnitStatus

  @CreatedAt
  declare created_at: Date

  @UpdatedAt
  declare updated_at: Date

  // Association fields — populated via Sequelize includes
  declare property?: Property
  declare unit_type_group?: UnitTypeGroup
  declare tenants?: import('./Tenant').Tenant[]
  declare payments?: import('./Payment').Payment[]
  declare maintenance_items?: import('./Maintenance').Maintenance[]
  declare reminder_logs?: import('./ReminderLog').ReminderLog[]
  declare stk_requests?: import('./StkRequest').StkRequest[]
}
