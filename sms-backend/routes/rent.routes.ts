import { Router } from 'express'
import { authenticate } from '@middleware/authenticate'
import { validate } from '@middleware/validate'
import {
  createUnitTypeGroup, listUnitTypeGroups,
  updateRent, deleteUnitTypeGroup, getPaymentStatusBoard,
} from '@controllers/RentController'
import { createUnitTypeGroupSchema, updateRentSchema } from '@shared-types/rent.schemas'

const router = Router()
router.use(authenticate)

// Rent tier management — property-scoped (owner-only enforced in service)
router.post('/properties/:propertyId/rent-groups', validate(createUnitTypeGroupSchema), createUnitTypeGroup)
router.get('/properties/:propertyId/rent-groups', listUnitTypeGroups)
router.patch('/rent-groups/:groupId', validate(updateRentSchema), updateRent)
router.delete('/rent-groups/:groupId', deleteUnitTypeGroup)

// Agent payment status dashboard
router.get('/properties/:propertyId/payment-status', getPaymentStatusBoard)

export default router
