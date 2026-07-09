import { api } from './client'

export interface RentGroup {
  id: string
  name: string
  rent_amount: number
  sort_order: number
  units?: Unit[]
}

export interface Unit {
  id: string
  unit_number: string
  status: 'occupied' | 'vacant'
  tenant?: {
    id: string
    full_name: string
    phone: string
    lease_start: string
  } | null
}

export interface Property {
  id: string
  name: string
  location: string
  unit_type_groups: RentGroup[]
}

export interface Payment {
  id: string
  gross_amount: number
  waltern_fee: number
  agent_amount: number
  payment_method: string
  mpesa_receipt: string | null
  month: number
  year: number
  created_at: string
  property?: { id: string; name: string }
  unit?: { id: string; unit_number: string }
  tenant?: { id: string; full_name: string }
}

export interface PaymentsResponse {
  summary: {
    totalGross: number
    totalWalternFee: number
    totalAgentFee: number
    netToOwner: number
    count: number
  }
  payments: Payment[]
}

export const ownerApi = {
  getProperties: () =>
    api.get<{ success: boolean; data: Property[] }>('/api/owner-auth/properties'),
  getPropertyDetail: (id: string) =>
    api.get<{ success: boolean; data: Property }>(`/api/owner-auth/properties/${id}`),
  updateRent: (groupId: string, rentAmount: number) =>
    api.patch(`/api/owner-auth/rent-groups/${groupId}`, { rentAmount }),
  getReports: () =>
    api.get('/api/owner-auth/reports'),
  getPayments: (month?: string) =>
    api.get<{ success: boolean; data: PaymentsResponse }>(
      '/api/owner-auth/payments',
      { params: month ? { month } : {} }
    ),
}
