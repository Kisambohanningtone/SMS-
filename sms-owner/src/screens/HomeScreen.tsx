import React, { useState, useCallback } from 'react'
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, Alert } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { Ionicons } from '@expo/vector-icons'
import { ownerApi, type Property } from '../api/owner'
import { useAuthStore } from '../hooks/useAuth'

interface Props { navigation: any }

export default function HomeScreen({ navigation }: Props) {
  const owner = useAuthStore(s => s.owner)
  const [refreshing, setRefreshing] = useState(false)
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['owner-properties'],
    queryFn: () => ownerApi.getProperties(),
    refetchInterval: 5000,
  })

  const properties = data?.data?.data ?? []
  const onRefresh = useCallback(async () => { setRefreshing(true); await refetch(); setRefreshing(false) }, [refetch])

  const totalUnits = properties.reduce((s, p) => s + p.unit_type_groups.reduce((a, g) => a + (g.units?.length ?? 0), 0), 0)
  const occupiedUnits = properties.reduce((s, p) => s + p.unit_type_groups.reduce((a, g) => a + (g.units?.filter(u => u.status === 'occupied').length ?? 0), 0), 0)

  function renderProperty({ item }: { item: Property }) {
    const units = item.unit_type_groups.flatMap(g => g.units ?? [])
    const occupied = units.filter(u => u.status === 'occupied').length
    return (
      <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('PropertyDetail', { property: item })}>
        <View style={styles.cardLeft}>
          <View style={styles.iconBox}><Ionicons name="business" size={20} color="#1E3A5F" /></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.propName}>{item.name}</Text>
            <Text style={styles.propLocation}>{item.location}</Text>
            <View style={styles.statsRow}>
              <View style={styles.statChip}>
                <Ionicons name="home" size={11} color="#6B7280" />
                <Text style={styles.statText}>{units.length} units</Text>
              </View>
              <View style={styles.statChip}>
                <Ionicons name="people" size={11} color="#16A34A" />
                <Text style={[styles.statText, { color: '#16A34A' }]}>{occupied} occupied</Text>
              </View>
            </View>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
      </TouchableOpacity>
    )
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.greeting}>Welcome back,</Text>
        <Text style={styles.name}>{owner?.fullName?.split(' ')[0] ?? 'Owner'}</Text>
        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryNum}>{properties.length}</Text>
            <Text style={styles.summaryLabel}>Properties</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryNum}>{occupiedUnits}</Text>
            <Text style={styles.summaryLabel}>Occupied</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryNum}>{totalUnits - occupiedUnits}</Text>
            <Text style={styles.summaryLabel}>Vacant</Text>
          </View>
        </View>
      </View>
      {isLoading ? (
        <Text style={styles.loading}>Loading properties...</Text>
      ) : properties.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="business" size={48} color="#E5E7EB" />
          <Text style={styles.emptyTitle}>No properties yet</Text>
          <Text style={styles.emptySub}>Your properties will appear here once your agent adds them</Text>
        </View>
      ) : (
        <FlatList data={properties} keyExtractor={p => p.id} renderItem={renderProperty}
          contentContainerStyle={{ padding: 16 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />} />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { backgroundColor: '#1E3A5F', padding: 20, paddingTop: 24 },
  greeting: { color: '#A8C5E8', fontSize: 14 },
  name: { color: '#fff', fontSize: 22, fontWeight: '700', marginTop: 2 },
  summaryRow: { flexDirection: 'row', gap: 10, marginTop: 16 },
  summaryCard: { flex: 1, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 12, padding: 12, alignItems: 'center' },
  summaryNum: { color: '#fff', fontSize: 22, fontWeight: '700' },
  summaryLabel: { color: '#A8C5E8', fontSize: 11, marginTop: 2 },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 10, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#F3F4F6' },
  cardLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 12 },
  iconBox: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center' },
  propName: { fontSize: 15, fontWeight: '700', color: '#111827' },
  propLocation: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  statsRow: { flexDirection: 'row', gap: 8, marginTop: 6 },
  statChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#F9FAFB', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  statText: { fontSize: 11, color: '#6B7280' },
  loading: { textAlign: 'center', marginTop: 40, color: '#9CA3AF' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: '#6B7280', marginTop: 12 },
  emptySub: { fontSize: 13, color: '#9CA3AF', marginTop: 4, textAlign: 'center' },
})
