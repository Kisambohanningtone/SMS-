import { Router } from 'express'
import { authenticate } from '@middleware/authenticate'
import {
  listReports, generateReport, sendReport, getOwnerPortal, deleteReport
} from '@controllers/ReportController'

const router = Router()

// Public — owner portal (signed JWT, no session auth)
router.get('/owner/:token', getOwnerPortal)

// Protected
router.use(authenticate)
router.get('/', listReports)
router.post('/generate', generateReport)
router.post('/:id/send', sendReport)
router.delete('/:id', deleteReport)

export default router
