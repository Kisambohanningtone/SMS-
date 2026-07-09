import React, { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator, Alert, ScrollView } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { tenantAuthApi } from '../api/auth'
import { useAuthStore } from '../hooks/useAuth'

export default function LoginScreen() {
  const setAuth = useAuthStore(s => s.setAuth)
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleLogin() {
    if (!phone || !password) { Alert.alert('Missing info', 'Please enter your phone and password'); return }
    setLoading(true)
    try {
      const res = await tenantAuthApi.login(phone, password)
      const { accessToken, tenant } = res.data.data
      await setAuth(tenant, accessToken)
    } catch (err: any) {
      Alert.alert('Sign in failed', err.response?.data?.message ?? 'Invalid phone or password')
    } finally { setLoading(false) }
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Hero section */}
        <View style={styles.hero}>
          <View style={styles.iconWrap}>
            <Ionicons name="home" size={32} color="#10B981" />
          </View>
          <Text style={styles.brand}>Waltern Tech</Text>
          <Text style={styles.brandSub}>TENANT PORTAL</Text>
          <Text style={styles.heroTitle}>Your home,{'\n'}your payments,{'\n'}<Text style={styles.heroAccent}>your control.</Text></Text>
          <Text style={styles.heroSub}>Pay rent, track your lease, and view payment history — all from your phone.</Text>
        </View>

        {/* Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Sign In</Text>
          <Text style={styles.cardSub}>Use your phone number and password from your agent</Text>

          <Text style={styles.label}>Phone number</Text>
          <TextInput style={styles.input} placeholder="254712345678" placeholderTextColor="#374151"
            value={phone} onChangeText={setPhone} keyboardType="phone-pad" autoCapitalize="none" />

          <Text style={styles.label}>Password</Text>
          <View style={styles.pwRow}>
            <TextInput style={[styles.input, { flex: 1, marginBottom: 0 }]} placeholder="Enter your password"
              placeholderTextColor="#374151" value={password} onChangeText={setPassword}
              secureTextEntry={!showPw} autoCapitalize="none" />
            <TouchableOpacity onPress={() => setShowPw(!showPw)} style={styles.eyeBtn}>
              <Ionicons name={showPw ? 'eye-off' : 'eye'} size={18} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={[styles.btn, loading && { opacity: 0.6 }]} onPress={handleLogin} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Sign In</Text>}
          </TouchableOpacity>

          <Text style={styles.note}>Don't have a password? Contact your property agent to get your login credentials.</Text>
        </View>

        <Text style={styles.footer}>Waltern Tech Ltd · Nairobi, Kenya</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#080C14' },
  scroll: { flexGrow: 1, padding: 24, paddingTop: 60 },
  hero: { marginBottom: 32, alignItems: 'flex-start' },
  iconWrap: { width: 56, height: 56, borderRadius: 16, backgroundColor: 'rgba(16,185,129,0.15)', alignItems: 'center', justifyContent: 'center', marginBottom: 20, borderWidth: 1, borderColor: 'rgba(16,185,129,0.3)' },
  brand: { color: '#fff', fontSize: 18, fontWeight: '700', marginBottom: 2 },
  brandSub: { color: '#10B981', fontSize: 10, fontWeight: '700', letterSpacing: 3, marginBottom: 24 },
  heroTitle: { color: '#fff', fontSize: 36, fontWeight: '800', lineHeight: 44, letterSpacing: -0.5, marginBottom: 12 },
  heroAccent: { color: '#10B981' },
  heroSub: { color: '#374151', fontSize: 14, lineHeight: 22, maxWidth: 300 },
  card: { backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', borderRadius: 20, padding: 24, marginBottom: 24 },
  cardTitle: { color: '#fff', fontSize: 22, fontWeight: '700', marginBottom: 6 },
  cardSub: { color: '#4B5563', fontSize: 13, marginBottom: 24, lineHeight: 20 },
  label: { color: '#9CA3AF', fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 },
  input: { backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, color: '#fff', fontSize: 15, marginBottom: 16 },
  pwRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
  eyeBtn: { padding: 10, marginLeft: -44 },
  btn: { backgroundColor: '#10B981', borderRadius: 12, paddingVertical: 16, alignItems: 'center' },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  note: { textAlign: 'center', color: '#374151', fontSize: 12, marginTop: 20, lineHeight: 18 },
  footer: { textAlign: 'center', color: '#1F2937', fontSize: 11, marginBottom: 20 },
})
