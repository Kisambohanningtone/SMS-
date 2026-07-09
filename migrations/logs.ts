import { QueryInterface, DataTypes } from 'sequelize'

export async function up(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.createTable('reminder_logs', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    tenant_id: { type: DataTypes.UUID, allowNull: false, references: { model: 'tenants', key: 'id' } },
    agent_id: { type: DataTypes.UUID, allowNull: false, references: { model: 'agents', key: 'id' } },
    channel: { type: DataTypes.ENUM('whatsapp', 'sms', 'both'), allowNull: false },
    status: { type: DataTypes.ENUM('pending', 'sent', 'delivered', 'failed'), allowNull: false, defaultValue: 'pending' },
    message: { type: DataTypes.TEXT, allowNull: false },
    provider_message_id: { type: DataTypes.STRING(100), allowNull: true },
    failure_reason: { type: DataTypes.TEXT, allowNull: true },
    sent_at: { type: DataTypes.DATE, allowNull: true },
    created_at: { type: DataTypes.DATE, allowNull: false },
    updated_at: { type: DataTypes.DATE, allowNull: false },
  })
  await queryInterface.addIndex('reminder_logs', ['agent_id'])
  await queryInterface.addIndex('reminder_logs', ['tenant_id'])
  await queryInterface.addIndex('reminder_logs', ['status'])
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.dropTable('reminder_logs')
}