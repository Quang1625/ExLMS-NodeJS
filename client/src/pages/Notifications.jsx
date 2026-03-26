import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import { useAuth } from '../context/AuthContext'
import api from '../api/axios'

const TYPE_ICON = {
  JOIN_REQUEST:'🔔', JOIN_APPROVED:'✅', JOIN_REJECTED:'❌',
  NEW_ASSIGNMENT:'📝', ASSIGNMENT_DUE_SOON:'⏰', ASSIGNMENT_GRADED:'🏆',
  NEW_MEETING:'📅', MEETING_STARTING_SOON:'🔔',
  NEW_COURSE:'📚', FORUM_REPLY:'💬', MENTION:'@', CONTENT_REPORTED:'⚠️', SYSTEM:'ℹ️'
}

export default function Notifications() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [notifications, setNotifications] = useState([])
  const [filter, setFilter] = useState('all')
  const [loading, setLoading] = useState(true)

  const load = () => {
    if (!user?._id) return
    const url = filter === 'unread'
      ? `/notifications?recipient_id=${user._id}&is_read=false`
      : `/notifications?recipient_id=${user._id}`
    api.get(url)
      .then(r => {
          const fetchedData = r.data.data || r.data;
          setNotifications(Array.isArray(fetchedData) ? fetchedData : []);
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [filter, user])

  const markRead = async (id) => {
    await api.put(`/notifications/${id}/read`)
    setNotifications(prev => prev.map(n => n._id === id ? { ...n, is_read: true } : n))
  }

  const markAll = async () => {
    await api.put('/notifications/read-all')
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
  }

  const unreadCount = notifications.filter(n => !n.is_read).length

  const handleNotificationClick = async (n) => {
    if (!n.is_read) await markRead(n._id);
    if (n.action_url) navigate(n.action_url);
  }

  return (
    <Layout>
      <div className="page-header">
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div>
            <h1>Thông báo 🔔</h1>
            <p>{unreadCount > 0 ? `${unreadCount} thông báo chưa đọc` : 'Tất cả đã đọc'}</p>
          </div>
          {unreadCount > 0 && (
            <button className="btn btn-secondary btn-sm" onClick={markAll}>✓ Đánh dấu tất cả đã đọc</button>
          )}
        </div>
      </div>

      {/* Filter */}
      <div style={{ display:'flex', gap:'0.5rem', marginBottom:'1.5rem' }}>
        {[['all','Tất cả'],['unread','Chưa đọc']].map(([val, label]) => (
          <button key={val}
            className={`btn btn-sm ${filter === val ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setFilter(val)}>{label}</button>
        ))}
      </div>

      <div className="card" style={{ padding:0, overflow:'hidden' }}>
        {loading ? <div className="spinner-wrap"><div className="spinner" /></div>
        : notifications.length === 0 ? (
          <div className="empty-state" style={{ padding:'3rem' }}>
            <div className="empty-state__icon">🎉</div>
            <h3>Không có thông báo</h3>
          </div>
        ) : notifications.map(n => (
          <div key={n._id}
            className={`notif-item ${!n.is_read ? 'notif-item--unread' : ''}`}
            onClick={() => handleNotificationClick(n)}
            style={{ cursor: 'pointer' }}>
            <div style={{ fontSize:'1.25rem', flexShrink:0, marginTop:2 }}>{TYPE_ICON[n.type] || '🔔'}</div>
            <div className="notif-content">
              <div className="notif-title">{n.title}</div>
              {n.body && <div className="notif-body">{n.body}</div>}
              <div className="notif-time">{new Date(n.created_at).toLocaleString('vi-VN')}</div>
            </div>
            {!n.is_read && <div className="notif-dot" style={{ flexShrink:0 }} />}
          </div>
        ))}
      </div>
    </Layout>
  )
}
