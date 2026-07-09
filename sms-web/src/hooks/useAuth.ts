import { create } from 'zustand'
import type { User } from '../api/auth'

interface AuthState {
  user: User | null
  token: string | null
  setAuth: (user: User, token: string) => void
  clearAuth: () => void
  isAuthenticated: () => boolean
}

const storedToken = localStorage.getItem('sms_token')
const storedUser = localStorage.getItem('sms_user')

export const useAuthStore = create<AuthState>((set, get) => ({
  token: storedToken,
  user: storedUser ? JSON.parse(storedUser) : null,

  setAuth: (user, token) => {
    localStorage.setItem('sms_token', token)
    localStorage.setItem('sms_user', JSON.stringify(user))
    set({ user, token })
  },

  clearAuth: () => {
    localStorage.removeItem('sms_token')
    localStorage.removeItem('sms_user')
    set({ user: null, token: null })
  },

  isAuthenticated: () => !!get().token && !!get().user,
}))
