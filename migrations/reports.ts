import { QueryInterface, DataTypes } from 'sequelize'

export async function up(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.createTable('owner_reports', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    agent_id: { type: DataTypes.UUID, allowNull: false, references: { model: 'agents', key: 'id' } },
    owner_id: { type: DataTypes.UUID, allowNull: false, references: { model: 'owners', key: 'id' } },
    property_id: { type: DataTypes.UUID, allowNull: false, references: { model: 'properties', key: 'id' } },
    month_year: { type: DataTypes.STRING(7), allowNull: false },
    total_collected: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
    maintenance_costs: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
    agent_fee: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
    net_to_owner: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
    pdf_url: { type: DataTypes.STRING(500), allowNull: true },
    owner_token: { type: DataTypes.STRING(500), allowNull: false },
    sent_at: { type: DataTypes.DATE, allowNull: true },
    created_at: { type: DataTypes.DATE, allowNull: false },
    updated_at: { type: DataTypes.DATE, allowNull: false },
  })
  await queryInterface.addIndex('owner_reports', ['agent_id'])
  await queryInterface.addIndex('owner_reports', ['property_id', 'month_year'])
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.dropTable('owner_reports')
}