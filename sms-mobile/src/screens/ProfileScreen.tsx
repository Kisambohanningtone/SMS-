import { Ionicons } from '@expo/vector-icons'
import React, { useState } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Modal, Alert, ActivityIndicator } from 'react-native'
import { useAuthStore } from '../hooks/useAuth'
import { tenantAuthApi } from '../api/auth'

export default function ProfileScreen() {
  const { tenant, clearAuth } = useAuthStore()
  const [showChangePw, setShowChangePw] = useState(false)
  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogout() {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: () => clearAuth() },
    ])
  }

  async function handleChangePassword() {
    if (newPw.length < 6) {
      Alert.alert('Password too short', 'New password must be at least 6 characters')
      return
    }
    setLoading(true)
    try {
      await tenantAuthApi.changePassword(currentPw, newPw)
      Alert.alert('Success', 'Password changed successfully')
      setShowChangePw(false)
      setCurrentPw('')
      setNewPw('')
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message ?? 'Failed to change password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{tenant?.fullName?.[0] ?? 'T'}</Text>
        </View>
        <Text style={styles.name}>{tenant?.fullName}</Text>
        <View style={styles.phoneRow}>
          <Ionicons name="call" size={13} color="#A8C5E8" />
          <Text style={styles.phone}>{tenant?.phone}</Text>
        </View>
      </View>

      <View style={styles.menu}>
        <TouchableOpacity style={styles.menuItem} onPress={() => setShowChangePw(true)}>
          <Ionicons name="lock-closed" size={18} color="#1E3A5F" />
          <Text style={styles.menuText}>Change Password</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem} onPress={handleLogout}>
          <Ionicons name="log-out" size={18} color="#DC2626" />
          <Text style={[styles.menuText, { color: '#DC2626' }]}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.footer}>Waltern Tech Ltd &bull; Tenant Portal v1.0</Text>

      <Modal visible={showChangePw} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Change Password</Text>
              <TouchableOpacity onPress={() => setShowChangePw(false)}>
                <Ionicons name="close" size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>Current Password</Text>
            <TextInput
              style={styles.input}
              secureTextEntry
              value={currentPw}
              onChangeText={setCurrentPw}
              placeholder="Enter current password"
            />

            <Text style={styles.label}>New Password</Text>
            <TextInput
              style={styles.input}
              secureTextEntry
              value={newPw}
              onChangeText={setNewPw}
              placeholder="At least 6 characters"
            />

            <TouchableOpacity
              style={[styles.saveBtn, loading && { opacity: 0.6 }]}
              onPress={handleChangePassword}
              disabled={loading}
            >
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Save Password</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { backgroundColor: '#1E3A5F', alignItems: 'center', paddingVertical: 36, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  avatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  avatarText: { fontSize: 28, fontWeight: '700', color: '#1E3A5F' },
  name: { color: '#fff', fontSize: 19, fontWeight: '700' },
  phoneRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4 },
  phone: { color: '#A8C5E8', fontSize: 13 },
  menu: { margin: 20, backgroundColor: '#fff', borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: '#F3F4F6' },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  menuText: { fontSize: 15, fontWeight: '600', color: '#111827' },
  footer: { textAlign: 'center', fontSize: 11, color: '#9CA3AF', marginTop: 40, marginBottom: 24 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  label: { fontSize: 12, fontWeight: '600', color: '#6B7280', marginBottom: 6, textTransform: 'uppercase' },
  input: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, marginBottom: 16 },
  saveBtn: { backgroundColor: '#1E3A5F', borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 4 },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
})
