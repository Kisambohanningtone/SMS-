/**
 * CreditService — PRD 3.7 Overpayment Credit Balance
 *
 * When tenant pays more than rent due → excess goes to credit_balance
 * Next month: effectiveRentDue = rentAmount - credit_balance
 *
 * Tables: tenants.credit_balance (INTEGER), credit_ledger
 */
import { logger } from '@config/logger'
import { AppError } from '@middleware/errorHandler'
import { sequelize } from '@config/db'

export class CreditService {

  /**
   * Called by PaymentService after every payment.
   * Calculates overpayment, updates credit_balance, logs to credit_ledger.
   */
  async processPayment(
    tenantId: string,
    paymentId: string,
    grossAmount: number,
    rentDue: number
  ): Promise<{ overpayment: number; creditUsed: number; newCreditBalance: number }> {
    // Get current credit balance
    const [tenantRows] = await sequelize.query(
      `SELECT credit_balance FROM tenants WHERE id = :tenantId`,
      { replacements: { tenantId }, type: 'SELECT' as any }
    ) as any[]
    const currentCredit = Number(tenantRows[0]?.credit_balance ?? 0)

    // Get total paid this month
    const now = new Date()
    const [paidRows] = await sequelize.query(`
      SELECT COALESCE(SUM(gross_amount), 0) as total
      FROM payments
      WHERE tenant_id = :tenantId
        AND month = :month AND year = :year
        AND is_voided = false
    `, {
      replacements: { tenantId, month: now.getMonth() + 1, year: now.getFullYear() },
      type: 'SELECT' as any,
    }) as any[]

    const totalPaidThisMonth = Number((paidRows as any)[0]?.total ?? 0)
    const creditUsed = Math.min(currentCredit, rentDue)
    const effectiveDue = Math.max(0, rentDue - creditUsed)
    const overpayment = Math.max(0, totalPaidThisMonth - effectiveDue)
    const newCreditBalance = currentCredit - creditUsed + overpayment

    // Update tenant credit_balance
    await sequelize.query(
      `UPDATE tenants SET credit_balance = :balance, updated_at = NOW() WHERE id = :tenantId`,
      { replacements: { balance: newCreditBalance, tenantId } }
    )

    // Log credit used
    if (creditUsed > 0) {
      await sequelize.query(`
        INSERT INTO credit_ledger (id, tenant_id, payment_id, amount, type, description, balance_after)
        VALUES (gen_random_uuid(), :tenantId, :paymentId, :amount, 'debit', 'Credit applied to rent', :balance)
      `, { replacements: { tenantId, paymentId, amount: creditUsed, balance: newCreditBalance } })
    }

    // Log overpayment credit
    if (overpayment > 0) {
      await sequelize.query(`
        INSERT INTO credit_ledger (id, tenant_id, payment_id, amount, type, description, balance_after)
        VALUES (gen_random_uuid(), :tenantId, :paymentId, :amount, 'credit', 'Overpayment credited', :balance)
      `, { replacements: { tenantId, paymentId, amount: overpayment, balance: newCreditBalance } })
      logger.info(`Overpayment: tenant ${tenantId} KES ${overpayment} → new credit KES ${newCreditBalance}`)
    }

    return { overpayment, creditUsed, newCreditBalance }
  }

  /** Get effective rent due this month (rent minus credit balance) */
  async getEffectiveDue(tenantId: string): Promise<{
    rentAmount: number; creditBalance: number; effectiveDue: number
  }> {
    const [rows] = await sequelize.query(`
      SELECT t.credit_balance,
             COALESCE(utg.rent_amount, p.default_rent, 0) as rent_amount
      FROM tenants t
      JOIN units u ON t.unit_id = u.id
      JOIN properties p ON u.property_id = p.id
      LEFT JOIN unit_type_groups utg ON u.unit_type_group_id = utg.id
      WHERE t.id = :tenantId
    `, { replacements: { tenantId }, type: 'SELECT' as any }) as any[]

    const row = (rows as any)[0]
    if (!row) throw new AppError('Tenant not found', 404)

    const rentAmount = Number(row.rent_amount)
    const creditBalance = Number(row.credit_balance ?? 0)
    return { rentAmount, creditBalance, effectiveDue: Math.max(0, rentAmount - creditBalance) }
  }

  /** Credit ledger history for a tenant */
  async getLedger(tenantId: string) {
    const [rows] = await sequelize.query(`
      SELECT cl.*, p.gross_amount, p.payment_method
      FROM credit_ledger cl
      LEFT JOIN payments p ON cl.payment_id = p.id
      WHERE cl.tenant_id = :tenantId
      ORDER BY cl.created_at DESC LIMIT 50
    `, { replacements: { tenantId }, type: 'SELECT' as any }) as any[]
    return rows
  }
}
