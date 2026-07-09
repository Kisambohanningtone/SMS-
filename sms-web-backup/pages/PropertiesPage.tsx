import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams, Link } from 'react-router-dom'
import {
  Building2, ArrowLeft, Phone, Loader2, Send,
  CheckCircle2, XCircle, Clock, Home, AlertCircle, RefreshCw
} from 'lucide-react'
import toast from 'react-hot-toast'
import { propertiesApi, type UnitStatus } from '../api/properties'
import { paymentsApi } from '../api/payments'

// ── Payment board badge ───────────────────────────────────────────────────────
function StatusBadge({ status }: { status: UnitStatus['status'] }) {
  const map = {
    paid:    <span className="badge-paid"><CheckCircle2 size={10} className="mr-1" />Paid</span>,
    partial: <span className="badge-partial"><Clock size={10} className="mr-1" />Partial</span>,
    unpaid:  <span className="badge-unpaid"><XCircle size={10} className="mr-1" />Unpaid</span>,
    vacant:  <span className="badge-vacant"><Home size={10} className="mr-1" />Vacant</span>,
  }
  return map[status]
}

// ── STK Push modal ────────────────────────────────────────────────────────────
function StkModal({ unit, onClose }: { unit: UnitStatus; onClose: () => void }) {
  const [amount, setAmount] = useState(String(unit.rent_due))
  const [phone, setPhone] = useState(unit.tenant?.phone ?? '')
  const [polling, setPolling] = useState(false)
  const [checkoutId, setCheckoutId] = useState('')
  const [stkStatus, setStkStatus] = useState<string>('')

  const push = useMutation({
    mutationFn: () => paymentsApi.stkPush({
      unitId: unit.unit_id,
      phoneNumber: phone,
      amount: Number(amount),
      tenantId: unit.tenant?.id,
    }),
    onSuccess: async (res) => {
      const id = res.data.data.checkoutRequestId
      setCheckoutId(id)
      setStkStatus('pending')
      toast.success('STK push sent! Tenant should receive a prompt shortly.')
      // Poll for result
      setPolling(true)
      let attempts = 0
      const interval = setInterval(async () => {
        attempts++
        try {
          const statusRes = await paymentsApi.stkStatus(id)
          const st = statusRes.data.data.status
          setStkStatus(st)
          if (st !== 'pending' || attempts >= 12) {
            clearInterval(interval)
            setPolling(false)
            if (st === 'success') toast.success('Payment confirmed!')
            if (st === 'failed') toast.error('Payment failed or cancelled by tenant')
          }
        } catch { clearInterval(interval); setPolling(false) }
      }, 5000)
    },
    onError: (err: any) => toast.error(err.response?.data?.message ?? 'STK push failed'),
  })

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <h3 className="font-semibold text-gray-900 mb-1">Request M-Pesa Payment</h3>
        <p className="text-sm text-gray-500 mb-4">Unit {unit.unit_number} &mdash; {unit.tenant?.name}</p>

        {stkStatus === 'success' ? (
          <div className="text-center py-6">
            <CheckCircle2 size={48} className="text-green-500 mx-auto mb-3" />
            <p className="font-semibold text-gray-900">Payment Confirmed!</p>
            <p className="text-sm text-gray-500 mt-1">KES {Number(amount).toLocaleString()} received</p>
            <button onClick={onClose} className="btn-primary w-full mt-4">Done</button>
          </div>
        ) : stkStatus === 'failed' || stkStatus === 'cancelled' ? (
          <div className="text-center py-6">
            <XCircle size={48} className="text-red-400 mx-auto mb-3" />
            <p className="font-semibold text-gray-900">Payment not completed</p>
            <p className="text-sm text-gray-500 mt-1">Tenant cancelled or did not respond</p>
            <button onClick={onClose} className="btn-secondary w-full mt-4">Close</button>
          </div>
        ) : polling ? (
          <div className="text-center py-6">
            <Loader2 size={40} className="text-primary-500 mx-auto mb-3 animate-spin" />
            <p className="font-semibold text-gray-900">Waiting for payment...</p>
            <p className="text-sm text-gray-500 mt-1">Prompt sent to {phone}</p>
            <p className="text-xs text-gray-400 mt-3">Tenant has 90 seconds to enter their PIN</p>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <label className="label">Phone number</label>
              <input className="input" value={phone} onChange={e => setPhone(e.target.value)} placeholder="254708374149" />
            </div>
            <div>
              <label className="label">Amount (KES)</label>
              <input className="input" type="number" value={amount} onChange={e => setAmount(e.target.value)} />
              <p className="text-xs text-gray-400 mt-1">Rent due: KES {unit.rent_due.toLocaleString()}</p>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
              <button
                onClick={() => push.mutate()}
                disabled={push.isPending || !phone || !amount}
                className="btn-primary flex-1 flex items-center justify-center gap-2"
              >
                {push.isPending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                Send Prompt
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Property detail page ──────────────────────────────────────────────────────
export function PropertyDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [selectedUnit, setSelectedUnit] = useState<UnitStatus | null>(null)
  const now = new Date()
  const [month, setMonth] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`)

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['payment-board', id, month],
    queryFn: () => propertiesApi.paymentStatus(id!, month),
    enabled: !!id,
    refetchInterval: 30000, // refresh every 30s
  })

  const board = data?.data?.data
  const summary = board?.summary

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 size={32} className="animate-spin text-primary-500" />
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link to="/properties" className="text-gray-400 hover:text-gray-600">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-gray-900">{board?.property.name}</h1>
          <p className="text-sm text-gray-500">Payment status board</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <input
            type="month"
            value={month}
            onChange={e => setMonth(e.target.value)}
            className="input w-auto text-sm"
          />
          <button onClick={() => refetch()} className="btn-secondary p-2">
            <RefreshCw size={15} />
          </button>
        </div>
      </div>

      {/* Summary cards */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {[
            { label: 'Total', value: summary.total_units, color: 'bg-gray-100 text-gray-700' },
            { label: 'Paid', value: summary.paid, color: 'bg-green-100 text-green-700' },
            { label: 'Partial', value: summary.partial, color: 'bg-yellow-100 text-yellow-700' },
            { label: 'Unpaid', value: summary.unpaid, color: 'bg-red-100 text-red-700' },
            { label: 'Vacant', value: summary.vacant, color: 'bg-gray-100 text-gray-500' },
          ].map(s => (
            <div key={s.label} className={`rounded-xl p-4 text-center ${s.color}`}>
              <p className="text-2xl font-bold">{s.value}</p>
              <p className="text-xs font-medium mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Collection progress */}
      {summary && (
        <div className="card">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-gray-600">Collection progress</span>
            <span className="font-medium text-gray-900">
              KES {summary.total_collected.toLocaleString()} / KES {summary.total_expected.toLocaleString()}
            </span>
          </div>
          <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary-500 rounded-full transition-all"
              style={{ width: summary.total_expected > 0 ? `${Math.min((summary.total_collected / summary.total_expected) * 100, 100)}%` : '0%' }}
            />
          </div>
          <p className="text-xs text-gray-400 mt-1.5">
            {summary.total_expected > 0 ? Math.round((summary.total_collected / summary.total_expected) * 100) : 0}% collected
          </p>
        </div>
      )}

      {/* Units grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {board?.units.map(unit => (
          <div key={unit.unit_id}
            className={`rounded-xl border p-4 transition-all hover:shadow-md
              ${unit.status === 'paid' ? 'border-green-200 bg-green-50' :
                unit.status === 'partial' ? 'border-yellow-200 bg-yellow-50' :
                unit.status === 'unpaid' ? 'border-red-200 bg-red-50' :
                'border-gray-200 bg-white'}`}
          >
            <div className="flex justify-between items-start mb-2">
              <p className="font-semibold text-gray-900">{unit.unit_number}</p>
              <StatusBadge status={unit.status} />
            </div>
            <p className="text-xs text-gray-500 mb-3">{unit.rent_type}</p>

            {unit.tenant ? (
              <div className="space-y-1 mb-3">
                <p className="text-sm font-medium text-gray-800">{unit.tenant.name}</p>
                <div className="flex items-center gap-1 text-xs text-gray-500">
                  <Phone size={11} />
                  {unit.tenant.phone}
                </div>
              </div>
            ) : (
              <p className="text-xs text-gray-400 mb-3 italic">No tenant</p>
            )}

            <div className="grid grid-cols-2 gap-2 text-xs mb-3">
              <div>
                <p className="text-gray-400">Rent due</p>
                <p className="font-medium text-gray-900">KES {unit.rent_due.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-gray-400">Balance</p>
                <p className={`font-medium ${unit.balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  KES {unit.balance.toLocaleString()}
                </p>
              </div>
            </div>

            {unit.status !== 'vacant' && unit.status !== 'paid' && (
              <button
                onClick={() => setSelectedUnit(unit)}
                className="w-full btn-primary text-xs py-1.5 flex items-center justify-center gap-1.5"
              >
                <Send size={11} />
                Request Payment
              </button>
            )}
          </div>
        ))}
      </div>

      {selectedUnit && (
        <StkModal unit={selectedUnit} onClose={() => { setSelectedUnit(null); refetch() }} />
      )}
    </div>
  )
}

