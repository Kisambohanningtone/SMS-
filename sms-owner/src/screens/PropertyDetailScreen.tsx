import React, { useState } from 'react'
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Modal, TextInput, Alert, ActivityIndicator } from 'react-native'
import { useQueryClient, useMutation } from '@tanstack/react-query'
import { Ionicons } from '@expo/vector-icons'
import { ownerApi, type Property, type RentGroup, type Unit } from '../api/owner'

interface Props { route: any; navigation: any }

function EditRentModal({ group, onClose }: { group: RentGroup; onClose: () => void }) {
  const queryClient = useQueryClient()
  const [amount, setAmount] = useState(group.rent_amount.toString())

  const update = useMutation({
    mutationFn: () => ownerApi.updateRent(group.id, Number(amount)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['owner-properties'] })
      Alert.alert('Success', `Rent updated to KES ${Number(amount).toLocaleString()}`)
      onClose()
    },
    onError: (err: any) => Alert.alert('Error', err.response?.data?.message ?? 'Failed to update rent'),
  })

  return (
    <Modal visible transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Edit Rent — {group.name}</Text>
            <TouchableOpacity onPress={onClose}><Ionicons name="close" size={20} color="#6B7280" /></TouchableOpacity>
          </View>
          <Text style={styles.label}>Monthly rent (KES)</Text>
          <TextInput style={styles.input} value={amount} onChangeText={setAmount} keyboardType="numeric" />
          <TouchableOpacity style={[styles.saveBtn, update.isPending && { opacity: 0.6 }]}
            onPress={() => update.mutate()} disabled={update.isPending}>
            {update.isPending ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Save Rent Amount</Text>}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  )
}

export default function PropertyDetailScreen({ route }: Props) {
  const property: Property = route.params.property
  const [editingGroup, setEditingGroup] = useState<RentGroup | null>(null)

  function renderGroup({ item }: { item: RentGroup }) {
    const units = item.units ?? []
    const occupied = units.filter(u => u.status === 'occupied')
    return (
      <View style={styles.groupCard}>
        <View style={styles.groupHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.groupName}>{item.name}</Text>
            <Text style={styles.groupRent}>KES {item.rent_amount.toLocaleString()} / month</Text>
          </View>
          <TouchableOpacity style={styles.editBtn} onPress={() => setEditingGroup(item)}>
            <Ionicons name="pencil" size={14} color="#1E3A5F" />
            <Text style={styles.editBtnText}>Edit Rent</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.occupancyBar}>
          <Text style={styles.occupancyText}>{occupied.length}/{units.length} occupied</Text>
          <View style={styles.barBg}>
            <View style={[styles.barFill, { flex: units.length > 0 ? occupied.length / units.length : 0 }]} />
          </View>
        </View>
        {occupied.map((unit: Unit) => (
          <View key={unit.id} style={styles.unitRow}>
            <View style={styles.unitLeft}>
              <Ionicons name="home" size={14} color="#6B7280" />
              <Text style={styles.unitNumber}>{unit.unit_number}</Text>
            </View>
            {unit.tenant ? (
              <View style={styles.tenantRow}>
                <Ionicons name="person" size={13} color="#16A34A" />
                <Text style={styles.tenantName}>{unit.tenant.full_name}</Text>
              </View>
            ) : (
              <Text style={styles.vacantBadge}>Vacant</Text>
            )}
          </View>
        ))}
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.propName}>{property.name}</Text>
        <Text style={styles.propLocation}>{property.location}</Text>
      </View>
      <FlatList data={property.unit_type_groups} keyExtractor={g => g.id}
        renderItem={renderGroup} contentContainerStyle={{ padding: 16 }} />
      {editingGroup && <EditRentModal group={editingGroup} onClose={() => setEditingGroup(null)} />}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { backgroundColor: '#1E3A5F', padding: 20 },
  propName: { color: '#fff', fontSize: 20, fontWeight: '700' },
  propLocation: { color: '#A8C5E8', fontSize: 13, marginTop: 4 },
  groupCard: { backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#F3F4F6' },
  groupHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  groupName: { fontSize: 16, fontWeight: '700', color: '#111827' },
  groupRent: { fontSize: 13, color: '#16A34A', fontWeight: '600', marginTop: 2 },
  editBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#EEF2FF', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  editBtnText: { fontSize: 12, fontWeight: '600', color: '#1E3A5F' },
  occupancyBar: { marginBottom: 12 },
  occupancyText: { fontSize: 12, color: '#6B7280', marginBottom: 4 },
  barBg: { height: 6, backgroundColor: '#F3F4F6', borderRadius: 3, overflow: 'hidden', flexDirection: 'row' },
  barFill: { height: 6, backgroundColor: '#16A34A', borderRadius: 3 },
  unitRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6, borderTopWidth: 1, borderTopColor: '#F9FAFB' },
  unitLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  unitNumber: { fontSize: 13, fontWeight: '600', color: '#374151' },
  tenantRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  tenantName: { fontSize: 13, color: '#16A34A' },
  vacantBadge: { fontSize: 11, color: '#9CA3AF', backgroundColor: '#F3F4F6', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modal: { backgroundColor: '#fff', borderRadius: 20, padding: 24, width: '100%', maxWidth: 400, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.25, shadowRadius: 20, elevation: 10 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 17, fontWeight: '700', color: '#111827' },
  label: { fontSize: 12, fontWeight: '600', color: '#6B7280', marginBottom: 6, textTransform: 'uppercase' },
  input: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 14, fontSize: 20, fontWeight: '700', color: '#111827', marginBottom: 16 },
  saveBtn: { backgroundColor: '#1E3A5F', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
})
