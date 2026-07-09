import path from 'path'
import fs from 'fs'
import PDFDocument from 'pdfkit'
import jwt from 'jsonwebtoken'
import { Op } from 'sequelize'
import {
  OwnerReport, Property, Unit, Payment, Maintenance,
  Owner, Agent, Tenant,
} from '@models/index'
import { UnitStatus } from '@models/Unit'
import { UnitTypeGroup } from '@models/UnitTypeGroup'
import { NotificationService } from './NotificationService'
import { AppError } from '@middleware/errorHandler'
import { logger } from '@config/logger'
import { env } from '@config/env'

export class ReportService {
  private notif = new NotificationService()

  async list(agentId: string, filters: Record<string, unknown>): Promise<OwnerReport[]> {
    const properties = await Property.findAll({ where: { agent_id: agentId } })
    const propertyIds = properties.map(p => p.id)

    const where: Record<string, unknown> = { property_id: propertyIds }
    if (filters.month && filters.year) {
      where['month'] = Number(filters.month)
      where['year'] = Number(filters.year)
    }
    if (filters.propertyId) where['property_id'] = filters.propertyId

    return OwnerReport.findAll({
      where,
      include: [{ model: Property, as: 'property', attributes: ['id', 'name', 'location'] }],
      order: [['year', 'DESC'], ['month', 'DESC']],
      limit: 50,
    })
  }

  /**
   * Generate a monthly owner report for a property.
   * Calculates all financials, generates PDF, stores report record.
   */
  async generate(agentId: string, data: { propertyId: string; monthYear: string }): Promise<OwnerReport> {
    const agent = await Agent.findByPk(agentId)
    if (!agent) throw new AppError('Agent not found', 404)

    const property = await Property.findOne({
      where: { id: data.propertyId, agent_id: agent.id },
      include: [{ model: Owner, as: 'owner' }],
    })
    if (!property) throw new AppError('Property not found', 404)

    const [year, month] = data.monthYear.split('-').map(Number)

    // Check if report already exists
    const existing = await OwnerReport.findOne({
      where: { property_id: property.id, month, year },
    })
    if (existing) return existing

    // ── Fetch all data for this period ──────────────────────────────────────
    const units = await Unit.findAll({
      where: { property_id: property.id },
      include: [
        { model: UnitTypeGroup, as: 'unit_type_group', attributes: ['rent_amount', 'name'] },
        { model: Tenant, as: 'tenants', where: { is_active: true }, required: false },
      ],
    })

    const payments = await Payment.findAll({
      where: { property_id: property.id, month, year },
    })

    const maintenance = await Maintenance.findAll({
      where: { property_id: property.id, month, year },
    })

    // ── Calculate financials ─────────────────────────────────────────────────
    const occupiedUnits = units.filter(u => u.status === UnitStatus.OCCUPIED)

    const totalExpected = occupiedUnits.reduce((sum: number, u: Unit) => {
      const group = u.unit_type_group as UnitTypeGroup | undefined
      return sum + (group?.rent_amount ?? property.default_rent)
    }, 0)

    const totalCollected = payments.reduce((sum: number, p: Payment) => sum + p.gross_amount, 0)
    const walternFeeTotal = payments.reduce((sum: number, p: Payment) => sum + p.waltern_fee, 0)
    const agentFeeAmount = Math.floor(totalCollected * ((agent.agent_fee_percent ?? 10) / 100))
    const maintenanceTotal = maintenance.reduce((sum: number, m: Maintenance) => sum + m.amount, 0)
    const netToOwner = totalCollected - walternFeeTotal - agentFeeAmount - maintenanceTotal
    const collectionRate = totalExpected > 0
      ? Math.round((totalCollected / totalExpected) * 100)
      : 0

    const monthName = new Date(year, month - 1).toLocaleString('en-KE', { month: 'long', year: 'numeric' })

    // ── Generate PDF ─────────────────────────────────────────────────────────
    const pdfPath = await this.generatePdf({
      property,
      owner: property.owner as Owner,
      agent,
      units,
      payments,
      maintenance,
      period: { month, year, monthName },
      financials: { totalExpected, totalCollected, walternFeeTotal, agentFeeAmount, maintenanceTotal, netToOwner, collectionRate },
    })

    // ── Generate secure owner token ──────────────────────────────────────────
    const ownerToken = jwt.sign(
      { type: 'owner_report', propertyId: property.id, month, year },
      env.jwt.ownerSecret,
      { expiresIn: '30d' }
    )

    // ── Save report ──────────────────────────────────────────────────────────
    const report = await OwnerReport.create({
      property_id: property.id,
      month,
      year,
      total_expected: totalExpected,
      total_collected: totalCollected,
      waltern_fee_total: walternFeeTotal,
      agent_fee_amount: agentFeeAmount,
      maintenance_total: maintenanceTotal,
      net_to_owner: netToOwner,
      collection_rate: collectionRate,
      pdf_url: pdfPath,
      owner_token: ownerToken,
    })

    logger.info(
      `Report generated — property: ${property.name}, period: ${monthName}, ` +
      `collected: ${totalCollected}, net_to_owner: ${netToOwner}`
    )

    return report
  }

