import axios from 'axios'
import { env } from '@config/env'
import { logger } from '@config/logger'
import { AppError } from '@middleware/errorHandler'
import { redisGet, redisSet, REDIS_KEYS } from '@config/redis'
import { StkRequest, Unit, Property } from '@models/index'
import { StkStatus } from '@models/StkRequest'

export interface StkPushInput {
  phoneNumber: string
  amount: number
  unitId: string
  tenantId?: string
  agentId: string
  accountReference: string
  transactionDesc: string
}

export interface StkPushResult {
  checkoutRequestId: string
  merchantRequestId: string
  responseDescription: string
}

/**
 * DarajaService — Safaricom M-Pesa Daraja API integration.
 *
 * OAuth tokens expire after 3600s. We cache them in Redis for 3500s
 * (100s safety margin) to avoid hitting the OAuth endpoint on every
 * STK push — Safaricom rate-limits OAuth calls aggressively.
 */
export class DarajaService {

  /**
   * Returns a cached OAuth token, or fetches + caches a new one.
   * Daraja uses HTTP Basic Auth: base64(consumerKey:consumerSecret).
   */
  async getOAuthToken(): Promise<string> {
    const cached = await redisGet(REDIS_KEYS.darajaToken)
    if (cached) return cached

    if (!env.daraja.consumerKey || !env.daraja.consumerSecret) {
      throw new AppError(
        'Daraja credentials not configured — set DARAJA_CONSUMER_KEY and DARAJA_CONSUMER_SECRET in .env',
        501
      )
    }

    const auth = Buffer.from(`${env.daraja.consumerKey}:${env.daraja.consumerSecret}`).toString('base64')

    try {
      const { data } = await axios.get(
        `${env.daraja.baseUrl}/oauth/v1/generate?grant_type=client_credentials`,
        { headers: { Authorization: `Basic ${auth}` } }
      )

      const token = data.access_token as string
      const expiresIn = Number(data.expires_in ?? 3600)

      // Cache for slightly less than actual expiry
      await redisSet(REDIS_KEYS.darajaToken, token, Math.max(expiresIn - 100, 60))

      logger.info('Daraja OAuth token refreshed')
      return token
    } catch (error) {
      logger.error('Daraja OAuth failed:', error)
      throw new AppError('Failed to authenticate with Daraja — check credentials', 502)
    }
  }

  /** Generates the Lipa Na M-Pesa password: base64(shortcode + passkey + timestamp) */
  private generatePassword(timestamp: string): string {
    const raw = `${env.daraja.shortcode}${env.daraja.passkey}${timestamp}`
    return Buffer.from(raw).toString('base64')
  }

  /** Returns timestamp in Safaricom's required format: YYYYMMDDHHmmss */
  private getTimestamp(): string {
    const d = new Date()
    const pad = (n: number) => String(n).padStart(2, '0')
    return (
      d.getFullYear().toString() +
      pad(d.getMonth() + 1) +
      pad(d.getDate()) +
      pad(d.getHours()) +
      pad(d.getMinutes()) +
      pad(d.getSeconds())
    )
  }

  /** Normalises phone to 254XXXXXXXXX format required by Daraja */
  private normalizePhone(phone: string): string {
    const digits = phone.replace(/\D/g, '')
    if (digits.startsWith('254')) return digits
    if (digits.startsWith('0')) return `254${digits.slice(1)}`
    if (digits.startsWith('7') || digits.startsWith('1')) return `254${digits}`
    return digits
  }

  /**
   * Initiates an STK Push — sends a payment prompt to the tenant's phone.
   * Creates a tracking row in stk_requests (90s expiry) and caches the
   * checkout ID in Redis for fast status polling.
   */
  async initiateStkPush(input: StkPushInput): Promise<StkPushResult> {
    if (!env.daraja.passkey) {
      throw new AppError(
        'Daraja passkey not configured — set DARAJA_PASSKEY in .env',
        501
      )
    }

    const token = await this.getOAuthToken()
    const timestamp = this.getTimestamp()
    const password = this.generatePassword(timestamp)
    const phone = this.normalizePhone(input.phoneNumber)

    if (input.amount < 1) throw new AppError('Amount must be at least KES 1', 400)

    try {
      const { data } = await axios.post(
        `${env.daraja.baseUrl}/mpesa/stkpush/v1/processrequest`,
        {
          BusinessShortCode: env.daraja.shortcode,
          Password: password,
          Timestamp: timestamp,
          TransactionType: 'CustomerPayBillOnline',
          Amount: Math.round(input.amount),
          PartyA: phone,
          PartyB: env.daraja.shortcode,
          PhoneNumber: phone,
          CallBackURL: env.daraja.stkCallbackUrl,
          AccountReference: input.accountReference.slice(0, 12),
          TransactionDesc: input.transactionDesc.slice(0, 13),
        },
        { headers: { Authorization: `Bearer ${token}` } }
      )

      if (data.ResponseCode !== '0') {
        throw new AppError(data.ResponseDescription ?? 'STK push failed', 502)
      }

      const checkoutRequestId = data.CheckoutRequestID as string

      // Track in DB — expires in 90 seconds (Daraja's prompt timeout)
      await StkRequest.create({
        checkout_request_id: checkoutRequestId,
        unit_id: input.unitId,
        tenant_id: input.tenantId ?? null,
        agent_id: input.agentId,
        phone_number: phone,
        amount: Math.round(input.amount),
        status: StkStatus.PENDING,
        expires_at: new Date(Date.now() + 90_000),
      })

      // Cache for fast polling
      await redisSet(
        REDIS_KEYS.stkRequest(checkoutRequestId),
        JSON.stringify({ status: 'pending' }),
        120
      )

      logger.info(
        `STK push initiated — phone: ${phone}, amount: ${input.amount}, ` +
        `checkoutRequestId: ${checkoutRequestId}`
      )

      return {
        checkoutRequestId,
        merchantRequestId: data.MerchantRequestID,
        responseDescription: data.ResponseDescription,
      }
    } catch (error) {
      if (error instanceof AppError) throw error
      logger.error('STK push request failed:', error)
      throw new AppError('Failed to initiate STK push', 502)
    }
  }

  /**
   * Queries Daraja directly for the status of a CheckoutRequestID.
   * Used as a fallback when the callback hasn't arrived yet.
   */
  async queryStkStatus(checkoutRequestId: string): Promise<{
    resultCode: string
    resultDesc: string
  }> {
    const token = await this.getOAuthToken()
    const timestamp = this.getTimestamp()
    const password = this.generatePassword(timestamp)

    try {
      const { data } = await axios.post(
        `${env.daraja.baseUrl}/mpesa/stkpushquery/v1/query`,
        {
          BusinessShortCode: env.daraja.shortcode,
          Password: password,
          Timestamp: timestamp,
          CheckoutRequestID: checkoutRequestId,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      )

      return {
        resultCode: String(data.ResultCode),
        resultDesc: data.ResultDesc,
      }
    } catch (error) {
      logger.error('STK status query failed:', error)
      throw new AppError('Failed to query STK status', 502)
    }
  }
}
