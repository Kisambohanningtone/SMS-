import { createClient, RedisClientType } from 'redis'
import { logger } from './logger'

let client: RedisClientType

export async function connectRedis(): Promise<void> {
  const redisUrl = process.env.REDIS_URL

  if (redisUrl) {
    logger.info('Redis: connecting via REDIS_URL (Render)')
    client = createClient({ url: redisUrl }) as RedisClientType
  } else {
    logger.info('Redis: connecting via REDIS_HOST (local dev)')
    client = createClient({
      socket: {
        host: process.env.REDIS_HOST ?? 'localhost',
        port: Number(process.env.REDIS_PORT ?? 6379),
      },
      password: process.env.REDIS_PASSWORD || undefined,
    }) as RedisClientType
  }

  client.on('error', (err) => logger.error('Redis error:', err))
  client.on('connect', () => logger.info('Redis connected'))

  await client.connect()
}

export function getRedis(): RedisClientType {
  if (!client) throw new Error('Redis not initialised')
  return client
}

export async function redisSet(key: string, value: string, ttlSeconds?: number): Promise<void> {
  ttlSeconds
    ? await getRedis().setEx(key, ttlSeconds, value)
    : await getRedis().set(key, value)
}

export async function redisGet(key: string): Promise<string | null> {
  return getRedis().get(key)
}

export async function redisDel(key: string): Promise<void> {
  await getRedis().del(key)
}

export async function redisExists(key: string): Promise<boolean> {
  return (await getRedis().exists(key)) === 1
}

export async function redisSetJson<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
  await redisSet(key, JSON.stringify(value), ttlSeconds)
}

export async function redisGetJson<T>(key: string): Promise<T | null> {
  const raw = await redisGet(key)
  if (!raw) return null
  try { return JSON.parse(raw) as T } catch { return null }
}
export const REDIS_KEYS = {
  darajaToken: 'daraja_token',
  kopokopoToken: 'kopokopo_token',

  stkRequest: (checkoutRequestId: string) =>
    `stk_request:${checkoutRequestId}`,

  session: (id: string) =>
    `session:${id}`,

  user: (id: string) =>
    `user:${id}`,
}