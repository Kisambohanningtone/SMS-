import { api } from './client'

export interface Owner {
  id: string; full_name: string; phone: string; email?: string; mpesa_number?: string
}
export interface CreateOwnerInput {
  full_name: string; phone: string; email?: string
}

export const ownersApi = {
  list: () => api.get<{ success: boolean; data: Owner[] }>('/api/owners'),
  create: (data: CreateOwnerInput) =>
    api.post<{ success: boolean; data: Owner }>('/api/owners', data),
}