// ── Properties list page ──────────────────────────────────────────────────────
export function PropertiesPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['properties'],
    queryFn: () => propertiesApi.list(),
  })
  const properties = data?.data?.data ?? []

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 size={32} className="animate-spin text-primary-500" />
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Properties</h1>
          <p className="text-sm text-gray-500 mt-1">{properties.length} properties in your portfolio</p>
        </div>
      </div>

      {properties.length === 0 ? (
        <div className="card text-center py-16">
          <Building2 size={48} className="mx-auto mb-4 text-gray-300" />
          <p className="text-gray-500 font-medium">No properties yet</p>
          <p className="text-sm text-gray-400 mt-1">Properties added via the API will appear here</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {properties.map((p: any) => {
            const total = p.units?.length ?? 0
            const occupied = p.units?.filter((u: any) => u.status === 'occupied').length ?? 0
            const pct = total > 0 ? Math.round((occupied / total) * 100) : 0
            const color = `#${p.color_hex ?? '1E3A5F'}`
            return (
              <Link to={`/properties/${p.id}`} key={p.id}
                className="card hover:shadow-lg transition-shadow group cursor-pointer">
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg flex-shrink-0"
                    style={{ backgroundColor: color }}>
                    {p.name[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 truncate group-hover:text-primary-500 transition-colors">{p.name}</p>
                    <p className="text-sm text-gray-500 truncate">{p.location}</p>
                    <p className="text-xs text-gray-400 mt-1">{p.owner?.full_name}</p>
                  </div>
                </div>

                {/* Rent tiers */}
                {p.unit_type_groups?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {p.unit_type_groups.map((g: any) => (
                      <span key={g.id} className="text-xs bg-primary-50 text-primary-600 px-2 py-0.5 rounded-full">
                        {g.name}: KES {g.rent_amount.toLocaleString()}
                      </span>
                    ))}
                  </div>
                )}

                <div className="flex justify-between text-sm text-gray-600 mb-2">
                  <span>{occupied}/{total} occupied</span>
                  <span>{pct}%</span>
                </div>
                <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}