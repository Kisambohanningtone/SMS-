import axios from 'axios'
import { env } from '@config/env'
import { logger } from '@config/logger'
import { AppError } from '@middleware/errorHandler'
import { Payment, Unit, Property, Tenant, Agent } from '@models/index'
import { PaymentMethod } from '@models/Payment'
import { calculateWalternFee } from './PaymentService'

/**
 * C2BService — Safaricom Daraja C2B (Customer to Business) Paybill integration.
 *
 * Flow:
 *  Tenant opens M-Pesa → Pay Bill → enters agent Paybill number
 *  → enters unit number as account reference (e.g. "C 1")
 *  → enters amount → confirms PIN
 *  → Safaricom fires webhook to POST /webhooks/c2b/confirm
 *  → this service records the payment with 0.5% Waltern fee split
 *
 * Once Safaricom approves the Split Payment feature on Waltern Tech
 * Paybill 247247, the 0.5% is automatically routed to Waltern Tech
 * at transaction source — before the agent sees any money.
 *
 * Idempotency: Safaricom may retry webhooks. We dedupe on TransID
 * (the M-Pesa receipt number) which is unique per transaction.
 */

export interface C2BConfirmPayload {
  TransactionType: string    // "Pay Bill"
  TransID: string            // M-Pesa receipt e.g. "REH123456789"
  TransTime: string          // "20260615120000"
  TransAmount: string        // "3000.00"
  BusinessShortCode: string  // Agent Paybill e.g. "247247"
  BillRefNumber: string      // Unit number entered by tenant e.g. "C 1"
  InvoiceNumber: string
  OrgAccountBalance: string
  ThirdPartyTransID: string
  MSISDN: string             // Tenant phone e.g. "254708374149"
  FirstName: string
  MiddleName: string
  LastName: string
}

export interface C2BValidatePayload {
  TransactionType: string
  TransID: string
  TransAmount: string
  BusinessShortCode: string
  BillRefNumber: string
  MSISDN: string
  FirstName: string
}

export class C2BService {

  /**
   * Validation — Safaricom calls this BEFORE processing the payment.
   * Return ResultCode "0" to accept, "C2B00007" to reject.
   * We accept everything and handle edge cases in confirmation.
   */
  async validate(payload: C2BValidatePayload): Promise<{ ResultCode: string; ResultDesc: string }> {
    const { BusinessShortCode, BillRefNumber, TransAmount } = payload

    const agent = await Agent.findOne({ where: { paybill_number: BusinessShortCode } })
    if (!agent) {
      logger.warn(`C2B validate — unknown Paybill: ${BusinessShortCode}`)
      // Accept anyway — don't reject money, log it and investigate
      return { ResultCode: '0', ResultDesc: 'Accepted' }
    }

    const amount = parseFloat(TransAmount)
    if (amount < 1) {
      return { ResultCode: 'C2B00007', ResultDesc: 'Amount below minimum' }
    }

    logger.info(`C2B validate OK — Paybill: ${BusinessShortCode}, ref: "${BillRefNumber}", amount: ${amount}`)
    return { ResultCode: '0', ResultDesc: 'Accepted' }
  }

