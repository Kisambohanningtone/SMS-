import { QueryInterface, DataTypes } from 'sequelize'

export async function up(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.createTable('payments', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    tenant_id: { type: DataTypes.UUID, allowNull: false, references: { model: 'tenants', key: 'id' } },
    unit_id: { type: DataTypes.UUID, allowNull: false, references: { model: 'units', key: 'id' } },
    agent_id: { type: DataTypes.UUID, allowNull: false, references: { model: 'agents', key: 'id' } },
    gross_amount: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
    waltern_fee: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
    agent_amount: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
    commission_rate: { type: DataTypes.DECIMAL(6, 4), allowNull: false, defaultValue: 0.005 },
    channel: { type: DataTypes.ENUM('mpesa', 'bank', 'manual', 'stk_push'), allowNull: false },
    transaction_reference: { type: DataTypes.STRING(100), allowNull: true, unique: true },
    month_year: { type: DataTypes.STRING(7), allowNull: false },
    notes: { type: DataTypes.TEXT, allowNull: true },
    paid_at: { type: DataTypes.DATE, allowNull: false },
    created_at: { type: DataTypes.DATE, allowNull: false },
    updated_at: { type: DataTypes.DATE, allowNull: false },
  })
  await queryInterface.addIndex('payments', ['agent_id', 'month_year'])
  await queryInterface.addIndex('payments', ['unit_id', 'month_year'])
  await queryInterface.addIndex('payments', ['tenant_id'])
  await queryInterface.addIndex('payments', ['transaction_reference'], { unique: true, where: { transaction_reference: { $ne: null } } as Record<string, unknown> })
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.dropTable('payments')
}