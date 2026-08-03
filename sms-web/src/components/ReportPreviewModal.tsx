/**
 * ReportPreviewModal — PRD 3.2
 *
 * Shows report figures BEFORE sending to owner.
 * Agent can: Download PDF | Send via WhatsApp | Close
 * WhatsApp is only sent when agent explicitly clicks Send.
 */
import { useState } from 'react'
import {
  X, FileText, Send, Download, CheckCircle,
  Building2, User, Calendar, TrendingUp
} from 'lucide-react'
import { useMutation } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { reportsApi, type ReportPreview } from '../api/reports'

interface Props {
  report: ReportPreview
  onClose: () => void
  onSent: () => void
}

const kes = (n: number) => `KES ${Math.round(n).toLocaleString('en-KE')}`

export default function ReportPreviewModal({ report, onClose, onSent }: Props) {
  const [sendConfirm, setSendConfirm] = useState(false)

  const sendMutation = useMutation({
    mutationFn: () => reportsApi.send(report.id),
    onSuccess: () => {
      toast.success(`Report sent to ${report.owner.full_name} via WhatsApp`)
      onSent()
      onClose()
    },
    onError: (err: any) => toast.error(err.response?.data?.message ?? 'Failed to send report'),
  })

  const f = report.financials

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center">
              <FileText size={18} className="text-blue-600" />
            </div>
            <div>
              <h2 className="font-semibold text-sm text-slate-900">Report Preview</h2>
              <p className="text-xs text-slate-400">{report.period.label}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Property + Owner */}
        <div className="p-5 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-50 rounded-xl p-3">
              <div className="flex items-center gap-2 mb-1">
                <Building2 size={13} className="text-slate-400" />
                <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Property</span>
              </div>
              <p className="text-sm font-semibold text-slate-900">{report.property.name}</p>
              <p className="text-xs text-slate-400 mt-0.5">{report.property.location}</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-3">
              <div className="flex items-center gap-2 mb-1">
                <User size={13} className="text-slate-400" />
                <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Owner</span>
              </div>
              <p className="text-sm font-semibold text-slate-900">{report.owner.full_name}</p>
              <p className="text-xs text-slate-400 mt-0.5">{report.owner.phone}</p>
            </div>
          </div>

          {/* Period + Collection Rate */}
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Calendar size={14} className="text-blue-600" />
                <span className="text-sm font-semibold text-blue-900">{report.period.label}</span>
              </div>
              <div className="flex items-center gap-1.5 bg-blue-100 px-2.5 py-1 rounded-full">
                <TrendingUp size={11} className="text-blue-600" />
                <span className="text-xs font-semibold text-blue-700">
                  {Math.round(f.collection_rate)}% collected
                </span>
              </div>
            </div>

            {/* Financial breakdown */}
            <div className="space-y-2">
              {[
                { label: 'Total expected',   val: kes(f.total_expected),  color: 'text-slate-600' },
                { label: 'Total collected',  val: kes(f.total_collected), color: 'text-green-700', bold: true },
                { label: 'Maintenance costs',val: kes(f.maintenance),     color: 'text-red-600'   },
                { label: 'Agent fee (10%)',  val: kes(f.agent_fee),       color: 'text-orange-600'},
              ].map(({ label, val, color, bold }) => (
                <div key={label} className="flex items-center justify-between">
                  <span className="text-xs text-slate-500">{label}</span>
                  <span className={`text-xs font-medium ${color} ${bold ? 'font-semibold' : ''}`}>{val}</span>
                </div>
              ))}
              <div className="h-px bg-blue-200 my-1" />
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-800">Net to owner</span>
                <span className="text-sm font-bold text-blue-700">{kes(f.net_to_owner)}</span>
              </div>
            </div>
          </div>

          {/* Already sent notice */}
          {report.sent_at && (
            <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl p-3">
              <CheckCircle size={14} className="text-green-600 flex-shrink-0" />
              <p className="text-xs text-green-700">
                Sent to owner on {new Date(report.sent_at).toLocaleDateString('en-KE', {
                  day: 'numeric', month: 'short', year: 'numeric'
                })}
              </p>
            </div>
          )}

          {/* Send confirmation */}
          {sendConfirm && !report.sent_at && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
              <p className="text-xs text-amber-800 mb-2">
                This will send the report to <strong>{report.owner.full_name}</strong> ({report.owner.phone}) via WhatsApp. Confirm?
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => sendMutation.mutate()}
                  disabled={sendMutation.isPending}
                  className="flex-1 py-2 bg-green-600 text-white text-xs font-medium rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                >
                  {sendMutation.isPending ? 'Sending...' : 'Yes, send now'}
                </button>
                <button
                  onClick={() => setSendConfirm(false)}
                  className="flex-1 py-2 bg-slate-100 text-slate-700 text-xs font-medium rounded-lg hover:bg-slate-200 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="p-5 pt-0 flex gap-3">
          {report.pdf_url && (
            <a
              href={report.pdf_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-slate-100 text-slate-700 text-sm font-medium rounded-xl hover:bg-slate-200 transition-colors"
            >
              <Download size={15} />
              Download PDF
            </a>
          )}
          {!report.sent_at && !sendConfirm && (
            <button
              onClick={() => setSendConfirm(true)}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors"
            >
              <Send size={15} />
              Send to Owner
            </button>
          )}
          {report.sent_at && (
            <button
              onClick={() => setSendConfirm(true)}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-slate-600 text-white text-sm font-medium rounded-xl hover:bg-slate-700 transition-colors"
            >
              <Send size={15} />
              Resend to Owner
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
