import { Router } from 'express'
import { authenticate } from '@middleware/authenticate'
import {
  listUnits, createUnit, getUnitStatus,
  updateUnit, deleteUnit
} from '@controllers/UnitController'

const router = Router()
router.use(authenticate)

router.get('/property/:propertyId', listUnits)
router.post('/property/:propertyId', createUnit)
router.get('/:id/status', getUnitStatus)
router.patch('/:id', updateUnit)
router.delete('/:id', deleteUnit)

export default router
