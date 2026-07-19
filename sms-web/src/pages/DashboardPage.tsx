import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Building2, TrendingUp, Wallet, Users, ArrowRight, Loader2, RefreshCw } from 'lucide-react'
import { useAuthStore } from '../hooks/useAuth'
import { paymentsApi } from '../api/payments'
import { propertiesApi } from '../api/properties'

// ─── HELPERS ───────────────────────────────────────────────────────────────
const kes = (n: number) => `KES ${Math.round(n).toLocaleString('en-KE')}`

const greeting = () => {
  const h = new Date().getHours()
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
}

const monthLabel = () =>
  new Date().toLocaleString('default', { month: 'long', year: 'numeric' })

const monthStr = () => {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

// ─── DONUT ─────────────────────────────────────────────────────────────────
function DonutChart({ paid, partial, overdue, total }: {
  paid: number; partial: number; overdue: number; total: number
}) {
  const r    = 38
  const circ = 2 * Math.PI * r
  const arc  = (n: number) => (n / (total || 1)) * circ
  const paidArc    = arc(paid)
  const partialArc = arc(partial)
  const overdueArc = arc(overdue)
  const rate = total > 0 ? Math.round((paid / total) * 100) : 0

  return (
    <div className="flex justify-center py-3">
      <div className="relative flex items-center justify-center w-28 h-28">
        <svg width="112" height="112" viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)' }}>
          <circle cx="50" cy="50" r={r} fill="none" stroke="#E2E8F0" strokeWidth="13"/>
          <circle cx="50" cy="50" r={r} fill="none" stroke="#22C55E" strokeWidth="13"
            strokeDasharray={`${paidArc} ${circ}`} strokeDashoffset="0" strokeLinecap="round"/>
          <circle cx="50" cy="50" r={r} fill="none" stroke="#EAB308" strokeWidth="13"
            strokeDasharray={`${partialArc} ${circ}`} strokeDashoffset={`${-paidArc}`} strokeLinecap="round"/>
          <circle cx="50" cy="50" r={r} fill="none" stroke="#EF4444" strokeWidth="13"
            strokeDasharray={`${overdueArc} ${circ}`} strokeDashoffset={`${-(paidArc + partialArc)}`} strokeLinecap="round"/>
        </svg>
        <div className="absolute text-center">
          <div className="text-xl font-extrabold text-slate-900 leading-none">{rate}%</div>
          <div className="text-[10px] text-slate-400 mt-0.5">collected</div>
        </div>
      </div>
    </div>
  )
}

