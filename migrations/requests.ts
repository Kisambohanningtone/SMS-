import { QueryInterface, DataTypes } from 'sequelize'

export async function up(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.createTable('stk_requests', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    agent_id: { type: DataTypes.UUID, allowNull: false, references: { model: 'agents', key: 'id' } },
    tenant_id: { type: DataTypes.UUID, allowNull: false, references: { model: 'tenants', key: 'id' } },
    unit_id: { type: DataTypes.UUID, allowNull: false, references: { model: 'units', key: 'id' } },
    merchant_request_id: { type: DataTypes.STRING(100), allowNull: false },
    checkout_request_id: { type: DataTypes.STRING(100), allowNull: false, unique: true },
    amount: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
    phone_number: { type: DataTypes.STRING(20), allowNull: false },
    status: { type: DataTypes.ENUM('pending', 'success', 'failed', 'expired'), defaultValue: 'pending' },
    result_code: { type: DataTypes.INTEGER, allowNull: true },
    result_desc: { type: DataTypes.STRING(255), allowNull: true },
    mpesa_receipt_number: { type: DataTypes.STRING(50), allowNull: true },
    expires_at: { type: DataTypes.DATE, allowNull: false },
    created_at: { type: DataTypes.DATE, allowNull: false },
    updated_at: { type: DataTypes.DATE, allowNull: false },
  })
  await queryInterface.addIndex('stk_requests', ['checkout_request_id'], { unique: true })
  await queryInterface.addIndex('stk_requests', ['agent_id'])
  await queryInterface.addIndex('stk_requests', ['status', 'expires_at'])
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.dropTable('stk_requests')
}