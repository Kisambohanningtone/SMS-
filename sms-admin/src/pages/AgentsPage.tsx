import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Loader2, Building2, TrendingUp, DollarSign, UserX,
  UserCheck, ChevronDown, ChevronUp, Search, X, KeyRound, Eye
} from 'lucide-react'
import toast from 'react-hot-toast'
import { adminApi, type AgentRow, type AgentProfile } from '../api/admin'

// ── Deactivate Modal ──────────────────────────────────────────────────────────
function DeactivateModal({ agent, onClose }: { agent: AgentRow; onClose: () => void }) {
  const [reason, setReason] = useState('')
  const queryClient = useQueryClient()

  const deactivate = useMutation({
    mutationFn: () => adminApi.deactivate(agent.agentId, reason),
    onSuccess: () => {
      toast.success(`${agent.fullName} has been deactivated`)
      queryClient.invalidateQueries({ queryKey: ['admin-agents'] })
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] })
      onClose()
    },
    onError: (err: any) => toast.error(err.response?.data?.message ?? 'Failed to deactivate'),
  })

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h3 className="font-bold text-slate-900">Deactivate Agent</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <p className="text-sm font-semibold text-red-800">{agent.fullName}</p>
            <p className="text-xs text-red-600 mt-0.5">{agent.email}</p>
          </div>
          <div className="text-xs text-slate-500 space-y-1">
            <p>• Login will be immediately disabled</p>
            <p>• All assigned properties remain intact</p>
            <p>• Payment history is preserved</p>
            <p>• Account can be reactivated anytime</p>
          </div>
          <div>
            <label className="label">Reason for deactivation <span className="text-red-500">*</span></label>
            <textarea
              className="input"
              rows={3}
              placeholder="e.g. Contract ended, policy violation..."
              value={reason}
              onChange={e => setReason(e.target.value)}
            />
          </div>
        </div>
        <div className="flex gap-2 px-6 py-4 border-t bg-slate-50 rounded-b-2xl">
          <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button
            onClick={() => deactivate.mutate()}
            disabled={!reason.trim() || deactivate.isPending}
            className="btn-danger flex-1"
          >
            {deactivate.isPending ? <Loader2 size={14} className="animate-spin" /> : 'Deactivate'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Reset Password Modal ──────────────────────────────────────────────────────
function ResetPasswordModal({ agent, onClose }: { agent: AgentRow; onClose: () => void }) {
  const [password, setPassword] = useState('')

  const reset = useMutation({
    mutationFn: () => adminApi.resetPassword(agent.agentId, password),
    onSuccess: () => { toast.success('Password reset successfully'); onClose() },
    onError: (err: any) => toast.error(err.response?.data?.message ?? 'Failed'),
  })

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h3 className="font-bold text-slate-900">Reset Password</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <p className="text-sm text-slate-500">Set a new temporary password for <strong>{agent.fullName}</strong>. Share it with them securely.</p>
          <div>
            <label className="label">New password (min 8 chars)</label>
            <input className="input" type="text" placeholder="Temporary password" value={password} onChange={e => setPassword(e.target.value)} />
          </div>
        </div>
        <div className="flex gap-2 px-6 py-4 border-t bg-slate-50 rounded-b-2xl">
          <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button
            onClick={() => reset.mutate()}
            disabled={password.length < 8 || reset.isPending}
            className="btn-primary flex-1"
          >
            {reset.isPending ? <Loader2 size={14} className="animate-spin" /> : 'Reset Password'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Agent Profile Modal ───────────────────────────────────────────────────────
function ProfileModal({ agentId, onClose }: { agentId: string; onClose: () => void }) {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-agent-profile', agentId],
    queryFn: () => adminApi.getAgent(agentId),
  })
  const profile = data?.data?.data

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h3 className="font-bold text-slate-900">Agent Profile</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
        </div>
        {isLoading ? (
          <div className="flex items-center justify-center h-40"><Loader2 size={24} className="animate-spin text-indigo-500" /></div>
        ) : profile ? (
          <div className="px-6 py-5 space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-lg font-bold">
                {profile.agent.fullName.split(' ').map(n => n[0]).join('').slice(0,2)}
              </div>
              <div>
                <p className="font-bold text-slate-900 text-lg">{profile.agent.fullName}</p>
                <p className="text-sm text-slate-500">{profile.agent.email}</p>
                <span className={profile.agent.isActive ? 'badge-active' : 'badge-inactive'}>
                  {profile.agent.isActive ? 'Active' : 'Deactivated'}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Business', value: profile.agent.businessName ?? '—' },
                { label: 'Phone', value: profile.agent.phone ?? '—' },
                { label: 'Paybill', value: profile.agent.paybillNumber ?? 'Not set' },
                { label: 'Last Login', value: profile.agent.lastLoginAt ? new Date(profile.agent.lastLoginAt).toLocaleDateString('en-KE') : 'Never' },
                { label: 'Properties', value: profile.stats.totalProperties },
                { label: 'Units', value: `${profile.stats.occupiedUnits}/${profile.stats.totalUnits} occupied` },
                { label: 'Transactions', value: profile.stats.totalTransactions },
                { label: 'All-time Fee', value: `KES ${profile.stats.allTimeCommission.toLocaleString()}` },
              ].map(item => (
                <div key={item.label} className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-slate-400 uppercase tracking-wide">{item.label}</p>
                  <p className="text-sm font-semibold text-slate-800 mt-0.5">{item.value}</p>
                </div>
              ))}
            </div>

            {!profile.agent.isActive && profile.agent.deactivationReason && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                <p className="text-xs font-semibold text-red-600 uppercase tracking-wide">Deactivation Reason</p>
                <p className="text-sm text-red-800 mt-1">{profile.agent.deactivationReason}</p>
                <p className="text-xs text-red-400 mt-1">
                  {profile.agent.deactivatedAt ? new Date(profile.agent.deactivatedAt).toLocaleString('en-KE') : ''}
                </p>
              </div>
            )}

            <p className="text-xs text-slate-400">
              Joined: {new Date(profile.agent.joinedAt).toLocaleDateString('en-KE', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
        ) : null}
        <div className="px-6 py-4 border-t bg-slate-50 rounded-b-2xl">
          <button onClick={onClose} className="btn-secondary w-full">Close</button>
        </div>
      </div>
    </div>
  )
}

