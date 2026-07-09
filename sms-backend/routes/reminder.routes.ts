import { Router } from 'express'
import { authenticate } from '@middleware/authenticate'
import {
  sendReminder, sendBulkReminders, getLogs, retryReminder, deleteLog, clearLogs
} from '@controllers/ReminderController'

const router = Router()
router.use(authenticate)

router.post('/send', sendReminder)
router.post('/bulk', sendBulkReminders)
router.get('/logs', getLogs)
router.post('/retry/:logId', retryReminder)
router.delete('/logs/:logId', deleteLog)
router.delete('/logs', clearLogs)

export default router
