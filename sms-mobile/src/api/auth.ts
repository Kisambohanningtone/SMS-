import { api } from './client'

export interface TenantAuthData {
  id: string
  fullName: string
  phone: string
  mustChangePassword: boolean
}

export interface LoginResponse {
  accessToken: string
  tenant: TenantAuthData
}

export const tenantAuthApi = {
  login: (phone: string, password: string) =>
    api.post<{ success: boolean; data: LoginResponse }>('/api/tenant-auth/login', { phone, password }),
  changePassword: (currentPassword: string, newPassword: string) =>
    api.post('/api/tenant-auth/change-password', { currentPassword, newPassword }),
}
