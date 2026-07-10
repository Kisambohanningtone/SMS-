import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Users, Loader2, Search, CheckCircle2, XCircle, Trash2 } from 'lucide-react'
import { adminApi } from '../api/admin'


function DeleteOwnerBtn({ ownerId, ownerName, propCount }: { ownerId: string; ownerName: string; propCount: number }) {
  const queryClient = useQueryClient()
  const del = useMutation({
    mutationFn: () => adminApi.deleteOwner(ownerId),
    onSuccess: () => {
      toast.success(ownerName + ' deleted')
      queryClient.invalidateQueries({ queryKey: ['admin-owners'] })
    },
    onError: (err: any) => toast.error(err.response?.data?.message ?? 'Cannot delete owner'),
  })
  const confirmMsg = propCount > 0
    ? 'WARNING: ' + ownerName + ' has ' + propCount + ' active properties. Deleting will unlink them. Continue?'
    : 'Delete ' + ownerName + '? This cannot be undone.'
  return (
    <button
      onClick={() => { if (window.confirm(confirmMsg)) del.mutate() }}
      disabled={del.isPending}
      className="text-red-400 hover:text-red-600 transition-colors p-1"
      title="Delete owner"
    >
      {del.isPending ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
    </button>
  )
}

export function OwnersPage() {
  const [search, setSearch] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['admin-owners'],
    queryFn: () => adminApi.listOwners(),
  })

  const owners = ((data?.data?.data ?? []) as any[]).filter((o: any) =>
    search === '' ||
    o.fullName?.toLowerCase().includes(search.toLowerCase()) ||
    o.phone?.includes(search) ||
    o.email?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Owners</h1>
          <p className="text-sm text-slate-400 mt-1">All property owners registered on the platform</p>
        </div>
        <div className="card px-4 py-2.5 flex items-center gap-2">
          <Users size={16} className="text-indigo-500" />
          <span className="text-sm font-bold text-slate-900">{owners.length}</span>
          <span className="text-sm text-slate-400">owners</span>
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input className="input pl-9" placeholder="Search by name, phone, email..."
          value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 size={28} className="animate-spin text-indigo-500" />
        </div>
      ) : owners.length === 0 ? (
        <div className="card text-center py-16">
          <Users size={48} className="mx-auto mb-4 text-slate-200" />
          <p className="text-slate-400 font-medium">No owners found</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50">
                <th className="table-th">Owner</th>
                <th className="table-th">Phone</th>
                <th className="table-th">Email</th>
                <th className="table-th text-center">Properties</th>
                <th className="table-th text-center">Portal Access</th>
                <th className="table-th">Properties</th>
              </tr>
            </thead>
            <tbody>
              {owners.map((o: any) => (
                <tr key={o.id} className="table-row">
                  <td className="table-td">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white text-xs font-bold">
                        {o.fullName?.[0] ?? 'O'}
                      </div>
                      <p className="font-semibold text-slate-900">{o.fullName}</p>
                    </div>
                  </td>
                  <td className="table-td text-slate-600">{o.phone}</td>
                  <td className="table-td text-slate-600">{o.email ?? '—'}</td>
                  <td className="table-td text-center font-bold text-slate-900">{o.propertyCount}</td>
                  <td className="table-td text-center">
                    {o.hasPortalAccess
                      ? <span className="badge-active flex items-center gap-1 justify-center"><CheckCircle2 size={11} />Active</span>
                      : <span className="badge-inactive flex items-center gap-1 justify-center"><XCircle size={11} />No access</span>
                    }
                  </td>
                  <td className="table-td">
                    <DeleteOwnerBtn ownerId={o.id} ownerName={o.fullName} propCount={o.propertyCount} />
                  </td>
                  <td className="table-td">
                    <div className="flex flex-wrap gap-1">
                      {o.properties?.slice(0, 3).map((p: any) => (
                        <span key={p.id} className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{p.name}</span>
                      ))}
                      {o.properties?.length > 3 && (
                        <span className="text-xs text-slate-400">+{o.properties.length - 3} more</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
