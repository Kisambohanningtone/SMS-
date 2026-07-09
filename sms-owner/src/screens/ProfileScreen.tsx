import React, { useState } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Modal, Alert, ActivityIndicator } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useAuthStore } from '../hooks/useAuth'
import { ownerAuthApi } from '../api/auth'

export default function ProfileScreen() {
  const { owner, clearAuth } = useAuthStore()
  const [showChangePw, setShowChangePw] = useState(false)
  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogout() {
    Alert.alert('Sign out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: () => clearAuth() },
    ])
  }

  async function handleChangePassword() {
    if (newPw.length < 6) { Alert.alert('Too short', 'Password must be at least 6 characters'); return }
    setLoading(true)
    try {
      await ownerAuthApi.changePassword(currentPw, newPw)
      Alert.alert('Success', 'Password changed')
      setShowChangePw(false); setCurrentPw(''); setNewPw('')
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message ?? 'Failed')
    } finally { setLoading(false) }
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.avatar}><Text style={styles.avatarText}>{owner?.fullName?.[0] ?? 'O'}</Text></View>
        <Text style={styles.name}>{owner?.fullName}</Text>
        <Text style={styles.phone}>{owner?.phone}</Text>
        {owner?.email && <Text style={styles.phone}>{owner.email}</Text>}
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
      <Text style={styles.footer}>Waltern Tech Ltd • Owner Portal v1.0</Text>

      <Modal visible={showChangePw} transparent animationType="slide">
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Change Password</Text>
              <TouchableOpacity onPress={() => setShowChangePw(false)}><Ionicons name="close" size={20} color="#6B7280" /></TouchableOpacity>
            </View>
            <Text style={styles.label}>Current Password</Text>
            <TextInput style={styles.input} secureTextEntry value={currentPw} onChangeText={setCurrentPw} placeholder="Current password" />
            <Text style={styles.label}>New Password</Text>
            <TextInput style={styles.input} secureTextEntry value={newPw} onChangeText={setNewPw} placeholder="At least 6 characters" />
            <TouchableOpacity style={[styles.saveBtn, loading && { opacity: 0.6 }]} onPress={handleChangePassword} disabled={loading}>
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
  header: { backgroundColor: '#1E3A5F', alignItems: 'center', paddingVertical: 36 },
  avatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  avatarText: { fontSize: 28, fontWeight: '700', color: '#1E3A5F' },
  name: { color: '#fff', fontSize: 19, fontWeight: '700' },
  phone: { color: '#A8C5E8', fontSize: 13, marginTop: 4 },
  menu: { margin: 20, backgroundColor: '#fff', borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: '#F3F4F6' },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  menuText: { fontSize: 15, fontWeight: '600', color: '#111827' },
  footer: { textAlign: 'center', fontSize: 11, color: '#9CA3AF', marginTop: 40, marginBottom: 24 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modal: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  label: { fontSize: 12, fontWeight: '600', color: '#6B7280', marginBottom: 6, textTransform: 'uppercase' },
  input: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, marginBottom: 16 },
  saveBtn: { backgroundColor: '#1E3A5F', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
})
