import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import Layout from '../components/Layout'
import { useAuth } from '../context/AuthContext'
import api from '../api/axios'

export default function Profile() {
  const { t, i18n } = useTranslation()
  const { user, updateUserInfo } = useAuth()
  const [formData, setFormData] = useState({ full_name: '', bio: '', avatar_url: '' })
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })

  useEffect(() => {
    if (user) setFormData({ full_name: user.full_name || '', bio: user.bio || '', avatar_url: user.avatar_url || '' })
  }, [user])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true); setMessage({ type: '', text: '' })
    try {
      const { data } = await api.put(`/users/${user._id}`, formData)
      updateUserInfo(data)
      setMessage({ type: 'success', text: t('profile.update_success') })
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.error || t('common.error_fail') })
    } finally { setLoading(false) }
  }

  const initials = user?.full_name?.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase() || '?'
  const locale = i18n.language === 'en' ? 'en-US' : 'vi-VN'

  const roleColors = {
    ADMIN: { bg: 'rgba(239,68,68,0.12)', color: '#ef4444', icon: '⚡' },
    INSTRUCTOR: { bg: 'rgba(108,99,255,0.12)', color: '#8b85ff', icon: '👨‍🏫' },
    STUDENT: { bg: 'rgba(34,197,94,0.12)', color: '#22c55e', icon: '🎓' },
  }
  const roleStyle = roleColors[user?.role] || roleColors.STUDENT

  return (
    <Layout>
      <div className="page fade-in">
        {/* Header Hero */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(108,99,255,0.15), rgba(0,212,255,0.08))',
          border: '1px solid var(--border)',
          borderRadius: '20px',
          padding: '2.5rem',
          marginBottom: '2rem',
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          gap: '2rem',
          flexWrap: 'wrap'
        }}>
          {/* Background decoration */}
          <div style={{
            position: 'absolute', top: '-40px', right: '-40px',
            width: '200px', height: '200px', borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(108,99,255,0.1) 0%, transparent 70%)',
            pointerEvents: 'none'
          }} />

          {/* Large Avatar */}
          <div style={{
            width: '100px', height: '100px', borderRadius: '24px',
            background: 'linear-gradient(135deg, var(--primary), var(--accent))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '2.5rem', fontWeight: 800, color: '#fff',
            boxShadow: '0 8px 24px rgba(108,99,255,0.3)',
            flexShrink: 0
          }}>
            {initials}
          </div>

          <div style={{ flex: 1, minWidth: '200px' }}>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.3rem' }}>{user?.full_name}</h1>
            <p style={{ color: 'var(--text-2)', fontSize: '0.9rem', marginBottom: '0.75rem' }}>{user?.email}</p>
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                padding: '5px 14px', borderRadius: '99px', fontSize: '0.78rem', fontWeight: 700,
                background: roleStyle.bg, color: roleStyle.color
              }}>
                {roleStyle.icon} {t(`profile.roles.${user?.role}`) || user?.role}
              </span>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                padding: '5px 14px', borderRadius: '99px', fontSize: '0.78rem', fontWeight: 600,
                background: 'rgba(34,197,94,0.1)', color: 'var(--success)'
              }}>
                ● {t('profile.active')}
              </span>
            </div>
          </div>

          {/* Quick stats */}
          <div style={{ display: 'flex', gap: '1rem', flexShrink: 0 }}>
            <div style={{
              textAlign: 'center', padding: '0.75rem 1.25rem',
              background: 'var(--glass)', border: '1px solid var(--border)',
              borderRadius: '14px', minWidth: '80px'
            }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('profile.joined_since')}</div>
              <div style={{ fontWeight: 800, fontSize: '0.9rem', marginTop: '0.25rem' }}>
                {user?.created_at ? new Date(user.created_at).toLocaleDateString(locale, { month: 'short', year: 'numeric' }) : '—'}
              </div>
            </div>
          </div>
        </div>

        {/* Edit Form */}
        <div className="card" style={{ maxWidth: '640px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
            <span style={{ fontSize: '1.3rem' }}>✏️</span>
            <h3 style={{ fontWeight: 700 }}>{t('profile.edit_profile')}</h3>
          </div>
          
          {message.text && (
            <div className={`alert alert-${message.type === 'success' ? 'success' : 'error'}`} style={{ animation: 'fadeIn 0.3s ease' }}>
              {message.type === 'success' ? '✅' : '⚠️'} {message.text}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600 }}>👤 {t('profile.full_name')}</label>
              <input type="text" className="form-input" value={formData.full_name}
                onChange={e => setFormData({ ...formData, full_name: e.target.value })} required />
            </div>

            <div className="form-group">
              <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600 }}>📧 Email</label>
              <input type="email" className="form-input" value={user?.email || ''} disabled
                style={{ opacity: 0.5, cursor: 'not-allowed' }} />
              <span className="form-hint">🔒 Email không thể thay đổi</span>
            </div>

            <div className="form-group">
              <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600 }}>📝 {t('profile.bio')}</label>
              <textarea className="form-input" rows="4" value={formData.bio}
                onChange={e => setFormData({ ...formData, bio: e.target.value })}
                placeholder={t('profile.bio_placeholder')}
                style={{ resize: 'vertical', minHeight: '100px' }} />
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
              <button type="submit" className="btn btn-primary btn-lg" disabled={loading}>
                {loading ? '⏳ ' + t('profile.saving') : '💾 ' + t('profile.save_changes')}
              </button>
              <button type="button" className="btn btn-secondary btn-lg" onClick={() => setFormData({ full_name: user.full_name, bio: user.bio })}>
                {t('profile.cancel')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Layout>
  )
}
