import { api } from './client'

export interface TenantProfile {
  id: string
  full_name: string
  phone: string
  national_id: string | null
  lease_start: string
  lease_end: string | null
  deposit_amount: number
  deposit_paid: boolean
  is_active: boolean
  unit: {
    id: string
    unit_number: string
    status: string
    property: {
      id: string
      name: string
      location: string
    }
  }
}

export interface TenantPayment {
  id: string
  gross_amount: number
  payment_method: string
  mpesa_receipt: string | null
  month: number
  year: number
  created_at: string
}

export const tenantApi = {
  getProfile: () =>
    api.get<{ success: boolean; data: TenantProfile }>('/api/tenant-auth/profile'),
  getPayments: () =>
    api.get<{ success: boolean; data: TenantPayment[] }>('/api/tenant-auth/payments'),
}
