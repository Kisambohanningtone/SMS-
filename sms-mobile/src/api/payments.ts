import { api } from './client'

export interface StkPushResult {
  checkoutRequestId: string
  responseDescription: string
}

export const tenantPaymentsApi = {
  stkPush: (amount: number) =>
    api.post<{ success: boolean; data: StkPushResult }>('/api/tenant-auth/pay', { amount }),
  stkStatus: (checkoutRequestId: string) =>
    api.get<{ success: boolean; data: { status: string; mpesaReceipt?: string } }>(
      `/api/payments/stk-push/${checkoutRequestId}/status`
    ),
}
