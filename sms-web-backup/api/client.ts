import axios from 'axios'

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:5000',
  timeout: 15000,
})

// Attach token to every request
api.interceptors.request.use(config => {
  const token = localStorage.getItem('sms_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Auto-logout on 401
api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('sms_token')
      localStorage.removeItem('sms_user')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)
EOF

cat > /home/claude/sms-web/src/api/auth.ts << 'EOF'
import { api } from './client'

export interface LoginInput { email: string; password: string }
export interface User { id: string; email: string; firstName: string; lastName: string; role: string; agentId: string }
export interface AuthResponse { accessToken: string; user: User }

export const authApi = {
  login: (data: LoginInput) => api.post<{ success: boolean; data: AuthResponse }>('/api/auth/login', data),
  me: () => api.get<{ success: boolean; data: User }>('/api/auth/me'),
  logout: () => api.post('/api/auth/logout'),
}
EOF

cat > /home/claude/sms-web/src/api/properties.ts << 'EOF'
import { api } from './client'

export interface UnitTypeGroup { id: string; name: string; rent_amount: number; sort_order: number }
export interface Unit { id: string; unit_number: string; status: 'occupied' | 'vacant'; floor: string | null; unit_type_group_id: string | null }
export interface Owner { id: string; full_name: string; phone: string; email: string }
export interface Property {
  id: string; name: string; location: string; default_rent: number
  color_hex: string; payment_method: string; is_active: boolean
  owner: Owner; units: Unit[]; unit_type_groups: UnitTypeGroup[]
  created_at: string
}
export interface UnitStatus {
  unit_id: string; unit_number: string; floor: string | null
  rent_type: string; rent_due: number; amount_paid: number
  balance: number; status: 'paid' | 'partial' | 'unpaid' | 'vacant'
  tenant: { id: string; name: string; phone: string } | null
}
export interface PaymentBoard {
  property: { id: string; name: string }
  period: { month: number; year: number }
  summary: { total_units: number; paid: number; partial: number; unpaid: number; vacant: number; total_expected: number; total_collected: number }
  units: UnitStatus[]
}

export const propertiesApi = {
  list: () => api.get<{ success: boolean; data: Property[] }>('/api/properties'),
  get: (id: string) => api.get<{ success: boolean; data: Property }>(`/api/properties/${id}`),
  create: (data: Partial<Property> & { owner_id: string }) => api.post<{ success: boolean; data: Property }>('/api/properties', data),
  paymentStatus: (id: string, month?: string) =>
    api.get<{ success: boolean; data: PaymentBoard }>(`/api/properties/${id}/payment-status${month ? `?month=${month}` : ''}`),
}
EOF

cat > /home/claude/sms-web/src/api/payments.ts << 'EOF'
import { api } from './client'

export interface StkPushInput { unitId: string; phoneNumber: string; amount: number; tenantId?: string }
export interface StkPushResult { checkoutRequestId: string; responseDescription: string }

export const paymentsApi = {
  stkPush: (data: StkPushInput) => api.post<{ success: boolean; data: StkPushResult }>('/api/payments/stk-push', data),
  stkStatus: (checkoutRequestId: string) => api.get<{ success: boolean; data: { status: string; mpesaReceipt?: string } }>(`/api/payments/stk-push/${checkoutRequestId}/status`),
  list: (params?: Record<string, string>) => api.get('/api/payments', { params }),
  summary: (month?: string) => api.get('/api/payments/summary', { params: month ? { month } : {} }),
  createManual: (data: Record<string, unknown>) => api.post('/api/payments/manual', data),
}
EOF

cat > /home/claude/sms-web/src/api/tenants.ts << 'EOF'
import { api } from './client'

export interface Tenant { id: string; unit_id: string; full_name: string; phone: string; national_id?: string; lease_start: string; lease_end?: string; deposit_amount: number; deposit_paid: boolean; is_active: boolean }
export interface CreateTenantInput { unit_id: string; full_name: string; phone: string; national_id?: string; lease_start: string; lease_end?: string; deposit_amount?: number }

export const tenantsApi = {
  create: (data: CreateTenantInput) => api.post<{ success: boolean; data: Tenant }>('/api/tenants', data),
  list: (params?: Record<string, string>) => api.get<{ success: boolean; data: Tenant[] }>('/api/tenants', { params }),
  vacate: (id: string) => api.patch(`/api/tenants/${id}/vacate`),
}