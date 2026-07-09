import Joi from 'joi'

export const createUnitTypeGroupSchema = Joi.object({
  name: Joi.string().min(2).max(100).required(),
  rent_amount: Joi.number().integer().min(0).required(),
  unit_count: Joi.number().integer().min(1).max(200).required(),
  unit_prefix: Joi.string().max(20).optional(),
  starting_number: Joi.number().integer().min(1).optional(),
  sort_order: Joi.number().integer().min(0).optional(),
})

export const updateRentSchema = Joi.object({
  rent_amount: Joi.number().integer().min(0).required(),
})
