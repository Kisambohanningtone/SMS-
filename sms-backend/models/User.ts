import {
  Table, Column, Model, DataType, PrimaryKey, Default,
  Unique, AllowNull, CreatedAt, UpdatedAt,
} from 'sequelize-typescript'
import { v4 as uuidv4 } from 'uuid'

export enum UserRole {
  AGENT = 'agent',
  OWNER = 'owner',
  ADMIN = 'admin',
}

@Table({ tableName: 'users', timestamps: true, underscored: true })
export class User extends Model {
  @PrimaryKey
  @Default(() => uuidv4())
  @Column(DataType.UUID)
  declare id: string

  @Unique
  @AllowNull(false)
  @Column(DataType.STRING(255))
  declare email: string

  @AllowNull(false)
  @Column(DataType.STRING(255))
  declare password_hash: string

  @AllowNull(false)
  @Column(DataType.STRING(255))
  declare full_name: string

  @Column(DataType.STRING(20))
  declare phone: string

  @AllowNull(false)
  @Column(DataType.ENUM(...Object.values(UserRole)))
  declare role: UserRole

  @Default(true)
  @Column(DataType.BOOLEAN)
  declare is_active: boolean

  @Column(DataType.TEXT)
  declare deactivation_reason: string | null

  @Column(DataType.UUID)
  declare deactivated_by: string | null

  @Column(DataType.DATE)
  declare deactivated_at: Date | null

  @Column(DataType.DATE)
  declare last_login_at: Date | null


  @CreatedAt
  declare created_at: Date

  @UpdatedAt
  declare updated_at: Date

  // Association fields — populated via Sequelize includes
  declare agent?: import('./Agent').Agent
  declare owner?: import('./Owner').Owner

  toJSON(): Record<string, unknown> {
    const values = super.toJSON() as Record<string, unknown>
    delete values['password_hash']
    return values
  }
}
