import { createClient, RedisClientType } from 'redis'
import { env } from './env'
import { logger } from './logger'

let client: RedisClientType

export async function connectRedis(): Promise<void> {
  client = createClient({
    socket: {
      host: env.redis.host,
      port: env.redis.port,
    },
    password: env.redis.password || undefined,
  }) as RedisClientType

  client.on('error', (err) => logger.error('Redis error:', err))
  client.on('connect', () => logger.info(`Redis connected — ${env.redis.host}:${env.redis.port}`))
  client.on('reconnecting', () => logger.warn('Redis reconnecting...'))

  await client.connect()
}

export function getRedis(): RedisClientType {
  if (!client) throw new Error('Redis not initialised — call connectRedis() first')
  return client
}

export async function redisSet(key: string, value: string, ttlSeconds?: number): Promise<void> {
  const redis = getRedis()
  if (ttlSeconds) {
    await redis.setEx(key, ttlSeconds, value)
  } else {
    await redis.set(key, value)
  }
}

export async function redisGet(key: string): Promise<string | null> {
  return getRedis().get(key)
}

export async function redisDel(key: string): Promise<void> {
  await getRedis().del(key)
}

export async function redisExists(key: string): Promise<boolean> {
  const result = await getRedis().exists(key)
  return result === 1
}

export async function redisSetJson<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
  await redisSet(key, JSON.stringify(value), ttlSeconds)
}

export async function redisGetJson<T>(key: string): Promise<T | null> {
  const raw = await redisGet(key)
  if (!raw) return null
  try {
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

export const REDIS_KEYS = {
  darajaToken: 'daraja:oauth_token',
  kopokopoToken: 'kopokopo:oauth_token',
  stkRequest: (checkoutId: string) => `stk:request:${checkoutId}`,
  paymentIdempotency: (transactionId: string) => `payment:idempotency:${transactionId}`,
  refreshToken: (userId: string) => `auth:refresh:${userId}`,
  rateLimitAgent: (agentId: string) => `rate:agent:${agentId}`,
}
