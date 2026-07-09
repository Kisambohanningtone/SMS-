import { api } from './client'

export interface AdminUser {
  id: string; email: string; full_name: string; role: string
}
export interface AuthResponse { accessToken: string; user: AdminUser }

export const authApi = {
  login: (email: string, password: string) =>
    api.post<{ success: boolean; data: AuthResponse }>('/api/auth/login', { email, password }),
  logout: () => api.post('/api/auth/logout'),
}
