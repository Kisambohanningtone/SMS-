import { Request, Response, NextFunction } from 'express'
import { logger } from '@config/logger'

/**
 * KopoKopo publishes their webhook IP ranges in their documentation.
 * These are the production IPs — sandbox uses any IP.
 * Update this list when KopoKopo publishes new IPs.
 */
const KOPOKOPO_ALLOWED_IPS: string[] = [
  '196.201.214.200',
  '196.201.214.206',
  '196.201.213.114',
  '196.201.214.207',
  '196.201.214.208',
  '196.201.213.44',
  '196.201.212.127',
  '196.201.212.138',
  '196.201.212.129',
  '196.201.212.136',
  '196.201.212.74',
  '196.201.212.69',
]

function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for']
  if (forwarded) {
    return (Array.isArray(forwarded) ? forwarded[0] : forwarded).split(',')[0].trim()
  }
  return req.socket.remoteAddress ?? ''
}

export function kopokopoIpWhitelist(req: Request, res: Response, next: NextFunction): void {
  // In development/sandbox, skip IP check
  if (process.env.NODE_ENV !== 'production') {
    next()
    return
  }

  const clientIp = getClientIp(req)

  if (!KOPOKOPO_ALLOWED_IPS.includes(clientIp)) {
    logger.warn(`KopoKopo webhook blocked — IP not whitelisted: ${clientIp}`)
    res.status(403).json({ success: false, message: 'Forbidden' })
    return
  }

  next()
}

/**
 * Verify KopoKopo HMAC-SHA256 webhook signature
 * Header: X-KopoKopo-Signature
 */
import crypto from 'crypto'
import { env } from '@config/env'

export function kopokopoSignature(req: Request, res: Response, next: NextFunction): void {
  const signature = req.headers['x-kopokopo-signature'] as string

  if (!signature) {
    logger.warn('KopoKopo webhook missing signature header')
    res.status(400).json({ success: false, message: 'Missing webhook signature' })
    return
  }

  const rawBody = JSON.stringify(req.body)
  const expected = crypto
    .createHmac('sha256', env.kopokopo.webhookSecret)
    .update(rawBody)
    .digest('hex')

  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
    logger.warn('KopoKopo webhook signature mismatch')
    res.status(401).json({ success: false, message: 'Invalid webhook signature' })
    return
  }

  next()
}
