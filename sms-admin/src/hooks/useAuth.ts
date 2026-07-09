import { create } from 'zustand'
import type { AdminUser } from '../api/auth'

interface AuthState {
  user: AdminUser | null
  token: string | null
  setAuth: (user: AdminUser, token: string) => void
  clearAuth: () => void
  isAuthenticated: () => boolean
}

const storedToken = localStorage.getItem('admin_token')
const storedUser = localStorage.getItem('admin_user')

export const useAuthStore = create<AuthState>((set, get) => ({
  token: storedToken,
  user: storedUser ? JSON.parse(storedUser) : null,
  setAuth: (user, token) => {
    localStorage.setItem('admin_token', token)
    localStorage.setItem('admin_user', JSON.stringify(user))
    set({ user, token })
  },
  clearAuth: () => {
    localStorage.removeItem('admin_token')
    localStorage.removeItem('admin_user')
    set({ user: null, token: null })
  },
  isAuthenticated: () => !!get().token && !!get().user,
}))
