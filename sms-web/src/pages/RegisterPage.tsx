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

          <div style={{ textAlign: 'center', marginTop: '20px' }}>
            <span style={{ color: '#4B5563', fontSize: '14px' }}>Already have an account? </span>
            <Link to="/login" style={{ color: '#6366F1', fontSize: '14px', fontWeight: 600, textDecoration: 'none' }}>Sign in →</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
