/**
 * UtilityService — PRD 3.4 Utility Billing
 *
 * Handles water, electricity, garbage billing per unit.
 * Water/Electricity: units_consumed × rate_per_unit
 * Garbage: flat_fee per unit
 * Sanity check: flag if reading > 3× trailing 3-month average
 *
 * Tables: utility_rates, utility_readings
 */
import { logger } from '@config/logger'
import { AppError } from '@middleware/errorHandler'
import { sequelize } from '@config/db'

export type UtilityType = 'water' | 'electricity' | 'garbage'

export interface CreateReadingInput {
  unitId: string
  propertyId: string
  utilityType: UtilityType
  month: number
  year: number
  previousReading?: number
  currentReading?: number
  photoUrl?: string
  recordedBy: string
}

export class UtilityService {

  /** Set or update utility rate for a property */
  async setRate(data: {
    propertyId: string
    utilityType: UtilityType
    ratePerUnit?: number
    flatFee?: number
    createdBy: string
  }) {
    await sequelize.query(`
      INSERT INTO utility_rates (id, property_id, utility_type, rate_per_unit, flat_fee, created_by)
      VALUES (gen_random_uuid(), :propertyId, :utilityType, :ratePerUnit, :flatFee, :createdBy)
      ON CONFLICT (property_id, utility_type, effective_from)
      DO UPDATE SET rate_per_unit = :ratePerUnit, flat_fee = :flatFee, updated_at = NOW()
    `, {
      replacements: {
        propertyId: data.propertyId,
        utilityType: data.utilityType,
        ratePerUnit: data.ratePerUnit ?? null,
        flatFee: data.flatFee ?? null,
        createdBy: data.createdBy,
      }
    })

    // Log rate change to audit_log
    await sequelize.query(`
      INSERT INTO audit_log (id, user_id, action, entity_type, new_value)
      VALUES (gen_random_uuid(), :userId, 'utility_rate_changed', 'utility_rates',
              :newValue::jsonb)
    `, {
      replacements: {
        userId: data.createdBy,
        newValue: JSON.stringify({
          propertyId: data.propertyId,
          utilityType: data.utilityType,
          ratePerUnit: data.ratePerUnit,
          flatFee: data.flatFee,
        })
      }
    })

    return { success: true }
  }

  /** Get current rates for a property */
  async getRates(propertyId: string) {
    const [rows] = await sequelize.query(`
      SELECT DISTINCT ON (utility_type)
        id, utility_type, rate_per_unit, flat_fee, effective_from
      FROM utility_rates
      WHERE property_id = :propertyId
      ORDER BY utility_type, effective_from DESC
    `, { replacements: { propertyId }, type: 'SELECT' as any }) as any[]
    return rows
  }

  /** Record a utility reading for a unit */
  async recordReading(input: CreateReadingInput) {
    // Get current rate
    const [rateRows] = await sequelize.query(`
      SELECT rate_per_unit, flat_fee FROM utility_rates
      WHERE property_id = :propertyId AND utility_type = :utilityType
      ORDER BY effective_from DESC LIMIT 1
    `, {
      replacements: { propertyId: input.propertyId, utilityType: input.utilityType },
      type: 'SELECT' as any,
    }) as any[]

    const rate = (rateRows as any)[0]
    if (!rate) throw new AppError(`No ${input.utilityType} rate configured for this property`, 400)

    // Calculate amount
    let amountCharged = 0
    let isFlagged = false
    let flagReason = null

    if (input.utilityType === 'garbage') {
      amountCharged = Number(rate.flat_fee ?? 0)
    } else {
      const consumed = (input.currentReading ?? 0) - (input.previousReading ?? 0)
      if (consumed < 0) throw new AppError('Current reading cannot be less than previous reading', 400)
      amountCharged = Math.round(consumed * Number(rate.rate_per_unit ?? 0))

      // Sanity check — flag if > 3× trailing 3-month average
      const [avgRows] = await sequelize.query(`
        SELECT AVG(units_consumed) as avg_consumed
        FROM utility_readings
        WHERE unit_id = :unitId AND utility_type = :utilityType
          AND (year * 12 + month) > ((:year * 12 + :month) - 4)
          AND (year * 12 + month) < (:year * 12 + :month)
      `, {
        replacements: { unitId: input.unitId, utilityType: input.utilityType, year: input.year, month: input.month },
        type: 'SELECT' as any,
      }) as any[]

      const avgConsumed = Number((avgRows as any)[0]?.avg_consumed ?? 0)
      if (avgConsumed > 0 && consumed > avgConsumed * 3) {
        isFlagged = true
        flagReason = `Reading ${consumed} is more than 3× the 3-month average of ${avgConsumed.toFixed(1)}`
        logger.warn(`Utility reading flagged: unit ${input.unitId} ${input.utilityType} — ${flagReason}`)
      }
    }

    // Upsert reading
    await sequelize.query(`
      INSERT INTO utility_readings
        (id, unit_id, property_id, utility_type, month, year,
         previous_reading, current_reading, amount_charged,
         photo_url, is_flagged, flag_reason, recorded_by)
      VALUES
        (gen_random_uuid(), :unitId, :propertyId, :utilityType, :month, :year,
         :prevReading, :currReading, :amountCharged,
         :photoUrl, :isFlagged, :flagReason, :recordedBy)
      ON CONFLICT (unit_id, utility_type, month, year)
      DO UPDATE SET
        previous_reading = :prevReading,
        current_reading = :currReading,
        amount_charged = :amountCharged,
        photo_url = :photoUrl,
        is_flagged = :isFlagged,
        flag_reason = :flagReason,
        recorded_by = :recordedBy,
        updated_at = NOW()
    `, {
      replacements: {
        unitId: input.unitId,
        propertyId: input.propertyId,
        utilityType: input.utilityType,
        month: input.month,
        year: input.year,
        prevReading: input.previousReading ?? null,
        currReading: input.currentReading ?? null,
        amountCharged,
        photoUrl: input.photoUrl ?? null,
        isFlagged,
        flagReason,
        recordedBy: input.recordedBy,
      }
    })

    return { amountCharged, isFlagged, flagReason }
  }

  /** Get all utility readings for a property in a given month */
  async getReadings(propertyId: string, month: number, year: number) {
    const [rows] = await sequelize.query(`
      SELECT ur.*, u.unit_number
      FROM utility_readings ur
      JOIN units u ON ur.unit_id = u.id
      WHERE ur.property_id = :propertyId AND ur.month = :month AND ur.year = :year
      ORDER BY u.unit_number, ur.utility_type
    `, {
      replacements: { propertyId, month, year },
      type: 'SELECT' as any,
    }) as any[]
    return rows
  }

  /** Get utility bill total for a unit/month — used in owner reports */
  async getUnitUtilityTotal(unitId: string, month: number, year: number): Promise<number> {
    const [rows] = await sequelize.query(`
      SELECT COALESCE(SUM(amount_charged), 0) as total
      FROM utility_readings
      WHERE unit_id = :unitId AND month = :month AND year = :year
    `, { replacements: { unitId, month, year }, type: 'SELECT' as any }) as any[]
    return Number((rows as any)[0]?.total ?? 0)
  }
}
