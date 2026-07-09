import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search, Users, Loader2 } from 'lucide-react'
import { adminApi, type SearchUser } from '../api/admin'

const ROLE_COLORS: Record<string, string> = {
  agent: 'badge-blue', owner: 'badge-amber', admin: 'badge bg-purple-50 text-purple-700',
}

export function UsersPage() {
  const [search, setSearch] = useState('')
  const [role, setRole] = useState('')
  const [submitted, setSubmitted] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['admin-user-search', submitted, role],
    queryFn: () => adminApi.searchUsers(submitted, role || undefined),
    enabled: submitted.length > 1,
  })

  const users = data?.data?.data ?? []

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    setSubmitted(search)
  }

  return (
    <div className="space-y-6 animate-slide-up">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">User Search</h1>
        <p className="text-sm text-slate-400 mt-1">Search across agents, landlords, and tenants</p>
      </div>

      <form onSubmit={handleSearch} className="flex gap-3">
        <div className="relative flex-1 max-w-md">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            className="input pl-9"
            placeholder="Search by name, email, or phone..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select className="input w-40" value={role} onChange={e => setRole(e.target.value)}>
          <option value="">All roles</option>
          <option value="agent">Agents</option>
          <option value="owner">Landlords</option>
        </select>
        <button type="submit" className="btn-primary">Search</button>
      </form>

      {submitted.length > 1 && (
        isLoading ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 size={24} className="animate-spin text-indigo-500" />
          </div>
        ) : users.length === 0 ? (
          <div className="card text-center py-16">
            <Users size={40} className="mx-auto mb-3 text-slate-200" />
            <p className="text-slate-400 font-medium">No users found for "{submitted}"</p>
          </div>
        ) : (
          <div className="card overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-50 text-sm text-slate-500">
              {users.length} result{users.length !== 1 ? 's' : ''} for "{submitted}"
            </div>
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="table-th">Name</th>
                  <th className="table-th">Email</th>
                  <th className="table-th">Phone</th>
                  <th className="table-th">Role</th>
                  <th className="table-th">Status</th>
                  <th className="table-th">Last Login</th>
                  <th className="table-th">Joined</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u: SearchUser) => (
                  <tr key={u.id} className="table-row">
                    <td className="table-td font-semibold text-slate-900">{u.full_name}</td>
                    <td className="table-td text-slate-600">{u.email}</td>
                    <td className="table-td text-slate-600">{u.phone ?? '—'}</td>
                    <td className="table-td">
                      <span className={ROLE_COLORS[u.role] ?? 'badge bg-slate-100 text-slate-600'}>
                        {u.role}
                      </span>
                    </td>
                    <td className="table-td">
                      <span className={u.is_active ? 'badge-active' : 'badge-inactive'}>
                        {u.is_active ? 'Active' : 'Deactivated'}
                      </span>
                    </td>
                    <td className="table-td text-slate-400 text-xs">
                      {u.last_login_at ? new Date(u.last_login_at).toLocaleDateString('en-KE') : 'Never'}
                    </td>
                    <td className="table-td text-slate-400 text-xs">
                      {new Date(u.created_at).toLocaleDateString('en-KE')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {submitted.length === 0 && (
        <div className="card text-center py-20">
          <Search size={48} className="mx-auto mb-4 text-slate-200" />
          <p className="text-slate-400 font-medium">Search for any user</p>
          <p className="text-sm text-slate-300 mt-1">Enter a name, email, or phone number above</p>
        </div>
      )}
    </div>
  )
}
