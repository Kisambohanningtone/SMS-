import { api } from './client'

export interface PaymentRecord {
  id: string
  unit_id: string
  tenant_id: string | null
  property_id: string
  agent_id: string
  gross_amount: number
  waltern_fee: number
  agent_amount: number
  month: number
  year: number
  payment_method: 'kopokopo' | 'mpesa_stk' | 'cash' | 'bank' | 'paybill'
  mpesa_receipt: string | null
  payer_phone: string | null
  created_at: string
  is_voided: boolean
  voided_reason: string | null
  voided_at: string | null
  unit?: { id: string; unit_number: string }
  tenant?: { id: string; full_name: string; phone: string } | null
  property?: { id: string; name: string }
}

export interface PaymentSummary {
  period: { month: number; year: number }
  payments: { count: number; paid_units: number }
  units: { total: number; paid: number; outstanding: number }
  financials: { gross_collected: number; waltern_fee: number; agent_earnings: number }
}

export interface StkPushInput {
  unitId: string; phoneNumber: string; amount: number; tenantId?: string
}
export interface StkPushResult {
  checkoutRequestId: string; responseDescription: string
}

export const paymentsApi = {
  list: (params?: { month?: string; unitId?: string; propertyId?: string; payment_method?: string }) =>
    api.get<{ success: boolean; data: PaymentRecord[] }>('/api/payments', { params }),
  summary: (month?: string) =>
    api.get<{ success: boolean; data: PaymentSummary }>('/api/payments/summary', { params: month ? { month } : {} }),
  createManual: (data: {
    unit_id: string; tenant_id?: string; gross_amount: number
    month: number; year: number; payment_method: string
    mpesa_receipt?: string; payer_phone?: string
  }) => api.post<{ success: boolean; data: PaymentRecord }>('/api/payments/manual', data),
  delete: (id: string) =>
    api.delete<{ success: boolean }>('/api/payments/' + id),
  void: (id: string, reason: string) =>
    api.patch<{ success: boolean; data: PaymentRecord }>(`/api/payments/${id}/void`, { reason }),
  stkPush: (data: StkPushInput) =>
    api.post<{ success: boolean; data: StkPushResult }>('/api/payments/stk-push', data),
  stkStatus: (checkoutRequestId: string) =>
    api.get<{ success: boolean; data: { status: string; mpesaReceipt?: string } }>(
      `/api/payments/stk-push/${checkoutRequestId}/status`
    ),
}
