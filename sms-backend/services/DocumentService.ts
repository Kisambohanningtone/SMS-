/**
 * DocumentService — PRD 3.1 Lease Document Upload
 *
 * Handles lease agreement and tenant document uploads.
 * Validates: MIME type + magic bytes + size ≤ 10MB
 * Storage: local disk (./uploads/documents/) — swap for S3 in production
 * Security: signed time-limited URLs (JWT, 1 hour expiry)
 *
 * Table: tenant_documents
 */
import path from 'path'
import fs from 'fs'
import crypto from 'crypto'
import jwt from 'jsonwebtoken'
import { env } from '@config/env'
import { AppError } from '@middleware/errorHandler'
import { logger } from '@config/logger'
import { sequelize } from '@config/db'

const UPLOAD_DIR = path.resolve(process.cwd(), 'uploads', 'documents')
const MAX_SIZE   = 10 * 1024 * 1024  // 10MB

// Allowed MIME types + their magic bytes
const ALLOWED: Record<string, Buffer> = {
  'application/pdf':  Buffer.from([0x25, 0x50, 0x44, 0x46]),          // %PDF
  'image/jpeg':       Buffer.from([0xFF, 0xD8, 0xFF]),                  // JPEG
  'image/png':        Buffer.from([0x89, 0x50, 0x4E, 0x47]),           // PNG
  'image/webp':       Buffer.from([0x52, 0x49, 0x46, 0x46]),           // RIFF (WebP)
}

export class DocumentService {

  constructor() {
    // Ensure upload directory exists
    if (!fs.existsSync(UPLOAD_DIR)) {
      fs.mkdirSync(UPLOAD_DIR, { recursive: true })
    }
  }

  /**
   * Upload a document for a tenant.
   * fileBuffer: raw file bytes
   * originalName: original filename from client
   * mimeType: MIME type declared by client (we verify with magic bytes)
   */
  async upload(data: {
    tenantId: string
    uploadedBy: string
    fileBuffer: Buffer
    originalName: string
    mimeType: string
    documentType?: string
  }): Promise<{ id: string; signedUrl: string }> {

    // 1. Size check
    if (data.fileBuffer.length > MAX_SIZE) {
      throw new AppError('File too large. Maximum size is 10MB.', 400)
    }

    // 2. Magic bytes verification — never trust client-declared MIME
    const actualMime = this._detectMime(data.fileBuffer)
    if (!actualMime) {
      throw new AppError(
        'Unsupported file type. Allowed: PDF, JPEG, PNG, WebP.',
        400
      )
    }

    // 3. Verify tenant exists
    const [tenantRows] = await sequelize.query(
      `SELECT id FROM tenants WHERE id = :tenantId AND is_active = true`,
      { replacements: { tenantId: data.tenantId }, type: 'SELECT' as any }
    ) as any[]
    if (!(tenantRows as any)[0]) throw new AppError('Tenant not found', 404)

    // 4. Generate secure filename — never use original filename on disk
    const ext = this._getExt(actualMime)
    const storedName = `${crypto.randomUUID()}${ext}`
    const storedPath = path.join(UPLOAD_DIR, storedName)

    // 5. Write to disk
    fs.writeFileSync(storedPath, data.fileBuffer)
    logger.info(`Document saved: ${storedName} (${data.fileBuffer.length} bytes)`)

    // 6. Save to DB
    const [result] = await sequelize.query(`
      INSERT INTO tenant_documents
        (id, tenant_id, uploaded_by, document_type, original_filename,
         stored_path, mime_type, file_size_bytes)
      VALUES
        (gen_random_uuid(), :tenantId, :uploadedBy, :docType, :originalName,
         :storedPath, :mimeType, :fileSize)
      RETURNING id
    `, {
      replacements: {
        tenantId:     data.tenantId,
        uploadedBy:   data.uploadedBy,
        docType:      data.documentType ?? 'lease',
        originalName: data.originalName.slice(0, 255),
        storedPath:   storedName, // store only filename, not full path
        mimeType:     actualMime,
        fileSize:     data.fileBuffer.length,
      },
      type: 'SELECT' as any,
    }) as any[]

    const docId = (result as any)[0].id

    // 7. Generate signed URL (JWT, 1 hour)
    const signedUrl = this._signUrl(docId, storedName)

    return { id: docId, signedUrl }
  }

  /** List all documents for a tenant */
  async list(tenantId: string) {
    const [rows] = await sequelize.query(`
      SELECT id, document_type, original_filename, mime_type,
             file_size_bytes, is_verified, created_at
      FROM tenant_documents
      WHERE tenant_id = :tenantId
      ORDER BY created_at DESC
    `, { replacements: { tenantId }, type: 'SELECT' as any }) as any[]
    return rows
  }

  /** Serve a document — verify signed URL then stream file */
  async serve(docId: string, token: string): Promise<{ buffer: Buffer; mimeType: string; filename: string }> {
    // Verify JWT
    let payload: { docId: string; filename: string }
    try {
      payload = jwt.verify(token, env.jwt.secret) as typeof payload
    } catch {
      throw new AppError('Document link expired or invalid', 401)
    }

    if (payload.docId !== docId) throw new AppError('Invalid document token', 401)

    // Fetch record
    const [rows] = await sequelize.query(
      `SELECT stored_path, mime_type, original_filename FROM tenant_documents WHERE id = :docId`,
      { replacements: { docId }, type: 'SELECT' as any }
    ) as any[]

    const doc = (rows as any)[0]
    if (!doc) throw new AppError('Document not found', 404)

    const filePath = path.join(UPLOAD_DIR, doc.stored_path)
    if (!fs.existsSync(filePath)) throw new AppError('Document file not found', 404)

    return {
      buffer:   fs.readFileSync(filePath),
      mimeType: doc.mime_type,
      filename: doc.original_filename,
    }
  }

  // ─── PRIVATE ─────────────────────────────────────────────────────────────

  private _detectMime(buffer: Buffer): string | null {
    for (const [mime, magic] of Object.entries(ALLOWED)) {
      if (buffer.slice(0, magic.length).equals(magic)) return mime
    }
    return null
  }

  private _getExt(mime: string): string {
    const map: Record<string, string> = {
      'application/pdf': '.pdf',
      'image/jpeg':      '.jpg',
      'image/png':       '.png',
      'image/webp':      '.webp',
    }
    return map[mime] ?? '.bin'
  }

  private _signUrl(docId: string, filename: string): string {
    const token = jwt.sign(
      { docId, filename },
      env.jwt.secret,
      { expiresIn: '1h' }
    )
    return `/api/tenants/documents/${docId}/serve?token=${token}`
  }
}
