import {
  Table, Column, Model, DataType, PrimaryKey, Default,
  AllowNull, ForeignKey, CreatedAt, UpdatedAt,
} from 'sequelize-typescript'
import { v4 as uuidv4 } from 'uuid'
import { Agent } from './Agent'
import { Owner } from './Owner'
import { UnitTypeGroup } from './UnitTypeGroup'

export enum PaymentMethod {
  KOPOKOPO = 'kopokopo',
  DARAJA_MANUAL = 'daraja_manual',
}

@Table({ tableName: 'properties', timestamps: true, underscored: true })
export class Property extends Model {
  @PrimaryKey
  @Default(() => uuidv4())
  @Column(DataType.UUID)
  declare id: string

  @AllowNull(false)
  @ForeignKey(() => Agent)
  @Column(DataType.UUID)
  declare agent_id: string

  @AllowNull(false)
  @ForeignKey(() => Owner)
  @Column(DataType.UUID)
  declare owner_id: string

  @AllowNull(false)
  @Column(DataType.STRING(255))
  declare name: string

  @AllowNull(false)
  @Column(DataType.STRING(500))
  declare location: string

  /**
   * Fallback rent for units with no unit_type_group assigned.
   * Most properties define rent via UnitTypeGroup instead — this
   * exists for simple single-tier properties or legacy data.
   */
  @Default(0)
  @Column(DataType.INTEGER)
  declare default_rent: number

  @Default('2563EB')
  @Column(DataType.CHAR(6))
  declare color_hex: string

  @Default(PaymentMethod.KOPOKOPO)
  @Column(DataType.ENUM(...Object.values(PaymentMethod)))
  declare payment_method: PaymentMethod

  @Default(true)
  @Column(DataType.BOOLEAN)
  declare is_active: boolean

  @CreatedAt
  declare created_at: Date

  @UpdatedAt
  declare updated_at: Date

  // Association fields — populated via Sequelize includes
  declare agent?: Agent
  declare owner?: Owner
  declare units?: import('./Unit').Unit[]
  declare unit_type_groups?: UnitTypeGroup[]
  declare payments?: import('./Payment').Payment[]
  declare maintenance_items?: import('./Maintenance').Maintenance[]
  declare owner_reports?: import('./OwnerReport').OwnerReport[]
}
