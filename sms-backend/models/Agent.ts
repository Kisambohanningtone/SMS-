import {
  Table, Column, Model, DataType, PrimaryKey, Default,
  AllowNull, ForeignKey, CreatedAt, UpdatedAt, Unique,
} from 'sequelize-typescript'
import { v4 as uuidv4 } from 'uuid'
import { User } from './User'

export interface ReminderSchedule {
  day1: number
  day2: number
  day3: number
  channels: Array<'whatsapp' | 'sms'>
}

const DEFAULT_SCHEDULE: ReminderSchedule = {
  day1: 1,
  day2: 7,
  day3: 15,
  channels: ['whatsapp', 'sms'],
}

@Table({ tableName: 'agents', timestamps: true, underscored: true })
export class Agent extends Model {
  @PrimaryKey
  @Default(() => uuidv4())
  @Column(DataType.UUID)
  declare id: string

  @Unique
  @AllowNull(false)
  @ForeignKey(() => User)
  @Column(DataType.UUID)
  declare user_id: string

  @Column(DataType.STRING(255))
  declare business_name: string

  @Column(DataType.STRING(20))
  declare kopokopo_till_number: string

  @Column(DataType.STRING(200))
  declare kopokopo_client_id: string

  @Column(DataType.STRING(200))
  declare kopokopo_client_secret: string

  @Column(DataType.STRING(20))
  declare mpesa_number: string

  @Column(DataType.STRING(20))
  declare paybill_number: string

  @Default(DEFAULT_SCHEDULE)
  @AllowNull(false)
  @Column(DataType.JSONB)
  declare reminder_schedule: ReminderSchedule

  @Column(DataType.TEXT)
  declare reminder_template_wa: string

  @Column(DataType.TEXT)
  declare reminder_template_sms: string

  @Default(10.00)
  @Column(DataType.DECIMAL(5, 2))
  declare agent_fee_percent: number

  @Default(0.50)
  @Column(DataType.DECIMAL(5, 2))
  declare waltern_fee_percent: number

  @Default(5)
  @Column(DataType.INTEGER)
  declare report_auto_send_day: number

  @CreatedAt
  declare created_at: Date

  @UpdatedAt
  declare updated_at: Date

  // Association fields
  declare user?: import('./User').User
}