// ── Agent Table Row ───────────────────────────────────────────────────────────
function AgentTableRow({ agent }: { agent: AgentRow }) {
  const [deactivateOpen, setDeactivateOpen] = useState(false)
  const [resetOpen, setResetOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const queryClient = useQueryClient()

  const deleteAgentMutation = useMutation({
    mutationFn: () => adminApi.deleteAgent(agent.agentId),
    onSuccess: () => {
      toast.success(agent.fullName + ' and all data permanently deleted')
      queryClient.invalidateQueries({ queryKey: ['admin-agents'] })
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] })
    },
    onError: (err: any) => toast.error(err.response?.data?.message ?? 'Delete failed'),
  })
  const reactivate = useMutation({
    mutationFn: () => adminApi.reactivate(agent.agentId),
    onSuccess: () => {
      toast.success(`${agent.fullName} reactivated`)
      queryClient.invalidateQueries({ queryKey: ['admin-agents'] })
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] })
    },
    onError: (err: any) => toast.error(err.response?.data?.message ?? 'Failed'),
  })

  return (
    <>
      <tr className={`table-row ${!agent.isActive ? 'opacity-60' : ''}`}>
        <td className="table-td">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
              {agent.fullName.split(' ').map(n => n[0]).join('').slice(0,2)}
            </div>
            <div>
              <p className="font-semibold text-slate-900 text-sm">{agent.fullName}</p>
              <p className="text-xs text-slate-400">{agent.email}</p>
            </div>
          </div>
        </td>
        <td className="table-td">
          <p className="text-sm text-slate-700">{agent.businessName ?? '—'}</p>
          <p className="text-xs text-slate-400">Paybill: {agent.paybillNumber ?? 'Not set'}</p>
        </td>
        <td className="table-td text-center tabular font-medium text-slate-700">{agent.stats.properties}</td>
        <td className="table-td text-right tabular font-bold text-slate-900">KES {agent.stats.monthly_gross.toLocaleString()}</td>
        <td className="table-td text-right tabular font-bold text-amber-600">KES {agent.stats.monthly_commission.toLocaleString()}</td>
        <td className="table-td">
          <span className={agent.isActive ? 'badge-active' : 'badge-inactive'}>
            {agent.isActive ? 'Active' : 'Deactivated'}
          </span>
        </td>
        <td className="table-td">
          <div className="flex items-center justify-end gap-1">
            <button onClick={() => setProfileOpen(true)} className="btn-ghost p-2 rounded-lg" title="View profile">
              <Eye size={14} />
            </button>
            <button onClick={() => setResetOpen(true)} className="btn-ghost p-2 rounded-lg" title="Reset password">
              <KeyRound size={14} />
            </button>
            {agent.isActive ? (
              <button
                onClick={() => setDeactivateOpen(true)}
                className="btn text-xs px-2.5 py-1.5 bg-red-50 text-red-600 hover:bg-red-100 border border-red-200"
              >
                <UserX size={12} /> Deactivate
              </button>
            ) : (
              <button
                onClick={() => { if (window.confirm(`Reactivate ${agent.fullName}?`)) reactivate.mutate() }}
                disabled={reactivate.isPending}
                className="btn text-xs px-2.5 py-1.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-200"
              >
                {reactivate.isPending ? <Loader2 size={12} className="animate-spin" /> : <><UserCheck size={12} /> Reactivate</>}
              </button>
            )}
            <button
              onClick={() => {
                if (window.confirm(`PERMANENTLY DELETE ${agent.fullName}?\n\nThis will delete ALL their properties, tenants, payments, and reports. This cannot be undone.`))
                  deleteAgentMutation.mutate()
              }}
              disabled={deleteAgentMutation.isPending}
              className="btn-ghost p-2 rounded-lg text-slate-400 hover:text-red-600"
              title="Delete agent permanently"
            >
              {deleteAgentMutation.isPending ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
            </button>
          </div>
        </td>
      </tr>

      {deactivateOpen && <DeactivateModal agent={agent} onClose={() => setDeactivateOpen(false)} />}
      {resetOpen && <ResetPasswordModal agent={agent} onClose={() => setResetOpen(false)} />}
      {profileOpen && <ProfileModal agentId={agent.agentId} onClose={() => setProfileOpen(false)} />}
    </>
  )
}

