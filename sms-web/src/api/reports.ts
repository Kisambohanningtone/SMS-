import { api } from './client'

export interface OwnerReport {
  id: string
  property_id: string
  month: number
  year: number
  total_expected: number
  total_collected: number
  waltern_fee_total: number
  agent_fee_amount: number
  maintenance_total: number
  net_to_owner: number
  collection_rate: number
  pdf_url: string | null
  owner_token: string | null
  sent_at: string | null
  created_at: string
  property?: { id: string; name: string; location: string }
}

export const reportsApi = {
  list: (filters?: { propertyId?: string; month?: string; year?: string }) =>
    api.get<{ success: boolean; data: OwnerReport[] }>('/api/reports', { params: filters }),
  generate: (propertyId: string, monthYear: string) =>
    api.post<{ success: boolean; data: OwnerReport }>('/api/reports/generate', { propertyId, monthYear }),
  delete: (reportId: string) =>
    api.delete<{ success: boolean }>('/api/reports/' + reportId),
  send: (reportId: string) =>
    api.post<{ success: boolean; data: unknown }>(`/api/reports/${reportId}/send`),
}
