import { Router } from 'express'
import { authenticate } from '@middleware/authenticate'
import { getRates, setRate, recordReading, getReadings } from '@controllers/UtilityController'
import Joi from 'joi'
import { validate } from '@middleware/validate'

const router = Router()
router.use(authenticate)

const rateSchema = Joi.object({
  utilityType: Joi.string().valid('water', 'electricity', 'garbage').required(),
  ratePerUnit: Joi.number().min(0).optional(),
  flatFee: Joi.number().min(0).optional(),
})

const readingSchema = Joi.object({
  unitId: Joi.string().uuid().required(),
  propertyId: Joi.string().uuid().required(),
  utilityType: Joi.string().valid('water', 'electricity', 'garbage').required(),
  month: Joi.number().integer().min(1).max(12).required(),
  year: Joi.number().integer().min(2020).required(),
  previousReading: Joi.number().min(0).optional(),
  currentReading: Joi.number().min(0).optional(),
  photoUrl: Joi.string().uri().optional(),
})

router.get('/properties/:propertyId/utility-rates', getRates)
router.post('/properties/:propertyId/utility-rates', validate(rateSchema), setRate)
router.post('/utility-readings', validate(readingSchema), recordReading)
router.get('/properties/:propertyId/utility-readings', getReadings)

export default router
