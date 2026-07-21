import { useState } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import { Eye, EyeOff, Loader2, Shield, ArrowLeft } from 'lucide-react'
import toast from 'react-hot-toast'
import { api } from '../api/client'
import { useAuthStore } from '../hooks/useAuth'

export function RegisterAdminPage() {
  const { isAuthenticated, user } = useAuthStore()
  const navigate = useNavigate()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)

  if (!isAuthenticated() || user?.role !== 'super_admin') return <Navigate to="/" replace />

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password.length < 8) { toast.error('Password must be at least 8 characters'); return }
    if (password !== confirmPassword) { toast.error('Passwords do not match'); return }
    setLoading(true)
    try {
      await api.post('/api/admin/register-admin', { full_name: fullName, email, phone: phone || undefined, password })
      toast.success(`Admin account created for ${fullName}`)
      navigate('/agents')
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Failed to create admin account')
    } finally { setLoading(false) }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px',
    padding: '14px 16px', color: '#fff', fontSize: '15px',
    outline: 'none', boxSizing: 'border-box',
  }
  const labelStyle: React.CSSProperties = {
    display: 'block', color: '#9CA3AF', fontSize: '11px',
    fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px',
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: '#080C14', fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* Left panel */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '48px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '-80px', left: '-80px', width: '450px', height: '450px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(245,158,11,0.2) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '-100px', right: '0', width: '350px', height: '350px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(217,119,6,0.12) 0%, transparent 70%)', pointerEvents: 'none' }} />

        {/* Logo */}
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'linear-gradient(135deg, #F59E0B, #D97706)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Shield size={20} color="white" />
            </div>
            <div>
              <div style={{ color: '#fff', fontWeight: 700, fontSize: '16px' }}>Waltern Tech</div>
              <div style={{ color: '#4B5563', fontSize: '11px', letterSpacing: '0.5px', textTransform: 'uppercase' }}>Admin Console</div>
            </div>
          </div>
        </div>

        {/* Skyline */}
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

        {/* Copy */}
        <div style={{ position: 'relative', zIndex: 1 }}>
          <p style={{ color: '#F59E0B', fontSize: '12px', fontWeight: 700, letterSpacing: '3px', textTransform: 'uppercase', marginBottom: '16px' }}>Admin Management</p>
          <h1 style={{ color: '#fff', fontSize: '38px', fontWeight: 800, lineHeight: 1.15, letterSpacing: '-1px', marginBottom: '20px' }}>
            Expanding the<br />Waltern Tech<br /><span style={{ background: 'linear-gradient(90deg, #F59E0B, #D97706)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Admin team.</span>
          </h1>
          <p style={{ color: '#4B5563', fontSize: '15px', lineHeight: 1.7, maxWidth: '380px', marginBottom: '32px' }}>
            Create a new admin account for a trusted Waltern Tech team member. They will have full access to the platform command centre.
          </p>
          <div style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: '12px', padding: '16px 20px' }}>
            <p style={{ color: '#F59E0B', fontSize: '12px', fontWeight: 700, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>⚠ Admin Access Warning</p>
            <p style={{ color: '#4B5563', fontSize: '13px', lineHeight: 1.6, margin: 0 }}>
              Admin accounts have full platform access — they can view all agents, owners, transactions, and platform data. Only create accounts for trusted Waltern Tech staff.
            </p>
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div style={{ width: '520px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px', borderLeft: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ width: '100%' }}>
          <button onClick={() => navigate(-1)}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#4B5563', background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px', marginBottom: '24px', padding: 0 }}>
            <ArrowLeft size={16} /> Back to dashboard
          </button>

          <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '24px', padding: '40px', backdropFilter: 'blur(20px)' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'linear-gradient(135deg, #F59E0B, #D97706)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px' }}>
              <Shield size={24} color="white" />
            </div>
            <h2 style={{ color: '#fff', fontSize: '22px', fontWeight: 700, marginBottom: '6px' }}>Create Admin Account</h2>
            <p style={{ color: '#4B5563', fontSize: '14px', marginBottom: '28px' }}>New Waltern Tech staff member</p>

            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: '18px' }}>
                <label style={labelStyle}>Full name</label>
                <input style={inputStyle} placeholder="e.g. Jane Kamau" value={fullName}
                  onChange={e => setFullName(e.target.value)} required autoFocus
                  onFocus={e => (e.target.style.borderColor = '#F59E0B')}
                  onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')} />
              </div>

              <div style={{ marginBottom: '18px' }}>
                <label style={labelStyle}>Email address</label>
                <input type="email" style={inputStyle} placeholder="jane@waltern.com" value={email}
                  onChange={e => setEmail(e.target.value)} required
                  onFocus={e => (e.target.style.borderColor = '#F59E0B')}
                  onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')} />
              </div>

              <div style={{ marginBottom: '18px' }}>
                <label style={labelStyle}>Phone number (optional)</label>
                <input style={inputStyle} placeholder="+254700000000" value={phone}
                  onChange={e => setPhone(e.target.value)}
                  onFocus={e => (e.target.style.borderColor = '#F59E0B')}
                  onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')} />
              </div>

              <div style={{ marginBottom: '18px' }}>
                <label style={labelStyle}>Password (min 8 characters)</label>
                <div style={{ position: 'relative' }}>
                  <input type={showPw ? 'text' : 'password'} style={{ ...inputStyle, paddingRight: '48px' }}
                    placeholder="Create a strong password" value={password}
                    onChange={e => setPassword(e.target.value)} required minLength={8}
                    onFocus={e => (e.target.style.borderColor = '#F59E0B')}
                    onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')} />
                  <button type="button" onClick={() => setShowPw(!showPw)}
                    style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#4B5563', padding: 0 }}>
                    {showPw ? <EyeOff size={16} color="#4B5563" /> : <Eye size={16} color="#4B5563" />}
                  </button>
                </div>
              </div>

              <div style={{ marginBottom: '28px' }}>
                <label style={labelStyle}>Confirm password</label>
                <input type="password" style={{ ...inputStyle, borderColor: confirmPassword && confirmPassword !== password ? '#EF4444' : 'rgba(255,255,255,0.1)' }}
                  placeholder="Repeat the password" value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)} required
                  onFocus={e => (e.target.style.borderColor = '#F59E0B')}
                  onBlur={e => (e.target.style.borderColor = confirmPassword !== password ? '#EF4444' : 'rgba(255,255,255,0.1)')} />
                {confirmPassword && confirmPassword !== password && (
                  <p style={{ color: '#EF4444', fontSize: '12px', marginTop: '6px' }}>Passwords do not match</p>
                )}
              </div>

              <button type="submit" disabled={loading || !!(confirmPassword && confirmPassword !== password)}
                style={{ width: '100%', padding: '15px', background: (loading || !!(confirmPassword && confirmPassword !== password)) ? 'rgba(245,158,11,0.4)' : 'linear-gradient(135deg, #F59E0B, #D97706)', border: 'none', borderRadius: '12px', color: '#fff', fontSize: '15px', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxSizing: 'border-box' }}>
                {loading ? <><Loader2 size={16} className="animate-spin" />Creating account...</> : 'Create Admin Account'}
              </button>
            </form>

            <div style={{ marginTop: '24px', paddingTop: '20px', borderTop: '1px solid rgba(255,255,255,0.06)', textAlign: 'center' }}>
              <p style={{ color: '#374151', fontSize: '12px' }}>This action is logged and audited · Waltern Tech Ltd</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
