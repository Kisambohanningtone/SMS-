import { QueryInterface } from 'sequelize'

// Performance indexes added after all tables exist
export async function up(queryInterface: QueryInterface): Promise<void> {
  // Fast lookup of payments by waltern_fee for commission reports
  await queryInterface.addIndex('payments', ['waltern_fee'])
  // Fast agent dashboard — all units by status across properties
  await queryInterface.addIndex('units', ['property_id', 'status'])
  // Fast tenant search by phone across agent portfolio
  await queryInterface.addIndex('tenants', ['phone'])
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.removeIndex('payments', ['waltern_fee'])
  await queryInterface.removeIndex('units', ['property_id', 'status'])
  await queryInterface.removeIndex('tenants', ['phone'])
}