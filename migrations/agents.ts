import { QueryInterface, DataTypes } from 'sequelize'

export async function up(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.createTable('agents', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    user_id: { type: DataTypes.UUID, allowNull: false, references: { model: 'users', key: 'id' }, onDelete: 'CASCADE' },
    full_name: { type: DataTypes.STRING(255), allowNull: false },
    phone: { type: DataTypes.STRING(20), allowNull: false },
    business_name: { type: DataTypes.STRING(255), allowNull: true },
    kopokopo_client_id: { type: DataTypes.STRING(255), allowNull: true },
    kopokopo_client_secret: { type: DataTypes.STRING(255), allowNull: true },
    kopokopo_buy_goods_number: { type: DataTypes.STRING(20), allowNull: true },
    fee_percent: { type: DataTypes.DECIMAL(5, 2), allowNull: false, defaultValue: 10.0 },
    reminder_schedule: { type: DataTypes.JSONB, defaultValue: {} },
    is_verified: { type: DataTypes.BOOLEAN, defaultValue: false },
    created_at: { type: DataTypes.DATE, allowNull: false },
    updated_at: { type: DataTypes.DATE, allowNull: false },
  })
  await queryInterface.addIndex('agents', ['user_id'], { unique: true })
  await queryInterface.addIndex('agents', ['kopokopo_buy_goods_number'])
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.dropTable('agents')
}