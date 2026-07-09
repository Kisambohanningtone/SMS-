import { useLocation } from 'react-router-dom'
import { Bell, Search } from 'lucide-react'
import { useAuthStore } from '../../hooks/useAuth'
import { useState, useEffect } from 'react'

const titles: Record<string, { title: string; subtitle: string }> = {
  '/':         { title: 'Dashboard',      subtitle: 'Platform overview and key metrics' },
  '/agents':   { title: 'Agents',         subtitle: 'Manage agent accounts and commissions' },
  '/payments': { title: 'Transactions',   subtitle: 'All payment records across the platform' },
  '/activity': { title: 'Live Activity',  subtitle: 'Real-time payment feed' },
  '/owners':   { title: 'Owners',          subtitle: 'All property owners on the platform' },
}

export function TopBar() {
  const { pathname } = useLocation()
  const { title, subtitle } = titles[pathname] ?? { title: 'Admin', subtitle: '' }
  const [time, setTime] = useState(new Date())

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  return (
    <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-sm border-b border-slate-100">
      <div className="flex items-center justify-between px-6 h-16">
        <div>
          <h1 className="text-lg font-bold text-slate-900 leading-tight">{title}</h1>
          <p className="text-xs text-slate-400">{subtitle}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-500">
            <span className="tabular font-medium text-slate-700">
              {time.toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
            <span className="text-slate-300">•</span>
            <span>Nairobi</span>
          </div>
          <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-semibold text-emerald-700">System Live</span>
          </div>
        </div>
      </div>
    </header>
  )
}
