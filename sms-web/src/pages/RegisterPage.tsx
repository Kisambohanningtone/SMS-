import { useState } from 'react'
import { useNavigate, Navigate, Link } from 'react-router-dom'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { authApi } from '../api/auth'
import { useAuthStore } from '../hooks/useAuth'

export function RegisterPage() {
  const { setAuth, isAuthenticated } = useAuthStore()
  const navigate = useNavigate()
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [businessName, setBusinessName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)

  if (isAuthenticated()) return <Navigate to="/" replace />

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password.length < 8) { toast.error('Password must be at least 8 characters'); return }
    setLoading(true)
    try {
      const res = await authApi.register({ firstName, lastName, email, password, phone, businessName: businessName || undefined })
      const { accessToken, user } = res.data.data
      setAuth(user, accessToken)
      toast.success(`Welcome, ${user.firstName}!`)
      navigate('/')
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Registration failed')
    } finally { setLoading(false) }
  }

  const inputStyle = { width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '13px 16px', color: '#fff', fontSize: '14px', outline: 'none', boxSizing: 'border-box' as const }
  const labelStyle = { display: 'block', color: '#9CA3AF', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '1px', marginBottom: '7px' }

  async function handleGoogleSignIn() {
    if (!(window as any).google) {
      const script = document.createElement('script')
      script.src = 'https://accounts.google.com/gsi/client'
      script.onload = () => initGoogle()
      document.head.appendChild(script)
    } else {
      initGoogle()
    }
    function initGoogle() {
      ;(window as any).google.accounts.id.initialize({
        client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
        callback: async (response: { credential: string }) => {
          setLoading(true)
          try {
            const res = await fetch((import.meta.env.VITE_API_URL ?? 'http://localhost:5000') + '/api/auth/google', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ idToken: response.credential }),
            })
            const data = await res.json()
            if (data.success) {
              localStorage.setItem('accessToken', data.data.accessToken)
              window.location.href = '/'
            } else {
              alert(data.message ?? 'Google sign-in failed')
            }
          } catch (e) {
            alert('Google sign-in failed')
          } finally {
            setLoading(false)
          }
        },
      })
      ;(window as any).google.accounts.id.prompt()
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: '#080C14', fontFamily: 'Inter, system-ui, sans-serif', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' }}>
      <div style={{ position: 'absolute', top: '-100px', left: '-100px', width: '500px', height: '500px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.2) 0%, transparent 70%)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: '-100px', right: '-100px', width: '400px', height: '400px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(59,130,246,0.15) 0%, transparent 70%)', pointerEvents: 'none' }} />

      <div style={{ width: '100%', maxWidth: '520px', position: 'relative', zIndex: 1 }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
            <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'linear-gradient(135deg, #6366F1, #3B82F6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9,22 9,12 15,12 15,22"/></svg>
            </div>
            <div style={{ textAlign: 'left' }}>
              <div style={{ color: '#fff', fontWeight: 700, fontSize: '16px' }}>Waltern Tech</div>
              <div style={{ color: '#4B5563', fontSize: '11px', letterSpacing: '0.5px', textTransform: 'uppercase' }}>Agent Portal</div>
            </div>
          </div>
          <h1 style={{ color: '#fff', fontSize: '28px', fontWeight: 800, marginBottom: '8px', letterSpacing: '-0.5px' }}>Create your agent account</h1>
          <p style={{ color: '#4B5563', fontSize: '14px', lineHeight: 1.6 }}>Your properties, tenants, and payments — completely separate from other agents.</p>
        </div>

        <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '24px', padding: '36px', backdropFilter: 'blur(20px)' }}>
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div>
                <label style={labelStyle}>First name</label>
                <input style={inputStyle} placeholder="Mary" value={firstName} onChange={e => setFirstName(e.target.value)} required autoFocus />
              </div>
              <div>
                <label style={labelStyle}>Last name</label>
                <input style={inputStyle} placeholder="Otieno" value={lastName} onChange={e => setLastName(e.target.value)} required />
              </div>
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label style={labelStyle}>Business / agency name (optional)</label>
              <input style={inputStyle} placeholder="Otieno Properties" value={businessName} onChange={e => setBusinessName(e.target.value)} />
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label style={labelStyle}>Email address</label>
              <input type="email" style={inputStyle} placeholder="mary@example.com" value={email} onChange={e => setEmail(e.target.value)} required />
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label style={labelStyle}>Phone number</label>
              <input style={inputStyle} placeholder="+254722000000" value={phone} onChange={e => setPhone(e.target.value)} required />
            </div>
            <div style={{ marginBottom: '28px' }}>
              <label style={labelStyle}>Password (min 8 characters)</label>
              <div style={{ position: 'relative' }}>
                <input type={showPw ? 'text' : 'password'} style={{ ...inputStyle, paddingRight: '48px' }} placeholder="Create a strong password" value={password} onChange={e => setPassword(e.target.value)} required minLength={8} />
                <button type="button" onClick={() => setShowPw(!showPw)} style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#4B5563', padding: 0 }}>
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <button type="submit" disabled={loading}
              style={{ width: '100%', padding: '15px', background: loading ? 'rgba(99,102,241,0.5)' : 'linear-gradient(135deg, #6366F1, #3B82F6)', border: 'none', borderRadius: '12px', color: '#fff', fontSize: '15px', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxSizing: 'border-box' }}>
              {loading ? <><Loader2 size={16} className="animate-spin" />Creating account...</> : 'Create Agent Account'}
            </button>
          </form>

          {/* PRD 3.11 — Google Sign-In */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '16px 0' }}>
            <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.08)' }} />
            <span style={{ color: '#6B7280', fontSize: '12px' }}>or continue with</span>
            <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.08)' }} />
          </div>
          <button type="button" onClick={handleGoogleSignIn} disabled={loading}
            style={{ width: '100%', padding: '13px', background: '#fff', border: '1px solid #E5E7EB', borderRadius: '12px', color: '#374151', fontSize: '14px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', boxSizing: 'border-box' }}>
            <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
            Sign in with Google
          </button>

          <div style={{ textAlign: 'center', marginTop: '20px' }}>
            <span style={{ color: '#4B5563', fontSize: '14px' }}>Already have an account? </span>
            <Link to="/login" style={{ color: '#6366F1', fontSize: '14px', fontWeight: 600, textDecoration: 'none' }}>Sign in →</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
