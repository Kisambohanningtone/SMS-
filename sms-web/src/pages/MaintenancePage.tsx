import { Wrench, Construction } from 'lucide-react'

export function MaintenancePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Maintenance</h1>
        <p className="text-sm text-gray-500 mt-1">Track property maintenance costs and repairs</p>
      </div>
      <div className="card text-center py-20">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary-50 mb-4">
          <Wrench size={28} className="text-primary-500" />
        </div>
        <p className="font-semibold text-gray-700">Maintenance</p>
        <p className="text-sm text-gray-400 mt-2 max-w-xs mx-auto">This section is being built and will be available soon.</p>
        <div className="flex items-center justify-center gap-2 text-xs text-amber-600 bg-amber-50 px-4 py-2 rounded-lg mt-4 inline-flex mx-auto">
          <Construction size={12} />
          Coming soon
        </div>
      </div>
    </div>
  )
}
