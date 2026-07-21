import { NavLink, useNavigate } from 'react-router-dom'
import { LayoutDashboard, Users, CreditCard, Activity, LogOut, Shield, ChevronRight, Zap, Search, Home, UserPlus } from 'lucide-react'
import { useAuthStore } from '../../hooks/useAuth'
import { authApi } from '../../api/auth'

const nav = [
  { to: '/',         icon: LayoutDashboard, label: 'Dashboard',    desc: 'Platform overview' },
  { to: '/agents',   icon: Users,           label: 'Agents',       desc: 'Manage accounts' },
  { to: '/users',    icon: Search,          label: 'User Search',  desc: 'Find any user' },
  { to: '/owners',   icon: Home,            label: 'Owners',       desc: 'Property owners' },
  { to: '/payments', icon: CreditCard,      label: 'Transactions', desc: 'All payments' },
  { to: '/activity', icon: Activity,        label: 'Live Feed',    desc: 'Real-time events' },
]

export function Sidebar() {
  const { user, clearAuth } = useAuthStore()
  const navigate = useNavigate()

  async function handleLogout() {
    try { await authApi.logout() } catch {}
    clearAuth()
    navigate('/login')
  }

  const initials = user?.full_name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2) ?? 'WT'

  return (
    <aside className="fixed inset-y-0 left-0 w-64 flex flex-col z-50" style={{ background: '#0F172A' }}>
      <div className="px-5 pt-6 pb-5 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg">
            <Shield size={18} className="text-white" />
          </div>
          <div>
            <p className="text-white font-bold text-sm tracking-tight">Waltern Tech</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <p className="text-slate-400 text-xs">Admin Console</p>
            </div>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        <p className="text-slate-600 text-xs font-semibold uppercase tracking-widest px-3 mb-3">Navigation</p>
        {nav.map(({ to, icon: Icon, label, desc }) => (
          <NavLink key={to} to={to} end={to === '/'}
            className={({ isActive }) => isActive ? 'nav-active' : 'nav-inactive'}>
            {({ isActive }) => (
              <>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${isActive ? 'bg-white/10' : ''}`}>
                  <Icon size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium leading-none">{label}</p>
                  <p className={`text-xs mt-0.5 ${isActive ? 'text-slate-300' : 'text-slate-600'}`}>{desc}</p>
                </div>
                {isActive && <ChevronRight size={14} className="text-slate-400 flex-shrink-0" />}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="px-3 pb-2">
        {user?.role === 'super_admin' && <NavLink to="/register-admin"
          className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium text-amber-400 hover:bg-white/5 transition-colors border border-amber-500/20 hover:border-amber-500/40">
          <UserPlus size={15} />
          <span>Add Admin</span>
        </NavLink>}
      </div>
      <div className="px-4 pb-2">
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-indigo-600/10 border border-indigo-500/20">
          <Zap size={12} className="text-indigo-400" />
          <p className="text-xs text-indigo-300">SMS Platform v1.0 MVP</p>
        </div>
      </div>

      <div className="px-3 pb-4 pt-2 border-t border-white/5">
        <div className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-white/5 transition-colors group">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-semibold truncate">{user?.full_name}</p>
            <p className="text-slate-500 text-xs">Super Admin</p>
          </div>
          <button onClick={handleLogout} className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-500 hover:text-white p-1 rounded-lg hover:bg-white/10" title="Sign out">
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </aside>
  )
}
