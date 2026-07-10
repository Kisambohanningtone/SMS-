import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { X, ChevronRight, ChevronLeft, Plus, Trash2, Loader2, Check, Building2, User, Home } from 'lucide-react'
import toast from 'react-hot-toast'
import { propertiesApi } from '../api/properties'
import { rentApi } from '../api/rent'
import { ownersApi, type Owner } from '../api/owners'

interface RentTierDraft {
  name: string
  rent_amount: string
  unit_count: string
  unit_prefix: string
}

const emptyTier = (): RentTierDraft => ({ name: '', rent_amount: '', unit_count: '', unit_prefix: '' })

export function AddPropertyWizard({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient()
  const [step, setStep] = useState(1)

  // Step 1 — owner
  const [ownerMode, setOwnerMode] = useState<'existing' | 'new'>('existing')
  const [selectedOwnerId, setSelectedOwnerId] = useState('')
  const [newOwner, setNewOwner] = useState({ full_name: '', phone: '', email: '' })

  // Step 2 — property
  const [property, setProperty] = useState({ name: '', location: '' })

  // Step 3 — rent tiers
  const [tiers, setTiers] = useState<RentTierDraft[]>([emptyTier()])

  // Track created IDs across steps
  const [createdOwnerId, setCreatedOwnerId] = useState('')
  const [createdPropertyId, setCreatedPropertyId] = useState('')

  const { data: ownersData } = useQuery({
    queryKey: ['owners'],
    queryFn: () => ownersApi.list(),
  })
  const owners = ownersData?.data?.data ?? []

  // ── Mutations ────────────────────────────────────────────────────────────
  const createOwner = useMutation({
    mutationFn: () => ownersApi.create(newOwner),
    onSuccess: (res: any) => {
      const id = res.data.data.id
      const tempPw = res.data.temporaryPassword
      setCreatedOwnerId(id)
      queryClient.invalidateQueries({ queryKey: ['owners'] })
      setNewOwner({ full_name: '', phone: '', email: '' })
      if (tempPw) {
        toast.success('Owner created — see login details below')
        setTimeout(() => {
          window.alert(
            'Owner created successfully!\n\n' +
            'Owner Portal Login Details:\n' +
            'Phone: ' + newOwner.phone + '\n' +
            'Temporary Password: ' + tempPw + '\n\n' +
            'Share these with the owner so they can log in to the Owner Portal app.\n' +
            'They will be asked to change their password on first login.'
          )
        }, 300)
      }
      setStep(2)
    },
    onError: (err: any) => toast.error(err.response?.data?.message ?? 'Failed to create owner'),
  })

  const createProperty = useMutation({
    mutationFn: () => propertiesApi.create({
      owner_id: ownerMode === 'existing' ? selectedOwnerId : createdOwnerId,
      name: property.name,
      location: property.location,
    }),
    onSuccess: (res) => {
      setCreatedPropertyId(res.data.data.id)
      setStep(3)
    },
    onError: (err: any) => toast.error(err.response?.data?.message ?? 'Failed to create property'),
  })

  const createTiers = useMutation({
    mutationFn: async () => {
      const validTiers = tiers.filter(t => t.name && t.rent_amount && t.unit_count)
      for (const tier of validTiers) {
        await rentApi.createGroup(createdPropertyId, {
          name: tier.name,
          rent_amount: Number(tier.rent_amount),
          unit_count: Number(tier.unit_count),
          unit_prefix: tier.unit_prefix || tier.name,
        })
      }
    },
    onSuccess: () => {
      toast.success('Property created with all rent tiers!')
      queryClient.invalidateQueries({ queryKey: ['properties'] })
      onClose()
    },
    onError: (err: any) => toast.error(err.response?.data?.message ?? 'Failed to create rent tiers — you can add them later'),
  })

  // ── Step navigation guards ──────────────────────────────────────────────
  function canProceedStep1() {
    if (ownerMode === 'existing') return !!selectedOwnerId
    return !!(newOwner.full_name && newOwner.phone)
  }
  function canProceedStep2() {
    return !!(property.name && property.location)
  }

  function handleStep1Next() {
    if (ownerMode === 'existing') {
      setCreatedOwnerId(selectedOwnerId)
      setStep(2)
    } else {
      createOwner.mutate()
    }
  }

  function addTier() { setTiers([...tiers, emptyTier()]) }
  function removeTier(i: number) { setTiers(tiers.filter((_, idx) => idx !== i)) }
  function updateTier(i: number, field: keyof RentTierDraft, value: string) {
    const next = [...tiers]
    next[i] = { ...next[i], [field]: value }
    setTiers(next)
  }

  const totalUnits = tiers.reduce((sum, t) => sum + (Number(t.unit_count) || 0), 0)

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div>
            <h2 className="font-semibold text-gray-900">Add New Property</h2>
            <p className="text-xs text-gray-500 mt-0.5">Step {step} of 3</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        {/* Step indicator */}
        <div className="flex px-6 pt-4 gap-2">
          {[1, 2, 3].map(s => (
            <div key={s} className={`flex-1 h-1.5 rounded-full ${s <= step ? 'bg-primary-500' : 'bg-gray-200'}`} />
          ))}
        </div>

        {/* Body */}
        <div className="px-6 py-5 overflow-y-auto flex-1">

          {/* ── STEP 1: Owner ── */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-primary-500 mb-1">
                <User size={16} />
                <span className="text-sm font-medium">Who owns this property?</span>
              </div>

              <div className="flex gap-2 mb-4">
                <button
                  onClick={() => setOwnerMode('existing')}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${ownerMode === 'existing' ? 'bg-primary-500 text-white border-primary-500' : 'bg-white text-gray-600 border-gray-200'}`}
                >
                  Existing Owner
                </button>
                <button
                  onClick={() => setOwnerMode('new')}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${ownerMode === 'new' ? 'bg-primary-500 text-white border-primary-500' : 'bg-white text-gray-600 border-gray-200'}`}
                >
                  New Owner
                </button>
              </div>

              {ownerMode === 'existing' ? (
                <div>
                  <label className="label">Select owner</label>
                  {owners.length === 0 ? (
                    <p className="text-sm text-gray-400 italic py-3">No owners yet — switch to "New Owner" to add one</p>
                  ) : (
                    <select className="input" value={selectedOwnerId} onChange={e => setSelectedOwnerId(e.target.value)}>
                      <option value="">Choose an owner...</option>
                      {owners.map((o: Owner) => (
                        <option key={o.id} value={o.id}>{o.full_name} — {o.phone}</option>
                      ))}
                    </select>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="label">Full name</label>
                    <input className="input" placeholder="Walter Wekesa" value={newOwner.full_name}
                      onChange={e => setNewOwner({ ...newOwner, full_name: e.target.value })} />
                  </div>
                  <div>
                    <label className="label">Phone number</label>
                    <input className="input" placeholder="+254712345678" value={newOwner.phone}
                      onChange={e => setNewOwner({ ...newOwner, phone: e.target.value })} />
                  </div>
                  <div>
                    <label className="label">Email (optional)</label>
                    <input className="input" placeholder="owner@example.com" value={newOwner.email}
                      onChange={e => setNewOwner({ ...newOwner, email: e.target.value })} />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── STEP 2: Property ── */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-primary-500 mb-1">
                <Building2 size={16} />
                <span className="text-sm font-medium">Property details</span>
              </div>
              <div>
                <label className="label">Property name</label>
                <input className="input" placeholder="Vipingo Apartments" value={property.name}
                  onChange={e => setProperty({ ...property, name: e.target.value })} autoFocus />
              </div>
              <div>
                <label className="label">Location</label>
                <input className="input" placeholder="Ruaka, Nairobi" value={property.location}
                  onChange={e => setProperty({ ...property, location: e.target.value })} />
              </div>
            </div>
          )}

          {/* ── STEP 3: Rent Tiers ── */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-primary-500 mb-1">
                <Home size={16} />
                <span className="text-sm font-medium">Rent tiers &amp; units</span>
              </div>
              <p className="text-xs text-gray-500 -mt-2">
                Add one or more rent tiers. Units are generated automatically (e.g. 20 units at KES 3,000, 10 at KES 5,000).
              </p>

              {tiers.map((tier, i) => (
                <div key={i} className="border rounded-lg p-3 space-y-2 relative bg-gray-50">
                  {tiers.length > 1 && (
                    <button onClick={() => removeTier(i)} className="absolute top-2 right-2 text-gray-400 hover:text-red-500">
                      <Trash2 size={14} />
                    </button>
                  )}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="label text-xs">Tier name</label>
                      <input className="input text-sm" placeholder="Bedsitter" value={tier.name}
                        onChange={e => updateTier(i, 'name', e.target.value)} />
                    </div>
                    <div>
                      <label className="label text-xs">Rent (KES)</label>
                      <input className="input text-sm" type="number" placeholder="3000" value={tier.rent_amount}
                        onChange={e => updateTier(i, 'rent_amount', e.target.value)} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="label text-xs">Number of units</label>
                      <input className="input text-sm" type="number" placeholder="20" value={tier.unit_count}
                        onChange={e => updateTier(i, 'unit_count', e.target.value)} />
                    </div>
                    <div>
                      <label className="label text-xs">Unit prefix (optional)</label>
                      <input className="input text-sm" placeholder="e.g. C" value={tier.unit_prefix}
                        onChange={e => updateTier(i, 'unit_prefix', e.target.value)} />
                    </div>
                  </div>
                </div>
              ))}

              <button onClick={addTier} className="flex items-center gap-1.5 text-sm text-primary-500 hover:text-primary-600 font-medium">
                <Plus size={14} /> Add another rent tier
              </button>

              {totalUnits > 0 && (
                <div className="bg-primary-50 rounded-lg p-3 text-sm text-primary-700">
                  <strong>{totalUnits}</strong> total units will be created
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t bg-gray-50 rounded-b-2xl">
          <button
            onClick={() => step > 1 ? setStep(step - 1) : onClose()}
            className="btn-secondary flex items-center gap-1.5 text-sm"
          >
            <ChevronLeft size={14} />
            {step > 1 ? 'Back' : 'Cancel'}
          </button>

          {step === 1 && (
            <button
              onClick={handleStep1Next}
              disabled={!canProceedStep1() || createOwner.isPending}
              className="btn-primary flex items-center gap-1.5 text-sm"
            >
              {createOwner.isPending ? <Loader2 size={14} className="animate-spin" /> : <>Next <ChevronRight size={14} /></>}
            </button>
          )}

          {step === 2 && (
            <button
              onClick={() => createProperty.mutate()}
              disabled={!canProceedStep2() || createProperty.isPending}
              className="btn-primary flex items-center gap-1.5 text-sm"
            >
              {createProperty.isPending ? <Loader2 size={14} className="animate-spin" /> : <>Next <ChevronRight size={14} /></>}
            </button>
          )}

          {step === 3 && (
            <button
              onClick={() => createTiers.mutate()}
              disabled={totalUnits === 0 || createTiers.isPending}
              className="btn-primary flex items-center gap-1.5 text-sm"
            >
              {createTiers.isPending ? <Loader2 size={14} className="animate-spin" /> : <><Check size={14} /> Finish</>}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
