import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../context/AuthContext'

function PasswordStrength({ password }) {
  const getStrength = (pw) => {
    if (!pw) return 0
    let score = 0
    if (pw.length >= 6) score++
    if (pw.length >= 10) score++
    if (/[A-Z]/.test(pw)) score++
    if (/[0-9]/.test(pw)) score++
    if (/[^A-Za-z0-9]/.test(pw)) score++
    return score
  }
  const score = getStrength(password)
  const levels = [
    { label: '', color: 'transparent', width: '0%' },
    { label: 'Yếu', color: '#ef4444', width: '25%' },
    { label: 'Trung bình', color: '#f59e0b', width: '50%' },
    { label: 'Khá', color: '#00d4ff', width: '75%' },
    { label: 'Mạnh', color: '#22c55e', width: '90%' },
    { label: 'Rất mạnh', color: '#22c55e', width: '100%' },
  ]
  const lvl = levels[Math.min(score, 5)]
  if (!password) return null
  return (
    <div style={{ marginTop: '0.5rem' }}>
      <div style={{ height: 4, borderRadius: 99, background: 'var(--bg-3)', overflow: 'hidden' }}>
        <div style={{
          height: '100%', width: lvl.width,
          background: lvl.color, borderRadius: 99,
          transition: 'width 0.4s ease, background 0.3s ease'
        }} />
      </div>
      {lvl.label && (
        <span style={{ fontSize: '0.72rem', color: lvl.color, fontWeight: 600, marginTop: '0.2rem', display: 'block' }}>
          {lvl.label}
        </span>
      )}
    </div>
  )
}

