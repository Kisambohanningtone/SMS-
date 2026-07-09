import { api } from './client'

export interface UnitTypeGroup {
  id: string; name: string; rent_amount: number; sort_order: number
}
export interface Unit {
  id: string; unit_number: string; status: 'occupied' | 'vacant'
  floor: string | null; unit_type_group_id: string | null
}
export interface Owner {
  id: string; full_name: string; phone: string; email: string
}
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
  summary: {
    total_units: number; paid: number; partial: number
    unpaid: number; vacant: number
    total_expected: number; total_collected: number
  }
  units: UnitStatus[]
}

export const propertiesApi = {
  list: () =>
    api.get<{ success: boolean; data: Property[] }>('/api/properties'),
  get: (id: string) =>
    api.get<{ success: boolean; data: Property }>(`/api/properties/${id}`),
  create: (data: { owner_id: string; name: string; location: string; default_rent?: number }) =>
    api.post<{ success: boolean; data: Property }>('/api/properties', data),
  paymentStatus: (id: string, month?: string) =>
    api.get<{ success: boolean; data: PaymentBoard }>(
      `/api/properties/${id}/payment-status${month ? `?month=${month}` : ''}`
    ),
  delete: (id: string) => api.delete<{ success: boolean; message: string }>(`/api/properties/${id}`),
}
