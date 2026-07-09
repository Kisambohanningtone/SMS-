import { api } from './client'

export const unitsApi = {
  delete: (id: string) => api.delete(`/api/units/${id}`),
}
