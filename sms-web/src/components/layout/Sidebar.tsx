import { NavLink, useNavigate } from 'react-router-dom'
import { Building2, LayoutDashboard, Users, CreditCard, Bell, FileText, Settings, LogOut, ChevronRight } from 'lucide-react'
import { useAuthStore } from '../../hooks/useAuth'
import { authApi } from '../../api/auth'

const nav = [
  { to: '/',           icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/properties', icon: Building2,       label: 'Properties' },
  { to: '/tenants',    icon: Users,           label: 'Tenants' },
  { to: '/payments',   icon: CreditCard,      label: 'Payments' },
  { to: '/reminders',  icon: Bell,            label: 'Reminders' },
  { to: '/reports',    icon: FileText,        label: 'Reports' },
  { to: '/settings',   icon: Settings,        label: 'Settings' },
]

export function Sidebar() {
  const { user, clearAuth } = useAuthStore()
  const navigate = useNavigate()

  async function handleLogout() {
    try { await authApi.logout() } catch {}
    clearAuth()
    navigate('/login')
  }

  return (
    <aside className="fixed inset-y-0 left-0 w-64 bg-primary-500 flex flex-col z-50">
      <div className="px-6 py-5 border-b border-primary-400">
        <div className="flex items-center gap-2">
          <Building2 className="text-white" size={22} />
          <div>
            <p className="text-white font-bold text-sm leading-tight">Waltern Tech</p>
            <p className="text-primary-200 text-xs">Smart Management System</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {nav.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150 group
              ${isActive ? 'bg-white text-primary-500' : 'text-primary-100 hover:bg-primary-400 hover:text-white'}`
            }
          >
            <Icon size={18} />
            <span className="flex-1">{label}</span>
            <ChevronRight size={14} className="opacity-0 group-hover:opacity-50 transition-opacity" />
          </NavLink>
        ))}
      </nav>

      <div className="px-4 py-4 border-t border-primary-400">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-full bg-primary-300 flex items-center justify-center text-primary-700 font-bold text-sm">
            {user?.firstName?.[0]}{user?.lastName?.[0]}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-medium truncate">{user?.firstName} {user?.lastName}</p>
            <p className="text-primary-200 text-xs capitalize">{user?.role}</p>
          </div>
        </div>
        <button onClick={handleLogout} className="flex items-center gap-2 w-full text-primary-200 hover:text-white text-sm transition-colors py-1.5">
          <LogOut size={15} />
          Sign out
        </button>
      </div>
    </aside>
  )
}
