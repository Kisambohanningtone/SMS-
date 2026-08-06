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

  async function handleGoogleSignIn() {
    if (typeof window === 'undefined') return
    // Load Google Identity Services
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
