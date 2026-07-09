import {
  Table, Column, Model, DataType, PrimaryKey, Default,
  AllowNull, ForeignKey, CreatedAt, UpdatedAt,
} from 'sequelize-typescript'
import { v4 as uuidv4 } from 'uuid'
import { Unit } from './Unit'

@Table({
  tableName: 'tenants',
  timestamps: true,
  underscored: true,
})
export class Tenant extends Model {
  @PrimaryKey
  @Default(() => uuidv4())
  @Column(DataType.UUID)
  declare id: string

  @AllowNull(false)
  @ForeignKey(() => Unit)
  @Column(DataType.UUID)
  declare unit_id: string

  @AllowNull(false)
  @Column(DataType.STRING(255))
  declare full_name: string

  @AllowNull(false)
  @Column(DataType.STRING(20))
  declare phone: string

  @Column(DataType.STRING(20))
  declare national_id: string

  @AllowNull(false)
  @Column(DataType.DATEONLY)
  declare lease_start: string

  @Column(DataType.DATEONLY)
  declare lease_end: string | null

  @Default(0)
  @Column(DataType.INTEGER)
  declare deposit_amount: number

  @Default(false)
  @Column(DataType.BOOLEAN)
  declare deposit_paid: boolean

  @Default(true)
  @Column(DataType.BOOLEAN)
  declare is_active: boolean

  @Column(DataType.STRING(255))
  declare password_hash: string | null

  @Default(true)
  @Column(DataType.BOOLEAN)
  declare must_change_password: boolean

  @Column(DataType.DATE)
  declare last_login_at: Date | null

  @CreatedAt
  declare created_at: Date

  @UpdatedAt
  declare updated_at: Date

  declare unit: Unit

  // HasMany associations declared in index.ts
  declare payments?: import('./Payment').Payment[]
  declare reminder_logs?: import('./ReminderLog').ReminderLog[]
}
