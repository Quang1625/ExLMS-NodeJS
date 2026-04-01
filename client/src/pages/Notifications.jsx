import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import Layout from '../components/Layout'
import api from '../api/axios'

export default function Notifications() {
  const { t, i18n } = useTranslation()
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const { data } = await api.get('/notifications')
        const list = Array.isArray(data) ? data : (data?.data || [])
        setNotifications(list)
      } catch (err) {
        console.error('Error fetching notifications:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchNotifications()
  }, [])

  const markAll = async () => {
    try {
      await api.put('/notifications/read-all')
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
    } catch (err) {
      console.error('Error marking all as read:', err)
    }
  }

  const markOne = async (id) => {
    try {
      await api.put(`/notifications/${id}/read`)
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, is_read: true } : n))
    } catch (err) {
      console.error('Error marking notification as read:', err)
    }
  }

  const unreadCount = notifications?.filter(n => !n.is_read).length || 0
  const filtered = filter === 'unread' ? (notifications?.filter(n => !n.is_read) || []) : (notifications || [])
  const locale = i18n.language === 'en' ? 'en-US' : 'vi-VN'

  if (loading) return <Layout><div className="spinner-wrap"><div className="spinner" /></div></Layout>

  const getTimeAgo = (date) => {
    const diff = Date.now() - new Date(date).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 60) return `${mins}m`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h`
    const days = Math.floor(hrs / 24)
    return `${days}d`
  }

  return (
    <Layout>
      <div className="page fade-in">
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ fontSize: '1.85rem', fontWeight: 800, marginBottom: '0.25rem' }}>{t('notifications.title')}</h1>
            <p style={{ color: 'var(--text-2)' }}>
              {unreadCount > 0 ? t('notifications.unread_count', { count: unreadCount }) : t('notifications.all_read')}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            {unreadCount > 0 && (
              <button className="btn btn-primary btn-sm" onClick={markAll}>
                ✓ {t('notifications.mark_all')}
              </button>
            )}
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="tab-nav" style={{ marginBottom: '1.5rem' }}>
          <button className={`tab-nav__btn ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>
            {t('notifications.tabs.all')} ({notifications.length})
          </button>
          <button className={`tab-nav__btn ${filter === 'unread' ? 'active' : ''}`} onClick={() => setFilter('unread')}>
            {t('notifications.tabs.unread')} ({unreadCount})
          </button>
        </div>

        {/* Notification List */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {filtered.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state__icon">🎉</div>
              <h3>{t('notifications.empty')}</h3>
            </div>
          ) : filtered.map((n, i) => (
            <div 
              key={n._id} 
              className={`notif-item ${!n.is_read ? 'notif-item--unread' : ''}`}
              onClick={() => !n.is_read && markOne(n._id)}
              style={{ animationDelay: `${i * 0.05}s`, animation: 'fadeIn 0.3s ease forwards' }}
            >
              <div style={{ 
                width: 42, height: 42, borderRadius: '12px', 
                background: n.is_read ? 'var(--glass)' : 'rgba(108,99,255,0.12)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1.2rem', flexShrink: 0
              }}>
                {n.is_read ? '📨' : '📬'}
              </div>
              <div className="notif-content">
                <div className="notif-title" style={{ opacity: n.is_read ? 0.6 : 1 }}>{n.title}</div>
                <div className="notif-body">{n.body}</div>
                <div className="notif-time">
                  {getTimeAgo(n.created_at)} · {new Date(n.created_at).toLocaleDateString(locale)}
                </div>
              </div>
              {!n.is_read && <div className="notif-dot" />}
            </div>
          ))}
        </div>
      </div>
    </Layout>
  )
}
