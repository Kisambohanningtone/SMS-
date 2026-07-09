import { api } from './client'

export interface ReminderSchedule {
  day1: number
  day2: number
  day3: number
  channels: Array<'whatsapp' | 'sms'>
}

export interface AgentProfile {
  business_name: string | null
  phone: string | null
  paybill_number: string | null
  mpesa_number: string | null
  reminder_schedule: ReminderSchedule
  reminder_template_wa: string | null
  reminder_template_sms: string | null
  agent_fee_percent: number
  report_auto_send_day: number
}

export interface UserWithAgent {
  id: string; email: string; firstName: string; lastName: string; role: string
  agent: AgentProfile
}

export interface UpdateAgentInput {
  business_name?: string
  phone?: string
  paybill_number?: string
  mpesa_number?: string
  reminder_schedule?: ReminderSchedule
  reminder_template_wa?: string
  reminder_template_sms?: string
  agent_fee_percent?: number
  report_auto_send_day?: number
}

export const agentApi = {
  getProfile: () => api.get<{ success: boolean; data: UserWithAgent }>('/api/agents/profile'),
  updateProfile: (data: UpdateAgentInput) =>
    api.patch<{ success: boolean; data: AgentProfile }>('/api/agents/profile', data),
}
