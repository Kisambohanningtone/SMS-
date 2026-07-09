import { Router } from 'express'
import { authenticate } from '@middleware/authenticate'
import {
  listMaintenance, createMaintenance,
  updateMaintenance, deleteMaintenance
} from '@controllers/MaintenanceController'

const router = Router()
router.use(authenticate)

router.get('/', listMaintenance)
router.post('/', createMaintenance)
router.patch('/:id', updateMaintenance)
router.delete('/:id', deleteMaintenance)

export default router
