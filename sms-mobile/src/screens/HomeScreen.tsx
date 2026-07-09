import { Ionicons } from '@expo/vector-icons'
import React from 'react'
import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { tenantApi } from '../api/tenant'
import { useAuthStore } from '../hooks/useAuth'
import { useState, useCallback } from 'react'

export default function HomeScreen() {
  const tenant = useAuthStore(s => s.tenant)
  const [refreshing, setRefreshing] = useState(false)

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['tenant-profile'],
    queryFn: () => tenantApi.getProfile(),
    refetchInterval: 5000,
  })

  const profile = data?.data?.data

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await refetch()
    setRefreshing(false)
  }, [refetch])

  const now = new Date()
  const hour = now.getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ padding: 20 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <Text style={styles.greeting}>{greeting},</Text>
      <Text style={styles.name}>{tenant?.fullName?.split(' ')[0] ?? 'there'} 👋</Text>

      {isLoading ? (
        <Text style={styles.loadingText}>Loading your lease details...</Text>
      ) : profile ? (
        <>
          <View style={styles.leaseCard}>
            <View style={styles.leaseHeader}>
              <Ionicons name="home" size={20} color="#fff" />
              <Text style={styles.leaseUnit}>{profile.unit.unit_number}</Text>
            </View>
            <Text style={styles.propertyName}>{profile.unit.property.name}</Text>
            <View style={styles.locationRow}>
              <Ionicons name="location" size={13} color="#A8C5E8" />
              <Text style={styles.locationText}>{profile.unit.property.location}</Text>
            </View>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Ionicons name="calendar" size={18} color="#1E3A5F" />
              <Text style={styles.statLabel}>Lease Start</Text>
              <Text style={styles.statValue}>
                {new Date(profile.lease_start).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })}
              </Text>
            </View>
            <View style={styles.statCard}>
              <Ionicons name="wallet" size={18} color="#27500A" />
              <Text style={styles.statLabel}>Deposit</Text>
              <Text style={styles.statValue}>
                KES {profile.deposit_amount.toLocaleString()}
              </Text>
              <Text style={[styles.depositBadge, profile.deposit_paid ? styles.paidBadge : styles.pendingBadge]}>
                {profile.deposit_paid ? 'Paid' : 'Pending'}
              </Text>
            </View>
          </View>

          <View style={styles.infoBox}>
            <Text style={styles.infoTitle}>Need to pay rent?</Text>
            <Text style={styles.infoText}>Go to the "Pay Rent" tab below to send a payment request directly to your phone via M-Pesa.</Text>
          </View>
        </>
      ) : (
        <Text style={styles.loadingText}>Could not load your lease details.</Text>
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  greeting: { fontSize: 15, color: '#6B7280' },
  name: { fontSize: 24, fontWeight: '700', color: '#111827', marginBottom: 20 },
  loadingText: { color: '#9CA3AF', marginTop: 20 },
  leaseCard: { backgroundColor: '#1E3A5F', borderRadius: 18, padding: 20, marginBottom: 16 },
  leaseHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  leaseUnit: { color: '#fff', fontSize: 22, fontWeight: '700' },
  propertyName: { color: '#E5EDF7', fontSize: 15, marginTop: 6 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  locationText: { color: '#A8C5E8', fontSize: 12 },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  statCard: { flex: 1, backgroundColor: '#fff', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#F3F4F6' },
  statLabel: { fontSize: 11, color: '#9CA3AF', marginTop: 8, textTransform: 'uppercase', fontWeight: '600' },
  statValue: { fontSize: 14, fontWeight: '700', color: '#111827', marginTop: 4 },
  depositBadge: { fontSize: 10, fontWeight: '700', marginTop: 6, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20, alignSelf: 'flex-start', overflow: 'hidden' },
  paidBadge: { backgroundColor: '#DCFCE7', color: '#166534' },
  pendingBadge: { backgroundColor: '#FEF3C7', color: '#92400E' },
  infoBox: { backgroundColor: '#EEF2FF', borderRadius: 14, padding: 16, borderLeftWidth: 4, borderLeftColor: '#6366F1' },
  infoTitle: { fontWeight: '700', color: '#3730A3', fontSize: 14, marginBottom: 4 },
  infoText: { color: '#4338CA', fontSize: 13, lineHeight: 18 },
})
