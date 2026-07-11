import axios from 'axios'
import * as SecureStore from 'expo-secure-store'

// IMPORTANT: replace with your computer's LAN IP when testing on a real phone
// (localhost won't work from a physical device — find it with `ipconfig` on Windows)
const API_BASE_URL = 'https://sms-backend-5rw8.onrender.com'

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
})

api.interceptors.request.use(async config => {
  const token = await SecureStore.getItemAsync('tenant_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  res => res,
  async err => {
    if (err.response?.status === 401) {
      await SecureStore.deleteItemAsync('tenant_token')
      await SecureStore.deleteItemAsync('tenant_data')
    }
    return Promise.reject(err)
  }
)
