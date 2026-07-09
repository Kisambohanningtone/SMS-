import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import { AppLayout } from './components/layout/AppLayout'
import { LoginPage } from './pages/LoginPage'
import { DashboardPage } from './pages/DashboardPage'
import { AgentsPage } from './pages/AgentsPage'
import { PaymentsPage } from './pages/PaymentsPage'
import { ActivityPage } from './pages/ActivityPage'
import { UsersPage } from './pages/UsersPage'
import { OwnersPage } from './pages/OwnersPage'
import { RegisterAdminPage } from './pages/RegisterAdminPage'

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 15_000 } },
})

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register-admin" element={<RegisterAdminPage />} />
          <Route element={<AppLayout />}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/agents" element={<AgentsPage />} />
            <Route path="/payments" element={<PaymentsPage />} />
            <Route path="/activity" element={<ActivityPage />} />
            <Route path="/users" element={<UsersPage />} />
            <Route path="/owners" element={<OwnersPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: { background: '#0F172A', color: '#fff', fontSize: '14px' },
          success: { style: { background: '#065f46' } },
          error: { style: { background: '#7f1d1d' } },
        }}
      />
    </QueryClientProvider>
  )
}
