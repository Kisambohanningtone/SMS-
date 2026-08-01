import Joi from 'joi'

export const registerSchema = Joi.object({
  firstName: Joi.string().min(2).max(50)
    .pattern(/^[A-Za-z\u00C0-\u024F' -]+$/)
    .required()
    .messages({ 'string.pattern.base': 'First name must contain letters only' }),
  lastName: Joi.string().min(2).max(50)
    .pattern(/^[A-Za-z\u00C0-\u024F' -]+$/)
    .required()
    .messages({ 'string.pattern.base': 'Last name must contain letters only' }),
  email: Joi.string().email().lowercase().required(),
  password: Joi.string().min(8).max(72).required()
    .messages({ 'string.min': 'Password must be at least 8 characters' }),
  phone: Joi.string()
    .pattern(/^\+[1-9]\d{7,14}$/)
    .required()
    .messages({ 'string.pattern.base': 'Phone must be in E.164 format e.g. +254700000000' }),
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
