import { QueryInterface, DataTypes } from 'sequelize'

export async function up(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.createTable('owners', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    agent_id: { type: DataTypes.UUID, allowNull: false, references: { model: 'agents', key: 'id' }, onDelete: 'CASCADE' },
    full_name: { type: DataTypes.STRING(255), allowNull: false },
    phone: { type: DataTypes.STRING(20), allowNull: false },
    email: { type: DataTypes.STRING(255), allowNull: true },
    mpesa_number: { type: DataTypes.STRING(20), allowNull: true },
    bank_account: { type: DataTypes.STRING(50), allowNull: true },
    bank_name: { type: DataTypes.STRING(100), allowNull: true },
    created_at: { type: DataTypes.DATE, allowNull: false },
    updated_at: { type: DataTypes.DATE, allowNull: false },
  })
  await queryInterface.addIndex('owners', ['agent_id'])
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.dropTable('owners')
}