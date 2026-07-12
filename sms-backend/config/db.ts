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
    // Drop conflicting enums before sync to avoid ALTER TABLE cast errors on Render
    const enumsToDrop = [
      'enum_properties_payment_method',
      'enum_users_role',
    ]
    for (const enumName of enumsToDrop) {
      try {
        await sequelize.query(`ALTER TABLE "properties" ALTER COLUMN "payment_method" DROP DEFAULT`).catch(() => {})
        await sequelize.query(`DROP TYPE IF EXISTS "public"."${enumName}" CASCADE`)
      } catch (e) { /* ignore */ }
    }
    await sequelize.sync({ alter: true })
    logger.info('Database synchronized')
  } catch (error) {
    logger.error('Database sync failed:', error)
    throw error
  }
}
