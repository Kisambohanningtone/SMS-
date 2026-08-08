/**
 * NotificationService
 *
 * Handles SMS and WhatsApp dispatch via Africa's Talking.
 *
 * BUG FIX: The AT Node.js SDK has a known issue where sms.send() fails silently.
 * Fix: use direct axios REST call — same approach confirmed working via curl.
 * Reference: Status Report June 2026 — "AT SMS: curl confirmed, server-side has 1 bug"
 */
import axios from 'axios'
import { env } from '@config/env'
import { logger } from '@config/logger'

export interface NotifResult {
  success:   boolean
  messageId: string | null
  error:     string | null
}

export class NotificationService {

  /**
   * Send SMS via Africa's Talking REST API directly
   * Bypasses the AT SDK which has a known silent failure bug
   */
  async sendSms(phone: string, message: string): Promise<NotifResult> {
    const to = this._normalisePhone(phone)

    try {
      const params = new URLSearchParams({
        username: env.africastalking.username,
        to,
        message,
      })

      // Add sender ID only if configured
      if (env.africastalking.senderId?.trim()) {
        params.append('from', env.africastalking.senderId)
      }

      const response = await axios.post(
        'https://api.africastalking.com/version1/messaging',
        params,
        {
          headers: {
            apiKey:         env.africastalking.apiKey,
            'Content-Type': 'application/x-www-form-urlencoded',
            Accept:         'application/json',
          },
          timeout: 15_000,
        }
      )

      // Log full raw response — helps diagnose any future issues
      logger.debug(`AT SMS raw response: ${JSON.stringify(response.data)}`)

      const recipients = response.data?.SMSMessageData?.Recipients ?? []
      const recipient  = recipients[0]

      const success = recipient?.statusCode === 101 || recipient?.status === 'Success'

      if (!success) {
        const errMsg = recipient?.status ?? JSON.stringify(response.data)
        logger.error(`AT SMS failed for ${to}: ${errMsg}`)
        return { success: false, messageId: null, error: errMsg }
      }

      logger.info(`AT SMS sent to ${to} — msgId: ${recipient.messageId}, cost: ${recipient.cost}`)
      return { success: true, messageId: recipient.messageId ?? null, error: null }

    } catch (err: any) {
      // Log everything for debugging
      const errDetail = {
        message: err.message,
        status:  err.response?.status,
        body:    JSON.stringify(err.response?.data),
      }
      logger.error(`AT SMS request error for ${to}:`, errDetail)
      return { success: false, messageId: null, error: err.message }
    }
  }

  /**
   * Send WhatsApp message via Africa's Talking
   * Falls back to SMS if AT_WHATSAPP_SENDER is not configured
   */
  async sendWhatsApp(phone: string, message: string): Promise<NotifResult> {
    const whatsappSender = process.env.AT_WHATSAPP_SENDER?.trim()

    if (!whatsappSender) {
      logger.info('AT_WHATSAPP_SENDER not configured — falling back to SMS')
      return this.sendSms(phone, message)
    }

    const to = this._normalisePhone(phone)

    try {
      const params = new URLSearchParams({
        username: env.africastalking.username,
        to,
        message,
        from: whatsappSender,
        channel: 'whatsapp',
      })

      const response = await axios.post(
        'https://api.africastalking.com/version1/messaging',
        params,
        {
          headers: {
            apiKey:         env.africastalking.apiKey,
            'Content-Type': 'application/x-www-form-urlencoded',
            Accept:         'application/json',
          },
          timeout: 15_000,
        }
      )

      logger.debug(`AT WhatsApp raw response: ${JSON.stringify(response.data)}`)

      const recipients = response.data?.SMSMessageData?.Recipients ?? []
      const recipient  = recipients[0]
      const success    = recipient?.statusCode === 101 || recipient?.status === 'Success'

      if (!success) {
        logger.warn(`AT WhatsApp failed for ${to} — falling back to SMS`)
        return this.sendSms(phone, message)
      }

      logger.info(`AT WhatsApp sent to ${to} — msgId: ${recipient.messageId}`)
      return { success: true, messageId: recipient.messageId ?? null, error: null }

    } catch (err: any) {
      logger.error(`AT WhatsApp error for ${to} — falling back to SMS:`, err.message)
      return this.sendSms(phone, message)
    }
  }

  /** Render reminder template with tenant data */
  renderTemplate(template: string, vars: Record<string, string>): string {
    return template
      .replace(/\[Tenant Name\]/g,    vars.tenantName    ?? '')
      .replace(/\[Rent Amount\]/g,    vars.rentAmount    ?? '')
      .replace(/\[Unit Number\]/g,    vars.unitNumber    ?? '')
      .replace(/\[Property Name\]/g,  vars.propertyName  ?? '')
      .replace(/\[Till Number\]/g,    vars.tillNumber    ?? '')
      .replace(/\[Agent Name\]/g,     vars.agentName     ?? '')
      .replace(/\[Balance\]/g,        vars.balance       ?? '')
  }

  // Normalise phone to +254XXXXXXXXX format
  private _normalisePhone(phone: string): string {
    const cleaned = phone.replace(/\D/g, '')
    if (cleaned.startsWith('254') && cleaned.length === 12) return `+${cleaned}`
    if (cleaned.startsWith('0')   && cleaned.length === 10) return `+254${cleaned.slice(1)}`
    if (cleaned.startsWith('7')   && cleaned.length === 9)  return `+254${cleaned}`
    if (cleaned.startsWith('1')   && cleaned.length === 9)  return `+254${cleaned}`
    return `+${cleaned}`
  }
}
