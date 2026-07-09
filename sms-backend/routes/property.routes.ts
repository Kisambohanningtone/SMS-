import { Router } from 'express'
import { authenticate } from '@middleware/authenticate'
import {
  listProperties, createProperty, getProperty,
  updateProperty, deleteProperty, getPropertySummary
} from '@controllers/PropertyController'

const router = Router()
router.use(authenticate)

router.get('/', listProperties)
router.post('/', createProperty)
router.get('/:id', getProperty)
router.patch('/:id', updateProperty)
router.delete('/:id', deleteProperty)
router.get('/:id/summary', getPropertySummary)

export default router
