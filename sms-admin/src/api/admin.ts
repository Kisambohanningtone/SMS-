import { api } from './client'

export interface DashboardStats {
  agents: { total: number; active: number; deactivated: number }
  owners: { total: number }
  tenants: { total: number }
  properties: { total: number }
  transactions: { total: number }
}

export interface ActivityEvent {
  type: 'payment' | 'registration'
  id: string
  title: string
  subtitle: string
  meta: string
  timestamp: string
  amount?: number
  fee?: number
}

export interface PlatformSummary {
  period: { month: number; year: number }
  agents: { total: number }
  properties: { total: number }
  units: { total: number; occupied: number; vacant: number }
  financials: {
    monthly_gross: number
    monthly_commission: number
    all_time_commission: number
    transaction_count: number
  }
}

export interface AgentRow {
  userId: string; agentId: string; fullName: string
  email: string; phone: string | null; businessName: string | null
  paybillNumber: string | null; isActive: boolean; joinedAt: string
  stats: { properties: number; transactions: number; monthly_gross: number; monthly_commission: number }
}

export interface AgentProfile {
  agent: {
    id: string; fullName: string; email: string; phone: string | null
    businessName: string | null; paybillNumber: string | null
    isActive: boolean; joinedAt: string; lastLoginAt: string | null
    deactivationReason: string | null; deactivatedAt: string | null
  }
  stats: {
    totalProperties: number; totalUnits: number; occupiedUnits: number
    totalTransactions: number; allTimeCommission: number
  }
}

export interface RecentPayment {
  id: string; gross_amount: number; waltern_fee: number
  agent_amount: number; payment_method: string
  mpesa_receipt: string | null; created_at: string
  month: number; year: number
  agent?: { id: string; business_name: string | null }
  property?: { id: string; name: string }
  unit?: { id: string; unit_number: string }
  tenant?: { id: string; full_name: string; phone: string }
}

export interface SearchUser {
  id: string; full_name: string; email: string
  phone: string | null; role: string; is_active: boolean
  created_at: string; last_login_at: string | null
}

export const adminApi = {
  stats: () =>
    api.get<{ success: boolean; data: DashboardStats }>('/api/admin/stats'),
  summary: (month?: string) =>
    api.get<{ success: boolean; data: PlatformSummary }>('/api/admin/summary', { params: month ? { month } : {} }),
  activity: (limit = 30) =>
    api.get<{ success: boolean; data: ActivityEvent[] }>('/api/admin/activity', { params: { limit } }),
  listAgents: (month?: string) =>
    api.get<{ success: boolean; data: AgentRow[] }>('/api/admin/agents', { params: month ? { month } : {} }),
  getAgent: (agentId: string) =>
    api.get<{ success: boolean; data: AgentProfile }>(`/api/admin/agents/${agentId}`),
  deactivate: (agentId: string, reason: string) =>
    api.patch(`/api/admin/agents/${agentId}/deactivate`, { reason }),
  reactivate: (agentId: string) =>
    api.patch(`/api/admin/agents/${agentId}/reactivate`),
  resetPassword: (agentId: string, newPassword: string) =>
    api.post(`/api/admin/agents/${agentId}/reset-password`, { newPassword }),
  searchUsers: (q: string, role?: string) =>
    api.get<{ success: boolean; data: SearchUser[] }>('/api/admin/users/search', { params: { q, role } }),
  deleteAgent: (agentId: string) =>
    api.delete('/api/admin/agents/' + agentId),
  deleteOwner: (ownerId: string) =>
    api.delete('/api/admin/owners/' + ownerId),
  listOwners: () =>
    api.get('/api/admin/owners'),
  recentPayments: (limit = 50) =>
    api.get<{ success: boolean; data: RecentPayment[] }>('/api/admin/payments/recent', { params: { limit } }),
}
