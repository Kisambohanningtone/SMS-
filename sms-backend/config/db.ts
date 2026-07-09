import { Sequelize } from 'sequelize-typescript'
import { env } from './env'
import { logger } from './logger'

export const sequelize = new Sequelize({
  dialect: 'postgres',
  host: env.db.host,
  port: env.db.port,
  database: env.db.name,
  username: env.db.user,
  password: env.db.password,
  logging: env.app.isDev ? (sql: string) => logger.debug(sql) : false,
  dialectOptions: env.db.ssl
    ? { ssl: { require: true, rejectUnauthorized: false } }
    : {},
  pool: { max: 10, min: 2, acquire: 30000, idle: 10000 },
  define: {
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
  models: [],
})

export async function connectDatabase(): Promise<void> {
  try {
    await sequelize.authenticate()
    logger.info(`Database connected — ${env.db.name}@${env.db.host}:${env.db.port}`)
  } catch (error) {
    logger.error('Database connection failed:', error)
    process.exit(1)
  }
}

export async function syncDatabase(force = false): Promise<void> {
  if (env.app.isProd && force) {
    throw new Error('Cannot force sync in production — run migrations instead')
  }
  await sequelize.sync({ force, alter: !force && env.app.isDev })
  logger.info('Database synced')
}
