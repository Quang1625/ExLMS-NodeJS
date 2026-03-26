import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import { useAuth } from '../context/AuthContext'
import api from '../api/axios'

const ROLE_GREET = { ADMIN: 'Quản trị viên', INSTRUCTOR: 'Giảng viên', STUDENT: 'Sinh viên' }

export default function Dashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [stats, setStats] = useState({ courses: 0, groups: 0, assignments: 0, notifications: 0 })
  const [recentCourses, setRecentCourses] = useState([])
  const [recentNotifs, setRecentNotifs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.get('/courses'),
      api.get('/study-groups'),
      api.get('/assignments'),
      api.get(`/notifications?recipient_id=${user?._id}&is_read=false`)
    ]).then(([courses, groups, assignments, notifs]) => {
      const coursesArr = courses.data.data ?? courses.data
      const groupsArr = groups.data.data ?? groups.data
      const assignmentsArr = assignments.data.data ?? assignments.data
      const notifsArr = notifs.data.data ?? notifs.data

      setStats({
        courses: coursesArr.length,
        groups: groupsArr.length,
        assignments: assignmentsArr.length,
        notifications: notifsArr.length
      })
      setRecentCourses(coursesArr)
      setRecentNotifs(notifsArr)
    }).catch(console.error).finally(() => setLoading(false))
  }, [user])

  const statCards = [
    { icon: '📚', label: 'Khóa học', value: stats.courses, color: '#6c63ff', bg: 'rgba(108,99,255,0.1)' },
    { icon: '👥', label: 'Nhóm học', value: stats.groups,  color: '#00d4ff', bg: 'rgba(0,212,255,0.1)' },
    { icon: '📝', label: 'Bài tập',  value: stats.assignments, color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
    { icon: '🔔', label: 'Thông báo chưa đọc', value: stats.notifications, color: '#22c55e', bg: 'rgba(34,197,94,0.1)' },
  ]

  const statusColor = { PUBLISHED: 'tag--success', DRAFT: 'tag--warning', ENDED: 'tag--danger', ARCHIVED: '' }
  const statusLabel = { PUBLISHED: 'Đang mở', DRAFT: 'Nháp', ENDED: 'Kết thúc', ARCHIVED: 'Lưu trữ' }

  return (
    <Layout>
      <div className="page-header">
        <h1>Xin chào, {user?.full_name?.split(' ').pop()} 👋</h1>
        <p>{ROLE_GREET[user?.role]} · Hôm nay là {new Date().toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
      </div>

      {/* Stat Cards */}
      <div className="stat-grid">
        {statCards.map(s => (
          <div className="stat-card" key={s.label}>
            <div className="stat-card__icon" style={{ background: s.bg, color: s.color }}>
              {s.icon}
            </div>
            <div>
              <div className="stat-card__value" style={{ color: s.color }}>{s.value}</div>
              <div className="stat-card__label">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid-2" style={{ gap: '1.5rem' }}>
        {/* Recent Courses */}
        <div className="card" style={{ maxHeight: '600px', overflowY: 'auto' }}>
          <div className="section-header" style={{ position: 'sticky', top: 0, background: 'var(--bg)', zIndex: 1, paddingBottom: '0.5rem', margin: '-1rem -1rem 1rem -1rem', padding: '1rem' }}>
            <h2 style={{ margin: 0 }}>📚 Tất cả khóa học</h2>
            <button className="btn btn-secondary btn-sm" onClick={() => navigate('/courses')}>Quản lý</button>
          </div>
          {loading ? <div className="spinner-wrap"><div className="spinner" /></div>
          : recentCourses.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state__icon">📭</div>
              <h3>Chưa có khóa học nào</h3>
            </div>
          ) : recentCourses.map(c => (
            <div key={c._id} style={{ display:'flex', alignItems:'center', gap:'1rem', padding:'0.75rem 0', borderBottom:'1px solid var(--border)', cursor:'pointer' }}
              onClick={() => navigate(`/courses/${c._id}`)}>
              <div style={{ fontSize:'1.5rem', width:40, textAlign:'center' }}>📋</div>
              <div style={{ flex:1 }}>
                <div style={{ fontWeight:600, fontSize:'0.9rem' }}>{c.title}</div>
                <div style={{ fontSize:'0.75rem', color:'var(--text-3)' }}>{c.group_id?.name || 'Nhóm'}</div>
              </div>
              <span className={`tag ${statusColor[c.status] || ''}`}>{statusLabel[c.status] || c.status}</span>
            </div>
          ))}
        </div>

        {/* Recent Notifications */}
        <div className="card" style={{ maxHeight: '600px', overflowY: 'auto' }}>
          <div className="section-header" style={{ position: 'sticky', top: 0, background: 'var(--bg)', zIndex: 1, paddingBottom: '0.5rem', margin: '-1rem -1rem 1rem -1rem', padding: '1rem' }}>
            <h2 style={{ margin: 0 }}>🔔 Tất cả thông báo</h2>
            <button className="btn btn-secondary btn-sm" onClick={() => navigate('/notifications')}>Trang thông báo</button>
          </div>
          {loading ? <div className="spinner-wrap"><div className="spinner" /></div>
          : recentNotifs.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state__icon">🎉</div>
              <h3>Không có thông báo mới</h3>
            </div>
          ) : recentNotifs.map(n => (
            <div key={n._id} className="notif-item notif-item--unread">
              <div className="notif-dot" />
              <div className="notif-content">
                <div className="notif-title">{n.title}</div>
                <div className="notif-body">{n.body}</div>
                <div className="notif-time">{new Date(n.created_at).toLocaleDateString('vi-VN')}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  )
}
