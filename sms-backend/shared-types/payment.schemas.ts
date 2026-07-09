import Joi from 'joi'
import { PaymentMethod } from '@models/Payment'

export const manualPaymentSchema = Joi.object({
  unit_id: Joi.string().uuid({ version: 'uuidv4' }).required(),
  tenant_id: Joi.string().uuid({ version: 'uuidv4' }).optional(),
  gross_amount: Joi.number().integer().min(1).required(),
  month: Joi.number().integer().min(1).max(12).required(),
  year: Joi.number().integer().min(2020).max(2100).required(),
  payment_method: Joi.string().valid(...Object.values(PaymentMethod)).required(),
  mpesa_receipt: Joi.string().max(20).optional(),
  payer_phone: Joi.string().pattern(/^\+?[0-9]{9,15}$/).optional(),
  notes: Joi.string().max(500).optional(),
})

export const stkPushSchema = Joi.object({
  unitId: Joi.string().uuid({ version: 'uuidv4' }).required(),
  tenantId: Joi.string().uuid({ version: 'uuidv4' }).optional(),
  phoneNumber: Joi.string().pattern(/^\+?[0-9]{9,15}$/).required()
    .messages({ 'string.pattern.base': 'phoneNumber must be a valid M-Pesa number' }),
  amount: Joi.number().integer().min(1).max(150000).required(),
})
