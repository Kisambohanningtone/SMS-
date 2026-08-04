import multer from 'multer'
import { Router } from 'express'
import { authenticate } from '@middleware/authenticate'
import { validate } from '@middleware/validate'
import {
  listTenants, createTenant, getTenant,
  updateTenant, deactivateTenant,
  uploadDocument, getDocuments
} from '@controllers/TenantController'
import Joi from 'joi'

const router = Router()
router.use(authenticate)

// PRD 3.6 — shared patterns
const E164_PHONE = /^\+[1-9]\d{7,14}$/
const NAME_REGEX  = /^[A-Za-z\u00C0-\u024F' -]+$/

// PRD 3.5 — deposit_amount required + positive
// PRD 3.6 — phone E.164, national_id required, names letters-only
const createTenantSchema = Joi.object({
  unit_id:        Joi.string().uuid().required(),
  full_name:      Joi.string().min(2).max(100)
                    .pattern(NAME_REGEX)
                    .required()
                    .messages({ 'string.pattern.base': 'Full name must contain letters only' }),
  phone:          Joi.string()
                    .pattern(E164_PHONE)
                    .required()
                    .messages({ 'string.pattern.base': 'Phone must be in E.164 format e.g. +254700000000' }),
  national_id:    Joi.string().min(5).max(20).required()
                    .messages({ 'any.required': 'National ID is required' }),
  lease_start:    Joi.date().required(),
  lease_end:      Joi.date().greater(Joi.ref('lease_start')).optional()
                    .messages({ 'date.greater': 'Lease end must be after lease start' }),
  deposit_amount: Joi.number().integer().positive().required()   // PRD 3.5
                    .messages({
                      'any.required': 'Deposit amount is required',
                      'number.positive': 'Deposit amount must be greater than 0',
                    }),
  deposit_paid:   Joi.boolean().optional().default(false),
})

const updateTenantSchema = Joi.object({
  full_name:      Joi.string().min(2).max(100).pattern(NAME_REGEX).optional()
                    .messages({ 'string.pattern.base': 'Full name must contain letters only' }),
  phone:          Joi.string().pattern(E164_PHONE).optional()
                    .messages({ 'string.pattern.base': 'Phone must be in E.164 format e.g. +254700000000' }),
  national_id:    Joi.string().min(5).max(20).optional(),
  lease_end:      Joi.date().optional(),
  deposit_amount: Joi.number().integer().positive().optional(),
  deposit_paid:   Joi.boolean().optional(),
})

// PRD 3.8 — search by q, sort by lease_start, filter by date range
// GET /api/tenants?q=jane&sort=lease_start&order=desc&leaseFrom=2026-01-01&leaseTo=2026-12-31
router.get('/',         listTenants)
router.post('/',        validate(createTenantSchema),  createTenant)
router.get('/:id',      getTenant)
router.patch('/:id',    validate(updateTenantSchema),  updateTenant)
router.delete('/:id',   deactivateTenant)

export default router

// PRD 3.1 — lease document upload
router.get('/:id/documents', getDocuments)
router.post('/:id/documents', uploadDocument)

// PRD 3.1 — file upload middleware (memory storage — max 10MB)
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } })

// Override the uploadDocument route to use multer
router.post('/:id/documents', upload.single('file'), uploadDocument)
router.get('/documents/:docId/serve', async (req, res, next) => {
  try {
    const { DocumentService } = await import('@services/DocumentService')
    const svc = new DocumentService()
    const { buffer, mimeType, filename } = await svc.serve(req.params.docId, req.query.token as string)
    res.setHeader('Content-Type', mimeType)
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`)
    res.send(buffer)
  } catch (err) { next(err) }
})
