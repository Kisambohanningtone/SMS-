import { api } from './client'

export interface OwnerAuthData {
  id: string
  fullName: string
  phone: string
  email: string | null
  mustChangePassword: boolean
}

export const ownerAuthApi = {
  login: (phone: string, password: string) =>
    api.post<{ success: boolean; data: { accessToken: string; owner: OwnerAuthData } }>(
      '/api/owner-auth/login', { phone, password }
    ),
  changePassword: (currentPassword: string, newPassword: string) =>
    api.post('/api/owner-auth/change-password', { currentPassword, newPassword }),
}
