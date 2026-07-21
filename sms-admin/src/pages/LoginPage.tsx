import { useState } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { authApi } from '../api/auth'
import { useAuthStore } from '../hooks/useAuth'

export function LoginPage() {
  const { setAuth, isAuthenticated, user } = useAuthStore()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)

  if (isAuthenticated() && (user?.role === 'admin' || user?.role === 'super_admin')) return <Navigate to="/" replace />

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await authApi.login(email, password)
      const { accessToken, user } = res.data.data
      if (user.role !== 'admin' && user.role !== 'super_admin') { toast.error('Access denied — admin accounts only'); return }
      setAuth(user, accessToken)
      navigate('/')
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Invalid credentials')
    } finally { setLoading(false) }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: '#080C14', fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* Left panel */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '48px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '-80px', left: '-80px', width: '450px', height: '450px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(245,158,11,0.2) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '-100px', right: '0', width: '350px', height: '350px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(217,119,6,0.15) 0%, transparent 70%)', pointerEvents: 'none' }} />

        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'linear-gradient(135deg, #F59E0B, #D97706)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            </div>
            <div>
              <div style={{ color: '#fff', fontWeight: 700, fontSize: '16px' }}>Waltern Tech</div>
              <div style={{ color: '#4B5563', fontSize: '11px', letterSpacing: '0.5px', textTransform: 'uppercase' }}>Admin Console</div>
            </div>
          </div>
        </div>

        <div style={{ position: 'relative', zIndex: 1, margin: '40px 0' }}>
          <svg viewBox="0 0 600 160" style={{ width: '100%', opacity: 0.1 }}>
            <rect x="20" y="40" width="40" height="120" fill="#F59E0B"/>
            <rect x="70" y="20" width="60" height="140" fill="#D97706"/>
            <rect x="140" y="10" width="80" height="150" fill="#F59E0B"/>
            <rect x="230" y="50" width="50" height="110" fill="#92400E"/>
            <rect x="290" y="30" width="70" height="130" fill="#F59E0B"/>
            <rect x="370" y="40" width="45" height="120" fill="#D97706"/>
            <rect x="425" y="20" width="55" height="140" fill="#F59E0B"/>
            <rect x="490" y="60" width="40" height="100" fill="#92400E"/>
            <rect x="540" y="35" width="50" height="125" fill="#D97706"/>
            <rect x="0" y="155" width="600" height="5" fill="#F59E0B" opacity="0.4"/>
          </svg>
        </div>

        <div style={{ position: 'relative', zIndex: 1 }}>
          <p style={{ color: '#F59E0B', fontSize: '12px', fontWeight: 700, letterSpacing: '3px', textTransform: 'uppercase', marginBottom: '16px' }}>Command Centre</p>
          <h1 style={{ color: '#fff', fontSize: '42px', fontWeight: 800, lineHeight: 1.15, letterSpacing: '-1px', marginBottom: '20px' }}>
            Total visibility.<br/>Total control.<br/><span style={{ background: 'linear-gradient(90deg, #F59E0B, #D97706)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Every transaction.</span>
          </h1>
          <p style={{ color: '#4B5563', fontSize: '16px', lineHeight: 1.7, maxWidth: '380px', marginBottom: '40px' }}>
            Monitor every agent, every property, and every shilling of commission earned across the entire SMS platform in real time.
          </p>
          <div style={{ display: 'flex', gap: '32px' }}>
            {[['0.5%', 'Per transaction'], ['Live', 'Activity feed'], ['All agents', 'One dashboard']].map(([val, label]) => (
              <div key={label}>
                <div style={{ color: '#fff', fontSize: '20px', fontWeight: 800 }}>{val}</div>
                <div style={{ color: '#374151', fontSize: '12px', marginTop: '4px' }}>{label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div style={{ width: '480px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px', borderLeft: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '24px', padding: '40px', backdropFilter: 'blur(20px)' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'linear-gradient(135deg, #F59E0B, #D97706)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          </div>
          <h2 style={{ color: '#fff', fontSize: '24px', fontWeight: 700, marginBottom: '6px' }}>Admin Sign In</h2>
          <p style={{ color: '#4B5563', fontSize: '14px', marginBottom: '32px' }}>Waltern Tech staff access only</p>

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', color: '#9CA3AF', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>Email address</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required autoFocus placeholder="admin@waltern.com"
                style={{ width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '14px 16px', color: '#fff', fontSize: '15px', outline: 'none', boxSizing: 'border-box' }}
                onFocus={e => e.target.style.borderColor = '#F59E0B'}
                onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'} />
            </div>
            <div style={{ marginBottom: '28px' }}>
              <label style={{ display: 'block', color: '#9CA3AF', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>Password</label>
              <div style={{ position: 'relative' }}>
                <input type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} required placeholder="••••••••••••"
                  style={{ width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '14px 48px 14px 16px', color: '#fff', fontSize: '15px', outline: 'none', boxSizing: 'border-box' }}
                  onFocus={e => e.target.style.borderColor = '#F59E0B'}
                  onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'} />
                <button type="button" onClick={() => setShowPw(!showPw)}
                  style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#4B5563', padding: 0 }}>
                  {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <button type="submit" disabled={loading}
              style={{ width: '100%', padding: '15px', background: loading ? 'rgba(245,158,11,0.5)' : 'linear-gradient(135deg, #F59E0B, #D97706)', border: 'none', borderRadius: '12px', color: '#fff', fontSize: '16px', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxSizing: 'border-box' }}>
              {loading ? <><Loader2 size={18} className="animate-spin" />Authenticating...</> : 'Access Admin Console'}
            </button>
          </form>

          <div style={{ marginTop: '32px', paddingTop: '24px', borderTop: '1px solid rgba(255,255,255,0.06)', textAlign: 'center' }}>
            <p style={{ color: '#374151', fontSize: '12px' }}>Unauthorized access is prohibited · Waltern Tech Ltd</p>
          </div>
        </div>
      </div>
    </div>
  )
}
