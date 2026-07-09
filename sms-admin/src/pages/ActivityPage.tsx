import { useQuery } from '@tanstack/react-query'
import { Activity, Loader2, Zap } from 'lucide-react'
import { adminApi, type RecentPayment } from '../api/admin'

const METHOD_COLORS: Record<string, string> = {
  mpesa_stk: 'bg-emerald-50 border-emerald-200 text-emerald-700',
  paybill: 'bg-blue-50 border-blue-200 text-blue-700',
  cash: 'bg-amber-50 border-amber-200 text-amber-700',
  bank: 'bg-slate-50 border-slate-200 text-slate-600',
}

export function ActivityPage() {
  const { data, isLoading, dataUpdatedAt } = useQuery({
    queryKey: ['admin-activity'],
    queryFn: () => adminApi.recentPayments(100),
    refetchInterval: 10000,
  })

  const payments = data?.data?.data ?? []
  const lastUpdate = dataUpdatedAt ? new Date(dataUpdatedAt).toLocaleTimeString('en-KE') : '—'

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 card px-4 py-3">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <div>
            <p className="text-sm font-semibold text-slate-700">Live feed — refreshes every 10 seconds</p>
            <p className="text-xs text-slate-400">Last updated: {lastUpdate}</p>
          </div>
        </div>
        <div className="card px-4 py-3 flex items-center gap-2">
          <Zap size={14} className="text-amber-500" />
          <span className="text-sm font-bold text-slate-900 tabular">{payments.length}</span>
          <span className="text-sm text-slate-400">events loaded</span>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-48"><Loader2 size={28} className="animate-spin text-indigo-500" /></div>
      ) : payments.length === 0 ? (
        <div className="card text-center py-20">
          <Activity size={48} className="mx-auto mb-4 text-slate-200" />
          <p className="font-semibold text-slate-400">Waiting for activity</p>
          <p className="text-sm text-slate-300 mt-1">When any tenant pays rent anywhere on the platform, it appears here instantly</p>
        </div>
      ) : (
        <div className="space-y-2">
          {payments.map((p: RecentPayment, i: number) => (
            <div key={p.id} className={`card p-4 flex items-center gap-4 transition-all hover:shadow-md ${i === 0 ? 'border-indigo-200 ring-1 ring-indigo-100' : ''}`}>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 border text-xs font-bold ${METHOD_COLORS[p.payment_method] ?? 'bg-slate-50 border-slate-200 text-slate-600'}`}>
                {(p.payment_method === 'mpesa_stk' ? 'STK' : p.payment_method === 'paybill' ? 'PB' : p.payment_method === 'cash' ? 'CA' : 'BK')}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  {i === 0 && <span className="badge bg-indigo-50 text-indigo-600 text-xs">Latest</span>}
                  <p className="text-sm font-semibold text-slate-900 truncate">
                    {p.tenant?.full_name ?? 'Unknown tenant'} paid {p.unit?.unit_number}
                  </p>
                </div>
                <p className="text-xs text-slate-400 truncate">
                  {p.property?.name} &bull; {p.agent?.business_name ?? 'Unknown agent'}
                  {p.mpesa_receipt && <span className="font-mono ml-2 text-slate-300">{p.mpesa_receipt}</span>}
                </p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="font-bold text-slate-900 tabular">KES {p.gross_amount.toLocaleString()}</p>
                <p className="text-xs text-amber-600 tabular font-semibold">Fee: KES {p.waltern_fee.toLocaleString()}</p>
              </div>
              <div className="text-right flex-shrink-0 hidden lg:block">
                <p className="text-xs text-slate-400 tabular whitespace-nowrap">
                  {new Date(p.created_at).toLocaleString('en-KE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
