import { useQuery } from '@tanstack/react-query'
import { Building2, Home, Users, TrendingUp, AlertCircle, CheckCircle2, Clock } from 'lucide-react'
import { propertiesApi } from '../api/properties'
import { paymentsApi } from '../api/payments'
import { useAuthStore } from '../hooks/useAuth'
import { Link } from 'react-router-dom'

function StatCard({ icon: Icon, label, value, sub, color }: { icon: any; label: string; value: string | number; sub?: string; color: string }) {
  return (
    <div className="card flex items-start gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
        <Icon size={22} className="text-white" />
      </div>
      <div>
        <p className="text-sm text-gray-500">{label}</p>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

export function DashboardPage() {
  const { user } = useAuthStore()
  const now = new Date()
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

  const { data: propsData } = useQuery({
    queryKey: ['properties'],
    queryFn: () => propertiesApi.list(),
  })

  const { data: summaryData } = useQuery({
    queryKey: ['payments-summary', month],
    queryFn: () => paymentsApi.summary(month),
  })

  const properties = propsData?.data?.data ?? []
  const summary = (summaryData?.data as any)?.data

  const totalUnits = properties.reduce((s: number, p: any) => s + (p.units?.length ?? 0), 0)
  const occupiedUnits = properties.reduce((s: number, p: any) =>
    s + (p.units?.filter((u: any) => u.status === 'occupied').length ?? 0), 0)

  const monthName = now.toLocaleString('en-KE', { month: 'long', year: 'numeric' })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Good {now.getHours() < 12 ? 'morning' : now.getHours() < 17 ? 'afternoon' : 'evening'}, {user?.firstName} 👋
        </h1>
        <p className="text-gray-500 text-sm mt-1">{monthName} — here's your portfolio overview</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Building2} label="Properties" value={properties.length} sub="Active" color="bg-primary-500" />
        <StatCard icon={Home} label="Total Units" value={totalUnits} sub={`${occupiedUnits} occupied`} color="bg-blue-500" />
        <StatCard icon={Users} label="Occupancy" value={totalUnits ? `${Math.round((occupiedUnits/totalUnits)*100)}%` : '0%'} sub="This month" color="bg-purple-500" />
        <StatCard icon={TrendingUp} label="Collected" value={summary ? `KES ${(summary.financials?.gross_collected ?? 0).toLocaleString()}` : '—'} sub={monthName} color="bg-success-500" />
      </div>

      {/* Properties list */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900">Your Properties</h2>
          <Link to="/properties" className="text-sm text-primary-500 hover:underline">View all →</Link>
        </div>

        {properties.length === 0 ? (
          <div className="text-center py-10 text-gray-400">
            <Building2 size={40} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">No properties yet</p>
            <Link to="/properties" className="text-sm text-primary-500 hover:underline mt-1 block">Add your first property</Link>
          </div>
        ) : (
          <div className="space-y-3">
            {properties.map((p: any) => {
              const total = p.units?.length ?? 0
              const occupied = p.units?.filter((u: any) => u.status === 'occupied').length ?? 0
              const pct = total > 0 ? Math.round((occupied / total) * 100) : 0
              const color = `#${p.color_hex ?? '2563EB'}`
              return (
                <Link to={`/properties/${p.id}`} key={p.id}
                  className="flex items-center gap-4 p-3 rounded-lg border hover:bg-gray-50 transition-colors group">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                    style={{ backgroundColor: color }}>
                    {p.name[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{p.name}</p>
                    <p className="text-xs text-gray-500">{p.location}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">{occupied}/{total} units</p>
                    <div className="flex items-center gap-1 justify-end mt-1">
                      <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                        <div className="h-full bg-primary-500 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-xs text-gray-400">{pct}%</span>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}