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

  const deleteAllRead = async () => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa tất cả thông báo đã đọc không?')) return
    try {
      await api.delete('/notifications/read')
      setNotifications(prev => prev.filter(n => !n.is_read))
    } catch (err) {
      console.error('Error deleting read notifications:', err)
    }
  }

  const deleteOne = async (e, id) => {
    e.stopPropagation()
    if (!window.confirm('Bạn có chắc chắn muốn xóa thông báo này không?')) return
    try {
      await api.delete(`/notifications/${id}`)
      setNotifications(prev => prev.filter(n => n._id !== id))
    } catch (err) {
      console.error('Error deleting notification:', err)
    }
  }

  const unreadCount = notifications?.filter(n => !n.is_read).length || 0
  const hasRead = notifications?.some(n => n.is_read)
  const filtered = filter === 'unread' ? notifications?.filter(n => !n.is_read) : notifications
  const locale = i18n.language === 'en' ? 'en-US' : 'vi-VN'

  const getTimeAgo = (date) => {
    const diff = Date.now() - new Date(date).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return t('notifications.just_now') || 'Vừa xong'
    if (mins < 60) return `${mins}m`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h`
    const days = Math.floor(hrs / 24)
    return `${days}d`
  }

  const getNotifIcon = (n) => {
    if (n.type === 'assignment') return '📝'
    if (n.type === 'quiz') return '⚡'
    if (n.type === 'forum') return '💬'
    if (n.type === 'course') return '📚'
    return n.is_read ? '📨' : '📬'
  }

  return (
    <Layout>
      <div className="page fade-in">
        {/* 2026 Page Header */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
          marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem'
        }}>
          <div>
            <h1 style={{ fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.03em', marginBottom: '0.35rem' }}>
              {t('notifications.title')}
            </h1>
            <p style={{ color: 'var(--text-2)', margin: 0 }}>
              {unreadCount > 0
                ? t('notifications.unread_count', { count: unreadCount })
                : t('notifications.all_read')}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            {hasRead && (
              <button className="btn btn-danger btn-sm" onClick={deleteAllRead} aria-label="Delete all read notifications" style={{ background: 'rgba(239,68,68,0.1)', color: 'var(--danger)', border: 'none' }}>
                🗑️ Xóa thông báo đã đọc
              </button>
            )}
            {unreadCount > 0 && (
              <button className="btn btn-primary btn-sm" onClick={markAll} aria-label="Mark all as read">
                ✓ {t('notifications.mark_all')}
              </button>
            )}
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="tab-nav" style={{ marginBottom: '1.5rem' }} role="tablist">
          <button
            className={`tab-nav__btn ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
            role="tab" aria-selected={filter === 'all'}
          >
            {t('notifications.tabs.all')}
            <span style={{ marginLeft: '0.4rem', padding: '1px 7px', background: 'var(--glass)', borderRadius: '99px', fontSize: '0.7rem' }}>
              {notifications.length}
            </span>
          </button>
          <button
            className={`tab-nav__btn ${filter === 'unread' ? 'active' : ''}`}
            onClick={() => setFilter('unread')}
            role="tab" aria-selected={filter === 'unread'}
          >
            {t('notifications.tabs.unread')}
            {unreadCount > 0 && (
              <span style={{ marginLeft: '0.4rem', padding: '1px 7px', background: 'var(--primary-dim)', color: 'var(--primary-2)', borderRadius: '99px', fontSize: '0.7rem', fontWeight: 700 }}>
                {unreadCount}
              </span>
            )}
          </button>
        </div>

        {/* Notification List */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {[1, 2, 3, 4].map(i => (
                <div key={i} style={{ display: 'flex', gap: '1rem', padding: '1.1rem 1.5rem', borderBottom: '1px solid var(--border)', alignItems: 'center' }}>
                  <div className="skeleton" style={{ width: 42, height: 42, borderRadius: '12px', flexShrink: 0 }} />
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <div className="skeleton skeleton-text" style={{ width: '60%' }} />
                    <div className="skeleton skeleton-text" style={{ width: '80%' }} />
                    <div className="skeleton skeleton-text" style={{ width: '25%' }} />
                  </div>
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state__icon">🎉</div>
              <h3>{t('notifications.empty')}</h3>
              <p>{t('notifications.empty_desc') || 'Không có thông báo nào!'}</p>
            </div>
          ) : (
            <div className="stagger-children">
              {filtered.map((n, i) => (
                <div
                  key={n._id}
                  className={`notif-item ${!n.is_read ? 'notif-item--unread' : ''}`}
                  onClick={() => !n.is_read && markOne(n._id)}
                  role="listitem"
                  aria-label={n.title}
                >
                  <div style={{
                    width: 44, height: 44, borderRadius: '12px',
                    background: n.is_read ? 'var(--glass)' : 'var(--primary-dim)',
                    border: '1px solid ' + (n.is_read ? 'var(--border)' : 'rgba(108,99,255,0.2)'),
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '1.25rem', flexShrink: 0
                  }} aria-hidden="true">
                    {getNotifIcon(n)}
                  </div>
                  <div className="notif-content">
                    <div className="notif-title" style={{ opacity: n.is_read ? 0.55 : 1 }}>{n.title}</div>
                    <div className="notif-body">{n.body}</div>
                    <div className="notif-time">
                      <span>{getTimeAgo(n.created_at)}</span>
                      <span style={{ margin: '0 0.3rem' }}>·</span>
                      <span>{new Date(n.created_at).toLocaleDateString(locale)}</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {!n.is_read && <div className="notif-dot" aria-label="Unread" />}
                    <button 
                      className="btn-delete-notif" 
                      onClick={(e) => deleteOne(e, n._id)} 
                      style={{
                        background: 'transparent', border: 'none', color: 'var(--text-3)', 
                        cursor: 'pointer', padding: '4px 8px', borderRadius: '4px',
                        fontSize: '0.9rem', transition: 'all 0.2s'
                      }}
                      onMouseEnter={e => e.currentTarget.style.color = 'var(--danger)'}
                      onMouseLeave={e => e.currentTarget.style.color = 'var(--text-3)'}
                      title="Xóa thông báo này"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  )
}