  /**
   * Send the report to the property owner via WhatsApp.
   * The owner receives a secure link to view their statement online.
   */
  async sendToOwner(agentId: string, reportId: string): Promise<void> {
    const report = await OwnerReport.findByPk(reportId, {
      include: [{
        model: Property, as: 'property',
        include: [{ model: Owner, as: 'owner' }],
      }],
    })
    if (!report) throw new AppError('Report not found', 404)

    const property = report.property as Property
    if (property.agent_id !== agentId) {
      throw new AppError('Access denied — this report belongs to a different agent', 403)
    }

    const owner = property?.owner as Owner
    if (!owner?.phone) throw new AppError('Owner has no phone number on file', 400)

    const monthName = new Date(report.year, report.month - 1)
      .toLocaleString('en-KE', { month: 'long', year: 'numeric' })

    // Build secure portal URL
    const portalUrl = `${env.app.baseUrl}/owner/report/${report.owner_token}`

    const message =
      `Dear ${owner.full_name},\n\n` +
      `Your ${monthName} statement for ${property.name} is ready.\n\n` +
      `Total Collected: KES ${report.total_collected.toLocaleString()}\n` +
      `Agent Fee: KES ${report.agent_fee_amount.toLocaleString()}\n` +
      `Maintenance: KES ${report.maintenance_total.toLocaleString()}\n` +
      `*Net to You: KES ${report.net_to_owner.toLocaleString()}*\n\n` +
      `View full statement: ${portalUrl}\n\n` +
      `Waltern Tech Ltd | ${env.waltern.supportPhone}`

    // Send via WhatsApp if configured, otherwise fall back to SMS
    if (process.env.AT_WHATSAPP_SENDER?.trim()) {
      await this.notif.sendWhatsApp(owner.phone, message)
    } else {
      await this.notif.sendSms(owner.phone, message)
      logger.info('Report sent via SMS — WhatsApp not configured (AT_WHATSAPP_SENDER not set)')
    }

    await report.update({ sent_at: new Date() })

    logger.info(`Report sent to owner ${owner.full_name} (${owner.phone}) — reportId: ${reportId}`)
  }

  /**
   * Owner portal — validates the secure token and returns report data.
   * No login required — the signed token IS the authentication.
   */
  async getByOwnerToken(token: string): Promise<object> {
    let decoded: { propertyId: string; month: number; year: number }
    try {
      decoded = jwt.verify(token, env.jwt.ownerSecret) as typeof decoded
    } catch {
      throw new AppError('Invalid or expired report link', 401)
    }

    const report = await OwnerReport.findOne({
      where: { property_id: decoded.propertyId, month: decoded.month, year: decoded.year },
      include: [{
        model: Property, as: 'property',
        include: [{ model: Owner, as: 'owner', attributes: ['id', 'full_name', 'phone', 'email'] }],
      }],
    })
    if (!report) throw new AppError('Report not found', 404)

    const payments = await Payment.findAll({
      where: { property_id: decoded.propertyId, month: decoded.month, year: decoded.year },
      include: [
        { model: Unit, as: 'unit', attributes: ['unit_number'] },
        { model: Tenant, as: 'tenant', attributes: ['full_name'] },
      ],
    })

    return { report, payments }
  }

