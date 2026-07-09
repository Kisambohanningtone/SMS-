import {
  Table, Column, Model, DataType, PrimaryKey, Default,
  AllowNull, ForeignKey, CreatedAt, UpdatedAt,
} from 'sequelize-typescript'
import { v4 as uuidv4 } from 'uuid'
import { Tenant } from './Tenant'
import { Unit } from './Unit'
import { Property } from './Property'

export enum ReminderChannel {
  WHATSAPP = 'whatsapp',
  SMS = 'sms',
}

export enum ReminderStatus {
  PENDING = 'pending',
  DELIVERED = 'delivered',
  FAILED = 'failed',
}

export enum ReminderTrigger {
  MANUAL = 'manual',
  AUTO = 'auto',
}

@Table({
  tableName: 'reminder_logs',
  timestamps: true,
  underscored: true,
  indexes: [
    { fields: ['tenant_id'], name: 'reminder_logs_tenant_id' },
    { fields: ['property_id', 'created_at'], name: 'reminder_logs_property_created' },
  ],
})
export class ReminderLog extends Model {
  @PrimaryKey
  @Default(() => uuidv4())
  @Column(DataType.UUID)
  declare id: string

  @AllowNull(false)
  @ForeignKey(() => Tenant)
  @Column(DataType.UUID)
  declare tenant_id: string

  @AllowNull(false)
  @ForeignKey(() => Unit)
  @Column(DataType.UUID)
  declare unit_id: string

  @AllowNull(false)
  @ForeignKey(() => Property)
  @Column(DataType.UUID)
  declare property_id: string

  @AllowNull(false)
  @Column(DataType.ENUM(...Object.values(ReminderChannel)))
  declare channel: ReminderChannel

  @Default(ReminderStatus.PENDING)
  @AllowNull(false)
  @Column(DataType.ENUM(...Object.values(ReminderStatus)))
  declare status: ReminderStatus

  @Default(ReminderTrigger.MANUAL)
  @Column(DataType.ENUM(...Object.values(ReminderTrigger)))
  declare triggered_by: ReminderTrigger

  @Column(DataType.TEXT)
  declare message_body: string | null

  @Column(DataType.STRING(100))
  declare provider_message_id: string | null

  @Column(DataType.TEXT)
  declare error_message: string | null

  @CreatedAt
  declare created_at: Date

  @UpdatedAt
  declare updated_at: Date

  // Association fields
  declare tenant?: import('./Tenant').Tenant
  declare unit?: import('./Unit').Unit
  declare property?: import('./Property').Property
}
