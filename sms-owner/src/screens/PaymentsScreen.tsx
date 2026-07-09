import React, { useState, useCallback } from 'react'
import { View, Text, StyleSheet, FlatList, RefreshControl } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { Ionicons } from '@expo/vector-icons'
import { ownerApi, type Payment } from '../api/owner'

const METHOD_LABELS: Record<string, string> = { mpesa_stk: 'STK Push', paybill: 'Paybill', cash: 'Cash', bank: 'Bank' }

export default function PaymentsScreen() {
  const [refreshing, setRefreshing] = useState(false)
  const now = new Date()
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['owner-payments', month],
    queryFn: () => ownerApi.getPayments(month),
    refetchInterval: 5000,
  })

  const result = data?.data?.data
  const payments = result?.payments ?? []
  const summary = result?.summary

  const onRefresh = useCallback(async () => { setRefreshing(true); await refetch(); setRefreshing(false) }, [refetch])

  function renderPayment({ item }: { item: Payment }) {
    const monthName = new Date(item.year, item.month - 1).toLocaleString('en-KE', { month: 'short', year: 'numeric' })
    return (
      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <Text style={styles.rowAmount}>KES {item.gross_amount.toLocaleString()}</Text>
          <Text style={styles.rowMeta}>{item.unit?.unit_number} • {item.tenant?.full_name ?? '—'} • {monthName}</Text>
          <Text style={styles.rowMethod}>{METHOD_LABELS[item.payment_method] ?? item.payment_method}</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={styles.netAmount}>KES {(item.gross_amount - item.waltern_fee - (item.gross_amount - item.waltern_fee - item.agent_amount)).toLocaleString()}</Text>
          <Text style={styles.netLabel}>your share</Text>
        </View>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Payments</Text>
        <Text style={styles.headerSub}>{now.toLocaleString('en-KE', { month: 'long', year: 'numeric' })}</Text>
        {summary && (
          <View style={styles.summaryRow}>
            <View style={styles.summaryCard}>
              <Ionicons name="trending-up" size={16} color="#A8C5E8" />
              <Text style={styles.summaryNum}>KES {summary.totalGross.toLocaleString()}</Text>
              <Text style={styles.summaryLabel}>Gross</Text>
            </View>
            <View style={styles.summaryCard}>
              <Ionicons name="cash" size={16} color="#4ADE80" />
              <Text style={[styles.summaryNum, { color: '#4ADE80' }]}>KES {summary.netToOwner.toLocaleString()}</Text>
              <Text style={styles.summaryLabel}>Net to You</Text>
            </View>
          </View>
        )}
      </View>
      {isLoading ? (
        <Text style={styles.loading}>Loading payments...</Text>
      ) : payments.length === 0 ? (
        <Text style={styles.loading}>No payments this month</Text>
      ) : (
        <FlatList data={payments} keyExtractor={p => p.id} renderItem={renderPayment}
          contentContainerStyle={{ padding: 16 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />} />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { backgroundColor: '#1E3A5F', padding: 20 },
  headerTitle: { color: '#fff', fontSize: 20, fontWeight: '700' },
  headerSub: { color: '#A8C5E8', fontSize: 13, marginTop: 2 },
  summaryRow: { flexDirection: 'row', gap: 10, marginTop: 14 },
  summaryCard: { flex: 1, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 12, padding: 12 },
  summaryNum: { color: '#fff', fontSize: 16, fontWeight: '700', marginTop: 4 },
  summaryLabel: { color: '#A8C5E8', fontSize: 11, marginTop: 2 },
  row: { backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 10, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#F3F4F6' },
  rowAmount: { fontSize: 16, fontWeight: '700', color: '#111827' },
  rowMeta: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  rowMethod: { fontSize: 11, color: '#9CA3AF', marginTop: 2 },
  netAmount: { fontSize: 15, fontWeight: '700', color: '#16A34A' },
  netLabel: { fontSize: 11, color: '#9CA3AF' },
  loading: { textAlign: 'center', marginTop: 40, color: '#9CA3AF' },
})
