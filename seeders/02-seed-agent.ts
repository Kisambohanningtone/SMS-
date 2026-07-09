import { QueryInterface } from 'sequelize'
import bcrypt from 'bcrypt'
import { v4 as uuidv4 } from 'uuid'

const userId = uuidv4()
const agentId = uuidv4()
const ownerId = uuidv4()
const propertyId = uuidv4()

export { userId, agentId, ownerId, propertyId }

export async function up(q: QueryInterface): Promise<void> {
  const passwordHash = await bcrypt.hash('Agent2026!', 12)

  await q.bulkInsert('users', [{
    id: userId,
    email: 'james.kariuki@test.co.ke',
    password_hash: passwordHash,
    role: 'agent',
    is_active: true,
    last_login_at: null,
    created_at: new Date(),
    updated_at: new Date(),
  }])

  await q.bulkInsert('agents', [{
    id: agentId,
    user_id: userId,
    full_name: 'James Kariuki',
    phone: '254712345678',
    business_name: 'Kariuki Properties Ltd',
    kopokopo_client_id: null,
    kopokopo_client_secret: null,
    kopokopo_buy_goods_number: '5555555',
    fee_percent: 10.00,
    reminder_schedule: JSON.stringify({ enabled: true, daysBefore: [7, 3, 1], time: '08:00' }),
    is_verified: true,
    created_at: new Date(),
    updated_at: new Date(),
  }])

  await q.bulkInsert('owners', [{
    id: ownerId,
    agent_id: agentId,
    full_name: 'Samuel Njoroge',
    phone: '254723456789',
    email: 'snjoroge@gmail.com',
    mpesa_number: '254723456789',
    bank_account: null,
    bank_name: null,
    created_at: new Date(),
    updated_at: new Date(),
  }])

  await q.bulkInsert('properties', [{
    id: propertyId,
    agent_id: agentId,
    owner_id: ownerId,
    name: 'Ruaka Gardens',
    location: 'Ruaka, Kiambu County',
    total_units: 20,
    rent_per_unit: 18000.00,
    description: 'Modern bedsitters and one-bedroom units in Ruaka',
    created_at: new Date(),
    updated_at: new Date(),
  }])
}

export async function down(q: QueryInterface): Promise<void> {
  await q.bulkDelete('properties', { id: propertyId } as Record<string, unknown>)
  await q.bulkDelete('owners', { id: ownerId } as Record<string, unknown>)
  await q.bulkDelete('agents', { id: agentId } as Record<string, unknown>)
  await q.bulkDelete('users', { id: userId } as Record<string, unknown>)
}