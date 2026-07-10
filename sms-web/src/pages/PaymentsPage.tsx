import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { CreditCard, Plus, X, Loader2, TrendingUp, Wallet, Building2, ChevronDown, Ban, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { paymentsApi, type PaymentRecord } from '../api/payments'
import { propertiesApi } from '../api/properties'

const METHOD_LABELS: Record<string, string> = {
  mpesa_stk: 'STK Push',
  paybill: 'Paybill',
  kopokopo: 'KopoKopo',
  cash: 'Cash',
  bank: 'Bank Transfer',
}

const METHOD_COLORS: Record<string, string> = {
  mpesa_stk: 'bg-green-100 text-green-700',
  paybill: 'bg-blue-100 text-blue-700',
  kopokopo: 'bg-purple-100 text-purple-700',
  cash: 'bg-amber-100 text-amber-700',
  bank: 'bg-gray-100 text-gray-700',
}

function ManualPaymentModal({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient()
  const now = new Date()
  const [unitId, setUnitId] = useState('')
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState<'cash' | 'bank'>('cash')
  const [reference, setReference] = useState('')
  const [payerPhone, setPayerPhone] = useState('')

  const { data: propsData } = useQuery({
    queryKey: ['properties'],
    queryFn: () => propertiesApi.list(),
  })

  const occupiedUnits = useMemo(() => {
    const properties = propsData?.data?.data ?? []
    const list: { unitId: string; label: string }[] = []
    for (const p of properties) {
      for (const u of p.units ?? []) {
        if (u.status === 'occupied') {
          list.push({ unitId: u.id, label: `${p.name} — ${u.unit_number}` })
        }
      }
    }
    return list
  }, [propsData])

  const createPayment = useMutation({
    mutationFn: () => paymentsApi.createManual({
      unit_id: unitId,
      gross_amount: Number(amount),
      month: now.getMonth() + 1,
      year: now.getFullYear(),
      payment_method: method,
      mpesa_receipt: method === 'bank' ? reference || undefined : undefined,
      payer_phone: payerPhone || undefined,
    }),
    onSuccess: () => {
      toast.success('Payment recorded')
      queryClient.invalidateQueries({ queryKey: ['payments'] })
      queryClient.invalidateQueries({ queryKey: ['payments-summary'] })
      onClose()
    },
    onError: (err: any) => toast.error(err.response?.data?.message ?? 'Failed to record payment'),
  })

  const canSubmit = unitId && amount && Number(amount) > 0

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="font-semibold text-gray-900">Record Manual Payment</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <p className="text-xs text-gray-500 -mt-1">
            For cash or bank transfers not captured automatically by M-Pesa.
          </p>

          <div>
            <label className="label">Unit</label>
            {occupiedUnits.length === 0 ? (
              <p className="text-sm text-gray-400 italic py-2">No occupied units yet</p>
            ) : (
              <select className="input" value={unitId} onChange={e => setUnitId(e.target.value)}>
                <option value="">Choose a unit...</option>
                {occupiedUnits.map(u => (
                  <option key={u.unitId} value={u.unitId}>{u.label}</option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label className="label">Amount (KES)</label>
            <input type="number" className="input" placeholder="3000" value={amount} onChange={e => setAmount(e.target.value)} />
          </div>

          <div>
            <label className="label">Payment method</label>
            <div className="flex gap-2">
              <button
                onClick={() => setMethod('cash')}
                className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${method === 'cash' ? 'bg-primary-500 text-white border-primary-500' : 'bg-white text-gray-600 border-gray-200'}`}
              >
                Cash
              </button>
              <button
                onClick={() => setMethod('bank')}
                className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${method === 'bank' ? 'bg-primary-500 text-white border-primary-500' : 'bg-white text-gray-600 border-gray-200'}`}
              >
                Bank Transfer
              </button>
            </div>
          </div>

          {method === 'bank' && (
            <div>
              <label className="label">Reference / transaction ID (optional)</label>
              <input className="input" placeholder="e.g. bank ref number" value={reference} onChange={e => setReference(e.target.value)} />
            </div>
          )}

          <div>
            <label className="label">Payer phone (optional)</label>
            <input className="input" placeholder="254712345678" value={payerPhone} onChange={e => setPayerPhone(e.target.value)} />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t bg-gray-50 rounded-b-2xl">
          <button onClick={onClose} className="btn-secondary text-sm">Cancel</button>
          <button
            onClick={() => createPayment.mutate()}
            disabled={!canSubmit || createPayment.isPending}
            className="btn-primary text-sm flex items-center gap-1.5"
          >
            {createPayment.isPending ? <Loader2 size={14} className="animate-spin" /> : 'Record Payment'}
          </button>
        </div>
      </div>
    </div>
  )
}

function VoidPaymentModal({ payment, onClose }: { payment: PaymentRecord; onClose: () => void }) {
  const queryClient = useQueryClient()
  const [reason, setReason] = useState('')

  const voidPayment = useMutation({
    mutationFn: () => paymentsApi.void(payment.id, reason),
    onSuccess: () => {
      toast.success('Payment voided')
      queryClient.invalidateQueries({ queryKey: ['payments'] })
      queryClient.invalidateQueries({ queryKey: ['payments-summary'] })
      onClose()
    },
    onError: (err: any) => toast.error(err.response?.data?.message ?? 'Failed to void payment'),
  })

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="font-semibold text-gray-900">Void Payment</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>
        <div className="px-6 py-5 space-y-3">
          <p className="text-sm text-gray-600">
            Voiding <strong>KES {payment.gross_amount.toLocaleString()}</strong> for {payment.unit?.unit_number}.
            This record stays for accounting but won't count toward collections.
          </p>
          <div>
            <label className="label">Reason (required)</label>
            <textarea
              className="input"
              rows={3}
              placeholder="e.g. Entered wrong amount, duplicate entry..."
              value={reason}
              onChange={e => setReason(e.target.value)}
            />
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t bg-gray-50 rounded-b-2xl">
          <button onClick={onClose} className="btn-secondary text-sm">Cancel</button>
          <button
            onClick={() => voidPayment.mutate()}
            disabled={!reason.trim() || voidPayment.isPending}
            className="btn-danger text-sm flex items-center gap-1.5"
          >
            {voidPayment.isPending ? <Loader2 size={14} className="animate-spin" /> : 'Void Payment'}
          </button>
        </div>
      </div>
    </div>
  )
}

function MonthGroup({ label, payments, defaultOpen }: { label: string; payments: PaymentRecord[]; defaultOpen: boolean }) {
  const [open, setOpen] = useState(defaultOpen)
  const [voidTarget, setVoidTarget] = useState<PaymentRecord | null>(null)

  const activeTotal = payments.filter(p => !p.is_voided).reduce((s, p) => s + p.gross_amount, 0)

  return (
    <div className="card p-0 overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <ChevronDown size={16} className={`text-gray-400 transition-transform ${open ? '' : '-rotate-90'}`} />
          <span className="font-medium text-gray-900">{label}</span>
          <span className="text-xs text-gray-400">{payments.length} payment{payments.length !== 1 ? 's' : ''}</span>
        </div>
        <span className="text-sm font-medium text-gray-700">KES {activeTotal.toLocaleString()}</span>
      </button>

      {open && (
        <table className="w-full text-sm border-t">
          <thead>
            <tr className="border-b bg-gray-50 text-left text-gray-500">
              <th className="px-4 py-2.5 font-medium">Date</th>
              <th className="px-4 py-2.5 font-medium">Unit</th>
              <th className="px-4 py-2.5 font-medium">Tenant</th>
              <th className="px-4 py-2.5 font-medium">Method</th>
              <th className="px-4 py-2.5 font-medium">Receipt</th>
              <th className="px-4 py-2.5 font-medium text-right">Gross</th>
              <th className="px-4 py-2.5 font-medium text-right">Fee</th>
              <th className="px-4 py-2.5 font-medium text-right">You Receive</th>
              <th className="px-4 py-2.5 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {payments.map(p => (
              <tr key={p.id} className={`border-b last:border-0 hover:bg-gray-50 ${p.is_voided ? 'opacity-50' : ''}`}>
                <td className="px-4 py-2.5 text-gray-600 whitespace-nowrap">
                  {new Date(p.created_at).toLocaleDateString('en-KE', { day: 'numeric', month: 'short' })}
                </td>
                <td className={`px-4 py-2.5 font-medium text-gray-900 ${p.is_voided ? 'line-through' : ''}`}>
                  {p.unit?.unit_number} <span className="text-gray-400 font-normal">— {p.property?.name}</span>
                </td>
                <td className="px-4 py-2.5 text-gray-600">{p.tenant?.full_name ?? '—'}</td>
                <td className="px-4 py-2.5">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${METHOD_COLORS[p.payment_method] ?? 'bg-gray-100 text-gray-600'}`}>
                    {METHOD_LABELS[p.payment_method] ?? p.payment_method}
                  </span>
                  {p.is_voided && (
                    <span className="ml-1.5 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                      Voided
                    </span>
                  )}
                </td>
                <td className="px-4 py-2.5 text-gray-500 font-mono text-xs">{p.mpesa_receipt ?? '—'}</td>
                <td className={`px-4 py-2.5 text-right text-gray-900 ${p.is_voided ? 'line-through' : ''}`}>KES {p.gross_amount.toLocaleString()}</td>
                <td className="px-4 py-2.5 text-right text-gray-400">KES {p.waltern_fee.toLocaleString()}</td>
                <td className={`px-4 py-2.5 text-right font-medium text-green-600 ${p.is_voided ? 'line-through' : ''}`}>KES {p.agent_amount.toLocaleString()}</td>
                <td className="px-4 py-2.5 text-right">
                  <div className="flex items-center gap-2">
                    {!p.is_voided && (p.payment_method === 'cash' || p.payment_method === 'bank') && (
                      <button
                        onClick={() => setVoidTarget(p)}
                        className="text-gray-400 hover:text-red-500 transition-colors"
                        title="Void payment"
                      >
                        <Ban size={14} />
                      </button>
                    )}
                    {p.is_voided && (
                      <button
                        onClick={() => {
                          if (window.confirm('Permanently delete this voided payment?')) {
                            const queryClient = useQueryClient()
                            paymentsApi.delete(p.id).then(() => queryClient.invalidateQueries({ queryKey: ['payments'] }))
                          }
                        }}
                        className="text-gray-400 hover:text-red-600 transition-colors"
                        title="Delete permanently"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {voidTarget && <VoidPaymentModal payment={voidTarget} onClose={() => setVoidTarget(null)} />}
    </div>
  )
}

export function PaymentsPage() {
  const [showManualModal, setShowManualModal] = useState(false)
  const now = new Date()
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

  const { data: summaryData } = useQuery({
    queryKey: ['payments-summary', currentMonthKey],
    queryFn: () => paymentsApi.summary(currentMonthKey),
  })

  const { data: listData, isLoading } = useQuery({
    queryKey: ['payments', 'all'],
    queryFn: () => paymentsApi.list(),
  })

  const summary = summaryData?.data?.data
  const allPayments = listData?.data?.data ?? []

  const grouped = useMemo(() => {
    const map = new Map<string, PaymentRecord[]>()
    for (const p of allPayments) {
      const key = `${p.year}-${String(p.month).padStart(2, '0')}`
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(p)
    }
    return Array.from(map.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([key, payments]) => {
        const [y, m] = key.split('-').map(Number)
        const label = new Date(y, m - 1).toLocaleString('en-KE', { month: 'long', year: 'numeric' })
        return { key, label, payments }
      })
  }, [allPayments])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Payments</h1>
          <p className="text-sm text-gray-500 mt-1">All payment transactions, grouped by month</p>
        </div>
        <button onClick={() => setShowManualModal(true)} className="btn-primary text-sm flex items-center gap-1.5">
          <Plus size={15} /> Record Payment
        </button>
      </div>

      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="card flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-success-500 flex items-center justify-center flex-shrink-0">
              <TrendingUp size={20} className="text-white" />
            </div>
            <div>
              <p className="text-sm text-gray-500">This Month's Collected</p>
              <p className="text-xl font-bold text-gray-900">KES {summary.financials.gross_collected.toLocaleString()}</p>
            </div>
          </div>
          <div className="card flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-primary-500 flex items-center justify-center flex-shrink-0">
              <Wallet size={20} className="text-white" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Your Earnings</p>
              <p className="text-xl font-bold text-gray-900">KES {summary.financials.agent_earnings.toLocaleString()}</p>
            </div>
          </div>
          <div className="card flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-warning-500 flex items-center justify-center flex-shrink-0">
              <Building2 size={20} className="text-white" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Units Paid</p>
              <p className="text-xl font-bold text-gray-900">{summary.units.paid}/{summary.units.total}</p>
            </div>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 size={28} className="animate-spin text-primary-500" />
        </div>
      ) : grouped.length === 0 ? (
        <div className="card text-center py-16">
          <CreditCard size={48} className="mx-auto mb-4 text-gray-300" />
          <p className="text-gray-500 font-medium">No payments yet</p>
          <p className="text-sm text-gray-400 mt-1">Payments from STK push, Paybill, or manual entry will appear here</p>
        </div>
      ) : (
        <div className="space-y-3">
          {grouped.map((g, i) => (
            <MonthGroup key={g.key} label={g.label} payments={g.payments} defaultOpen={i === 0} />
          ))}
        </div>
      )}

      {showManualModal && <ManualPaymentModal onClose={() => setShowManualModal(false)} />}
    </div>
  )
}
