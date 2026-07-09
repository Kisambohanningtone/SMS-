import { api } from './client'

export interface TenantUnit {
  id: string; unit_number: string
  property?: { id: string; name: string }
}
export interface Tenant {
  id: string; unit_id: string; full_name: string; phone: string
  national_id?: string | null; lease_start: string; lease_end?: string | null
  deposit_amount: number; deposit_paid: boolean; is_active: boolean
  unit?: TenantUnit
}
export interface CreateTenantInput {
  unit_id: string; full_name: string; phone: string
  national_id?: string; lease_start: string
  deposit_amount?: number; deposit_paid?: boolean
}

export const tenantsApi = {
  list: (isActive?: boolean) =>
    api.get<{ success: boolean; data: Tenant[] }>('/api/tenants', {
      params: isActive !== undefined ? { isActive: String(isActive) } : {},
    }),
  get: (id: string) =>
    api.get<{ success: boolean; data: Tenant }>(`/api/tenants/${id}`),
  create: (data: CreateTenantInput) =>
    api.post<{ success: boolean; data: Tenant }>('/api/tenants', data),
  vacate: (id: string) =>
    api.delete<{ success: boolean; message: string }>(`/api/tenants/${id}`),
}
