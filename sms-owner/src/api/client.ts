import axios from 'axios'
import * as SecureStore from 'expo-secure-store'

const api = axios.create({
  baseURL: 'https://sms-backend-5rw8.onrender.com',
  timeout: 15000,
})

api.interceptors.request.use(async config => {
  const token = await SecureStore.getItemAsync('owner_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  res => res,
  async err => {
    if (err.response?.status === 401) {
      await SecureStore.deleteItemAsync('owner_token')
      await SecureStore.deleteItemAsync('owner_data')
    }
    return Promise.reject(err)
  }
)

export { api }
