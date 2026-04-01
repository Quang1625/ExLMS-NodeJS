import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../context/AuthContext'
import { GoogleLogin } from '@react-oauth/google'

export default function Login() {
  const { t } = useTranslation()
  const { login, googleLogin } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [focusField, setFocusField] = useState(null)

  // Determine if Google One Tap is safe to use (requires HTTPS or localhost)
  const isSafeForOneTap = window.location.hostname === 'localhost' || window.location.protocol === 'https:'

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  const submit = async e => {
    e.preventDefault()
    setError(''); setLoading(true)
    try {
      await login(form.email, form.password)
      navigate('/')
    } catch (err) {
      setError(err.response?.data?.error || t('auth.login.login_fail'))
    } finally { setLoading(false) }
  }

  const handleGoogleSuccess = async (res) => {
    setError('')
    try {
      await googleLogin(res.credential)
      navigate('/')
    } catch (err) {
      setError(err.response?.data?.error || t('auth.login.google_fail'))
    }
  }

  return (
    <div className="auth-page">
      {/* Animated background orbs */}
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none', overflow: 'hidden'
      }}>
        <div style={{
          position: 'absolute', top: '10%', left: '15%',
          width: '400px', height: '400px', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(108,99,255,0.12) 0%, transparent 70%)',
          animation: 'float 8s ease-in-out infinite'
        }} />
        <div style={{
          position: 'absolute', bottom: '10%', right: '15%',
          width: '300px', height: '300px', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(0,212,255,0.08) 0%, transparent 70%)',
          animation: 'float 10s ease-in-out infinite reverse'
        }} />
      </div>

      <div className="auth-card fade-in" style={{ backdropFilter: 'blur(20px)', background: 'var(--bg-glass)', borderRadius: '24px' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            width: '64px', height: '64px', margin: '0 auto 1rem',
            background: 'linear-gradient(135deg, var(--primary), var(--accent))',
            borderRadius: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.8rem', boxShadow: '0 8px 24px rgba(108,99,255,0.3)',
            transform: 'rotate(-5deg)'
          }}>🎓</div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.25rem' }}>{t('auth.login.title')}</h1>
          <p style={{ color: 'var(--text-2)', fontSize: '0.9rem' }}>{t('auth.login.subtitle')}</p>
        </div>

        {error && (
          <div className="alert alert-error" style={{ animation: 'fadeIn 0.3s ease', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span>⚠️</span> {error}
          </div>
        )}

        <form onSubmit={submit}>
          <div className="form-group">
            <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600 }}>{t('auth.login.email')}</label>
            <div style={{ position: 'relative' }}>
              <span style={{
                position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)',
                fontSize: '1rem', opacity: focusField === 'email' ? 1 : 0.5, transition: 'all 0.2s ease'
              }}>📧</span>
              <input className="form-input" type="email" placeholder="your@email.com"
                style={{ paddingLeft: '2.75rem' }}
                value={form.email} onChange={set('email')} required
                onFocus={() => setFocusField('email')} onBlur={() => setFocusField(null)} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600 }}>{t('auth.login.password')}</label>
            <div style={{ position: 'relative' }}>
              <span style={{
                position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)',
                fontSize: '1rem', opacity: focusField === 'password' ? 1 : 0.5, transition: 'all 0.2s ease'
              }}>🔒</span>
              <input className="form-input" type="password" placeholder="••••••••"
                style={{ paddingLeft: '2.75rem' }}
                value={form.password} onChange={set('password')} required
                onFocus={() => setFocusField('password')} onBlur={() => setFocusField(null)} />
            </div>
          </div>
          <button className="btn btn-primary btn-lg" style={{ width: '100%', justifyContent: 'center', fontWeight: 700, marginTop: '0.5rem' }}
            disabled={loading}>
            {loading ? `⏳ ${t('auth.login.logging_in')}` : `🚀 ${t('auth.login.submit')}`}
          </button>
        </form>

        <div className="auth-divider">{t('auth.login.or_divider')}</div>

        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem', minHeight: '40px' }}>
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={() => setError(t('auth.login.google_fail'))}
            useOneTap={isSafeForOneTap}
            auto_select={isSafeForOneTap}
          />
        </div>

        <button className="oauth-btn" disabled title={t('auth.login.coming_soon')} style={{ borderRadius: '12px' }}>
          <span>🟦</span> {t('auth.login.microsoft_login')}
          <span style={{marginLeft:'auto',fontSize:'0.7rem',color:'var(--text-3)'}}>{t('auth.login.coming_soon')}</span>
        </button>

        <p className="auth-footer" style={{ marginTop: '2rem' }}>
          {t('auth.login.no_account')} <Link to="/register" style={{ fontWeight: 700 }}>{t('auth.login.register_link')} →</Link>
        </p>
      </div>
    </div>
  )
}
