import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Settings, Building2, Bell, Percent, Loader2, Save, CheckCircle2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { agentApi, type ReminderSchedule } from '../api/agent'

function Section({ icon: Icon, title, description, children }: { icon: any; title: string; description: string; children: React.ReactNode }) {
  return (
    <div className="card">
      <div className="flex items-start gap-3 mb-5">
        <div className="w-10 h-10 rounded-lg bg-primary-50 flex items-center justify-center flex-shrink-0">
          <Icon size={18} className="text-primary-500" />
        </div>
        <div>
          <h2 className="font-semibold text-gray-900">{title}</h2>
          <p className="text-sm text-gray-500 mt-0.5">{description}</p>
        </div>
      </div>
      {children}
    </div>
  )
}

export function SettingsPage() {
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['agent-profile'],
    queryFn: () => agentApi.getProfile(),
  })

  const agent = data?.data?.data?.agent

  // Business profile state
  const [businessName, setBusinessName] = useState('')
  const [phone, setPhone] = useState('')
  const [paybillNumber, setPaybillNumber] = useState('')
  const [mpesaNumber, setMpesaNumber] = useState('')

  // Reminder settings state
  const [day1, setDay1] = useState(1)
  const [day2, setDay2] = useState(7)
  const [day3, setDay3] = useState(15)
  const [channels, setChannels] = useState<Array<'whatsapp' | 'sms'>>(['whatsapp'])
  const [templateWa, setTemplateWa] = useState('')
  const [templateSms, setTemplateSms] = useState('')

  // Fee settings state
  const [feePercent, setFeePercent] = useState(10)
  const [reportSendDay, setReportSendDay] = useState(5)

  useEffect(() => {
    if (!agent) return
    setBusinessName(agent.business_name ?? '')
    setPhone(agent.phone ?? '')
    setPaybillNumber(agent.paybill_number ?? '')
    setMpesaNumber(agent.mpesa_number ?? '')
    setDay1(agent.reminder_schedule?.day1 ?? 1)
    setDay2(agent.reminder_schedule?.day2 ?? 7)
    setDay3(agent.reminder_schedule?.day3 ?? 15)
    setChannels(agent.reminder_schedule?.channels ?? ['whatsapp'])
    setTemplateWa(agent.reminder_template_wa ?? 'Dear [Tenant Name], this is a reminder that your rent of [Amount Due] for [Unit Number] at [Property Name] for [Month] is outstanding. Please pay via M-Pesa Paybill. Thank you.')
    setTemplateSms(agent.reminder_template_sms ?? '[Property Name] - [Unit Number]: Rent [Amount Due] for [Month] is due. Pay via M-Pesa Paybill. -Waltern Tech')
    setFeePercent(agent.agent_fee_percent ?? 10)
    setReportSendDay(agent.report_auto_send_day ?? 5)
  }, [agent])

  const saveBusiness = useMutation({
    mutationFn: () => agentApi.updateProfile({
      business_name: businessName || undefined,
      phone: phone || undefined,
      paybill_number: paybillNumber || undefined,
      mpesa_number: mpesaNumber || undefined,
    }),
    onSuccess: () => {
      toast.success('Business profile saved')
      queryClient.invalidateQueries({ queryKey: ['agent-profile'] })
    },
    onError: (err: any) => toast.error(err.response?.data?.message ?? 'Failed to save'),
  })

  const saveReminders = useMutation({
    mutationFn: () => agentApi.updateProfile({
      reminder_schedule: { day1, day2, day3, channels } as ReminderSchedule,
      reminder_template_wa: templateWa,
      reminder_template_sms: templateSms,
    }),
    onSuccess: () => {
      toast.success('Reminder settings saved')
      queryClient.invalidateQueries({ queryKey: ['agent-profile'] })
    },
    onError: (err: any) => toast.error(err.response?.data?.message ?? 'Failed to save'),
  })

  const saveFees = useMutation({
    mutationFn: () => agentApi.updateProfile({
      agent_fee_percent: feePercent,
      report_auto_send_day: reportSendDay,
    }),
    onSuccess: () => {
      toast.success('Fee settings saved')
      queryClient.invalidateQueries({ queryKey: ['agent-profile'] })
    },
    onError: (err: any) => toast.error(err.response?.data?.message ?? 'Failed to save'),
  })

  function toggleChannel(ch: 'whatsapp' | 'sms') {
    setChannels(prev => prev.includes(ch) ? prev.filter(c => c !== ch) : [...prev, ch])
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={32} className="animate-spin text-primary-500" />
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-1">Configure your agent profile and preferences</p>
      </div>

      {/* Business Profile */}
      <Section icon={Building2} title="Business Profile" description="Your contact details and M-Pesa Paybill number">
        <div className="space-y-4">
          <div>
            <label className="label">Business name</label>
            <input className="input" placeholder="Waltern Tech Ltd" value={businessName} onChange={e => setBusinessName(e.target.value)} />
          </div>
          <div>
            <label className="label">Phone number</label>
            <input className="input" placeholder="+254700000000" value={phone} onChange={e => setPhone(e.target.value)} />
          </div>
          <div>
            <label className="label">M-Pesa Paybill number</label>
            <input className="input" placeholder="e.g. 174379" value={paybillNumber} onChange={e => setPaybillNumber(e.target.value)} />
            <p className="text-xs text-gray-400 mt-1">
              Tenants pay rent into this Paybill. The system automatically matches payments to units using the account reference (unit number).
            </p>
          </div>
          <div>
            <label className="label">M-Pesa number for payouts (optional)</label>
            <input className="input" placeholder="254712345678" value={mpesaNumber} onChange={e => setMpesaNumber(e.target.value)} />
          </div>
          <button
            onClick={() => saveBusiness.mutate()}
            disabled={saveBusiness.isPending}
            className="btn-primary text-sm flex items-center gap-1.5"
          >
            {saveBusiness.isPending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            Save Business Profile
          </button>
        </div>
      </Section>

      {/* Reminder Settings */}
      <Section icon={Bell} title="Reminder Settings" description="When and how overdue tenants are reminded automatically">
        <div className="space-y-4">
          <div>
            <label className="label">Reminder days (day of month)</label>
            <div className="grid grid-cols-3 gap-2">
              <input type="number" min={1} max={31} className="input" value={day1} onChange={e => setDay1(Number(e.target.value))} />
              <input type="number" min={1} max={31} className="input" value={day2} onChange={e => setDay2(Number(e.target.value))} />
              <input type="number" min={1} max={31} className="input" value={day3} onChange={e => setDay3(Number(e.target.value))} />
            </div>
            <p className="text-xs text-gray-400 mt-1">Reminders go out automatically at 8am Nairobi time on these days</p>
          </div>

          <div>
            <label className="label">Send via</label>
            <div className="flex gap-2">
              <button
                onClick={() => toggleChannel('whatsapp')}
                className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${channels.includes('whatsapp') ? 'bg-primary-500 text-white border-primary-500' : 'bg-white text-gray-600 border-gray-200'}`}
              >
                WhatsApp
              </button>
              <button
                onClick={() => toggleChannel('sms')}
                className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${channels.includes('sms') ? 'bg-primary-500 text-white border-primary-500' : 'bg-white text-gray-600 border-gray-200'}`}
              >
                SMS
              </button>
            </div>
          </div>

          <div>
            <label className="label">WhatsApp message template</label>
            <textarea className="input" rows={3} value={templateWa} onChange={e => setTemplateWa(e.target.value)} />
          </div>

          <div>
            <label className="label">SMS message template</label>
            <textarea className="input" rows={2} value={templateSms} onChange={e => setTemplateSms(e.target.value)} />
            <p className="text-xs text-gray-400 mt-1">
              Available placeholders: [Tenant Name] [Unit Number] [Property Name] [Amount Due] [Month]
            </p>
          </div>

          <button
            onClick={() => saveReminders.mutate()}
            disabled={saveReminders.isPending}
            className="btn-primary text-sm flex items-center gap-1.5"
          >
            {saveReminders.isPending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            Save Reminder Settings
          </button>
        </div>
      </Section>

      {/* Fee Settings */}
      <Section icon={Percent} title="Fees & Reports" description="Your management fee and owner statement schedule">
        <div className="space-y-4">
          <div>
            <label className="label">Your management fee (% of rent collected)</label>
            <input type="number" min={0} max={30} className="input" value={feePercent} onChange={e => setFeePercent(Number(e.target.value))} />
            <p className="text-xs text-gray-400 mt-1">
              Charged separately from the 0.5% Waltern Tech platform fee
            </p>
          </div>
          <div>
            <label className="label">Auto-send owner statements on day</label>
            <input type="number" min={1} max={28} className="input" value={reportSendDay} onChange={e => setReportSendDay(Number(e.target.value))} />
            <p className="text-xs text-gray-400 mt-1">Monthly statement is generated and sent to owners on this day</p>
          </div>
          <button
            onClick={() => saveFees.mutate()}
            disabled={saveFees.isPending}
            className="btn-primary text-sm flex items-center gap-1.5"
          >
            {saveFees.isPending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            Save Fee Settings
          </button>
        </div>
      </Section>
    </div>
  )
}
