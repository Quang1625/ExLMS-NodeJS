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
  const [showPass, setShowPass] = useState(false)
  const [focusField, setFocusField] = useState(null)

  const isIpAddress = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(window.location.hostname)
  const isSafeForOneTap = !isIpAddress && window.location.protocol === 'https:'

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
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
        <div style={{
          position: 'absolute', top: '-5%', left: '-5%',
          width: '500px', height: '500px', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(108,99,255,0.14) 0%, transparent 65%)',
          animation: 'float 10s ease-in-out infinite'
        }} />
        <div style={{
          position: 'absolute', bottom: '-10%', right: '-5%',
          width: '400px', height: '400px', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(0,212,255,0.1) 0%, transparent 65%)',
          animation: 'float 13s ease-in-out infinite reverse'
        }} />
        <div style={{
          position: 'absolute', top: '40%', right: '20%',
          width: '250px', height: '250px', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(0,240,192,0.06) 0%, transparent 60%)',
          animation: 'float 8s ease-in-out infinite 2s'
        }} />
      </div>

      <div className="auth-card">
        {/* Logo & Branding */}
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <div style={{
            width: '72px', height: '72px', margin: '0 auto 1.25rem',
            background: 'linear-gradient(135deg, var(--primary), var(--accent))',
            borderRadius: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '2rem', boxShadow: '0 12px 32px rgba(108,99,255,0.4)',
            transform: 'rotate(-6deg)', transition: 'transform 0.3s ease'
          }}
          onMouseEnter={e => e.currentTarget.style.transform = 'rotate(0deg) scale(1.05)'}
          onMouseLeave={e => e.currentTarget.style.transform = 'rotate(-6deg)'}
          >🎓</div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '0.4rem', letterSpacing: '-0.03em' }}>
            {t('auth.login.title')}
          </h1>
          <p style={{ color: 'var(--text-2)', fontSize: '0.9rem' }}>{t('auth.login.subtitle')}</p>
        </div>

        {error && (
          <div className="alert alert-error" role="alert">
            <span aria-hidden="true">⚠️</span> {error}
          </div>
        )}

        <form onSubmit={submit} noValidate>
          {/* Email */}
          <div className="form-group">
            <label className="form-label" htmlFor="login-email">
              {t('auth.login.email')} <span style={{ color: 'var(--danger)' }}>*</span>
            </label>
            <div style={{ position: 'relative' }}>
              <span style={{
                position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)',
                fontSize: '1rem', opacity: focusField === 'email' ? 1 : 0.45,
                transition: 'opacity 0.2s ease', pointerEvents: 'none'
              }} aria-hidden="true">📧</span>
              <input id="login-email" className="form-input" type="email"
                placeholder="your@email.com"
                style={{ paddingLeft: '2.75rem' }}
                value={form.email} onChange={set('email')} required
                onFocus={() => setFocusField('email')} onBlur={() => setFocusField(null)}
                autoComplete="email" aria-label={t('auth.login.email')} />
            </div>
          </div>

          {/* Password */}
          <div className="form-group">
            <label className="form-label" htmlFor="login-password">
              {t('auth.login.password')} <span style={{ color: 'var(--danger)' }}>*</span>
            </label>
            <div style={{ position: 'relative' }}>
              <span style={{
                position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)',
                fontSize: '1rem', opacity: focusField === 'password' ? 1 : 0.45,
                transition: 'opacity 0.2s ease', pointerEvents: 'none'
              }} aria-hidden="true">🔒</span>
              <input id="login-password" className="form-input"
                type={showPass ? 'text' : 'password'}
                placeholder="••••••••"
                style={{ paddingLeft: '2.75rem', paddingRight: '3rem' }}
                value={form.password} onChange={set('password')} required
                onFocus={() => setFocusField('password')} onBlur={() => setFocusField(null)}
                autoComplete="current-password" aria-label={t('auth.login.password')} />
              <button type="button"
                style={{
                  position: 'absolute', right: '0.875rem', top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem',
                  color: 'var(--text-3)', padding: '0.25rem', transition: 'color 0.2s ease'
                }}
                onMouseEnter={e => e.currentTarget.style.color = 'var(--text)'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--text-3)'}
                onClick={() => setShowPass(!showPass)}
                aria-label={showPass ? 'Hide password' : 'Show password'}
              >{showPass ? '🙈' : '👁️'}</button>
            </div>
          </div>

          <button className="btn btn-primary btn-lg"
            style={{ width: '100%', justifyContent: 'center', marginTop: '0.5rem', letterSpacing: '-0.01em' }}
            type="submit" disabled={loading}
            aria-busy={loading}>
            {loading
              ? <><div className="spinner spinner-sm" style={{ marginRight: '0.5rem' }} />{t('auth.login.logging_in')}</>
              : <><span aria-hidden="true">🚀</span> {t('auth.login.submit')}</>
            }
          </button>
        </form>

        <div className="auth-divider">{t('auth.login.or_divider')}</div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '1rem', minHeight: '44px' }}>
          {!isIpAddress ? (
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={() => setError(t('auth.login.google_fail'))}
              useOneTap={isSafeForOneTap}
              auto_select={isSafeForOneTap}
            />
          ) : (
            <div style={{
              background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)',
              borderRadius: 'var(--radius-sm)', padding: '12px 16px', width: '100%',
              display: 'flex', alignItems: 'center', gap: '10px'
            }}>
              <span style={{ fontSize: '1.2rem' }} aria-hidden="true">⚠️</span>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-2)', margin: 0 }}>
                {t('auth.login.google_ip_warning') || 'Google Sign-In requires an official domain.'}
              </p>
            </div>
          )}
        </div>

        <button className="oauth-btn" disabled title={t('auth.login.coming_soon')} aria-label={t('auth.login.microsoft_login')}>
          <span aria-hidden="true">🟦</span> {t('auth.login.microsoft_login')}
          <span style={{ marginLeft: 'auto', fontSize: '0.7rem', color: 'var(--text-3)' }}>{t('auth.login.coming_soon')}</span>
        </button>

        <p className="auth-footer" style={{ marginTop: '2rem' }}>
          {t('auth.login.no_account')}{' '}
          <Link to="/register" style={{ fontWeight: 700 }}>{t('auth.login.register_link')} →</Link>
        </p>
      </div>
    </div>
  )
}
