import rateLimit from 'express-rate-limit'

/** Global API limiter — 100 req / 15 min */
export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests — try again in 15 minutes' },
})

/** Strict auth limiter — 10 attempts / 15 min (brute-force protection) */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many login attempts — try again in 15 minutes' },
})

/** STK push limiter — 5 pushes / min per IP (M-Pesa spam protection) */
export const stkLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many STK push requests — wait 1 minute' },
})

/** Reminder limiter — 20 dispatches / hour */
export const reminderLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Reminder limit reached — try again in 1 hour' },
})
