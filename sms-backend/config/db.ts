import dotenv from 'dotenv'
dotenv.config()

import 'reflect-metadata'
import { Sequelize } from 'sequelize-typescript'
import { logger } from './logger'
import path from 'path'

const modelsPath = path.join(__dirname, '..', 'models')

function createSequelize(): Sequelize {
  // Render provides DATABASE_URL — local dev uses individual vars
  const databaseUrl = process.env.DATABASE_URL

  if (databaseUrl) {
    logger.info('DB: connecting via DATABASE_URL (Render)')
    return new Sequelize(databaseUrl, {
      dialect: 'postgres',
      models: [],
      logging: false,
      dialectOptions: {
        ssl: { require: true, rejectUnauthorized: false },
      },
      pool: { max: 5, min: 1, acquire: 30000, idle: 10000 },
    })
  }

  logger.info('DB: connecting via DB_HOST (local dev)')
  return new Sequelize({
    dialect: 'postgres',
    host:     process.env.DB_HOST     ?? 'localhost',
    port:     Number(process.env.DB_PORT ?? 5432),
    database: process.env.DB_NAME     ?? 'sms_agent_db',
    username: process.env.DB_USER     ?? 'postgres',
    password: process.env.DB_PASSWORD ?? '',
    models: [],
    logging: (sql) => logger.debug(sql),
    pool: { max: 10, min: 2, acquire: 30000, idle: 10000 },
  })
}

export const sequelize = createSequelize()

export async function connectDatabase(): Promise<void> {
  try {
    await sequelize.authenticate()
    logger.info('Database connected successfully')
  } catch (error) {
    logger.error('Database connection failed:', error)
    throw error
  }
}

export async function syncDatabase(): Promise<void> {
  try {
    // Step 1: Drop conflicting enums that block ALTER TABLE on Render
    const preSyncSql = [
      'ALTER TABLE IF EXISTS "properties" ALTER COLUMN "payment_method" DROP DEFAULT',
      'DROP TYPE IF EXISTS "public"."enum_properties_payment_method" CASCADE',
      'DROP TYPE IF EXISTS "public"."enum_users_role" CASCADE',
    ]
    for (const sql of preSyncSql) {
      await sequelize.query(sql).catch(() => {})
    }

    // Step 2: Create missing tables safely — never drops existing data
    await sequelize.sync({ force: false })

    // Step 3: Add columns that Sequelize missed due to NOT NULL constraints
    const patches = [
      `ALTER TABLE IF EXISTS "users" ADD COLUMN IF NOT EXISTS "role" VARCHAR(20) DEFAULT 'agent'`,
      `ALTER TABLE IF EXISTS "tenants" ADD COLUMN IF NOT EXISTS "password_hash" VARCHAR(255)`,
      `ALTER TABLE IF EXISTS "tenants" ADD COLUMN IF NOT EXISTS "must_change_password" BOOLEAN DEFAULT true`,
      `ALTER TABLE IF EXISTS "tenants" ADD COLUMN IF NOT EXISTS "last_login_at" TIMESTAMPTZ`,
      `ALTER TABLE IF EXISTS "owners" ADD COLUMN IF NOT EXISTS "password_hash" VARCHAR(255)`,
      `ALTER TABLE IF EXISTS "owners" ADD COLUMN IF NOT EXISTS "must_change_password" BOOLEAN DEFAULT true`,
      `ALTER TABLE IF EXISTS "owners" ADD COLUMN IF NOT EXISTS "last_login_at" TIMESTAMPTZ`,
      `ALTER TABLE IF EXISTS "payments" ADD COLUMN IF NOT EXISTS "is_voided" BOOLEAN DEFAULT false`,
      `ALTER TABLE IF EXISTS "payments" ADD COLUMN IF NOT EXISTS "void_reason" VARCHAR(255)`,
      `ALTER TABLE IF EXISTS "users" ADD COLUMN IF NOT EXISTS "deactivation_reason" TEXT`,
      `ALTER TABLE IF EXISTS "users" ADD COLUMN IF NOT EXISTS "deactivated_by" UUID`,
      `ALTER TABLE IF EXISTS "users" ADD COLUMN IF NOT EXISTS "deactivated_at" TIMESTAMPTZ`,
      `ALTER TABLE IF EXISTS "users" ADD COLUMN IF NOT EXISTS "last_login_at" TIMESTAMPTZ`,
      `ALTER TABLE IF EXISTS "payments" ADD COLUMN IF NOT EXISTS "b2c_status" VARCHAR(20) DEFAULT 'pending'`,
      `ALTER TABLE IF EXISTS "payments" ADD COLUMN IF NOT EXISTS "intasend_ref" VARCHAR(100)`,
      `ALTER TABLE IF EXISTS "payments" ADD COLUMN IF NOT EXISTS "b2c_attempts" INTEGER DEFAULT 0`,
      `ALTER TABLE IF EXISTS "payments" ADD COLUMN IF NOT EXISTS "b2c_last_attempt_at" TIMESTAMPTZ`,
    ]
    for (const sql of patches) {
      await sequelize.query(sql).catch((e: any) => logger.warn('Patch skipped: ' + e.message))
    }

    logger.info('Database synchronized')
  } catch (error) {
    logger.error('Database sync failed:', error)
    throw error
  }
}
