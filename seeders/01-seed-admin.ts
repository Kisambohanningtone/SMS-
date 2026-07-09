import { QueryInterface } from 'sequelize'
import bcrypt from 'bcrypt'
import { v4 as uuidv4 } from 'uuid'

const userId = uuidv4()
const agentId = uuidv4()

export async function up(q: QueryInterface): Promise<void> {
  const passwordHash = await bcrypt.hash('WalternAdmin2026!', 12)
  await q.bulkInsert('users', [{
    id: userId,
    email: 'admin@walterntech.co.ke',
    password_hash: passwordHash,
    role: 'admin',
    is_active: true,
    last_login_at: null,
    created_at: new Date(),
    updated_at: new Date(),
  }])
  await q.bulkInsert('agents', [{
    id: agentId,
    user_id: userId,
    full_name: 'Waltern Tech Admin',
    phone: '254700000000',
    business_name: 'Waltern Tech Ltd',
    kopokopo_client_id: null,
    kopokopo_client_secret: null,
    kopokopo_buy_goods_number: null,
    fee_percent: 10.00,
    reminder_schedule: JSON.stringify({ enabled: true, daysBefore: [7, 3, 1], time: '08:00' }),
    is_verified: true,
    created_at: new Date(),
    updated_at: new Date(),
  }])
}

export async function down(q: QueryInterface): Promise<void> {
  await q.bulkDelete('agents', { user_id: userId } as Record<string, unknown>)
  await q.bulkDelete('users', { email: 'admin@walterntech.co.ke' } as Record<string, unknown>)
}