// ─── PROPERTY CARD ─────────────────────────────────────────────────────────
function PropertyCard({ p }: { p: any }) {
  const COLORS: Record<string, string> = {
    '2563EB': '#2563EB', '7C3AED': '#7C3AED', '059669': '#059669',
    'DC2626': '#DC2626', 'D97706': '#D97706', 'DB2777': '#DB2777',
  }
  const color    = COLORS[p.color_hex] ?? '#2563EB'
  const units    = p.units ?? []
  const total    = units.length || p.totalUnits || 0
  const occupied = p.occupiedUnits ?? 0
  
  return (
    <Link to={`/properties/${p.id}`}>
      <div className="bg-white border border-slate-200 rounded-xl p-4 mb-3 hover:border-blue-400 hover:shadow-md transition-all duration-150 cursor-pointer">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-1 h-10 rounded-full flex-shrink-0" style={{ background: color }}/>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-sm text-slate-900 truncate">{p.name}</div>
            <div className="text-xs text-slate-400 mt-0.5 truncate">📍 {p.location}</div>
          </div>
          <div className="text-xs font-medium px-2 py-1 bg-blue-50 text-blue-700 rounded-full flex-shrink-0">
            {total} units
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 mb-3">
          {[
            { val: occupied, label: 'Occupied', color: '#166534' },
            { val: (p.totalUnits ?? 0) - (p.occupiedUnits ?? 0), label: 'Vacant', color: '#475569' },
            { val: p.defaultRent ? kes(p.defaultRent) : '—', label: 'Rent/unit', color: '#1D4ED8' },
          ].map(({ val, label, color: c }) => (
            <div key={label} className="text-center bg-slate-50 rounded-lg py-2">
              <div className="text-base font-extrabold leading-none" style={{ color: c }}>{val}</div>
              <div className="text-[10px] text-slate-400 mt-1">{label}</div>
            </div>
          ))}
        </div>

        {/* Occupancy bar */}
        <div>
          <div className="flex justify-between text-xs text-slate-400 mb-1.5">
            <span>{occupied} of {total} occupied</span>
            <span>{total > 0 ? Math.round((occupied / total) * 100) : 0}%</span>
          </div>
          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${total > 0 ? (occupied / total) * 100 : 0}%`,
                background: 'linear-gradient(90deg,#2563EB,#7C3AED)',
              }}
            />
          </div>
        </div>
      </div>
    </Link>
  )
}

// ─── PAGE ──────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  useAuthStore()
  const ms = monthStr()

  const { data: sumRes, isLoading: sumLoading, refetch } = useQuery({
    queryKey: ['payment-summary', ms],
    queryFn:  () => paymentsApi.summary(ms),
    staleTime: 60_000,
  })

  const { data: propsRes, isLoading: propsLoading } = useQuery({
    queryKey: ['properties'],
    queryFn:  propertiesApi.list,
    staleTime: 120_000,
  })

  const { data: recentRes } = useQuery({
    queryKey: ['recent-payments', ms],
    queryFn:  () => paymentsApi.list({ month: ms }),
    staleTime: 30_000,
  })

  const summary    = sumRes?.data?.data
  const properties = (propsRes?.data?.data ?? []) as any[]
  const payments   = ((recentRes?.data?.data ?? []) as any[]).slice(0, 5)

  // ── derived figures from PaymentSummary shape ──
  const totalCollected = summary?.financials?.gross_collected   ?? 0
  const walternFee     = summary?.financials?.waltern_fee       ?? 0
  const paidUnits      = summary?.payments?.paid_units          ?? 0
  const totalUnits     = summary?.units?.total                  ?? 0
    const collRate       = totalUnits > 0 ? Math.round((paidUnits / totalUnits) * 100) : 0

  // breakdown counts — use what the API returns or derive
  const paid    = paidUnits
  const partial = summary?.units?.outstanding ?? 0
  const overdue = Math.max(0, totalUnits - paid - partial)
  const vacant  = properties.reduce((s: number, p: any) => s + ((p.totalUnits ?? 0) - (p.occupiedUnits ?? 0)), 0)

  const totalExpected = totalCollected + (summary?.units?.outstanding ?? 0)

  if (sumLoading || propsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="text-center">
          <Loader2 size={28} className="animate-spin text-blue-600 mx-auto mb-3"/>
          <p className="text-sm text-slate-400">Loading your dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-[1280px] mx-auto">

        {/* HEADER */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <p className="text-sm text-slate-400 mb-1">{greeting()} 👋</p>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">{monthLabel()} Overview</h1>
            <p className="text-xs text-slate-400 mt-1">
              {new Date().toLocaleDateString('en-KE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => refetch()}
              className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50 transition-colors">
              <RefreshCw size={13}/> Refresh
            </button>
            <Link to="/properties">
              <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
                + Add Property
              </button>
            </Link>
          </div>
        </div>

        {/* COMMISSION HERO */}
        <div className="rounded-2xl p-6 mb-5 relative overflow-hidden"
          style={{ background: 'linear-gradient(135deg,#1E3A8A 0%,#2563EB 55%,#7C3AED 100%)' }}>
          <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full bg-white opacity-[0.04]"/>
          <div className="absolute -bottom-14 right-16 w-36 h-36 rounded-full bg-white opacity-[0.03]"/>

          <div className="flex items-start justify-between relative z-10">
            <div>
              <p className="text-xs font-medium uppercase tracking-widest text-white/50 mb-2">
                Waltern Tech Commission · {monthLabel()}
              </p>
              <p className="text-4xl font-extrabold text-white mb-1">{kes(walternFee)}</p>
              <p className="text-xs text-white/60">
                0.5% of {kes(totalCollected)} collected across {properties.length} {properties.length === 1 ? 'property' : 'properties'}
              </p>
              <div className="inline-flex items-center gap-1.5 mt-3 px-3 py-1 rounded-full text-xs font-medium text-white/90"
                style={{ background: 'rgba(255,255,255,0.12)' }}>
                <TrendingUp size={11}/> {collRate}% collection rate this month
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-white/40 uppercase tracking-widest mb-1">Tenant Paybill</p>
              <p className="text-3xl font-extrabold text-white" style={{ letterSpacing: '0.1em' }}>247247</p>
              <p className="text-xs text-white/40 mt-1">NYUMBADESK RENT</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 mt-5 relative z-10">
            {[
              { val: totalUnits,          label: 'Total units'      },
              { val: properties.length,   label: 'Properties'       },
              { val: `${collRate}%`,      label: 'Collection rate'  },
            ].map(({ val, label }) => (
              <div key={label} className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.1)' }}>
                <div className="text-xl font-extrabold text-white">{val}</div>
                <div className="text-xs text-white/55 mt-0.5">{label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* STAT CARDS */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
          {[
            { icon: <Building2 size={16} className="text-blue-600"/>,  bg: 'bg-blue-50',   val: properties.length,       label: 'Properties',      sub: `${totalUnits} total units`           },
            { icon: <Wallet    size={16} className="text-green-600"/>, bg: 'bg-green-50',  val: kes(totalCollected),     label: 'Rent collected',  sub: `of ${kes(totalExpected)} expected`   },
            { icon: <Users     size={16} className="text-orange-500"/>,bg: 'bg-orange-50', val: kes(totalExpected - totalCollected), label: 'Outstanding', sub: `${overdue} units overdue`  },
            { icon: <TrendingUp size={16} className="text-purple-600"/>,bg:'bg-purple-50', val: kes(walternFee),          label: 'Commission',      sub: '0.5% auto-split'                     },
          ].map(({ icon, bg, val, label, sub }) => (
            <div key={label} className="bg-white border border-slate-200 rounded-xl p-4">
              <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center mb-3`}>{icon}</div>
              <div className="text-xl font-extrabold text-slate-900 leading-none mb-1">{val}</div>
              <div className="text-xs font-medium text-slate-600">{label}</div>
              <div className="text-xs text-slate-400 mt-0.5">{sub}</div>
            </div>
          ))}
        </div>

        {/* CONTENT GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">

          {/* LEFT — PROPERTIES */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-slate-900">Properties this month</h2>
              <Link to="/properties" className="text-xs text-blue-600 font-medium hover:text-blue-700 flex items-center gap-1">
                View all <ArrowRight size={11}/>
              </Link>
            </div>

            {properties.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-xl p-10 text-center">
                <Building2 size={32} className="text-slate-300 mx-auto mb-3"/>
                <p className="text-sm font-medium text-slate-600 mb-1">No properties yet</p>
                <p className="text-xs text-slate-400 mb-4">Add your first property to start tracking rent</p>
                <Link to="/properties">
                  <button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
                    Add property
                  </button>
                </Link>
              </div>
            ) : (
              properties.slice(0, 6).map((p: any) => <PropertyCard key={p.id} p={p}/>)
            )}
          </div>

          {/* RIGHT */}
          <div>

            {/* PAYBILL */}
            <div className="rounded-xl p-4 mb-3" style={{ background: 'linear-gradient(135deg,#0F172A,#1E293B)' }}>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-white/40 mb-2">Tenant Payment Paybill</p>
              <p className="text-3xl font-extrabold text-white mb-0.5" style={{ letterSpacing: '0.12em' }}>247247</p>
              <p className="text-xs text-white/40 mb-3">NYUMBADESK RENT · M-Pesa</p>
              <div className="rounded-lg p-3 space-y-2" style={{ background: 'rgba(255,255,255,0.06)' }}>
                {[
                  'Go to M-Pesa → Lipa Na M-Pesa → Pay Bill',
                  'Business No: 247247',
                  'Account No: Your unit number (e.g. A01)',
                ].map((step, i) => (
                  <div key={i} className="flex gap-2 items-start">
                    <div className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 text-[9px] font-bold text-white/70 mt-0.5"
                      style={{ background: 'rgba(255,255,255,0.12)' }}>{i + 1}</div>
                    <p className="text-xs text-white/60">{step}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* BREAKDOWN */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 mb-3">
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-sm font-semibold text-slate-900">Rent breakdown</h3>
                <span className="text-xs text-slate-400">{totalUnits - vacant} occupied</span>
              </div>
              <DonutChart paid={paid} partial={partial} overdue={overdue} total={totalUnits}/>
              <div className="space-y-0">
                {[
                  { label: 'Fully paid',      count: paid,    color: '#22C55E' },
                  { label: 'Partial payment', count: partial,  color: '#EAB308' },
                  { label: 'Overdue',         count: overdue,  color: '#EF4444' },
                  { label: 'Vacant',          count: vacant,   color: '#CBD5E1' },
                ].map(({ label, count, color }) => (
                  <div key={label} className="flex items-center gap-2.5 py-2 border-b border-slate-100 last:border-0">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }}/>
                    <span className="text-xs text-slate-600 flex-1">{label}</span>
                    <span className="text-xs font-semibold text-slate-900">{count}</span>
                    <span className="text-xs text-slate-400 w-8 text-right">
                      {totalUnits > 0 ? Math.round((count / totalUnits) * 100) : 0}%
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* LIVE FEED */}
            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-slate-900">Live payments</h3>
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"/>
                  <span className="text-xs text-slate-400">Real-time</span>
                </div>
              </div>

              {payments.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-4">No payments recorded yet this month</p>
              ) : (
                payments.map((p: any) => (
                  <div key={p.id} className="flex items-center gap-3 py-2.5 border-b border-slate-100 last:border-0">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0 text-sm">💳</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-slate-900 truncate">
                        {p.tenant?.full_name ?? 'Unknown'} · {p.unit?.unit_number ?? '—'}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {p.property?.name ?? '—'} · {new Date(p.created_at).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-xs font-semibold text-slate-900">{kes(p.gross_amount)}</p>
                      <p className="text-[10px] text-purple-600 font-medium mt-0.5">+{kes(p.waltern_fee)} → Waltern</p>
                    </div>
                  </div>
                ))
              )}

              <Link to="/payments">
                <button className="w-full mt-3 py-2 text-xs text-blue-600 font-medium border border-blue-100 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors flex items-center justify-center gap-1">
                  View all payments <ArrowRight size={11}/>
                </button>
              </Link>
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}
