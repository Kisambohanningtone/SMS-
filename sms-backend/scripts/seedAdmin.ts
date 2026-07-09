/**
 * Creates the Waltern Tech admin account.
 * Run once: cd "SMS AGENT" && npx ts-node -r tsconfig-paths/register sms-backend/scripts/seedAdmin.ts
 */
import 'reflect-metadata'
import 'tsconfig-paths/register'
import '@models/index'
import { connectDatabase, syncDatabase } from '@config/db'
import { connectRedis } from '@config/redis'
import { User } from '@models/User'
import { UserRole } from '@shared-types/auth.types'
import bcrypt from 'bcrypt'

async function seed() {
  await connectDatabase()
  await connectRedis()

  const email = 'admin@waltern.com'
  const existing = await User.findOne({ where: { email } })

  if (existing) {
    console.log(`Admin already exists: ${email}`)
    process.exit(0)
  }

  const password_hash = await bcrypt.hash('WalternAdmin2026!', 12)

  await User.create({
    email,
    password_hash,
    full_name: 'Hannington Kisambo',
    phone: '+254769805725',
    role: UserRole.ADMIN,
    is_active: true,
  })

  console.log('Admin created successfully!')
  console.log('Email: admin@waltern.com')
  console.log('Password: WalternAdmin2026!')
  process.exit(0)
}

seed().catch(err => {
  console.error('Seed failed:', err)
  process.exit(1)
})
