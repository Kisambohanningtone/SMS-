import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { CreditCard, Loader2, TrendingUp } from 'lucide-react'
import { adminApi, type RecentPayment } from '../api/admin'

const METHOD_LABELS: Record<string, string> = { mpesa_stk: 'STK Push', paybill: 'Paybill', cash: 'Cash', bank: 'Bank' }
const METHOD_COLORS: Record<string, string> = { mpesa_stk: 'badge-active', paybill: 'badge-blue', cash: 'badge-amber', bank: 'badge bg-slate-100 text-slate-600' }

export function PaymentsPage() {
  const [limit, setLimit] = useState(100)

  const { data, isLoading } = useQuery({
    queryKey: ['admin-payments', limit],
    queryFn: () => adminApi.recentPayments(limit),
  })

  const payments = data?.data?.data ?? []
  const totalGross = payments.reduce((s, p) => s + p.gross_amount, 0)
  const totalFee = payments.reduce((s, p) => s + p.waltern_fee, 0)

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="grid grid-cols-2 gap-4 max-w-lg">
        <div className="card p-5">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3"><TrendingUp size={16}/></div>
          <p className="text-2xl font-bold text-slate-900 tabular">KES {totalGross.toLocaleString()}</p>
          <p className="text-xs text-slate-400 mt-1 uppercase tracking-wide">Total Gross</p>
        </div>
        <div className="card p-5">
          <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mb-3"><CreditCard size={16}/></div>
          <p className="text-2xl font-bold text-amber-600 tabular">KES {totalFee.toLocaleString()}</p>
          <p className="text-xs text-slate-400 mt-1 uppercase tracking-wide">Our Commission</p>
        </div>
      </div>

      <div className="flex justify-end">
        <select className="input w-auto" value={limit} onChange={e => setLimit(Number(e.target.value))}>
          <option value={50}>Last 50 transactions</option>
          <option value={100}>Last 100 transactions</option>
          <option value={200}>Last 200 transactions</option>
        </select>
      </div>

      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-48"><Loader2 size={28} className="animate-spin text-indigo-500" /></div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50">
                <th className="table-th">Date</th>
                <th className="table-th">Agent</th>
                <th className="table-th">Property / Unit</th>
                <th className="table-th">Tenant</th>
                <th className="table-th">Method</th>
                <th className="table-th">Receipt</th>
                <th className="table-th text-right">Gross</th>
                <th className="table-th text-right">Fee</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p: RecentPayment) => (
                <tr key={p.id} className="table-row">
                  <td className="table-td text-slate-400 whitespace-nowrap tabular text-xs">
                    {new Date(p.created_at).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </td>
                  <td className="table-td font-medium text-slate-900">{p.agent?.business_name ?? '—'}</td>
                  <td className="table-td"><span className="text-slate-700">{p.property?.name}</span><span className="text-slate-400"> / {p.unit?.unit_number}</span></td>
                  <td className="table-td">{p.tenant?.full_name ?? '—'}</td>
                  <td className="table-td"><span className={METHOD_COLORS[p.payment_method] ?? 'badge bg-slate-100 text-slate-600'}>{METHOD_LABELS[p.payment_method] ?? p.payment_method}</span></td>
                  <td className="table-td font-mono text-xs text-slate-400">{p.mpesa_receipt ?? '—'}</td>
                  <td className="table-td text-right font-bold text-slate-900 tabular">KES {p.gross_amount.toLocaleString()}</td>
                  <td className="table-td text-right font-bold text-amber-600 tabular">KES {p.waltern_fee.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
