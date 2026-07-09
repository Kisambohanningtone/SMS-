import { api } from './client'

export interface ReminderLogEntry {
  id: string
  tenant_id: string
  unit_id: string
  property_id: string
  channel: 'whatsapp' | 'sms'
  status: 'pending' | 'delivered' | 'failed'
  triggered_by: 'manual' | 'auto'
  message_body: string | null
  error_message: string | null
  created_at: string
  tenant?: { id: string; full_name: string; phone: string }
  unit?: { id: string; unit_number: string }
}

export interface BulkReminderResult {
  sent: number
  failed: number
  skipped: number
  details: Array<{ tenantId: string; status: string; error?: string }>
}

export const remindersApi = {
  sendOne: (tenantId: string, channel: 'whatsapp' | 'sms') =>
    api.post<{ success: boolean; data: BulkReminderResult }>('/api/reminders/send', { tenantId, channel }),
  sendBulk: (month?: string) =>
    api.post<{ success: boolean; data: BulkReminderResult }>('/api/reminders/bulk', null, {
      params: month ? { month } : {},
    }),
  logs: (filters?: { status?: string; channel?: string }) =>
    api.get<{ success: boolean; data: ReminderLogEntry[] }>('/api/reminders/logs', { params: filters }),
  deleteLog: (logId: string) =>
    api.delete('/api/reminders/logs/' + logId),
  clearAllLogs: () =>
    api.delete('/api/reminders/logs'),
  retry: (logId: string) =>
    api.post<{ success: boolean; data: BulkReminderResult }>(`/api/reminders/retry/${logId}`),
}
