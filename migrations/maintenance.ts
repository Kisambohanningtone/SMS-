import { QueryInterface, DataTypes } from 'sequelize'

export async function up(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.createTable('maintenance_items', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    property_id: { type: DataTypes.UUID, allowNull: false, references: { model: 'properties', key: 'id' }, onDelete: 'CASCADE' },
    unit_id: { type: DataTypes.UUID, allowNull: true, references: { model: 'units', key: 'id' }, onDelete: 'SET NULL' },
    agent_id: { type: DataTypes.UUID, allowNull: false, references: { model: 'agents', key: 'id' } },
    description: { type: DataTypes.TEXT, allowNull: false },
    amount: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
    receipt_url: { type: DataTypes.STRING(500), allowNull: true },
    completed_at: { type: DataTypes.DATE, allowNull: true },
    created_at: { type: DataTypes.DATE, allowNull: false },
    updated_at: { type: DataTypes.DATE, allowNull: false },
  })
  await queryInterface.addIndex('maintenance_items', ['agent_id'])
  await queryInterface.addIndex('maintenance_items', ['property_id'])
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.dropTable('maintenance_items')
}