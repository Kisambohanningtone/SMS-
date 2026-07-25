/**
 * sanitiseResponse — PRD 3.3
 *
 * Strips Waltern Tech commission data from API responses
 * when the requester is an agent or owner.
 *
 * SECURITY RULE: waltern_fee must NEVER reach agent or owner browsers.
 * This runs as Express middleware — strips at the network layer,
 * not in the service layer, so it cannot be bypassed by a code change elsewhere.
 *
 * Fields stripped for role=agent|owner:
 *   waltern_fee, waltern_fee_total, walternFee, walternFeeTotal,
 *   commission_rate, waltern_commission, commission
 *
 * Super_admin and admin see full data.
 */
import { Request, Response, NextFunction } from 'express'

const WALTERN_FIELDS = new Set([
  'waltern_fee',
  'waltern_fee_total',
  'walternFee',
  'walternFeeTotal',
  'walternTotal',
  'commission_rate',
  'waltern_commission',
  'commission',
])

function stripWalternFields(obj: unknown): unknown {
  if (Array.isArray(obj)) return obj.map(stripWalternFields)
  if (obj && typeof obj === 'object') {
    const result: Record<string, unknown> = {}
    for (const [key, val] of Object.entries(obj as Record<string, unknown>)) {
      if (WALTERN_FIELDS.has(key)) continue // strip it
      result[key] = stripWalternFields(val)
    }
    return result
  }
  return obj
}

export function sanitiseForRole(req: Request, res: Response, next: NextFunction): void {
  const role = req.user?.role

  // Only strip for agents and owners — admins and super_admin see everything
  if (role !== 'agent' && role !== 'owner') {
    next()
    return
  }

  // Override res.json to intercept and sanitise the response
  const originalJson = res.json.bind(res)
  res.json = (body: unknown) => {
    const sanitised = stripWalternFields(body)
    return originalJson(sanitised)
  }

  next()
}
