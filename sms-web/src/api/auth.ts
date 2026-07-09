import { api } from './client'

export interface LoginInput { email: string; password: string }
export interface RegisterInput {
  firstName: string; lastName: string; email: string
  password: string; phone: string; businessName?: string
}
export interface User {
  id: string; email: string; firstName: string
  lastName: string; role: string; agentId: string
}
export interface AuthResponse { accessToken: string; user: User }

export const authApi = {
  login: (data: LoginInput) =>
    api.post<{ success: boolean; data: AuthResponse }>('/api/auth/login', data),
  register: (data: RegisterInput) =>
    api.post<{ success: boolean; data: AuthResponse }>('/api/auth/register', data),
  logout: () => api.post('/api/auth/logout'),
}
