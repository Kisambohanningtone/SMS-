import { Users, CreditCard, Bell, FileText, Settings, Construction } from 'lucide-react'

function Placeholder({ icon: Icon, title, description }: { icon: any; title: string; description: string }) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
        <p className="text-sm text-gray-500 mt-1">{description}</p>
      </div>
      <div className="card text-center py-20">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary-50 mb-4">
          <Icon size={28} className="text-primary-500" />
        </div>
        <p className="font-semibold text-gray-700">{title}</p>
        <p className="text-sm text-gray-400 mt-2 max-w-xs mx-auto">
          This section is being built and will be available soon.
        </p>
        <div className="flex items-center justify-center gap-2 text-xs text-amber-600 bg-amber-50 px-4 py-2 rounded-lg mt-4 inline-flex mx-auto">
          <Construction size={12} />
          Coming in Phase 6 completion
        </div>
      </div>
    </div>
  )
}

export function TenantsPage() {
  return <Placeholder icon={Users} title="Tenants" description="Manage your tenants and lease agreements" />
}

export function PaymentsPage() {
  return <Placeholder icon={CreditCard} title="Payments" description="View and manage all payment transactions" />
}

export function RemindersPage() {
  return <Placeholder icon={Bell} title="Reminders" description="Send and track payment reminders to tenants" />
}

export function ReportsPage() {
  return <Placeholder icon={FileText} title="Reports" description="Generate and send monthly owner statements" />
}

export function SettingsPage() {
  return <Placeholder icon={Settings} title="Settings" description="Configure your agent profile and preferences" />
}