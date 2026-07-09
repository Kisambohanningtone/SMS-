import axios from 'axios'
import { logger } from '@config/logger'
import { env } from '@config/env'
import { AppError } from '@middleware/errorHandler'

export interface SmsResult {
  messageId: string
  status: string
  cost?: string
}

export interface WhatsAppResult {
  messageId: string
  status: string
}

/**
 * NotificationService — Africa's Talking SMS and WhatsApp integration.
 *
 * Calls the Africa's Talking REST API directly via axios rather than
 * their official Node SDK. The SDK (v0.8.0) has a known issue where its
 * internal axios instance sends malformed auth headers that the API
 * rejects with 401, even with valid credentials — verified via direct
 * curl testing against the same endpoint with identical credentials,
 * which succeeds. Calling the REST API directly avoids this entirely.
 */
export class NotificationService {

  private get baseUrl(): string {
    // Sandbox uses a different host than production
    return env.africastalking.username === 'sandbox'
      ? 'https://api.sandbox.africastalking.com'
      : 'https://api.africastalking.com'
  }

  async sendSms(phone: string, message: string): Promise<SmsResult> {
    if (!env.africastalking.apiKey) {
      throw new AppError(
        "Africa's Talking not configured — set AT_API_KEY in .env",
        501
      )
    }

    try {
      const { data } = await axios.post(
        `${this.baseUrl}/version1/messaging`,
        new URLSearchParams({
          username: env.africastalking.username,
          to: phone,
          message,
          ...(env.africastalking.senderId ? { from: env.africastalking.senderId } : {}),
        }),
        {
          headers: {
            apiKey: env.africastalking.apiKey,
            'Content-Type': 'application/x-www-form-urlencoded',
            Accept: 'application/json',
          },
        }
      )

      const recipient = data.SMSMessageData?.Recipients?.[0]

      // Debug — log the full AT response so we can see exactly what's returned
      logger.debug(`AT SMS raw response: ${JSON.stringify(data)}`)
      logger.debug(`AT recipient: ${JSON.stringify(recipient)}`)

      if (!recipient || recipient.status !== 'Success') {
        throw new Error(recipient?.status ?? 'Unknown SMS error')
      }

      logger.info(`SMS sent to ${phone} — messageId: ${recipient.messageId}`)

      return {
        messageId: recipient.messageId,
        status: recipient.status,
        cost: recipient.cost,
      }
    } catch (error) {
      logger.error(`SMS failed to ${phone}:`, error)
      const msg = axios.isAxiosError(error)
        ? (error.response?.data?.SMSMessageData?.Recipients?.[0]?.status ?? error.message)
        : (error as Error).message
      throw new AppError(`SMS delivery failed: ${msg}`, 502)
    }
  }

  async sendWhatsApp(phone: string, message: string): Promise<WhatsAppResult> {
    if (!env.africastalking.apiKey) {
      throw new AppError(
        "Africa's Talking not configured — set AT_API_KEY in .env",
        501
      )
    }
    if (!env.africastalking.whatsappSender) {
      throw new AppError(
        'WhatsApp sender not configured — set AT_WHATSAPP_SENDER in .env',
        501
      )
    }

    try {
      const { data } = await axios.post(
        `${this.baseUrl}/whatsapp/message/send`,
        {
          username: env.africastalking.username,
          productId: env.africastalking.whatsappSender,
          to: phone,
          message: { type: 'text', body: { text: message } },
        },
        {
          headers: {
            apiKey: env.africastalking.apiKey,
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
        }
      )

      logger.info(`WhatsApp sent to ${phone}`)

      return {
        messageId: data?.messageId ?? data?.data?.messageId ?? 'unknown',
        status: 'sent',
      }
    } catch (error) {
      logger.error(`WhatsApp failed to ${phone}:`, error)
      const msg = axios.isAxiosError(error)
        ? (error.response?.data?.message ?? error.message)
        : (error as Error).message
      throw new AppError(`WhatsApp delivery failed: ${msg}`, 502)
    }
  }

  /**
   * Render a reminder template replacing placeholders:
   * [Tenant Name], [Unit Number], [Property Name], [Amount Due], [Month]
   */
  renderTemplate(
    template: string,
    vars: {
      tenantName: string
      unitNumber: string
      propertyName: string
      amountDue: number
      month: string
    }
  ): string {
    return template
      .replace(/\[Tenant Name\]/gi, vars.tenantName)
      .replace(/\[Unit Number\]/gi, vars.unitNumber)
      .replace(/\[Property Name\]/gi, vars.propertyName)
      .replace(/\[Amount Due\]/gi, `KES ${vars.amountDue.toLocaleString()}`)
      .replace(/\[Month\]/gi, vars.month)
  }
}
