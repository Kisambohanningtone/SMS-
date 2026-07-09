import { create } from 'zustand'
import * as SecureStore from 'expo-secure-store'
import type { TenantAuthData } from '../api/auth'

interface AuthState {
  tenant: TenantAuthData | null
  token: string | null
  isLoading: boolean
  setAuth: (tenant: TenantAuthData, token: string) => Promise<void>
  clearAuth: () => Promise<void>
  loadStoredAuth: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  tenant: null,
  token: null,
  isLoading: true,

  setAuth: async (tenant, token) => {
    await SecureStore.setItemAsync('tenant_token', token)
    await SecureStore.setItemAsync('tenant_data', JSON.stringify(tenant))
    set({ tenant, token })
  },

  clearAuth: async () => {
    await SecureStore.deleteItemAsync('tenant_token')
    await SecureStore.deleteItemAsync('tenant_data')
    set({ tenant: null, token: null })
  },

  loadStoredAuth: async () => {
    try {
      const token = await SecureStore.getItemAsync('tenant_token')
      const tenantData = await SecureStore.getItemAsync('tenant_data')
      if (token && tenantData) {
        set({ token, tenant: JSON.parse(tenantData), isLoading: false })
      } else {
        set({ isLoading: false })
      }
    } catch {
      set({ isLoading: false })
    }
  },
}))
