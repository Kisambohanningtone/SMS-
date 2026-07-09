import { Ionicons } from '@expo/vector-icons'
import React from 'react'
import { View, Text, StyleSheet, FlatList, RefreshControl } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { tenantApi, type TenantPayment } from '../api/tenant'
import { useState, useCallback } from 'react'

const METHOD_LABELS: Record<string, string> = {
  mpesa_stk: 'STK Push', paybill: 'Paybill', cash: 'Cash', bank: 'Bank', kopokopo: 'KopoKopo',
}

function PaymentRow({ item }: { item: TenantPayment }) {
  const monthName = new Date(item.year, item.month - 1).toLocaleString('en-KE', { month: 'long', year: 'numeric' })
  return (
    <View style={styles.row}>
      <View style={styles.iconCircle}>
        <Ionicons name="checkmark-circle" size={20} color="#16A34A" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowAmount}>KES {item.gross_amount.toLocaleString()}</Text>
        <Text style={styles.rowMeta}>{monthName} &bull; {METHOD_LABELS[item.payment_method] ?? item.payment_method}</Text>
        {item.mpesa_receipt && <Text style={styles.receipt}>{item.mpesa_receipt}</Text>}
      </View>
      <Text style={styles.rowDate}>
        {new Date(item.created_at).toLocaleDateString('en-KE', { day: 'numeric', month: 'short' })}
      </Text>
    </View>
  )
}

export default function PaymentsScreen() {
  const [refreshing, setRefreshing] = useState(false)
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['tenant-payments'],
    queryFn: () => tenantApi.getPayments(),
    refetchInterval: 5000,
  })

  const payments = data?.data?.data ?? []
  const total = payments.reduce((s, p) => s + p.gross_amount, 0)

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await refetch()
    setRefreshing(false)
  }, [refetch])

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Payment History</Text>
        <Text style={styles.headerSub}>Total paid: KES {total.toLocaleString()}</Text>
      </View>

      {isLoading ? (
        <Text style={styles.empty}>Loading payments...</Text>
      ) : payments.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="receipt" size={40} color="#D1D5DB" />
          <Text style={styles.emptyTitle}>No payments yet</Text>
          <Text style={styles.emptySub}>Your payment history will appear here</Text>
        </View>
      ) : (
        <FlatList
          data={payments}
          keyExtractor={item => item.id}
          renderItem={({ item }) => <PaymentRow item={item} />}
          contentContainerStyle={{ padding: 16 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { backgroundColor: '#1E3A5F', padding: 20, paddingTop: 24 },
  headerTitle: { color: '#fff', fontSize: 20, fontWeight: '700' },
  headerSub: { color: '#A8C5E8', fontSize: 13, marginTop: 4 },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#F3F4F6' },
  iconCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#DCFCE7', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  rowAmount: { fontSize: 16, fontWeight: '700', color: '#111827' },
  rowMeta: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  receipt: { fontSize: 11, color: '#9CA3AF', marginTop: 2, fontFamily: 'monospace' },
  rowDate: { fontSize: 12, color: '#9CA3AF' },
  empty: { textAlign: 'center', marginTop: 40, color: '#9CA3AF' },
  emptyState: { alignItems: 'center', justifyContent: 'center', flex: 1, padding: 40 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: '#6B7280', marginTop: 12 },
  emptySub: { fontSize: 13, color: '#9CA3AF', marginTop: 4, textAlign: 'center' },
})
