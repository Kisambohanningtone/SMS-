import {
  Table, Column, Model, DataType, PrimaryKey, Default,
  AllowNull, ForeignKey, CreatedAt, UpdatedAt,
} from 'sequelize-typescript'
import { v4 as uuidv4 } from 'uuid'
import { Property } from './Property'

/**
 * UnitTypeGroup — defines a rent tier within a property.
 *
 * Example: Vipingo Apartments has 3 groups —
 *   "Bedsitter"   x20 units @ KES 30
 *   "Single Room" x10 units @ KES 12
 *   "1 Bedroom"   x10 units @ KES 50
 *
 * Each Unit belongs to exactly one group, and inherits its rent_amount
 * from the group. Only the property owner (admin) can edit groups —
 * agents have read-only access. Updating rent_amount here instantly
 * reflects across all units in the group — no duplication.
 */
@Table({ tableName: 'unit_type_groups', timestamps: true, underscored: true })
export class UnitTypeGroup extends Model {
  @PrimaryKey
  @Default(() => uuidv4())
  @Column(DataType.UUID)
  declare id: string

  @AllowNull(false)
  @ForeignKey(() => Property)
  @Column(DataType.UUID)
  declare property_id: string

  /** e.g. "Bedsitter", "Single Room", "1 Bedroom" */
  @AllowNull(false)
  @Column(DataType.STRING(100))
  declare name: string

  /** Monthly rent in KES for every unit in this group */
  @AllowNull(false)
  @Column(DataType.INTEGER)
  declare rent_amount: number

  /** Optional display order in the dashboard */
  @Default(0)
  @Column(DataType.INTEGER)
  declare sort_order: number

  @CreatedAt
  declare created_at: Date

  @UpdatedAt
  declare updated_at: Date

  // Association fields — populated via Sequelize includes
  declare property?: Property
  declare units?: import('./Unit').Unit[]
}