export default function Register() {
  const { t } = useTranslation()
  const { register } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ full_name: '', email: '', password: '', role: 'STUDENT' })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPass, setShowPass] = useState(false)
  const [focusField, setFocusField] = useState(null)

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  const submit = async e => {
    e.preventDefault()
    setError(''); setSuccess(''); setLoading(true)
    try {
      const data = await register(form)
      setSuccess(data.message)
      if (form.role === 'STUDENT') setTimeout(() => navigate('/login'), 1500)
    } catch (err) {
      setError(err.response?.data?.error || t('auth.register.register_fail'))
    } finally { setLoading(false) }
  }

  const roleOptions = [
    { value: 'STUDENT', label: t('auth.register.role_student'), icon: '🎓', desc: 'Học tập & làm bài thi', color: '#22c55e' },
    { value: 'INSTRUCTOR', label: t('auth.register.role_instructor'), icon: '👨‍🏫', desc: 'Giảng dạy & quản lý', color: '#6c63ff' },
  ]

  return (
    <div className="auth-page">
      {/* Animated background orbs */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
        <div style={{
          position: 'absolute', top: '15%', right: '8%',
          width: '380px', height: '380px', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(0,212,255,0.12) 0%, transparent 65%)',
          animation: 'float 9s ease-in-out infinite'
        }} />
        <div style={{
          position: 'absolute', bottom: '10%', left: '5%',
          width: '420px', height: '420px', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(108,99,255,0.12) 0%, transparent 65%)',
          animation: 'float 12s ease-in-out infinite reverse'
        }} />
        <div style={{
          position: 'absolute', top: '55%', left: '40%',
          width: '200px', height: '200px', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(0,240,192,0.06) 0%, transparent 65%)',
          animation: 'float 7s ease-in-out infinite 1.5s'
        }} />
      </div>

      <div className="auth-card fade-in">
        {/* Logo & Branding */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div
            style={{
              width: '68px', height: '68px', margin: '0 auto 1.25rem',
              background: 'linear-gradient(135deg, var(--accent), var(--primary))',
              borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1.9rem', boxShadow: '0 10px 28px rgba(0,212,255,0.35)',
              transform: 'rotate(5deg)', transition: 'transform 0.3s ease, box-shadow 0.3s ease'
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'rotate(0deg) scale(1.08)'; e.currentTarget.style.boxShadow = '0 14px 36px rgba(0,212,255,0.5)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'rotate(5deg)'; e.currentTarget.style.boxShadow = '0 10px 28px rgba(0,212,255,0.35)'; }}
          >✨</div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: '0.25rem', letterSpacing: '-0.03em' }}>
            {t('auth.register.title')}
          </h1>
          <p style={{ color: 'var(--text-2)', fontSize: '0.875rem' }}>{t('auth.register.subtitle')}</p>
        </div>

        {error && <div className="alert alert-error" style={{ animation: 'fadeIn 0.3s ease' }}>⚠️ {error}</div>}
        {success && <div className="alert alert-success" style={{ animation: 'fadeIn 0.3s ease' }}>✅ {success}</div>}

        <form onSubmit={submit} noValidate>
          {/* Full Name */}
          <div className="form-group">
            <label className="form-label" htmlFor="reg-name">{t('auth.register.full_name')}</label>
            <div style={{ position: 'relative' }}>
              <span style={{
                position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)',
                fontSize: '1rem', opacity: focusField === 'name' ? 1 : 0.45,
                transition: 'opacity 0.2s ease', pointerEvents: 'none'
              }} aria-hidden="true">👤</span>
              <input
                id="reg-name"
                className="form-input"
                placeholder="Nguyễn Văn A"
                style={{ paddingLeft: '2.75rem' }}
                value={form.full_name}
                onChange={set('full_name')}
                onFocus={() => setFocusField('name')}
                onBlur={() => setFocusField(null)}
                required
                autoComplete="name"
              />
            </div>
          </div>

          {/* Email */}
          <div className="form-group">
            <label className="form-label" htmlFor="reg-email">{t('auth.register.email')}</label>
            <div style={{ position: 'relative' }}>
              <span style={{
                position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)',
                fontSize: '1rem', opacity: focusField === 'email' ? 1 : 0.45,
                transition: 'opacity 0.2s ease', pointerEvents: 'none'
              }} aria-hidden="true">📧</span>
              <input
                id="reg-email"
                className="form-input"
                type="email"
                placeholder="your@email.com"
                style={{ paddingLeft: '2.75rem' }}
                value={form.email}
                onChange={set('email')}
                onFocus={() => setFocusField('email')}
                onBlur={() => setFocusField(null)}
                required
                autoComplete="email"
              />
            </div>
          </div>

          {/* Password */}
          <div className="form-group">
            <label className="form-label" htmlFor="reg-password">{t('auth.register.password')}</label>
            <div style={{ position: 'relative' }}>
              <span style={{
                position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)',
                fontSize: '1rem', opacity: focusField === 'password' ? 1 : 0.45,
                transition: 'opacity 0.2s ease', pointerEvents: 'none'
              }} aria-hidden="true">🔒</span>
              <input
                id="reg-password"
                className="form-input"
                type={showPass ? 'text' : 'password'}
                placeholder={t('auth.register.password_hint')}
                style={{ paddingLeft: '2.75rem', paddingRight: '3rem' }}
                value={form.password}
                onChange={set('password')}
                onFocus={() => setFocusField('password')}
                onBlur={() => setFocusField(null)}
                required
                minLength={6}
                autoComplete="new-password"
              />
              <button
                type="button"
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
            <PasswordStrength password={form.password} />
          </div>

          {/* Role Selector */}
          <div className="form-group">
            <label className="form-label">{t('auth.register.role')}</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.875rem' }}>
              {roleOptions.map(r => (
                <div
                  key={r.value}
                  onClick={() => setForm(f => ({ ...f, role: r.value }))}
                  role="radio"
                  aria-checked={form.role === r.value}
                  tabIndex={0}
                  onKeyDown={e => e.key === 'Enter' && setForm(f => ({ ...f, role: r.value }))}
                  style={{
                    padding: '1.125rem', borderRadius: '16px', cursor: 'pointer',
                    border: form.role === r.value
                      ? `2px solid ${r.color}`
                      : '1.5px solid var(--border)',
                    background: form.role === r.value
                      ? `${r.color}18`
                      : 'var(--glass)',
                    transition: 'all 0.25s cubic-bezier(0.4,0,0.2,1)',
                    textAlign: 'center',
                    transform: form.role === r.value ? 'scale(1.03)' : 'scale(1)',
                    boxShadow: form.role === r.value ? `0 6px 20px ${r.color}30` : 'none',
                    outline: 'none',
                  }}
                >
                  <div style={{ fontSize: '1.75rem', marginBottom: '0.4rem', filter: form.role === r.value ? 'none' : 'grayscale(0.4)' }}>{r.icon}</div>
                  <div style={{ fontWeight: 700, fontSize: '0.85rem', color: form.role === r.value ? r.color : 'var(--text)' }}>{r.label}</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-3)', marginTop: '0.2rem' }}>{r.desc}</div>
                  {form.role === r.value && (
                    <div style={{
                      width: 20, height: 20, borderRadius: '50%', background: r.color,
                      margin: '0.5rem auto 0', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '0.7rem', color: '#fff', fontWeight: 900
                    }}>✓</div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <button
            className="btn btn-primary btn-lg"
            style={{ width: '100%', justifyContent: 'center', fontWeight: 700, marginTop: '0.5rem', letterSpacing: '-0.01em' }}
            type="submit"
            disabled={loading}
            aria-busy={loading}
          >
            {loading
              ? <><div className="spinner spinner-sm" style={{ marginRight: '0.5rem' }} />{t('auth.register.processing')}</>
              : <><span aria-hidden="true">✨</span> {t('auth.register.submit')}</>
            }
          </button>
        </form>

        <p className="auth-footer" style={{ marginTop: '2rem' }}>
          {t('auth.register.has_account')}{' '}
          <Link to="/login" style={{ fontWeight: 700 }}>{t('auth.register.login_link')} →</Link>
        </p>
      </div>
    </div>
  )
}
