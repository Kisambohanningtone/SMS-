import Joi from 'joi'

export const registerSchema = Joi.object({
  firstName: Joi.string().min(2).max(50).required(),
  lastName: Joi.string().min(2).max(50).required(),
  email: Joi.string().email().lowercase().required(),
  password: Joi.string().min(8).max(72).required()
    .messages({ 'string.min': 'Password must be at least 8 characters' }),
  phone: Joi.string().pattern(/^\+?[0-9]{9,15}$/).required()
    .messages({ 'string.pattern.base': 'Phone must be a valid number e.g. +254700000000' }),
  businessName: Joi.string().max(100).optional(),
})

export const loginSchema = Joi.object({
  email: Joi.string().email().lowercase().required(),
  password: Joi.string().required(),
})

export const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required(),
  newPassword: Joi.string().min(8).max(72).required()
    .messages({ 'string.min': 'New password must be at least 8 characters' }),
})
