import {
  Table, Column, Model, DataType, PrimaryKey, Default,
  AllowNull, ForeignKey, CreatedAt, UpdatedAt, Unique,
} from 'sequelize-typescript'
import { v4 as uuidv4 } from 'uuid'
import { Unit } from './Unit'
import { Tenant } from './Tenant'
import { Agent } from './Agent'

export enum StkStatus {
  PENDING = 'pending',
  SUCCESS = 'success',
  FAILED = 'failed',
  EXPIRED = 'expired',
  CANCELLED = 'cancelled',
}

@Table({
  tableName: 'stk_requests',
  timestamps: true,
  underscored: true,
  indexes: [
    { fields: ['agent_id'], name: 'stk_requests_agent_id' },
    { fields: ['created_at'], name: 'stk_requests_created_at' },
  ],
})
export class StkRequest extends Model {
  @PrimaryKey
  @Default(() => uuidv4())
  @Column(DataType.UUID)
  declare id: string

  @Unique
  @AllowNull(false)
  @Column(DataType.STRING(100))
  declare checkout_request_id: string

  @AllowNull(false)
  @ForeignKey(() => Unit)
  @Column(DataType.UUID)
  declare unit_id: string

  @ForeignKey(() => Tenant)
  @Column(DataType.UUID)
  declare tenant_id: string | null

  @AllowNull(false)
  @ForeignKey(() => Agent)
  @Column(DataType.UUID)
  declare agent_id: string

  @AllowNull(false)
  @Column(DataType.STRING(20))
  declare phone_number: string

  @AllowNull(false)
  @Column(DataType.INTEGER)
  declare amount: number

  @Default(StkStatus.PENDING)
  @AllowNull(false)
  @Column(DataType.ENUM(...Object.values(StkStatus)))
  declare status: StkStatus

  /** Safaricom result code from callback */
  @Column(DataType.INTEGER)
  declare result_code: number | null

  /** Safaricom result description */
  @Column(DataType.STRING(255))
  declare result_desc: string | null

  /** M-Pesa receipt number on success */
  @Column(DataType.STRING(20))
  declare mpesa_receipt: string | null

  /** Expires 90 seconds after creation — used by cleanup cron */
  @AllowNull(false)
  @Column(DataType.DATE)
  declare expires_at: Date

  @CreatedAt
  declare created_at: Date

  @UpdatedAt
  declare updated_at: Date

  declare unit: Unit

  declare tenant: Tenant

  declare agent: Agent
}
