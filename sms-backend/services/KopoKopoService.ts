import axios from 'axios'
import { env } from '@config/env'
import { logger } from '@config/logger'
import { AppError } from '@middleware/errorHandler'
import { redisGet, redisSet, REDIS_KEYS } from '@config/redis'
import { Payment, Unit, Property, Tenant, Agent } from '@models/index'
import { PaymentMethod } from '@models/Payment'
import { calculateWalternFee } from './PaymentService'

/**
 * KopoKopo webhook payload shape for "buygoods_transaction_received" events.
 * Reference: https://api-docs.kopokopo.com/
 */
export interface KopoKopoWebhookPayload {
  topic: string
  id: string
  created_at: string
  event: {
    type: string
    resource: {
      id: string
      reference: string
      origination_time: string
      amount: number
      currency: string
      sender_phone_number: string
      till_number: string
      status: string
      system: string
    }
  }
}

/**
 * KopoKopoService — handles incoming "till payment" webhooks.
 *
 * Flow: tenant pays into the agent's KopoKopo Buy Goods till -> KopoKopo
 * fires a webhook -> we identify which agent's till received it (via
 * till_number on the Agent record) -> match the amount to a unit if
 * possible (heuristic: most recent vacant/overdue unit, or manual review) ->
 * record the Payment with the 0.5% Waltern fee split.
 *
 * Idempotency: KopoKopo retries webhooks on non-200 responses, and may
 * send duplicates. We dedupe on event.resource.reference (KopoKopo's
 * unique transaction reference) stored as kopokopo_payment_ref.
 */
export class KopoKopoService {

  /**
   * Returns a cached OAuth token, or fetches + caches a new one.
   * KopoKopo tokens last 3600s — cached for 3500s.
   */
  async getOAuthToken(): Promise<string> {
    const cached = await redisGet(REDIS_KEYS.kopokopoToken)
    if (cached) return cached

    if (!env.kopokopo.clientId || !env.kopokopo.clientSecret) {
      throw new AppError(
        'KopoKopo credentials not configured — set KOPOKOPO_CLIENT_ID and KOPOKOPO_CLIENT_SECRET in .env',
        501
      )
    }

    try {
      const { data } = await axios.post(
        `${env.kopokopo.baseUrl}/oauth/token`,
        new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: env.kopokopo.clientId,
          client_secret: env.kopokopo.clientSecret,
        }),
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
      )

      const token = data.access_token as string
      const expiresIn = Number(data.expires_in ?? 3600)

      await redisSet(REDIS_KEYS.kopokopoToken, token, Math.max(expiresIn - 100, 60))

      logger.info('KopoKopo OAuth token refreshed')
      return token
    } catch (error) {
      logger.error('KopoKopo OAuth failed:', error)
      throw new AppError('Failed to authenticate with KopoKopo — check credentials', 502)
    }
  }

  /**
   * Processes an incoming "Buy Goods transaction received" webhook.
   * Records the payment against the agent identified by till_number.
   *
   * NOTE: KopoKopo till payments don't carry an AccountReference like
   * STK push does, so the unit cannot be auto-matched. This records
   * an "unassigned" payment (unit_id left null is not allowed by schema,
   * so this requires agent follow-up via the dashboard to assign it to
   * a unit) — see assignPaymentToUnit().
   */
  async handleWebhook(payload: KopoKopoWebhookPayload): Promise<void> {
    if (payload.event?.type !== 'Buy Goods Transaction Received' &&
        payload.event?.type !== 'buygoods_transaction_received') {
      logger.info(`KopoKopo webhook ignored — event type: ${payload.event?.type}`)
      return
    }

    const resource = payload.event.resource
    const { reference, amount, sender_phone_number, till_number } = resource

    // Idempotency check
    const existing = await Payment.findOne({ where: { kopokopo_payment_ref: reference } })
    if (existing) {
      logger.info(`KopoKopo webhook duplicate ignored — reference: ${reference}`)
      return
    }

    // Find the agent who owns this till
    const agent = await Agent.findOne({ where: { kopokopo_till_number: till_number } })
    if (!agent) {
      logger.warn(`KopoKopo webhook — no agent found for till_number: ${till_number}`)
      return
    }

    // Find agent's first property to attach this payment to for now —
    // production should prompt the agent to assign it via dashboard.
    const property = await Property.findOne({
      where: { agent_id: agent.id, is_active: true },
      order: [['created_at', 'ASC']],
    })

    if (!property) {
      logger.warn(`KopoKopo webhook — agent ${agent.id} has no properties to attach payment`)
      return
    }

    // Try to find an overdue/vacant-no unit by matching sender phone to a tenant
    const tenant = await Tenant.findOne({
      where: { phone: sender_phone_number, is_active: true },
      include: [{ model: Unit, as: 'unit' }],
    })

    const unit = tenant?.unit as Unit | undefined

    if (!unit) {
      logger.warn(
        `KopoKopo payment received but no matching tenant for phone ${sender_phone_number} — ` +
        `reference: ${reference}, amount: ${amount}. Manual assignment required.`
      )
      // We cannot create a Payment without unit_id (schema constraint).
      // In production this would go to a "pending_assignments" queue.
      return
    }

    const now = new Date()
    const waltern_fee = calculateWalternFee(amount)

    await Payment.create({
      unit_id: unit.id,
      tenant_id: tenant!.id,
      property_id: unit.property_id,
      agent_id: agent.id,
      gross_amount: amount,
      waltern_fee,
      agent_amount: amount - waltern_fee,
      month: now.getMonth() + 1,
      year: now.getFullYear(),
      payment_method: PaymentMethod.KOPOKOPO,
      kopokopo_payment_ref: reference,
      payer_phone: sender_phone_number,
      split_confirmed: true,
      confirmed_at: now,
    })

    logger.info(
      `KopoKopo payment recorded — unit: ${unit.unit_number}, amount: ${amount}, ` +
      `waltern_fee: ${waltern_fee}, reference: ${reference}`
    )
  }
}
