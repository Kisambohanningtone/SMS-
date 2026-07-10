import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Bell, Send, Loader2, CheckCircle2, XCircle, Clock, RefreshCw, MessageCircle, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { propertiesApi } from '../api/properties'
import { remindersApi, type ReminderLogEntry } from '../api/reminders'

interface OverdueTenant {
  tenantId: string
  tenantName: string
  phone: string
  unitNumber: string
  propertyName: string
  balance: number
  status: 'unpaid' | 'partial'
}

function OverdueRow({ tenant, onSend }: { tenant: OverdueTenant; onSend: (tenantId: string, channel: 'whatsapp' | 'sms') => void }) {
  const [sending, setSending] = useState<'whatsapp' | 'sms' | null>(null)

  async function handleSend(channel: 'whatsapp' | 'sms') {
    setSending(channel)
    await onSend(tenant.tenantId, channel)
    setSending(null)
  }

  return (
    <tr className="border-b last:border-0 hover:bg-gray-50">
      <td className="px-4 py-3">
        <p className="font-medium text-gray-900">{tenant.tenantName}</p>
        <p className="text-xs text-gray-400">{tenant.phone}</p>
      </td>
      <td className="px-4 py-3 text-gray-600">{tenant.unitNumber} — {tenant.propertyName}</td>
      <td className="px-4 py-3">
        <span className={tenant.status === 'unpaid' ? 'badge-unpaid' : 'badge-partial'}>
          {tenant.status === 'unpaid' ? 'Unpaid' : 'Partial'}
        </span>
      </td>
      <td className="px-4 py-3 text-right font-medium text-red-600">KES {tenant.balance.toLocaleString()}</td>
      <td className="px-4 py-3">
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={() => handleSend('whatsapp')}
            disabled={sending !== null}
            className="text-xs btn-secondary py-1 px-2 flex items-center gap-1"
          >
            {sending === 'whatsapp' ? <Loader2 size={11} className="animate-spin" /> : <MessageCircle size={11} />}
            WhatsApp
          </button>
          <button
            onClick={() => handleSend('sms')}
            disabled={sending !== null}
            className="text-xs btn-secondary py-1 px-2"
          >
            {sending === 'sms' ? <Loader2 size={11} className="animate-spin" /> : 'SMS'}
          </button>
        </div>
      </td>
    </tr>
  )
}

const STATUS_ICON = {
  delivered: <CheckCircle2 size={13} className="text-green-500" />,
  failed: <XCircle size={13} className="text-red-500" />,
  pending: <Clock size={13} className="text-amber-500" />,
}

