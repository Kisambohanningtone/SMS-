import {
  Table, Column, Model, DataType, PrimaryKey, Default,
  AllowNull, ForeignKey, CreatedAt, UpdatedAt,
} from 'sequelize-typescript'
import { v4 as uuidv4 } from 'uuid'
import { User } from './User'
import { Agent } from './Agent'

@Table({
  tableName: 'owners',
  timestamps: true,
  underscored: true,
})
export class Owner extends Model {
  @PrimaryKey
  @Default(() => uuidv4())
  @Column(DataType.UUID)
  declare id: string

  @ForeignKey(() => User)
  @Column(DataType.UUID)
  declare user_id: string | null

  @AllowNull(false)
  @ForeignKey(() => Agent)
  @Column(DataType.UUID)
  declare agent_id: string

  @AllowNull(false)
  @Column(DataType.STRING(255))
  declare full_name: string

  @AllowNull(false)
  @Column(DataType.STRING(20))
  declare phone: string

  @Column(DataType.STRING(255))
  declare email: string

  @Column(DataType.STRING(20))
  declare mpesa_number: string

  @Column(DataType.STRING(255))
  declare password_hash: string | null

  @Default(true)
  @Column(DataType.BOOLEAN)
  declare must_change_password: boolean

  @Column(DataType.DATE)
  declare last_login_at: Date | null


  @CreatedAt
  declare created_at: Date

  declare user: User

  declare agent: Agent

  // HasMany associations declared in index.ts
  declare properties?: import('./Property').Property[]
  declare owner_reports?: import('./OwnerReport').OwnerReport[]
}
