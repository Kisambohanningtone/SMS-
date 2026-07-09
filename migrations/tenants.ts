import { QueryInterface, DataTypes } from 'sequelize'

export async function up(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.createTable('tenants', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    unit_id: { type: DataTypes.UUID, allowNull: false, references: { model: 'units', key: 'id' } },
    agent_id: { type: DataTypes.UUID, allowNull: false, references: { model: 'agents', key: 'id' } },
    full_name: { type: DataTypes.STRING(255), allowNull: false },
    phone: { type: DataTypes.STRING(20), allowNull: false },
    email: { type: DataTypes.STRING(255), allowNull: true },
    id_number: { type: DataTypes.STRING(20), allowNull: true },
    lease_start: { type: DataTypes.DATEONLY, allowNull: false },
    lease_end: { type: DataTypes.DATEONLY, allowNull: true },
    deposit_amount: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
    is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
    created_at: { type: DataTypes.DATE, allowNull: false },
    updated_at: { type: DataTypes.DATE, allowNull: false },
  })
  await queryInterface.addIndex('tenants', ['agent_id'])
  await queryInterface.addIndex('tenants', ['unit_id'])
  await queryInterface.addIndex('tenants', ['phone', 'agent_id'])
  await queryInterface.addIndex('tenants', ['is_active'])
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.dropTable('tenants')
}
