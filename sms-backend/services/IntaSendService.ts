import axios from 'axios'
import { logger } from '@config/logger'
import { env } from '@config/env'
import { Payment, Agent } from '@models/index'
import { Op } from 'sequelize'

/**
 * IntaSendService — handles agent disbursements after C2B confirmation.
 *
 * After Safaricom confirms payment into Waltern Paybill 247247,
 * this service pays out the agent's 99.5% share via IntaSend API.
 *
 * Flow:
 *  C2B confirmed → SplitPaymentService calculates split
 *  → IntaSendService.disburseToAgent() called
 *  → IntaSend fires payout to agent M-Pesa or bank
 *  → IntaSend webhook updates b2c_status on payment record
 *  → Retry cron picks up failed payouts every 10 minutes
 */
export class IntaSendService {
  private get baseUrl(): string {
    return env.intasend?.sandbox
      ? 'https://sandbox.intasend.com'
      : 'https://payment.intasend.com'
  }

  private get headers() {
    return {
      Authorization: `Bearer ${env.intasend?.apiKey ?? ''}`,
      'Content-Type': 'application/json',
    }
  }

  /**
   * Disburse agent's share after a confirmed C2B payment.
   * Called from C2BService.handleConfirmation() asynchronously.
   */
  async disburseToAgent(paymentId: string): Promise<void> {
    const payment = await Payment.findByPk(paymentId, {
      include: [{ model: Agent, as: 'agent' }],
    })
    if (!payment) {
      logger.error(`IntaSend: payment ${paymentId} not found`)
      return
    }
    if (payment.b2c_status === 'sent') {
      logger.info(`IntaSend: payment ${paymentId} already disbursed`)
      return
    }

    const agent = payment.agent as Agent
    if (!agent?.mpesa_number) {
      logger.warn(`IntaSend: agent ${payment.agent_id} has no mpesa_number — skipping disbursement`)
      await payment.update({ b2c_status: 'failed' })
      return
    }

    const phone = this.normalizePhone(agent.mpesa_number)
    const agentName = agent.business_name ?? 'Agent'
    const narrative = `Rent disbursement - ${payment.month}/${payment.year}`

    try {
      await payment.update({
        b2c_attempts: payment.b2c_attempts + 1,
        b2c_last_attempt_at: new Date(),
      })

      if (!env.intasend?.apiKey) {
        // No IntaSend configured — log and mark as pending for manual payout
        logger.warn(`IntaSend not configured — payment ${paymentId} queued for manual disbursement`)
        await payment.update({ b2c_status: 'pending' })
        return
      }

      const { data } = await axios.post(
        `${this.baseUrl}/api/v1/send-money/mpesa/`,
        {
          currency: 'KES',
          transactions: [{
            name: agentName,
            account: phone,
            amount: payment.agent_amount,
            narrative,
          }],
        },
        { headers: this.headers }
      )

      const ref = data?.tracking_id ?? data?.id ?? 'unknown'
      await payment.update({
        b2c_status: 'sent',
        intasend_ref: ref,
      })

      logger.info(
        `IntaSend disbursement sent — paymentId: ${paymentId}, ` +
        `agent: ${agent.id}, amount: KES ${payment.agent_amount}, ref: ${ref}`
      )
    } catch (err: any) {
      const msg = axios.isAxiosError(err)
        ? JSON.stringify(err.response?.data)
        : (err as Error).message
      logger.error(`IntaSend disbursement failed — paymentId: ${paymentId}: ${msg}`)
      await payment.update({ b2c_status: 'failed' })
    }
  }

  /**
   * Retry cron — called every 10 minutes for failed payouts.
   * Max 3 attempts per payment. After that, admin alert is triggered.
   */
  async retryFailedDisbursements(): Promise<void> {
    const failed = await Payment.findAll({
      where: {
        b2c_status: 'failed',
        b2c_attempts: { [Op.lt]: 3 },
        payment_method: 'paybill',
      },
      limit: 50,
    })

    if (!failed.length) return

    logger.info(`IntaSend retry cron — ${failed.length} failed payouts to retry`)
    for (const p of failed) {
      await this.disburseToAgent(p.id)
    }
  }

  /**
   * Handle IntaSend payout webhook — updates payment b2c_status.
   */
  async handleWebhook(payload: any): Promise<void> {
    const { tracking_id, state, failed_reason } = payload
    if (!tracking_id) return

    const payment = await Payment.findOne({ where: { intasend_ref: tracking_id } })
    if (!payment) {
      logger.warn(`IntaSend webhook — no payment found for ref: ${tracking_id}`)
      return
    }

    if (state === 'COMPLETE') {
      await payment.update({ b2c_status: 'sent' })
      logger.info(`IntaSend payout confirmed — ref: ${tracking_id}`)
    } else if (state === 'FAILED') {
      await payment.update({ b2c_status: 'failed' })
      logger.error(`IntaSend payout failed — ref: ${tracking_id}, reason: ${failed_reason}`)
    }
  }

  private normalizePhone(phone: string): string {
    const digits = phone.replace(/\D/g, '')
    if (digits.startsWith('254')) return digits
    if (digits.startsWith('0')) return `254${digits.slice(1)}`
    if (digits.startsWith('7') || digits.startsWith('1')) return `254${digits}`
    return digits
  }
}
