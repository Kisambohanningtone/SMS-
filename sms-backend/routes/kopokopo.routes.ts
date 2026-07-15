import { Router, Request, Response } from 'express'
import { KopoKopoService } from '@services/KopoKopoService'
import { authenticate } from '@middleware/authenticate'
import { logger } from '@config/logger'
import { Agent } from '@models/index'

const router = Router()
const svc = new KopoKopoService()

/**
 * POST /webhooks/kopokopo
 * KopoKopo fires this when any tenant pays into any agent's till.
 * No auth — KopoKopo doesn't send JWT.
 * Respond 200 IMMEDIATELY, process async.
 */
router.post('/', async (req: Request, res: Response) => {
  res.status(200).json({ success: true })
  try {
    logger.info('KopoKopo webhook received:', JSON.stringify(req.body).slice(0, 200))
    await svc.handleWebhook(req.body)
  } catch (err) {
    logger.error('KopoKopo webhook processing error:', err)
  }
})

/**
 * POST /api/agents/till/register
 * Agent saves their KopoKopo till number + triggers webhook subscription + split config.
 * Requires authentication.
 */
router.post('/register-till', authenticate, async (req: Request, res: Response) => {
  try {
    const { tillNumber } = req.body
    if (!tillNumber) {
      res.status(400).json({ success: false, message: 'tillNumber is required' })
      return
    }

    const agentId = (req as any).user?.agentId
    if (!agentId) {
      res.status(401).json({ success: false, message: 'Agent not found' })
      return
    }

    // Save till number on agent record
    await Agent.update(
      { kopokopo_till_number: tillNumber },
      { where: { id: agentId } }
    )

    // Register with KopoKopo + configure split
    const result = await svc.registerTillWithSplit(tillNumber, agentId)

    res.json({
      success: true,
      message: result.splitConfigured
        ? `Till ${tillNumber} registered. 0.5% split to Waltern Tech configured automatically.`
        : `Till ${tillNumber} saved. Webhook active. Split payment requires manual KopoKopo dashboard setup.`,
      data: result,
    })
  } catch (err: any) {
    res.status(err.statusCode ?? 500).json({ success: false, message: err.message })
  }
})

/**
 * GET /api/agents/till/status
 * Returns current KopoKopo connection status for this agent.
 */
router.get('/till-status', authenticate, async (req: Request, res: Response) => {
  try {
    const agentId = (req as any).user?.agentId
    const agent = await Agent.findByPk(agentId, {
      attributes: ['id', 'kopokopo_till_number', 'paybill_number'],
    })

    res.json({
      success: true,
      data: {
        tillNumber:    agent?.kopokopo_till_number ?? null,
        paybillNumber: agent?.paybill_number       ?? null,
        isConnected:   !!(agent?.kopokopo_till_number || agent?.paybill_number),
      },
    })
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message })
  }
})

export default router
