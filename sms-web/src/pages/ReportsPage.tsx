import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { FileText, Plus, X, Loader2, Send, CheckCircle2, ExternalLink, Building2, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { reportsApi, type OwnerReport } from '../api/reports'
import { propertiesApi } from '../api/properties'

function GenerateReportModal({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient()
  const now = new Date()
  const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const defaultMonthYear = `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, '0')}`

  const [propertyId, setPropertyId] = useState('')
  const [monthYear, setMonthYear] = useState(defaultMonthYear)

  const { data: propsData } = useQuery({
    queryKey: ['properties'],
    queryFn: () => propertiesApi.list(),
  })
  const properties = propsData?.data?.data ?? []

  const generate = useMutation({
    mutationFn: () => reportsApi.generate(propertyId, monthYear),
    onSuccess: () => {
      toast.success('Report generated')
      queryClient.invalidateQueries({ queryKey: ['reports'] })
      onClose()
    },
    onError: (err: any) => toast.error(err.response?.data?.message ?? 'Failed to generate report'),
  })

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="font-semibold text-gray-900">Generate Owner Statement</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="label">Property</label>
            {properties.length === 0 ? (
              <p className="text-sm text-gray-400 italic py-2">No properties yet</p>
            ) : (
              <select className="input" value={propertyId} onChange={e => setPropertyId(e.target.value)}>
                <option value="">Choose a property...</option>
                {properties.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            )}
          </div>
          <div>
            <label className="label">Month</label>
            <input type="month" className="input" value={monthYear} onChange={e => setMonthYear(e.target.value)} />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t bg-gray-50 rounded-b-2xl">
          <button onClick={onClose} className="btn-secondary text-sm">Cancel</button>
          <button
            onClick={() => generate.mutate()}
            disabled={!propertyId || generate.isPending}
            className="btn-primary text-sm flex items-center gap-1.5"
          >
            {generate.isPending ? <Loader2 size={14} className="animate-spin" /> : 'Generate'}
          </button>
        </div>
      </div>
    </div>
  )
}

function ReportCard({ report }: { report: OwnerReport }) {
  const queryClient = useQueryClient()
  const monthName = new Date(report.year, report.month - 1).toLocaleString('en-KE', { month: 'long', year: 'numeric' })
  const portalUrl = '/owner/report/' + report.owner_token

  const deleteReport = useMutation({
    mutationFn: () => reportsApi.delete(report.id),
    onSuccess: () => {
      toast.success('Report deleted')
      queryClient.invalidateQueries({ queryKey: ['reports'] })
    },
    onError: (err: any) => toast.error(err.response?.data?.message ?? 'Failed to delete'),
  })
  const send = useMutation({
    mutationFn: () => reportsApi.send(report.id),
    onSuccess: () => {
      toast.success('Statement sent to owner via WhatsApp')
      queryClient.invalidateQueries({ queryKey: ['reports'] })
    },
    onError: (err: any) => toast.error(err.response?.data?.message ?? 'Failed to send statement'),
  })

  return (
    <div className="card">
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-2">
            <Building2 size={15} className="text-gray-400" />
            <p className="font-semibold text-gray-900">{report.property?.name}</p>
          </div>
          <p className="text-sm text-gray-500 mt-0.5">{monthName}</p>
        </div>
        {report.sent_at ? (
          <span className="inline-flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full">
            <CheckCircle2 size={11} /> Sent
          </span>
        ) : (
          <span className="text-xs text-gray-400 bg-gray-50 px-2 py-1 rounded-full">Not sent</span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm mb-4">
        <div>
          <p className="text-gray-400 text-xs">Expected</p>
          <p className="font-medium text-gray-900">KES {report.total_expected.toLocaleString()}</p>
        </div>
        <div>
          <p className="text-gray-400 text-xs">Collected</p>
          <p className="font-medium text-gray-900">KES {report.total_collected.toLocaleString()}</p>
        </div>
        <div>
          <p className="text-gray-400 text-xs">Collection rate</p>
          <p className="font-medium text-gray-900">{report.collection_rate}%</p>
        </div>
        <div>
          <p className="text-gray-400 text-xs">Maintenance</p>
          <p className="font-medium text-gray-900">KES {report.maintenance_total.toLocaleString()}</p>
        </div>
      </div>

      <div className="border-t pt-3 mb-4">
        <div className="flex justify-between text-xs text-gray-400 mb-1">
          <span>Waltern Tech fee (0.5%)</span>
          <span>- KES {report.waltern_fee_total.toLocaleString()}</span>
        </div>
        <div className="flex justify-between text-xs text-gray-400 mb-2">
          <span>Agent fee</span>
          <span>- KES {report.agent_fee_amount.toLocaleString()}</span>
        </div>
        <div className="flex justify-between font-semibold text-success-600">
          <span>Net to owner</span>
          <span>KES {report.net_to_owner.toLocaleString()}</span>
        </div>
      </div>

      <div className="flex gap-2">
        {report.owner_token && (
          <a
          
            href={portalUrl}
            target="_blank"
            rel="noreferrer"
            className="btn-secondary text-xs flex-1 flex items-center justify-center gap-1.5"
          >
            <ExternalLink size={12} /> Preview
          </a>
        )}
        <button
          onClick={() => { if (window.confirm('Delete this report?')) deleteReport.mutate() }}
          disabled={deleteReport.isPending}
          className="btn-secondary text-xs flex items-center justify-center gap-1 px-3"
          title="Delete report"
        >
          {deleteReport.isPending ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
        </button>
        <button
          onClick={() => send.mutate()}
          disabled={send.isPending}
          className="btn-primary text-xs flex-1 flex items-center justify-center gap-1.5"
        >
          {send.isPending ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
          {report.sent_at ? 'Resend' : 'Send to Owner'}
        </button>
      </div>
    </div>
  )
}

export function ReportsPage() {
  const [showModal, setShowModal] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['reports'],
    queryFn: () => reportsApi.list(),
  })

  const reports = data?.data?.data ?? []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
          <p className="text-sm text-gray-500 mt-1">Generate and send monthly owner statements</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary text-sm flex items-center gap-1.5">
          <Plus size={15} /> Generate Statement
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 size={28} className="animate-spin text-primary-500" />
        </div>
      ) : reports.length === 0 ? (
        <div className="card text-center py-16">
          <FileText size={48} className="mx-auto mb-4 text-gray-300" />
          <p className="text-gray-500 font-medium">No statements generated yet</p>
          <p className="text-sm text-gray-400 mt-1">Click "Generate Statement" to create your first owner report</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {reports.map(r => <ReportCard key={r.id} report={r} />)}
        </div>
      )}

      {showModal && <GenerateReportModal onClose={() => setShowModal(false)} />}
    </div>
  )
}
