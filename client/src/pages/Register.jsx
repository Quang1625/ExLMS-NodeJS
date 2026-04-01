import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../context/AuthContext'

export default function Register() {
  const { t } = useTranslation()
  const { register } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ full_name: '', email: '', password: '', role: 'STUDENT' })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

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
    { value: 'STUDENT', label: t('auth.register.role_student'), icon: '🎓', desc: 'Học tập & làm bài' },
    { value: 'INSTRUCTOR', label: t('auth.register.role_instructor'), icon: '👨‍🏫', desc: 'Giảng dạy & quản lý' },
  ]

  return (
    <div className="auth-page">
      {/* Animated background */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
        <div style={{
          position: 'absolute', top: '20%', right: '10%',
          width: '350px', height: '350px', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(0,212,255,0.1) 0%, transparent 70%)',
          animation: 'float 9s ease-in-out infinite'
        }} />
        <div style={{
          position: 'absolute', bottom: '15%', left: '10%',
          width: '400px', height: '400px', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(108,99,255,0.1) 0%, transparent 70%)',
          animation: 'float 11s ease-in-out infinite reverse'
        }} />
      </div>

      <div className="auth-card fade-in" style={{ backdropFilter: 'blur(20px)', background: 'var(--bg-glass)', borderRadius: '24px', maxWidth: '480px' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            width: '64px', height: '64px', margin: '0 auto 1rem',
            background: 'linear-gradient(135deg, var(--accent), var(--primary))',
            borderRadius: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.8rem', boxShadow: '0 8px 24px rgba(0,212,255,0.3)',
            transform: 'rotate(5deg)'
          }}>✨</div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.25rem' }}>{t('auth.register.title')}</h1>
          <p style={{ color: 'var(--text-2)', fontSize: '0.9rem' }}>{t('auth.register.subtitle')}</p>
        </div>

        {error && <div className="alert alert-error" style={{ animation: 'fadeIn 0.3s ease' }}>⚠️ {error}</div>}
        {success && <div className="alert alert-success" style={{ animation: 'fadeIn 0.3s ease' }}>✅ {success}</div>}

        <form onSubmit={submit}>
          <div className="form-group">
            <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600 }}>{t('auth.register.full_name')}</label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', fontSize: '1rem', opacity: 0.5 }}>👤</span>
              <input className="form-input" placeholder="Nguyễn Văn A" style={{ paddingLeft: '2.75rem' }}
                value={form.full_name} onChange={set('full_name')} required />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600 }}>{t('auth.register.email')}</label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', fontSize: '1rem', opacity: 0.5 }}>📧</span>
              <input className="form-input" type="email" placeholder="your@email.com" style={{ paddingLeft: '2.75rem' }}
                value={form.email} onChange={set('email')} required />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600 }}>{t('auth.register.password')}</label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', fontSize: '1rem', opacity: 0.5 }}>🔒</span>
              <input className="form-input" type="password" placeholder={t('auth.register.password_hint')} style={{ paddingLeft: '2.75rem' }}
                value={form.password} onChange={set('password')} required minLength={6} />
            </div>
          </div>

          {/* Role Selector */}
          <div className="form-group">
            <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600 }}>{t('auth.register.role')}</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              {roleOptions.map(r => (
                <div key={r.value} onClick={() => setForm(f => ({ ...f, role: r.value }))}
                  style={{
                    padding: '1rem', borderRadius: '14px', cursor: 'pointer',
                    border: form.role === r.value ? '2px solid var(--primary)' : '1px solid var(--border)',
                    background: form.role === r.value ? 'rgba(108,99,255,0.1)' : 'var(--glass)',
                    transition: 'all 0.2s ease', textAlign: 'center'
                  }}>
                  <div style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>{r.icon}</div>
                  <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>{r.label}</div>
                </div>
              ))}
            </div>
          </div>

          <button className="btn btn-primary btn-lg" style={{ width: '100%', justifyContent: 'center', fontWeight: 700, marginTop: '0.5rem' }}
            disabled={loading}>
            {loading ? `⏳ ${t('auth.register.processing')}` : `✨ ${t('auth.register.submit')}`}
          </button>
        </form>

        <p className="auth-footer" style={{ marginTop: '2rem' }}>
          {t('auth.register.has_account')} <Link to="/login" style={{ fontWeight: 700 }}>{t('auth.register.login_link')} →</Link>
        </p>
      </div>
    </div>
  )
}
