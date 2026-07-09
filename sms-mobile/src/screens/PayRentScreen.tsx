import { Ionicons } from '@expo/vector-icons'
import React, { useState } from 'react'
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, Alert } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { tenantApi } from '../api/tenant'
import { tenantPaymentsApi } from '../api/payments'

export default function PayRentScreen() {
  const [amount, setAmount] = useState('')
  const [status, setStatus] = useState<'idle' | 'pending' | 'success' | 'failed'>('idle')

  const { data } = useQuery({
    queryKey: ['tenant-profile'],
    queryFn: () => tenantApi.getProfile(),
  })
  const profile = data?.data?.data

  async function handlePay() {
    if (!amount || Number(amount) <= 0) {
      Alert.alert('Enter amount', 'Please enter a valid amount to pay')
      return
    }
    setStatus('pending')
    try {
      const res = await tenantPaymentsApi.stkPush(Number(amount))
      const checkoutId = res.data.data.checkoutRequestId

      let attempts = 0
      const interval = setInterval(async () => {
        attempts++
        try {
          const statusRes = await tenantPaymentsApi.stkStatus(checkoutId)
          const st = statusRes.data.data.status
          if (st === 'success') {
            clearInterval(interval)
            setStatus('success')
          } else if (st === 'failed' || attempts >= 18) {
            clearInterval(interval)
            setStatus('failed')
          }
        } catch {
          clearInterval(interval)
          setStatus('failed')
        }
      }, 5000)
    } catch (err: any) {
      setStatus('failed')
      Alert.alert('Payment failed', err.response?.data?.message ?? 'Could not initiate payment')
    }
  }

  if (status === 'pending') {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#1E3A5F" />
        <Text style={styles.pendingTitle}>Check your phone</Text>
        <Text style={styles.pendingSub}>Enter your M-Pesa PIN to complete the payment of KES {Number(amount).toLocaleString()}</Text>
      </View>
    )
  }

  if (status === 'success') {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="checkmark-circle" size={64} color="#16A34A" />
        <Text style={styles.successTitle}>Payment Successful!</Text>
        <Text style={styles.pendingSub}>KES {Number(amount).toLocaleString()} has been received</Text>
        <TouchableOpacity style={styles.doneBtn} onPress={() => { setStatus('idle'); setAmount('') }}>
          <Text style={styles.doneBtnText}>Done</Text>
        </TouchableOpacity>
      </View>
    )
  }

  if (status === 'failed') {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="close-circle" size={64} color="#DC2626" />
        <Text style={styles.failTitle}>Payment Not Completed</Text>
        <Text style={styles.pendingSub}>The payment was cancelled or timed out</Text>
        <TouchableOpacity style={styles.doneBtn} onPress={() => setStatus('idle')}>
          <Text style={styles.doneBtnText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="phone-portrait" size={28} color="#fff" />
        <Text style={styles.headerTitle}>Pay Rent</Text>
        <Text style={styles.headerSub}>
          {profile ? `${profile.unit.unit_number} — ${profile.unit.property.name}` : 'Loading...'}
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Amount (KES)</Text>
        <TextInput
          style={styles.input}
          placeholder="0"
          placeholderTextColor="#9CA3AF"
          keyboardType="numeric"
          value={amount}
          onChangeText={setAmount}
        />
        <Text style={styles.hint}>You will receive an M-Pesa PIN prompt on this phone</Text>

        <TouchableOpacity style={styles.payBtn} onPress={handlePay}>
          <Text style={styles.payBtnText}>Send Payment Request</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { backgroundColor: '#1E3A5F', padding: 24, paddingTop: 32, alignItems: 'center' },
  headerTitle: { color: '#fff', fontSize: 22, fontWeight: '700', marginTop: 10 },
  headerSub: { color: '#A8C5E8', fontSize: 13, marginTop: 4 },
  card: { margin: 20, backgroundColor: '#fff', borderRadius: 18, padding: 20, borderWidth: 1, borderColor: '#F3F4F6' },
  label: { fontSize: 12, fontWeight: '600', color: '#6B7280', marginBottom: 8, textTransform: 'uppercase' },
  input: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 16, fontSize: 24, fontWeight: '700', color: '#111827', marginBottom: 8 },
  hint: { fontSize: 12, color: '#9CA3AF', marginBottom: 20 },
  payBtn: { backgroundColor: '#1E3A5F', borderRadius: 12, paddingVertical: 16, alignItems: 'center' },
  payBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  centerContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, backgroundColor: '#F9FAFB' },
  pendingTitle: { fontSize: 18, fontWeight: '700', color: '#111827', marginTop: 16 },
  pendingSub: { fontSize: 14, color: '#6B7280', marginTop: 8, textAlign: 'center', lineHeight: 20 },
  successTitle: { fontSize: 20, fontWeight: '700', color: '#16A34A', marginTop: 16 },
  failTitle: { fontSize: 20, fontWeight: '700', color: '#DC2626', marginTop: 16 },
  doneBtn: { backgroundColor: '#1E3A5F', borderRadius: 12, paddingVertical: 14, paddingHorizontal: 40, marginTop: 24 },
  doneBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
})
