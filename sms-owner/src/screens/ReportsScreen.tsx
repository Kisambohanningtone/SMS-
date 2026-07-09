import React from 'react'
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Linking, RefreshControl } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { Ionicons } from '@expo/vector-icons'
import { ownerApi } from '../api/owner'
import { useState, useCallback } from 'react'

export default function ReportsScreen() {
  const [refreshing, setRefreshing] = useState(false)

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['owner-reports'],
    queryFn: () => ownerApi.getReports(),
    refetchInterval: 5000,
  })

  const reports = (data?.data?.data ?? []) as any[]

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await refetch()
    setRefreshing(false)
  }, [refetch])

  function openReport(token: string) {
    const url = `http://192.168.88.14:5000/owner/report/${token}`
    Linking.openURL(url)
  }

  function renderReport({ item }: { item: any }) {
    const monthName = new Date(item.year, item.month - 1)
      .toLocaleString('en-KE', { month: 'long', year: 'numeric' })
    return (
      <View style={styles.card}>
        <View style={styles.cardTop}>
          <View style={styles.iconBox}>
            <Ionicons name="document-text" size={20} color="#1E3A5F" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.propName}>{item.property?.name}</Text>
            <Text style={styles.period}>{monthName}</Text>
          </View>
          {item.sent_at && (
            <View style={styles.sentBadge}>
              <Text style={styles.sentText}>Sent</Text>
            </View>
          )}
        </View>

        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Expected</Text>
            <Text style={styles.statValue}>KES {item.total_expected?.toLocaleString()}</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Collected</Text>
            <Text style={styles.statValue}>KES {item.total_collected?.toLocaleString()}</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Collection</Text>
            <Text style={styles.statValue}>{item.collection_rate}%</Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.netRow}>
          <Text style={styles.netLabel}>Net to you</Text>
          <Text style={styles.netAmount}>KES {item.net_to_owner?.toLocaleString()}</Text>
        </View>

        {item.owner_token && (
          <TouchableOpacity style={styles.viewBtn} onPress={() => openReport(item.owner_token)}>
            <Ionicons name="open-outline" size={14} color="#1E3A5F" />
            <Text style={styles.viewBtnText}>View Full Statement</Text>
          </TouchableOpacity>
        )}
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Monthly Statements</Text>
        <Text style={styles.headerSub}>Your property income reports</Text>
      </View>

      {isLoading ? (
        <Text style={styles.loading}>Loading reports...</Text>
      ) : reports.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="document-text" size={48} color="#E5E7EB" />
          <Text style={styles.emptyTitle}>No reports yet</Text>
          <Text style={styles.emptySub}>Your agent will generate monthly statements here</Text>
        </View>
      ) : (
        <FlatList
          data={reports}
          keyExtractor={r => r.id}
          renderItem={renderReport}
          contentContainerStyle={{ padding: 16 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { backgroundColor: '#1E3A5F', padding: 20 },
  headerTitle: { color: '#fff', fontSize: 20, fontWeight: '700' },
  headerSub: { color: '#A8C5E8', fontSize: 13, marginTop: 4 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#F3F4F6' },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  iconBox: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center' },
  propName: { fontSize: 15, fontWeight: '700', color: '#111827' },
  period: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  sentBadge: { backgroundColor: '#DCFCE7', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  sentText: { fontSize: 11, fontWeight: '700', color: '#16A34A' },
  statsGrid: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  statItem: { flex: 1, backgroundColor: '#F9FAFB', borderRadius: 10, padding: 10 },
  statLabel: { fontSize: 10, color: '#9CA3AF', textTransform: 'uppercase', fontWeight: '600' },
  statValue: { fontSize: 13, fontWeight: '700', color: '#111827', marginTop: 3 },
  divider: { height: 1, backgroundColor: '#F3F4F6', marginBottom: 12 },
  netRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  netLabel: { fontSize: 14, fontWeight: '600', color: '#374151' },
  netAmount: { fontSize: 18, fontWeight: '700', color: '#16A34A' },
  viewBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#EEF2FF', padding: 12, borderRadius: 10, justifyContent: 'center' },
  viewBtnText: { fontSize: 13, fontWeight: '600', color: '#1E3A5F' },
  loading: { textAlign: 'center', marginTop: 40, color: '#9CA3AF' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: '#6B7280', marginTop: 12 },
  emptySub: { fontSize: 13, color: '#9CA3AF', marginTop: 4, textAlign: 'center' },
})
