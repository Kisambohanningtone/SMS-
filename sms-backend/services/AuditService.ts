/**
 * AuditService — PRD 6.1 Audit Log
 *
 * Tracks: utility rate changes, credit adjustments,
 *         commission data access, admin actions.
 * Table: audit_log
 */
import { sequelize } from '@config/db'
import { logger } from '@config/logger'
import { Request } from 'express'

export class AuditService {

  async log(data: {
    userId?: string
    action: string
    entityType?: string
    entityId?: string
    oldValue?: Record<string, unknown>
    newValue?: Record<string, unknown>
    req?: Request
  }): Promise<void> {
    try {
      const ipAddress = data.req
        ? (data.req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim()
          ?? data.req.socket?.remoteAddress
          ?? null
        : null

      const userAgent = data.req?.headers['user-agent'] ?? null

      await sequelize.query(`
        INSERT INTO audit_log
          (id, user_id, action, entity_type, entity_id, old_value, new_value, ip_address, user_agent)
        VALUES
          (gen_random_uuid(), :userId, :action, :entityType, :entityId,
           :oldValue::jsonb, :newValue::jsonb, :ipAddress, :userAgent)
      `, {
        replacements: {
          userId: data.userId ?? null,
          action: data.action,
          entityType: data.entityType ?? null,
          entityId: data.entityId ?? null,
          oldValue: data.oldValue ? JSON.stringify(data.oldValue) : null,
          newValue: data.newValue ? JSON.stringify(data.newValue) : null,
          ipAddress,
          userAgent,
        }
      })
    } catch (err) {
      // Never let audit logging break the main request
      logger.error('AuditService.log failed:', err)
    }
  }

  async getLog(filters: {
    userId?: string
    entityType?: string
    entityId?: string
    action?: string
    limit?: number
    offset?: number
  }) {
    const where: string[] = ['1=1']
    const replacements: Record<string, unknown> = {}

    if (filters.userId) { where.push('user_id = :userId'); replacements.userId = filters.userId }
    if (filters.entityType) { where.push('entity_type = :entityType'); replacements.entityType = filters.entityType }
    if (filters.entityId) { where.push('entity_id = :entityId'); replacements.entityId = filters.entityId }
    if (filters.action) { where.push('action ILIKE :action'); replacements.action = `%${filters.action}%` }

    replacements.limit = filters.limit ?? 50
    replacements.offset = filters.offset ?? 0

    const [rows] = await sequelize.query(`
      SELECT al.*, u.email, u.full_name
      FROM audit_log al
      LEFT JOIN users u ON al.user_id = u.id
      WHERE ${where.join(' AND ')}
      ORDER BY al.created_at DESC
      LIMIT :limit OFFSET :offset
    `, { replacements, type: 'SELECT' as any }) as any[]

    return rows
  }
}

// Singleton — import this everywhere
export const auditService = new AuditService()
