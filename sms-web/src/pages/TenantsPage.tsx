import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Users, Plus, X, Phone, Home, Loader2, LogOut, Search } from 'lucide-react'
import toast from 'react-hot-toast'
import { tenantsApi, type Tenant } from '../api/tenants'
import { propertiesApi } from '../api/properties'

interface VacantUnitOption {
  unitId: string
  unitNumber: string
  propertyName: string
  rentAmount: number
}

function AddTenantModal({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient()
  const [unitId, setUnitId] = useState('')
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [nationalId, setNationalId] = useState('')
  const [leaseStart, setLeaseStart] = useState(new Date().toISOString().slice(0, 10))
  const [depositAmount, setDepositAmount] = useState('')

  const { data: propsData } = useQuery({
    queryKey: ['properties'],
    queryFn: () => propertiesApi.list(),
  })

  const vacantUnits: VacantUnitOption[] = useMemo(() => {
    const properties = propsData?.data?.data ?? []
    const options: VacantUnitOption[] = []
    for (const p of properties) {
      const groupRentById = new Map(
        (p.unit_type_groups ?? []).map(g => [g.id, g.rent_amount])
      )
      for (const u of p.units ?? []) {
        if (u.status === 'vacant') {
          options.push({
            unitId: u.id,
            unitNumber: u.unit_number,
            propertyName: p.name,
            rentAmount: u.unit_type_group_id ? (groupRentById.get(u.unit_type_group_id) ?? p.default_rent) : p.default_rent,
          })
        }
      }
    }
    return options
  }, [propsData])

  const createTenant = useMutation({
    mutationFn: () => tenantsApi.create({
      unit_id: unitId,
      full_name: fullName,
      phone,
      national_id: nationalId || undefined,
      lease_start: leaseStart,
      deposit_amount: depositAmount ? Number(depositAmount) : undefined,
    }),
    onSuccess: (res: any) => {
      const tempPw = res.data?.temporaryPassword
      queryClient.invalidateQueries({ queryKey: ['tenants'] })
      queryClient.invalidateQueries({ queryKey: ['properties'] })
      onClose()
      if (tempPw) {
        setTimeout(() => {
          window.alert(
            'Tenant added successfully!\n\n' +
            '📱 Mobile App Login Details:\n' +
            'Phone: ' + phone + '\n' +
            'Temporary Password: ' + tempPw + '\n\n' +
            'Share these with the tenant.\n' +
            'They will be asked to change their password on first login.'
          )
        }, 300)
      } else {
        toast.success('Tenant added — unit marked occupied')
      }
    },
    onError: (err: any) => toast.error(err.response?.data?.message ?? 'Failed to add tenant'),
  })

  const canSubmit = unitId && fullName && phone && leaseStart

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="font-semibold text-gray-900">Add Tenant</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        <div className="px-6 py-5 overflow-y-auto flex-1 space-y-4">
          <div>
            <label className="label">Vacant unit</label>
            {vacantUnits.length === 0 ? (
              <p className="text-sm text-gray-400 italic py-2">No vacant units available — add a property or vacate an existing tenant first</p>
            ) : (
              <select className="input" value={unitId} onChange={e => setUnitId(e.target.value)}>
                <option value="">Choose a unit...</option>
                {vacantUnits.map(u => (
                  <option key={u.unitId} value={u.unitId}>
                    {u.propertyName} — {u.unitNumber} (KES {u.rentAmount.toLocaleString()}/mo)
                  </option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label className="label">Tenant full name</label>
            <input className="input" placeholder="Test Tenant" value={fullName} onChange={e => setFullName(e.target.value)} />
          </div>

          <div>
            <label className="label">Phone number</label>
            <input className="input" placeholder="254708374149" value={phone} onChange={e => setPhone(e.target.value)} />
          </div>

          <div>
            <label className="label">National ID (optional)</label>
            <input className="input" placeholder="12345678" value={nationalId} onChange={e => setNationalId(e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Lease start date</label>
              <input type="date" className="input" value={leaseStart} onChange={e => setLeaseStart(e.target.value)} />
            </div>
            <div>
              <label className="label">Deposit (KES, optional)</label>
              <input type="number" className="input" placeholder="0" value={depositAmount} onChange={e => setDepositAmount(e.target.value)} />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t bg-gray-50 rounded-b-2xl">
          <button onClick={onClose} className="btn-secondary text-sm">Cancel</button>
          <button
            onClick={() => createTenant.mutate()}
            disabled={!canSubmit || createTenant.isPending}
            className="btn-primary text-sm flex items-center gap-1.5"
          >
            {createTenant.isPending ? <Loader2 size={14} className="animate-spin" /> : 'Add Tenant'}
          </button>
        </div>
      </div>
    </div>
  )
}

export function TenantsPage() {
  const queryClient = useQueryClient()
  const [showAddModal, setShowAddModal] = useState(false)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'active' | 'all'>('active')

  const { data, isLoading } = useQuery({
    queryKey: ['tenants', filter],
    queryFn: () => tenantsApi.list(filter === 'active' ? true : undefined),
  })

  const vacate = useMutation({
    mutationFn: (id: string) => tenantsApi.vacate(id),
    onSuccess: () => {
      toast.success('Tenant vacated — unit marked vacant')
      queryClient.invalidateQueries({ queryKey: ['tenants'] })
      queryClient.invalidateQueries({ queryKey: ['properties'] })
    },
    onError: (err: any) => toast.error(err.response?.data?.message ?? 'Failed to vacate tenant'),
  })

  function handleVacate(tenant: Tenant) {
    if (window.confirm(`Vacate ${tenant.full_name} from ${tenant.unit?.unit_number}? The unit will become vacant.`)) {
      vacate.mutate(tenant.id)
    }
  }

  const tenants = data?.data?.data ?? []
  const filtered = tenants.filter(t =>
    t.full_name.toLowerCase().includes(search.toLowerCase()) ||
    t.phone.includes(search) ||
    t.unit?.unit_number?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tenants</h1>
          <p className="text-sm text-gray-500 mt-1">{tenants.length} {filter === 'active' ? 'active' : ''} tenants</p>
        </div>
        <button onClick={() => setShowAddModal(true)} className="btn-primary text-sm flex items-center gap-1.5">
          <Plus size={15} /> Add Tenant
        </button>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className="input pl-9"
            placeholder="Search name, phone, unit..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setFilter('active')}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${filter === 'active' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}
          >
            Active
          </button>
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${filter === 'all' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}
          >
            All
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 size={28} className="animate-spin text-primary-500" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="card text-center py-16">
          <Users size={48} className="mx-auto mb-4 text-gray-300" />
          <p className="text-gray-500 font-medium">No tenants found</p>
          <p className="text-sm text-gray-400 mt-1">
            {search ? 'Try a different search term' : 'Click "Add Tenant" to get started'}
          </p>
        </div>
      ) : (
        <div className="card p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50 text-left text-gray-500">
                <th className="px-4 py-3 font-medium">Tenant</th>
                <th className="px-4 py-3 font-medium">Unit</th>
                <th className="px-4 py-3 font-medium">Phone</th>
                <th className="px-4 py-3 font-medium">Lease start</th>
                <th className="px-4 py-3 font-medium">Deposit</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(t => (
                <tr key={t.id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{t.full_name}</td>
                  <td className="px-4 py-3 text-gray-600">
                    <div className="flex items-center gap-1.5">
                      <Home size={13} className="text-gray-400" />
                      {t.unit?.unit_number} <span className="text-gray-400">— {t.unit?.property?.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    <div className="flex items-center gap-1.5">
                      <Phone size={13} className="text-gray-400" />
                      {t.phone}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{new Date(t.lease_start).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                  <td className="px-4 py-3 text-gray-600">
                    {t.deposit_amount > 0 ? (
                      <span className={t.deposit_paid ? 'text-green-600' : 'text-amber-600'}>
                        KES {t.deposit_amount.toLocaleString()} {t.deposit_paid ? '✓' : '(pending)'}
                      </span>
                    ) : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    {t.is_active ? (
                      <span className="badge-paid">Active</span>
                    ) : (
                      <span className="badge-vacant">Vacated</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {t.is_active && (
                      <button
                        onClick={() => handleVacate(t)}
                        className="text-gray-400 hover:text-red-500 transition-colors inline-flex items-center gap-1 text-xs font-medium"
                        title="Vacate tenant"
                      >
                        <LogOut size={13} /> Vacate
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showAddModal && <AddTenantModal onClose={() => setShowAddModal(false)} />}
    </div>
  )
}
