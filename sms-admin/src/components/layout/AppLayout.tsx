import { Outlet, Navigate } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'
import { useAuthStore } from '../../hooks/useAuth'

export function AppLayout() {
  const { isAuthenticated, user } = useAuthStore()
  if (!isAuthenticated()) return <Navigate to="/login" replace />
  if (user?.role !== 'admin' && user?.role !== 'super_admin') return <Navigate to="/login" replace />

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      <Sidebar />
      <div className="flex-1 ml-64 flex flex-col overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-y-auto">
          <div className="p-6 max-w-screen-xl mx-auto animate-fade-in">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
