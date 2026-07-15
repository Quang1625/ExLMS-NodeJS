import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import Layout from '../components/Layout'
import { useAuth } from '../context/AuthContext'
import api from '../api/axios'
import { Camera, Save, RotateCcw, Shield, Mail, User, FileText } from 'lucide-react'

export default function Profile() {
  const { t, i18n } = useTranslation()
  const { user, updateUserInfo } = useAuth()
  const [formData, setFormData] = useState({ full_name: '', bio: '', avatar_url: '' })
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })
  const [focusField, setFocusField] = useState(null)

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const { data } = await api.get(`/users/${user._id}`)
        updateUserInfo(data)
      } catch (err) {
        console.error('Failed to fetch profile:', err)
      }
    }
    if (user?._id) {
      fetchProfile()
    }
  }, [user?._id])

  useEffect(() => {
    if (user) setFormData({ full_name: user.full_name || '', bio: user.bio || '', avatar_url: user.avatar_url || '' })
  }, [user])

  const handleAvatarChange = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    
    const uploadData = new FormData()
    uploadData.append('avatar', file)
    
    setLoading(true)
    setMessage({ type: '', text: '' })
    try {
      const { data } = await api.post(`/users/${user._id}/avatar`, uploadData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      updateUserInfo(data.user)
      setMessage({ type: 'success', text: 'Cập nhật ảnh đại diện thành công!' })
      setTimeout(() => setMessage({ type: '', text: '' }), 4000)
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Không thể tải ảnh đại diện lên' })
    } finally {
      setLoading(false)
    }
  }

  const triggerAvatarUpload = () => {
    document.getElementById('avatar-upload-input')?.click()
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true); setMessage({ type: '', text: '' })
    try {
      const { data } = await api.put(`/users/${user._id}`, formData)
      updateUserInfo(data)
      setMessage({ type: 'success', text: t('profile.update_success') })
      setTimeout(() => setMessage({ type: '', text: '' }), 4000)
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.error || t('common.error_fail') })
    } finally { setLoading(false) }
  }

  const initials = user?.full_name?.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase() || '?'
  const locale = i18n.language === 'en' ? 'en-US' : 'vi-VN'

  const roleConfig = {
    ADMIN:      { bg: 'rgba(239,68,68,0.12)',  color: '#f87171',  icon: '⚡', label: 'Administrator', gradient: 'linear-gradient(135deg,#ef4444,#f87171)' },
    INSTRUCTOR: { bg: 'rgba(108,99,255,0.12)', color: '#9d98ff',  icon: '👨‍🏫', label: 'Instructor', gradient: 'linear-gradient(135deg,#6c63ff,#9d98ff)' },
    STUDENT:    { bg: 'rgba(34,197,94,0.12)',  color: '#4ade80',  icon: '🎓', label: 'Student', gradient: 'linear-gradient(135deg,#22c55e,#4ade80)' },
  }
  const role = roleConfig[user?.role] || roleConfig.STUDENT

  const stats = [
    { label: t('profile.joined_since'), value: user?.created_at ? new Date(user.created_at).toLocaleDateString(locale, { month: 'short', year: 'numeric' }) : '—', icon: '📅' },
    { label: 'Vai trò', value: role.label, icon: role.icon },
  ]

  return (
    <Layout>
      <div className="page fade-in" style={{ maxWidth: 900 }}>

        {/* ── Profile Hero ── */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(108,99,255,0.16) 0%, rgba(0,212,255,0.07) 100%)',
          border: '1px solid rgba(255,255,255,0.09)',
          borderRadius: '24px',
          padding: '2.5rem 3rem',
          marginBottom: '2rem',
          position: 'relative', overflow: 'hidden',
          display: 'flex', alignItems: 'center', gap: '2.5rem', flexWrap: 'wrap'
        }}>
          {/* Background orbs */}
          <div style={{
            position: 'absolute', top: '-70px', right: '-50px', width: '280px', height: '280px',
            borderRadius: '50%', background: 'radial-gradient(circle, rgba(108,99,255,0.18) 0%, transparent 70%)',
            pointerEvents: 'none'
          }} />
          <div style={{
            position: 'absolute', bottom: '-50px', left: '35%', width: '220px', height: '220px',
            borderRadius: '50%', background: 'radial-gradient(circle, rgba(0,212,255,0.1) 0%, transparent 70%)',
            pointerEvents: 'none'
          }} />

          {/* Avatar */}
          <div
            style={{ position: 'relative', flexShrink: 0, cursor: 'pointer' }}
            onClick={triggerAvatarUpload}
          >
            <input
              type="file"
              id="avatar-upload-input"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleAvatarChange}
            />
            <div
              style={{
                width: '100px', height: '100px', borderRadius: '28px',
                background: user?.avatar_key ? 'none' : 'linear-gradient(135deg, var(--primary), var(--accent))',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '2.5rem', fontWeight: 800, color: '#fff',
                boxShadow: '0 12px 32px rgba(108,99,255,0.45)',
                transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                overflow: 'hidden'
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.06)'; e.currentTarget.style.boxShadow = '0 16px 40px rgba(108,99,255,0.55)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 12px 32px rgba(108,99,255,0.45)'; }}
              title="Nhấn để đổi ảnh đại diện"
            >
              {user?.avatar_key ? (
                <img
                  src={user.avatar_key}
                  alt={user.full_name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                initials
              )}
            </div>
            {/* Camera overlay hint */}
            <div style={{
              position: 'absolute', bottom: -6, right: -6,
              width: 30, height: 30, borderRadius: '50%',
              background: 'var(--bg-2)', border: '2px solid var(--border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
            }}>
              <Camera size={14} style={{ color: 'var(--text-3)' }} />
            </div>
          </div>

          {/* User Info */}
          <div style={{ flex: 1, minWidth: '200px', position: 'relative' }}>
            <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '0.2rem', letterSpacing: '-0.03em' }}>
              {user?.full_name}
            </h1>
            <p style={{ color: 'var(--text-2)', fontSize: '0.875rem', margin: '0.25rem 0 1rem', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Mail size={13} style={{ color: 'var(--text-3)' }} />
              {user?.email}
            </p>
            <div style={{ display: 'flex', gap: '0.625rem', flexWrap: 'wrap' }}>
              {/* Role Badge */}
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                padding: '5px 14px', borderRadius: '99px', fontSize: '0.78rem', fontWeight: 700,
                background: role.bg, color: role.color,
                border: `1px solid ${role.color}35`
              }}>
                <span aria-hidden="true">{role.icon}</span>
                {t(`profile.roles.${user?.role}`) || role.label}
              </span>
              {/* Active Indicator */}
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                padding: '5px 14px', borderRadius: '99px', fontSize: '0.78rem', fontWeight: 600,
                background: 'rgba(34,197,94,0.1)', color: 'var(--success)',
                border: '1px solid rgba(34,197,94,0.25)'
              }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--success)', display: 'inline-block', animation: 'pulse-glow 2s infinite' }} aria-hidden="true" />
                {t('profile.active')}
              </span>
            </div>
          </div>

          {/* Stats */}
          <div style={{ display: 'flex', gap: '0.75rem', flexShrink: 0, flexWrap: 'wrap', position: 'relative' }}>
            {stats.map((s, i) => (
              <div key={i} style={{
                textAlign: 'center', padding: '0.875rem 1.25rem',
                background: 'rgba(0,0,0,0.2)', backdropFilter: 'blur(8px)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '16px', minWidth: '95px'
              }}>
                <div style={{ fontSize: '1.25rem', marginBottom: '0.25rem' }}>{s.icon}</div>
                <div style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--text)' }}>{s.value}</div>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginTop: '0.2rem' }}>
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Edit Form Card ── */}
        <div className="card" style={{ maxWidth: '680px' }}>
          {/* Card Header */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '0.875rem',
            marginBottom: '1.75rem', paddingBottom: '1.25rem',
            borderBottom: '1px solid var(--border)'
          }}>
            <div style={{
              width: 44, height: 44, borderRadius: '13px',
              background: 'var(--primary-dim)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0
            }}>
              <User size={20} style={{ color: 'var(--primary-2)' }} />
            </div>
            <div>
              <h3 style={{ fontWeight: 700, margin: 0, fontSize: '1.05rem' }}>{t('profile.edit_profile')}</h3>
              <p style={{ color: 'var(--text-3)', fontSize: '0.8rem', margin: 0 }}>Cập nhật thông tin cá nhân của bạn</p>
            </div>
          </div>

          {/* Alert */}
          {message.text && (
            <div className={`alert alert-${message.type === 'success' ? 'success' : 'error'}`} role="alert">
              <span aria-hidden="true">{message.type === 'success' ? '✅' : '⚠️'}</span> {message.text}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            {/* Full Name */}
            <div className="form-group">
              <label className="form-label" htmlFor="profile-name">
                {t('profile.full_name')} <span style={{ color: 'var(--danger)' }}>*</span>
              </label>
              <div style={{ position: 'relative' }}>
                <User size={15} style={{
                  position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)',
                  color: focusField === 'name' ? 'var(--primary-2)' : 'var(--text-3)',
                  transition: 'color 0.2s ease', pointerEvents: 'none'
                }} />
                <input
                  id="profile-name"
                  type="text"
                  className="form-input"
                  style={{ paddingLeft: '2.5rem' }}
                  value={formData.full_name}
                  onChange={e => setFormData({ ...formData, full_name: e.target.value })}
                  onFocus={() => setFocusField('name')}
                  onBlur={() => setFocusField(null)}
                  required
                  autoComplete="name"
                  placeholder="Tên đầy đủ của bạn"
                />
              </div>
            </div>

            {/* Email (readonly) */}
            <div className="form-group">
              <label className="form-label" htmlFor="profile-email">Email</label>
              <div style={{ position: 'relative' }}>
                <Mail size={15} style={{
                  position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)',
                  color: 'var(--text-3)', pointerEvents: 'none'
                }} />
                <input
                  id="profile-email"
                  type="email"
                  className="form-input"
                  style={{ paddingLeft: '2.5rem', opacity: 0.5, cursor: 'not-allowed' }}
                  value={user?.email || ''}
                  disabled
                  aria-readonly="true"
                />
              </div>
              <span className="form-hint" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Shield size={11} style={{ color: 'var(--text-3)' }} />
                {t('profile.email_readonly') || 'Email không thể thay đổi'}
              </span>
            </div>

            {/* Bio */}
            <div className="form-group">
              <label className="form-label" htmlFor="profile-bio">
                {t('profile.bio')}
              </label>
              <div style={{ position: 'relative' }}>
                <FileText size={15} style={{
                  position: 'absolute', left: '0.875rem', top: '0.9rem',
                  color: focusField === 'bio' ? 'var(--primary-2)' : 'var(--text-3)',
                  transition: 'color 0.2s ease', pointerEvents: 'none'
                }} />
                <textarea
                  id="profile-bio"
                  className="form-input"
                  rows="4"
                  style={{ paddingLeft: '2.5rem', resize: 'vertical', minHeight: '110px' }}
                  value={formData.bio}
                  onChange={e => setFormData({ ...formData, bio: e.target.value })}
                  onFocus={() => setFocusField('bio')}
                  onBlur={() => setFocusField(null)}
                  placeholder={t('profile.bio_placeholder')}
                />
              </div>
              <span className="form-hint">{(formData.bio || '').length} / 300 ký tự</span>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '0.875rem', marginTop: '1.75rem' }}>
              <button
                type="submit"
                className="btn btn-primary btn-lg"
                disabled={loading}
                aria-busy={loading}
                style={{ gap: '0.5rem' }}
              >
                {loading
                  ? <><div className="spinner spinner-sm" />{t('profile.saving')}</>
                  : <><Save size={16} strokeWidth={2} />{t('profile.save_changes')}</>
                }
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-lg"
                onClick={() => setFormData({ full_name: user.full_name, bio: user.bio || '', avatar_url: user.avatar_url || '' })}
                style={{ gap: '0.5rem' }}
              >
                <RotateCcw size={15} strokeWidth={2} />
                {t('profile.cancel')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Layout>
  )
}
