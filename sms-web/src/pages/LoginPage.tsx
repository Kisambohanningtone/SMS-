import { useState } from 'react'
import { useNavigate, Navigate, Link } from 'react-router-dom'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { authApi } from '../api/auth'
import { useAuthStore } from '../hooks/useAuth'

export function LoginPage() {
  const { setAuth, isAuthenticated } = useAuthStore()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)

  if (isAuthenticated()) return <Navigate to="/" replace />

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await authApi.login({ email, password })
      const { accessToken, user } = res.data.data
      setAuth(user, accessToken)
      navigate('/')
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Invalid credentials')
    } finally { setLoading(false) }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: '#080C14', fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* ── Left panel ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '48px', position: 'relative', overflow: 'hidden' }}>
        {/* Gradient orbs */}
        <div style={{ position: 'absolute', top: '-80px', left: '-80px', width: '400px', height: '400px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.25) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '-100px', right: '-50px', width: '350px', height: '350px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(59,130,246,0.15) 0%, transparent 70%)', pointerEvents: 'none' }} />

        {/* Logo */}
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'linear-gradient(135deg, #6366F1, #3B82F6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9,22 9,12 15,12 15,22"/></svg>
            </div>
            <div>
              <div style={{ color: '#fff', fontWeight: 700, fontSize: '16px', letterSpacing: '-0.3px' }}>Waltern Tech</div>
              <div style={{ color: '#4B5563', fontSize: '11px', letterSpacing: '0.5px', textTransform: 'uppercase' }}>Agent Portal</div>
            </div>
          </div>
        </div>

        {/* City skyline SVG */}
        <div style={{ position: 'relative', zIndex: 1, margin: '40px 0' }}>
          <svg viewBox="0 0 600 200" style={{ width: '100%', opacity: 0.15 }}>
            <rect x="20" y="80" width="40" height="120" fill="#6366F1"/>
            <rect x="25" y="60" width="30" height="20" fill="#6366F1"/>
            <rect x="30" y="40" width="20" height="20" fill="#6366F1"/>
            <rect x="70" y="100" width="60" height="100" fill="#818CF8"/>
            <rect x="80" y="70" width="40" height="30" fill="#818CF8"/>
            <rect x="85" y="50" width="30" height="20" fill="#818CF8"/>
            <rect x="140" y="50" width="80" height="150" fill="#6366F1"/>
            <rect x="150" y="30" width="60" height="20" fill="#6366F1"/>
            <rect x="160" y="10" width="40" height="20" fill="#6366F1"/>
            <rect x="170" y="0" width="20" height="10" fill="#6366F1"/>
            <rect x="230" y="90" width="50" height="110" fill="#4F46E5"/>
            <rect x="290" y="60" width="70" height="140" fill="#6366F1"/>
            <rect x="300" y="40" width="50" height="20" fill="#6366F1"/>
            <rect x="370" y="80" width="45" height="120" fill="#818CF8"/>
            <rect x="425" y="70" width="55" height="130" fill="#6366F1"/>
            <rect x="430" y="50" width="45" height="20" fill="#6366F1"/>
            <rect x="490" y="100" width="40" height="100" fill="#4F46E5"/>
            <rect x="540" y="85" width="50" height="115" fill="#818CF8"/>
            <rect x="545" y="65" width="40" height="20" fill="#818CF8"/>
            <rect x="0" y="185" width="600" height="15" fill="#6366F1" opacity="0.3"/>
          </svg>
        </div>

        {/* Hero copy */}
        <div style={{ position: 'relative', zIndex: 1 }}>
          <p style={{ color: '#6366F1', fontSize: '12px', fontWeight: 700, letterSpacing: '3px', textTransform: 'uppercase', marginBottom: '16px' }}>Property Management Platform</p>
          <h1 style={{ color: '#fff', fontSize: '42px', fontWeight: 800, lineHeight: 1.15, letterSpacing: '-1px', marginBottom: '20px' }}>
            Every key.<br/>Every tenant.<br/><span style={{ background: 'linear-gradient(90deg, #6366F1, #3B82F6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Every shilling.</span>
          </h1>
          <p style={{ color: '#4B5563', fontSize: '16px', lineHeight: 1.7, maxWidth: '380px', marginBottom: '40px' }}>
            Manage your entire property portfolio — tenants, rent collection, reminders, and owner reports — from one place.
          </p>
          <div style={{ display: 'flex', gap: '32px' }}>
            {[['100%', 'M-Pesa integrated'], ['0.5%', 'Platform fee only'], ['Real-time', 'Payment tracking']].map(([val, label]) => (
              <div key={label}>
                <div style={{ color: '#fff', fontSize: '20px', fontWeight: 800 }}>{val}</div>
                <div style={{ color: '#374151', fontSize: '12px', marginTop: '4px' }}>{label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Right panel — glass card ── */}
      <div style={{ width: '480px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px', borderLeft: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '24px', padding: '40px', backdropFilter: 'blur(20px)' }}>
          <h2 style={{ color: '#fff', fontSize: '24px', fontWeight: 700, marginBottom: '6px' }}>Agent Sign In</h2>
          <p style={{ color: '#4B5563', fontSize: '14px', marginBottom: '32px' }}>Access your property management dashboard</p>

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', color: '#9CA3AF', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>Email address</label>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)} required autoFocus
                placeholder="agent@yourcompany.com"
                style={{ width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '14px 16px', color: '#fff', fontSize: '15px', outline: 'none', boxSizing: 'border-box' }}
                onFocus={e => e.target.style.borderColor = '#6366F1'}
                onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
              />
            </div>

            <div style={{ marginBottom: '28px' }}>
              <label style={{ display: 'block', color: '#9CA3AF', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} required
                  placeholder="Enter your password"
                  style={{ width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '14px 48px 14px 16px', color: '#fff', fontSize: '15px', outline: 'none', boxSizing: 'border-box' }}
                  onFocus={e => e.target.style.borderColor = '#6366F1'}
                  onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                />
                <button type="button" onClick={() => setShowPw(!showPw)}
                  style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#4B5563', padding: 0 }}>
                  {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading}
              style={{ width: '100%', padding: '15px', background: loading ? 'rgba(99,102,241,0.5)' : 'linear-gradient(135deg, #6366F1, #3B82F6)', border: 'none', borderRadius: '12px', color: '#fff', fontSize: '16px', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxSizing: 'border-box' }}>
              {loading ? <><Loader2 size={18} className="animate-spin" />Signing in...</> : 'Sign In to Dashboard'}
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: '24px' }}>
            <span style={{ color: '#4B5563', fontSize: '14px' }}>New agent? </span>
            <Link to="/register" style={{ color: '#6366F1', fontSize: '14px', fontWeight: 600, textDecoration: 'none' }}>Create your account →</Link>
          </div>

          <div style={{ marginTop: '32px', paddingTop: '24px', borderTop: '1px solid rgba(255,255,255,0.06)', textAlign: 'center' }}>
            <p style={{ color: '#374151', fontSize: '12px' }}>Waltern Tech Ltd · Property Management Platform · Nairobi, Kenya</p>
          </div>
        </div>
      </div>
    </div>
  )
}
