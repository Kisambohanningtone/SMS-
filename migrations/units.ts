import { QueryInterface, DataTypes } from 'sequelize'

export async function up(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.createTable('units', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    property_id: { type: DataTypes.UUID, allowNull: false, references: { model: 'properties', key: 'id' }, onDelete: 'CASCADE' },
    unit_number: { type: DataTypes.STRING(20), allowNull: false },
    floor: { type: DataTypes.STRING(10), allowNull: true },
    rent_amount: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
    status: { type: DataTypes.ENUM('vacant', 'paid', 'partial', 'overdue', 'balance'), defaultValue: 'vacant' },
    notes: { type: DataTypes.TEXT, allowNull: true },
    created_at: { type: DataTypes.DATE, allowNull: false },
    updated_at: { type: DataTypes.DATE, allowNull: false },
  })
  await queryInterface.addIndex('units', ['property_id'])
  await queryInterface.addIndex('units', ['status'])
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.dropTable('units')
}