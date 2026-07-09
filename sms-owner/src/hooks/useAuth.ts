import { create } from 'zustand'
import * as SecureStore from 'expo-secure-store'
import type { OwnerAuthData } from '../api/auth'

interface AuthState {
  owner: OwnerAuthData | null
  token: string | null
  isLoading: boolean
  setAuth: (owner: OwnerAuthData, token: string) => Promise<void>
  clearAuth: () => Promise<void>
  loadStoredAuth: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  owner: null,
  token: null,
  isLoading: true,
  setAuth: async (owner, token) => {
    await SecureStore.setItemAsync('owner_token', token)
    await SecureStore.setItemAsync('owner_data', JSON.stringify(owner))
    set({ owner, token })
  },
  clearAuth: async () => {
    await SecureStore.deleteItemAsync('owner_token')
    await SecureStore.deleteItemAsync('owner_data')
    set({ owner: null, token: null })
  },
  loadStoredAuth: async () => {
    try {
      const token = await SecureStore.getItemAsync('owner_token')
      const ownerData = await SecureStore.getItemAsync('owner_data')
      if (token && ownerData) {
        set({ token, owner: JSON.parse(ownerData), isLoading: false })
      } else {
        set({ isLoading: false })
      }
    } catch {
      set({ isLoading: false })
    }
  },
}))