// ── Agents Page ───────────────────────────────────────────────────────────────
export function AgentsPage() {
  const now = new Date()
  const [month, setMonth] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`)
  const [search, setSearch] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['admin-agents', month],
    queryFn: () => adminApi.listAgents(month),
  })

  const agents = (data?.data?.data ?? []).filter(a =>
    search === '' ||
    a.fullName.toLowerCase().includes(search.toLowerCase()) ||
    a.email.toLowerCase().includes(search.toLowerCase()) ||
    (a.businessName?.toLowerCase().includes(search.toLowerCase()) ?? false)
  )

  const active = agents.filter(a => a.isActive).length
  const totalCommission = agents.reduce((s, a) => s + a.stats.monthly_commission, 0)
  const totalGross = agents.reduce((s, a) => s + a.stats.monthly_gross, 0)

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="grid grid-cols-3 gap-4">
        <div className="card p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center"><Building2 size={18}/></div>
          <div><p className="text-xs text-slate-400 uppercase tracking-wide">Active / Total</p><p className="text-xl font-bold text-slate-900">{active}<span className="text-slate-400 text-sm font-normal"> / {agents.length}</span></p></div>
        </div>
        <div className="card p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center"><TrendingUp size={18}/></div>
          <div><p className="text-xs text-slate-400 uppercase tracking-wide">Gross This Month</p><p className="text-xl font-bold text-slate-900">KES {totalGross.toLocaleString()}</p></div>
        </div>
        <div className="card p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center"><DollarSign size={18}/></div>
          <div><p className="text-xs text-slate-400 uppercase tracking-wide">Our Commission</p><p className="text-xl font-bold text-amber-600">KES {totalCommission.toLocaleString()}</p></div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input className="input pl-9" placeholder="Search by name, email, business..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <input type="month" className="input w-auto" value={month} onChange={e => setMonth(e.target.value)} />
      </div>

      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-48"><Loader2 size={28} className="animate-spin text-indigo-500" /></div>
        ) : agents.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <p className="font-medium">No agents found</p>
            <p className="text-sm mt-1">{search ? 'Try a different search term' : 'No agents registered yet'}</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50">
                <th className="table-th">Agent</th>
                <th className="table-th">Business</th>
                <th className="table-th text-center">Properties</th>
                <th className="table-th text-right">Gross</th>
                <th className="table-th text-right">Commission</th>
                <th className="table-th">Status</th>
                <th className="table-th text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {agents.map(a => <AgentTableRow key={a.agentId} agent={a} />)}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
