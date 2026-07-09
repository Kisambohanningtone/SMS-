import {
  Table, Column, Model, DataType, PrimaryKey, Default,
  AllowNull, ForeignKey, CreatedAt, UpdatedAt, Unique,
} from 'sequelize-typescript'
import { v4 as uuidv4 } from 'uuid'
import { Unit } from './Unit'
import { Tenant } from './Tenant'
import { Property } from './Property'
import { Agent } from './Agent'
import { User } from './User'

export enum PaymentMethod {
  KOPOKOPO = 'kopokopo',
  MPESA_STK = 'mpesa_stk',
  CASH = 'cash',
  BANK = 'bank',
  PAYBILL = 'paybill',
}

@Table({
  tableName: 'payments',
  timestamps: true,
  underscored: true,
  indexes: [
    { fields: ['agent_id', 'month', 'year'], name: 'payments_agent_month_year' },
    { fields: ['property_id', 'month', 'year'], name: 'payments_property_month_year' },
    { fields: ['unit_id', 'month', 'year'], name: 'payments_unit_month_year' },
  ],
})
export class Payment extends Model {
  @PrimaryKey
  @Default(() => uuidv4())
  @Column(DataType.UUID)
  declare id: string

  @AllowNull(false)
  @ForeignKey(() => Unit)
  @Column(DataType.UUID)
  declare unit_id: string

  @ForeignKey(() => Tenant)
  @Column(DataType.UUID)
  declare tenant_id: string | null

  @AllowNull(false)
  @ForeignKey(() => Property)
  @Column(DataType.UUID)
  declare property_id: string

  @AllowNull(false)
  @ForeignKey(() => Agent)
  @Column(DataType.UUID)
  declare agent_id: string

  @AllowNull(false)
  @Column(DataType.INTEGER)
  declare gross_amount: number

  @Default(0)
  @AllowNull(false)
  @Column(DataType.INTEGER)
  declare waltern_fee: number

  @AllowNull(false)
  @Column(DataType.INTEGER)
  declare agent_amount: number

  @AllowNull(false)
  @Column({ type: DataType.INTEGER, validate: { min: 1, max: 12 } })
  declare month: number

  @AllowNull(false)
  @Column(DataType.INTEGER)
  declare year: number

  @AllowNull(false)
  @Column(DataType.ENUM(...Object.values(PaymentMethod)))
  declare payment_method: PaymentMethod

  @Unique
  @Column(DataType.STRING(20))
  declare mpesa_receipt: string | null

  @Column(DataType.STRING(100))
  declare kopokopo_payment_ref: string | null

  @Column(DataType.STRING(20))
  declare payer_phone: string | null

  @Default(false)
  @Column(DataType.BOOLEAN)
  declare split_confirmed: boolean

  @ForeignKey(() => User)
  @Column(DataType.UUID)
  declare recorded_by: string | null

  @Column(DataType.DATE)
  declare confirmed_at: Date | null

  @Default(false)
  @Column(DataType.BOOLEAN)
  declare is_voided: boolean

  @Column(DataType.STRING(255))
  declare voided_reason: string | null

  @Column(DataType.DATE)
  declare voided_at: Date | null

  @CreatedAt
  declare created_at: Date

  @UpdatedAt
  declare updated_at: Date

  // Association fields — populated via Sequelize includes
  declare unit?: Unit
  declare tenant?: Tenant
  declare property?: Property
  declare agent?: Agent
  declare recorder?: User
}