export function RemindersPage() {
  const queryClient = useQueryClient()
  const [tab, setTab] = useState<'overdue' | 'logs'>('overdue')
  const now = new Date()
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

  const { data: propsData } = useQuery({
    queryKey: ['properties'],
    queryFn: () => propertiesApi.list(),
  })

  const properties = propsData?.data?.data ?? []

  // Fetch payment status board for every property to compute overdue tenants
  const boardQueries = useQuery({
    queryKey: ['all-payment-boards', month, properties.map(p => p.id).join(',')],
    queryFn: async () => {
      const boards = await Promise.all(
        properties.map(p => propertiesApi.paymentStatus(p.id, month).then(r => r.data.data))
      )
      return boards
    },
    enabled: properties.length > 0,
  })

  const overdueTenants: OverdueTenant[] = useMemo(() => {
    const boards = boardQueries.data ?? []
    const list: OverdueTenant[] = []
    for (const board of boards) {
      for (const unit of board.units) {
        if ((unit.status === 'unpaid' || unit.status === 'partial') && unit.tenant) {
          list.push({
            tenantId: unit.tenant.id,
            tenantName: unit.tenant.name,
            phone: unit.tenant.phone,
            unitNumber: unit.unit_number,
            propertyName: board.property.name,
            balance: unit.balance,
            status: unit.status,
          })
        }
      }
    }
    return list
  }, [boardQueries.data])

  const { data: logsData, isLoading: logsLoading } = useQuery({
    queryKey: ['reminder-logs'],
    queryFn: () => remindersApi.logs(),
    enabled: tab === 'logs',
  })
  const logs = logsData?.data?.data ?? []

  const sendOne = useMutation({
    mutationFn: ({ tenantId, channel }: { tenantId: string; channel: 'whatsapp' | 'sms' }) =>
      remindersApi.sendOne(tenantId, channel),
    onSuccess: (res) => {
      const result = res.data.data
      if (result.sent > 0) toast.success('Reminder sent')
      else toast.error('Reminder failed to send')
      queryClient.invalidateQueries({ queryKey: ['reminder-logs'] })
    },
    onError: (err: any) => toast.error(err.response?.data?.message ?? 'Failed to send reminder'),
  })

  const sendBulk = useMutation({
    mutationFn: () => remindersApi.sendBulk(month),
    onSuccess: (res) => {
      const result = res.data.data
      toast.success(`Sent ${result.sent} reminder${result.sent !== 1 ? 's' : ''}${result.failed > 0 ? `, ${result.failed} failed` : ''}`)
      queryClient.invalidateQueries({ queryKey: ['reminder-logs'] })
    },
    onError: (err: any) => toast.error(err.response?.data?.message ?? 'Failed to send bulk reminders'),
  })

  const retry = useMutation({
    mutationFn: (logId: string) => remindersApi.retry(logId),
    onSuccess: () => {
      toast.success('Retry sent')
      queryClient.invalidateQueries({ queryKey: ['reminder-logs'] })
    },
    onError: (err: any) => toast.error(err.response?.data?.message ?? 'Retry failed'),
  })

  async function handleSendOne(tenantId: string, channel: 'whatsapp' | 'sms') {
    await sendOne.mutateAsync({ tenantId, channel })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reminders</h1>
          <p className="text-sm text-gray-500 mt-1">Send and track payment reminders to tenants</p>
        </div>
        {tab === 'overdue' && overdueTenants.length > 0 && (
          <button
            onClick={() => sendBulk.mutate()}
            disabled={sendBulk.isPending}
            className="btn-primary text-sm flex items-center gap-1.5"
          >
            {sendBulk.isPending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            Send All ({overdueTenants.length})
          </button>
        )}
      </div>

      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
        <button
          onClick={() => setTab('overdue')}
          className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${tab === 'overdue' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}
        >
          Overdue ({overdueTenants.length})
        </button>
        <button
          onClick={() => setTab('logs')}
          className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${tab === 'logs' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}
        >
          Delivery Log
        </button>
      </div>

      {tab === 'overdue' && (
        boardQueries.isLoading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 size={28} className="animate-spin text-primary-500" />
          </div>
        ) : overdueTenants.length === 0 ? (
          <div className="card text-center py-16">
            <CheckCircle2 size={48} className="mx-auto mb-4 text-green-300" />
            <p className="text-gray-500 font-medium">No overdue tenants</p>
            <p className="text-sm text-gray-400 mt-1">Everyone is paid up for this month</p>
          </div>
        ) : (
          <div className="card p-0 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50 text-left text-gray-500">
                  <th className="px-4 py-3 font-medium">Tenant</th>
                  <th className="px-4 py-3 font-medium">Unit</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium text-right">Balance</th>
                  <th className="px-4 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {overdueTenants.map(t => (
                  <OverdueRow key={t.tenantId} tenant={t} onSend={handleSendOne} />
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {tab === 'logs' && (
        logsLoading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 size={28} className="animate-spin text-primary-500" />
          </div>
        ) : logs.length === 0 ? (
          <div className="card text-center py-16">
            <Bell size={48} className="mx-auto mb-4 text-gray-300" />
            <p className="text-gray-500 font-medium">No reminders sent yet</p>
          </div>
        ) : (
          <div className="card p-0 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50 text-left text-gray-500">
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Tenant</th>
                  <th className="px-4 py-3 font-medium">Unit</th>
                  <th className="px-4 py-3 font-medium">Channel</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Trigger</th>
                  <th className="px-4 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log: ReminderLogEntry) => (
                  <tr key={log.id} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                      {new Date(log.created_at).toLocaleDateString('en-KE', { day: 'numeric', month: 'short' })}
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900">{log.tenant?.full_name ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{log.unit?.unit_number ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-600 capitalize">{log.channel}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        {STATUS_ICON[log.status]}
                        <span className="capitalize text-gray-600">{log.status}</span>
                      </div>
                      {log.error_message && (
                        <p className="text-xs text-red-400 mt-0.5">{log.error_message}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-400 capitalize">{log.triggered_by}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center gap-2">
                        {log.status === 'failed' && (
                          <button
                            onClick={() => retry.mutate(log.id)}
                            disabled={retry.isPending}
                            className="text-gray-400 hover:text-primary-500 transition-colors"
                            title="Retry"
                          >
                            <RefreshCw size={13} />
                          </button>
                        )}
                        <button
                          onClick={() => remindersApi.deleteLog(log.id).then(() => queryClient.invalidateQueries({ queryKey: ['reminder-logs'] }))}
                          className="text-gray-400 hover:text-red-500 transition-colors"
                          title="Delete log"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}
    </div>
  )
}
