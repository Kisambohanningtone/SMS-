import { useQuery } from '@tanstack/react-query'
import {
  Users, Building2, Home, DollarSign,
  Loader2, UserX, CreditCard
} from 'lucide-react'
import { adminApi, type ActivityEvent, type RecentPayment } from '../api/admin'

const METHOD_COLORS: Record<string, string> = {
  mpesa_stk: 'badge-active', paybill: 'badge-blue',
  cash: 'badge-amber', bank: 'badge bg-slate-100 text-slate-600',
}
const METHOD_LABELS: Record<string, string> = {
  mpesa_stk: 'STK Push', paybill: 'Paybill', cash: 'Cash', bank: 'Bank',
}

function StatCard({ icon: _Icon, label, value, sub, accent }: {
  icon: any; label: string; value: string | number; sub?: string; accent: string
}) {
  return (
    <div className="stat-card" style={{ borderLeft: `4px solid ${accent}` }}>
      <div className="pl-3">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">{label}</p>
        <p className="text-3xl font-bold text-slate-900 tabular">{value}</p>
        {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
      </div>
    </div>
  )
}

export function DashboardPage() {
  const now = new Date()
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const monthName = now.toLocaleString('en-KE', { month: 'long', year: 'numeric' })

  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: () => adminApi.stats(),
    refetchInterval: 60000,
  })

  const { data: summaryData } = useQuery({
    queryKey: ['admin-summary', month],
    queryFn: () => adminApi.summary(month),
    refetchInterval: 30000,
  })

  const { data: activityData } = useQuery({
    queryKey: ['admin-activity'],
    queryFn: () => adminApi.activity(20),
    refetchInterval: 15000,
  })

  const { data: paymentsData } = useQuery({
    queryKey: ['admin-recent-payments'],
    queryFn: () => adminApi.recentPayments(8),
    refetchInterval: 15000,
  })

  const s = statsData?.data?.data
  const fin = summaryData?.data?.data?.financials
  const activity = activityData?.data?.data ?? []
  const payments = paymentsData?.data?.data ?? []

  if (statsLoading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 size={28} className="animate-spin text-indigo-500" />
    </div>
  )

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1">Overview</p>
          <p className="text-2xl font-bold text-slate-900">{monthName}</p>
        </div>
        <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-4 py-2.5 shadow-sm">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-sm font-semibold text-slate-700">Live</span>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Users} label="Total Agents" value={s?.agents.total ?? 0} sub={`${s?.agents.active ?? 0} active`} accent="#6366f1" />
        <StatCard icon={UserX} label="Deactivated" value={s?.agents.deactivated ?? 0} sub="Agent accounts" accent="#ef4444" />
        <StatCard icon={Building2} label="Properties" value={s?.properties.total ?? 0} sub="Active listings" accent="#3b82f6" />
        <StatCard icon={Home} label="Tenants" value={s?.tenants.total ?? 0} sub="Active leases" accent="#8b5cf6" />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard icon={Users} label="Landlords" value={s?.owners.total ?? 0} sub="Property owners" accent="#06b6d4" />
        <StatCard icon={CreditCard} label="Total Transactions" value={s?.transactions.total ?? 0} sub="All time" accent="#10b981" />
        <StatCard icon={DollarSign} label="Commission This Month" value={`KES ${(fin?.monthly_commission ?? 0).toLocaleString()}`} sub={`KES ${(fin?.monthly_gross ?? 0).toLocaleString()} gross`} accent="#f59e0b" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-50">
            <h2 className="font-bold text-slate-900">Recent Activity</h2>
            <span className="text-xs text-slate-400">Last 20 events</span>
          </div>
          <div className="divide-y divide-slate-50 max-h-80 overflow-y-auto">
            {activity.length === 0 ? (
              <div className="text-center py-10 text-slate-400 text-sm">No activity yet</div>
            ) : activity.map((e: ActivityEvent) => (
              <div key={`${e.type}-${e.id}`} className="flex items-start gap-3 px-5 py-3 hover:bg-slate-50/50 transition-colors">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${e.type === 'payment' ? 'bg-emerald-50 text-emerald-600' : 'bg-indigo-50 text-indigo-600'}`}>
                  {e.type === 'payment' ? <CreditCard size={14} /> : <Users size={14} />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">{e.title}</p>
                  <p className="text-xs text-slate-400 truncate">{e.subtitle}</p>
                  {e.amount && (
                    <p className="text-xs font-semibold text-emerald-600 mt-0.5">
                      KES {e.amount.toLocaleString()} <span className="text-amber-500">• Fee: KES {e.fee?.toLocaleString()}</span>
                    </p>
                  )}
                </div>
                <p className="text-xs text-slate-400 flex-shrink-0 whitespace-nowrap">
                  {new Date(e.timestamp).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Payments */}
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-50">
            <h2 className="font-bold text-slate-900">Latest Payments</h2>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />Live
            </div>
          </div>
          <div className="divide-y divide-slate-50 max-h-80 overflow-y-auto">
            {payments.length === 0 ? (
              <div className="text-center py-10 text-slate-400 text-sm">No payments yet</div>
            ) : payments.map((p: RecentPayment) => (
              <div key={p.id} className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50/50">
                <div>
                  <p className="text-sm font-medium text-slate-800">{p.tenant?.full_name ?? '—'}</p>
                  <p className="text-xs text-slate-400">{p.property?.name} / {p.unit?.unit_number}</p>
                </div>
                <div className="ml-auto text-right">
                  <p className="text-sm font-bold text-slate-900 tabular">KES {p.gross_amount.toLocaleString()}</p>
                  <span className={`text-xs ${METHOD_COLORS[p.payment_method] ?? 'badge'}`}>
                    {METHOD_LABELS[p.payment_method] ?? p.payment_method}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
