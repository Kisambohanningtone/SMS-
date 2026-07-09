import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import { AppLayout } from './components/layout/AppLayout'
import { LoginPage } from './pages/LoginPage'
import { RegisterPage } from './pages/RegisterPage'
import { DashboardPage } from './pages/DashboardPage'
import { PropertiesPage, PropertyDetailPage } from './pages/PropertiesPage'
import { TenantsPage } from './pages/TenantsPage'
import { PaymentsPage } from './pages/PaymentsPage'
import { RemindersPage } from './pages/RemindersPage'
import { ReportsPage } from './pages/ReportsPage'
import { SettingsPage } from './pages/SettingsPage'
import { MaintenancePage } from './pages/MaintenancePage'

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
})

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route element={<AppLayout />}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/properties" element={<PropertiesPage />} />
            <Route path="/properties/:id" element={<PropertyDetailPage />} />
            <Route path="/tenants" element={<TenantsPage />} />
            <Route path="/payments" element={<PaymentsPage />} />
            <Route path="/reminders" element={<RemindersPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/maintenance" element={<MaintenancePage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: { background: '#1E3A5F', color: '#fff', fontSize: '14px' },
          success: { style: { background: '#27500A' } },
          error: { style: { background: '#991B1B' } },
        }}
      />
    </QueryClientProvider>
  )
}