  /**
   * Confirmation — Safaricom calls this AFTER payment is processed.
   * Money has moved. Must return 200 fast. All heavy processing here.
   */
  async handleConfirmation(payload: C2BConfirmPayload): Promise<void> {
    const { TransID, TransAmount, BusinessShortCode, BillRefNumber, MSISDN, FirstName, LastName } = payload

    // Idempotency — never record same receipt twice
    const existing = await Payment.findOne({ where: { mpesa_receipt: TransID } })
    if (existing) {
      logger.info(`C2B duplicate ignored — TransID: ${TransID}`)
      return
    }

    const amount = Math.round(parseFloat(TransAmount))

    // Find agent by Paybill shortcode
    const agent = await Agent.findOne({
      where: { paybill_number: BusinessShortCode },
    })

    if (!agent) {
      logger.warn(`C2B confirm — no agent for Paybill: ${BusinessShortCode}, TransID: ${TransID}`)
      return
    }

    // Match unit by BillRefNumber (what tenant typed as account reference)
    const unit = await this.matchUnit(agent.id, BillRefNumber)

    if (!unit) {
      logger.warn(
        `C2B payment KES ${amount} received — unit ref "${BillRefNumber}" could not be matched. ` +
        `TransID: ${TransID}, phone: ${MSISDN}. Agent ${agent.id} must assign manually.`
      )
      // In Phase 5 this parks in a pending_assignments queue visible on dashboard
      return
    }

    // Find active tenant on this unit
    const tenant = await Tenant.findOne({ where: { unit_id: unit.id, is_active: true } })

    const now = new Date()
    const waltern_fee = calculateWalternFee(amount)

    await Payment.create({
      unit_id: unit.id,
      tenant_id: tenant?.id ?? null,
      property_id: unit.property_id,
      agent_id: agent.id,
      gross_amount: amount,
      waltern_fee,
      agent_amount: amount - waltern_fee,
      month: now.getMonth() + 1,
      year: now.getFullYear(),
      payment_method: PaymentMethod.PAYBILL,
      mpesa_receipt: TransID,
      payer_phone: MSISDN,
      split_confirmed: true,
      confirmed_at: now,
    })

    logger.info(
      `C2B payment recorded — unit: ${unit.unit_number}, amount: KES ${amount}, ` +
      `waltern_fee: KES ${waltern_fee}, agent_amount: KES ${amount - waltern_fee}, ` +
      `TransID: ${TransID}, payer: ${FirstName} ${LastName} (${MSISDN})`
    )
  }

  /**
   * Registers C2B validation + confirmation URLs with Safaricom.
   * Call this ONCE per agent Paybill when they onboard.
   * Requires a valid Daraja OAuth token.
   */
  async registerUrls(shortcode: string, token: string): Promise<void> {
    const baseUrl = env.app.baseUrl ?? 'https://yourdomain.com'
    try {
      const { data } = await axios.post(
        `${env.daraja.baseUrl}/mpesa/c2b/v1/registerurl`,
        {
          ShortCode: shortcode,
          ResponseType: 'Completed',
          ConfirmationURL: `${baseUrl}/webhooks/c2b/confirm`,
          ValidationURL: `${baseUrl}/webhooks/c2b/validate`,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      logger.info(`C2B URLs registered for Paybill ${shortcode}`, data)
    } catch (err) {
      logger.error(`C2B URL registration failed for ${shortcode}:`, err)
      throw new AppError('Failed to register C2B URLs with Safaricom', 502)
    }
  }

  /**
   * Matches BillRefNumber to a unit.
   * Tries: exact → no-space → partial → skip.
   * e.g. "C 1", "C1", "UNIT C1", "c1" all match unit_number "C 1"
   */
  private async matchUnit(agentId: string, billRef: string): Promise<Unit | null> {
    if (!billRef?.trim()) return null

    const ref = billRef.trim().toUpperCase()
    const refNoSpace = ref.replace(/\s+/g, '')

    const properties = await Property.findAll({ where: { agent_id: agentId, is_active: true } })
    if (!properties.length) return null

    const propertyIds = properties.map(p => p.id)
    const units = await Unit.findAll({ where: { property_id: propertyIds } })

    // 1. Exact match (e.g. "C 1" === "C 1")
    let hit = units.find(u => u.unit_number.toUpperCase() === ref)
    if (hit) return hit

    // 2. Space-stripped match (e.g. "C1" matches "C 1")
    hit = units.find(u => u.unit_number.replace(/\s+/g, '').toUpperCase() === refNoSpace)
    if (hit) return hit

    // 3. Partial — ref contains unit number (e.g. "UNIT C1" contains "C 1")
    hit = units.find(u => refNoSpace.includes(u.unit_number.replace(/\s+/g, '').toUpperCase()))
    if (hit) return hit

    return null
  }
}
