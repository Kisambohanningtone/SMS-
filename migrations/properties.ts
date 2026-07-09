import { QueryInterface, DataTypes } from 'sequelize'

export async function up(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.createTable('properties', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    agent_id: { type: DataTypes.UUID, allowNull: false, references: { model: 'agents', key: 'id' }, onDelete: 'CASCADE' },
    owner_id: { type: DataTypes.UUID, allowNull: true, references: { model: 'owners', key: 'id' }, onDelete: 'SET NULL' },
    name: { type: DataTypes.STRING(255), allowNull: false },
    location: { type: DataTypes.STRING(500), allowNull: false },
    total_units: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    rent_per_unit: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
    description: { type: DataTypes.TEXT, allowNull: true },
    created_at: { type: DataTypes.DATE, allowNull: false },
    updated_at: { type: DataTypes.DATE, allowNull: false },
  })
  await queryInterface.addIndex('properties', ['agent_id'])
  await queryInterface.addIndex('properties', ['owner_id'])
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.dropTable('properties')
}