  // ── PDF Generation ──────────────────────────────────────────────────────────
  private async generatePdf(data: {
    property: Property
    owner: Owner
    agent: Agent
    units: Unit[]
    payments: Payment[]
    maintenance: Maintenance[]
    period: { month: number; year: number; monthName: string }
    financials: {
      totalExpected: number
      totalCollected: number
      walternFeeTotal: number
      agentFeeAmount: number
      maintenanceTotal: number
      netToOwner: number
      collectionRate: number
    }
  }): Promise<string> {
    const dir = path.resolve(env.storage.reportsDir)
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })

    const filename = `report_${data.property.id}_${data.period.year}_${data.period.month}.pdf`
    const filepath = path.join(dir, filename)

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50, size: 'A4' })
      const stream = fs.createWriteStream(filepath)
      doc.pipe(stream)

      const { financials: f, period, property, owner } = data

      // Header
      doc.fontSize(20).fillColor('#1E3A5F').text('WALTERN TECH LTD', { align: 'center' })
      doc.fontSize(12).fillColor('#555555').text('Property Management Statement', { align: 'center' })
      doc.moveDown(0.5)
      doc.fontSize(14).fillColor('#1E3A5F').text(`${property.name} — ${period.monthName}`, { align: 'center' })
      doc.moveDown()

      // Property & Owner info
      doc.fontSize(11).fillColor('#000000')
      doc.text(`Property: ${property.name}`)
      doc.text(`Location: ${property.location}`)
      doc.text(`Owner: ${owner?.full_name ?? 'N/A'}`)
      doc.text(`Owner Phone: ${owner?.phone ?? 'N/A'}`)
      doc.text(`Period: ${period.monthName}`)
      doc.moveDown()

      // Financial Summary
      doc.fontSize(13).fillColor('#1E3A5F').text('Financial Summary')
      doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke('#CCCCCC')
      doc.moveDown(0.3)

      const rows = [
        ['Total Rent Expected', `KES ${f.totalExpected.toLocaleString()}`],
        ['Total Rent Collected', `KES ${f.totalCollected.toLocaleString()}`],
        ['Collection Rate', `${f.collectionRate}%`],
        ['Waltern Tech Fee (0.5%)', `KES ${f.walternFeeTotal.toLocaleString()}`],
        [`Agent Management Fee (${(data.agent.agent_fee_percent ?? 10)}%)`, `KES ${f.agentFeeAmount.toLocaleString()}`],
        ['Maintenance Costs', `KES ${f.maintenanceTotal.toLocaleString()}`],
      ]

      doc.fontSize(11).fillColor('#000000')
      for (const [label, value] of rows) {
        doc.text(label, 50, doc.y, { continued: true })
        doc.text(value, { align: 'right' })
      }

      doc.moveDown(0.5)
      doc.fontSize(13).fillColor('#27500A')
      doc.text('Net Amount to Owner', 50, doc.y, { continued: true })
      doc.text(`KES ${f.netToOwner.toLocaleString()}`, { align: 'right' })
      doc.moveDown()

      // Payment details
      if (data.payments.length > 0) {
        doc.fontSize(13).fillColor('#1E3A5F').text('Payment Details')
        doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke('#CCCCCC')
        doc.moveDown(0.3)
        doc.fontSize(10).fillColor('#000000')

        for (const p of data.payments) {
          const unit = p.unit as Unit | undefined
          const tenant = p.tenant as Tenant | undefined
          doc.text(
            `${unit?.unit_number ?? 'N/A'} — ${tenant?.full_name ?? 'Unknown'} — ` +
            `KES ${p.gross_amount.toLocaleString()} — ${p.mpesa_receipt ?? p.payment_method}`,
            { indent: 20 }
          )
        }
        doc.moveDown()
      }

      // Maintenance
      if (data.maintenance.length > 0) {
        doc.fontSize(13).fillColor('#1E3A5F').text('Maintenance')
        doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke('#CCCCCC')
        doc.moveDown(0.3)
        doc.fontSize(10).fillColor('#000000')
        for (const m of data.maintenance) {
          doc.text(`${m.description} — KES ${m.amount.toLocaleString()}`, { indent: 20 })
        }
        doc.moveDown()
      }

      // Footer
      doc.fontSize(9).fillColor('#888888')
        .text(
          `Generated by Waltern Tech Ltd | ${env.waltern.supportEmail} | ${env.waltern.supportPhone}`,
          { align: 'center' }
        )

      doc.end()
      stream.on('finish', () => resolve(filepath))
      stream.on('error', reject)
    })
  }
  async deleteReport(agentId: string, reportId: string): Promise<void> {
    const report = await OwnerReport.findByPk(reportId, {
      include: [{ model: Property, as: 'property' }],
    })
    if (!report) throw new AppError('Report not found', 404)
    const property = report.property as Property
    if (property.agent_id !== agentId) throw new AppError('Access denied', 403)
    await report.destroy()
    logger.info('Report deleted — reportId: ' + reportId)
  }

}