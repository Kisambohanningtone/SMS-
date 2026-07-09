import { Request, Response, NextFunction } from 'express'
import Joi from 'joi'

type ValidationTarget = 'body' | 'query' | 'params'

export function validate(schema: Joi.ObjectSchema, target: ValidationTarget = 'body') {
  return (req: Request, res: Response, next: NextFunction): void => {
    const { error, value } = schema.validate(req[target], {
      abortEarly: false,
      stripUnknown: true,
    })

    if (error) {
      const messages = error.details.map((d) => d.message.replace(/['"]/g, ''))
      res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: messages,
      })
      return
    }

    req[target] = value
    next()
  }
}

// ── Common reusable schemas ───────────────────────────────────────────────────
export const schemas = {
  uuid: Joi.string().uuid({ version: 'uuidv4' }),

  monthYear: Joi.string()
    .pattern(/^\d{4}-(0[1-9]|1[0-2])$/)
    .messages({ 'string.pattern.base': 'month must be in YYYY-MM format' }),

  phone: Joi.string()
    .pattern(/^\+?[0-9]{9,15}$/)
    .messages({ 'string.pattern.base': 'phone must be a valid number' }),

  pagination: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
  }),
}
