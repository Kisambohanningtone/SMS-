import {
  Table, Column, Model, DataType, PrimaryKey, Default,
  AllowNull, ForeignKey, CreatedAt, UpdatedAt,
} from 'sequelize-typescript'
import { v4 as uuidv4 } from 'uuid'
import { Property } from './Property'

@Table({
  tableName: 'owner_reports',
  timestamps: true,
  underscored: true,
  indexes: [
    {
      unique: true,
      fields: ['property_id', 'month', 'year'],
      name: 'owner_reports_property_month_year_unique',
    },
  ],
})
export class OwnerReport extends Model {
  @PrimaryKey
  @Default(() => uuidv4())
  @Column(DataType.UUID)
  declare id: string

  @AllowNull(false)
  @ForeignKey(() => Property)
  @Column(DataType.UUID)
  declare property_id: string

  @AllowNull(false)
  @Column({ type: DataType.INTEGER, validate: { min: 1, max: 12 } })
  declare month: number

  @AllowNull(false)
  @Column(DataType.INTEGER)
  declare year: number

  @AllowNull(false)
  @Column(DataType.INTEGER)
  declare total_expected: number

  @AllowNull(false)
  @Column(DataType.INTEGER)
  declare total_collected: number

  @AllowNull(false)
  @Column(DataType.INTEGER)
  declare waltern_fee_total: number

  @AllowNull(false)
  @Column(DataType.INTEGER)
  declare agent_fee_amount: number

  @AllowNull(false)
  @Column(DataType.INTEGER)
  declare maintenance_total: number

  @AllowNull(false)
  @Column(DataType.INTEGER)
  declare net_to_owner: number

  @Column(DataType.DECIMAL(5, 2))
  declare collection_rate: number

  @Column(DataType.STRING(500))
  declare pdf_url: string | null

  @Column(DataType.TEXT)
  declare owner_token: string | null

  @Column(DataType.DATE)
  declare sent_at: Date | null

  @CreatedAt
  declare created_at: Date

  @UpdatedAt
  declare updated_at: Date

  // Association fields
  declare property?: import('./Property').Property
}
