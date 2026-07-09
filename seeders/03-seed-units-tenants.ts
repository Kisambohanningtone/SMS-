import { QueryInterface } from 'sequelize'
import { v4 as uuidv4 } from 'uuid'

// Import IDs from previous seeder
const PROPERTY_ID = process.env.SEED_PROPERTY_ID ?? 'REPLACE_WITH_PROPERTY_ID'
const AGENT_ID    = process.env.SEED_AGENT_ID    ?? 'REPLACE_WITH_AGENT_ID'

export async function up(q: QueryInterface): Promise<void> {
  // Generate 20 units
  const units = Array.from({ length: 20 }, (_, i) => ({
    id: uuidv4(),
    property_id: PROPERTY_ID,
    unit_number: `A${String(i + 1).padStart(2, '0')}`,
    floor: i < 10 ? 'Ground' : 'First',
    rent_amount: 18000.00,
    status: i < 15 ? 'overdue' : 'vacant',
    notes: null,
    created_at: new Date(),
    updated_at: new Date(),
  }))

  await q.bulkInsert('units', units)

  // Add tenants to first 15 units
  const occupiedUnits = units.slice(0, 15)
  const tenants = occupiedUnits.map((unit, i) => ({
    id: uuidv4(),
    unit_id: unit.id,
    agent_id: AGENT_ID,
    full_name: `Test Tenant ${i + 1}`,
    phone: `2547${String(10000000 + i).slice(1)}`,
    email: null,
    id_number: null,
    lease_start: new Date('2025-01-01'),
    lease_end: null,
    deposit_amount: 18000.00,
    is_active: true,
    created_at: new Date(),
    updated_at: new Date(),
  }))

  await q.bulkInsert('tenants', tenants)
}

export async function down(q: QueryInterface): Promise<void> {
  await q.bulkDelete('tenants', { agent_id: AGENT_ID } as Record<string, unknown>)
  await q.bulkDelete('units', { property_id: PROPERTY_ID } as Record<string, unknown>)
}