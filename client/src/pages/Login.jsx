import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { GoogleLogin } from '@react-oauth/google'

export default function Login() {
  const { login, googleLogin } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  const submit = async e => {
    e.preventDefault()
    setError(''); setLoading(true)
    try {
      await login(form.email, form.password)
      navigate('/')
    } catch (err) {
      setError(err.response?.data?.error || 'Đăng nhập thất bại')
    } finally { setLoading(false) }
  }

  const handleGoogleSuccess = async (res) => {
    setError('')
    try {
      await googleLogin(res.credential)
      navigate('/')
    } catch (err) {
      setError(err.response?.data?.error || 'Đăng nhập Google thất bại')
    }
  }

  // Debug check for Client ID
  if (!import.meta.env.VITE_GOOGLE_CLIENT_ID) {
    console.warn('VITE_GOOGLE_CLIENT_ID is missing from .env');
  }

  return (
    <div className="auth-page">
      <div className="auth-card fade-in">
        <div className="auth-logo">
          <div className="auth-logo-icon">🎓</div>
          <span className="auth-logo-text">ExLMS</span>
        </div>
        <h1 className="auth-title">Chào mừng trở lại</h1>
        <p className="auth-subtitle">Đăng nhập để tiếp tục học tập</p>

        {error && <div className="alert alert-error">⚠️ {error}</div>}

        <form onSubmit={submit}>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input className="form-input" type="email" placeholder="your@email.com"
              value={form.email} onChange={set('email')} required />
          </div>
          <div className="form-group">
            <label className="form-label">Mật khẩu</label>
            <input className="form-input" type="password" placeholder="••••••••"
              value={form.password} onChange={set('password')} required />
          </div>
          <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}
            disabled={loading}>
            {loading ? '⏳ Đang đăng nhập...' : '🚀 Đăng nhập'}
          </button>
        </form>

        <div className="auth-divider">Hoặc đăng nhập với</div>

        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem', minHeight: '40px' }}>
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={() => setError('Đăng nhập Google thất bại')}
            useOneTap
            auto_select
          />
        </div>

        <button className="oauth-btn" disabled>

          <span>🟦</span> Tiếp tục với Microsoft
          <span style={{marginLeft:'auto',fontSize:'0.7rem',color:'var(--text-3)'}}>coming soon</span>
        </button>


        <p className="auth-footer">
          Chưa có tài khoản? <Link to="/register">Đăng ký ngay</Link>
        </p>
      </div>
    </div>
  )
}
