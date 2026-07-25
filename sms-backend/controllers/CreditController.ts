import { Request, Response, NextFunction } from 'express'
import { CreditService } from '@services/CreditService'

const svc = new CreditService()

export async function getEffectiveDue(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await svc.getEffectiveDue(req.params.tenantId)
    res.json({ success: true, data })
  } catch (err) { next(err) }
}

export async function getLedger(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await svc.getLedger(req.params.tenantId)
    res.json({ success: true, data })
  } catch (err) { next(err) }
}
