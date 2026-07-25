import { Request, Response, NextFunction } from 'express'
import { UtilityService } from '@services/UtilityService'

const svc = new UtilityService()

export async function getRates(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await svc.getRates(req.params.propertyId)
    res.json({ success: true, data })
  } catch (err) { next(err) }
}

export async function setRate(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await svc.setRate({ ...req.body, propertyId: req.params.propertyId, createdBy: req.user!.id })
    res.json({ success: true, data })
  } catch (err) { next(err) }
}

export async function recordReading(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await svc.recordReading({ ...req.body, recordedBy: req.user!.id })
    res.status(201).json({ success: true, data })
  } catch (err) { next(err) }
}

export async function getReadings(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { month, year } = req.query
    const data = await svc.getReadings(req.params.propertyId, Number(month), Number(year))
    res.json({ success: true, data })
  } catch (err) { next(err) }
}
