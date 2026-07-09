import {
  Table, Column, Model, DataType, PrimaryKey, Default,
  AllowNull, ForeignKey, CreatedAt, UpdatedAt,
} from 'sequelize-typescript'
import { v4 as uuidv4 } from 'uuid'
import { Property } from './Property'
import { Unit } from './Unit'
import { User } from './User'

@Table({
  tableName: 'maintenance_items',
  timestamps: true,
  underscored: true,
  indexes: [
    { fields: ['property_id', 'month', 'year'], name: 'maintenance_property_month_year' },
  ],
})
export class Maintenance extends Model {
  @PrimaryKey
  @Default(() => uuidv4())
  @Column(DataType.UUID)
  declare id: string

  @AllowNull(false)
  @ForeignKey(() => Property)
  @Column(DataType.UUID)
  declare property_id: string

  @ForeignKey(() => Unit)
  @Column(DataType.UUID)
  declare unit_id: string | null

  @AllowNull(false)
  @Column(DataType.TEXT)
  declare description: string

  @AllowNull(false)
  @Column(DataType.INTEGER)
  declare amount: number

  @AllowNull(false)
  @Column({
    type: DataType.INTEGER,
    validate: { min: 1, max: 12 },
  })
  declare month: number

  @AllowNull(false)
  @Column(DataType.INTEGER)
  declare year: number

  @Column(DataType.STRING(500))
  declare receipt_url: string | null

  @AllowNull(false)
  @ForeignKey(() => User)
  @Column(DataType.UUID)
  declare created_by: string

  @CreatedAt
  declare created_at: Date

  declare property: Property

  declare unit: Unit

  declare creator: User
}
