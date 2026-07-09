import { api } from './client'

export interface UnitTypeGroup {
  id: string; property_id: string; name: string; rent_amount: number; sort_order: number
}
export interface CreateUnitTypeGroupInput {
  name: string; rent_amount: number; unit_count: number
  unit_prefix?: string; starting_number?: number
}

export const rentApi = {
  listGroups: (propertyId: string) =>
    api.get<{ success: boolean; data: UnitTypeGroup[] }>(`/api/properties/${propertyId}/rent-groups`),
  createGroup: (propertyId: string, data: CreateUnitTypeGroupInput) =>
    api.post<{ success: boolean; data: UnitTypeGroup }>(`/api/properties/${propertyId}/rent-groups`, data),
  updateRent: (groupId: string, rent_amount: number) =>
    api.patch<{ success: boolean; data: UnitTypeGroup }>(`/api/rent-groups/${groupId}`, { rent_amount }),
  deleteGroup: (groupId: string) =>
    api.delete(`/api/rent-groups/${groupId}`),
}
