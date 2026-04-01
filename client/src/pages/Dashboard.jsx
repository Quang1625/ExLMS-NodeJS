import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Layout from '../components/Layout'
import { useAuth } from '../context/AuthContext'
import api from '../api/axios'

export default function Dashboard() {
  const { t, i18n } = useTranslation()
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
        courses: Array.isArray(coursesArr) ? coursesArr.length : 0,
        groups: Array.isArray(groupsArr) ? groupsArr.length : 0,
        assignments: Array.isArray(assignmentsArr) ? assignmentsArr.length : 0,
        notifications: Array.isArray(notifsArr) ? notifsArr.length : 0
      })
      setRecentCourses(Array.isArray(coursesArr) ? coursesArr : [])
      setRecentNotifs(Array.isArray(notifsArr) ? notifsArr : [])
    }).catch(console.error).finally(() => setLoading(false))
  }, [user])

  const statCards = [
    { icon: '📚', label: t('dashboard.stats.courses'), value: stats.courses, color: '#6c63ff', bg: 'rgba(108,99,255,0.1)' },
    { icon: '👥', label: t('dashboard.stats.groups'), value: stats.groups, color: '#00d4ff', bg: 'rgba(0,212,255,0.1)' },
    { icon: '📝', label: t('dashboard.stats.assignments'), value: stats.assignments, color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
    { icon: '🔔', label: t('dashboard.stats.notifications'), value: stats.notifications, color: '#22c55e', bg: 'rgba(34,197,94,0.1)' },
  ]

  const statusColor = { PUBLISHED: 'tag--success', DRAFT: 'tag--warning', ENDED: 'tag--danger', ARCHIVED: '' }

  const formattedDate = new Intl.DateTimeFormat(i18n.language === 'en' ? 'en-US' : 'vi-VN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(new Date())

  const timeGreeting = () => {
    const h = new Date().getHours()
    if (h < 12) return '🌅'
    if (h < 18) return '☀️'
    return '🌙'
  }

  return (
    <Layout>
      <div className="page fade-in">
        {/* Hero Header */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(108,99,255,0.12), rgba(0,212,255,0.06))',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius)',
          padding: '2rem 2.5rem',
          marginBottom: '2rem',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{
            position: 'absolute', top: '-50%', right: '-10%',
            width: '300px', height: '300px',
            background: 'radial-gradient(circle, rgba(108,99,255,0.08) 0%, transparent 70%)',
            borderRadius: '50%', pointerEvents: 'none'
          }} />
          <h1 style={{ fontSize: '1.85rem', fontWeight: 800, marginBottom: '0.5rem' }}>
            {timeGreeting()} {t('dashboard.greeting', { name: user?.full_name?.split(' ').pop() })}
          </h1>
          <p style={{ color: 'var(--text-2)', fontSize: '0.95rem' }}>
            {t(`sidebar.roles.${user?.role}`)} · {t('dashboard.today', { date: formattedDate })}
          </p>
        </div>

        {/* Stat Cards */}
        <div className="stat-grid">
          {statCards.map((s, i) => (
            <div className="stat-card" key={s.label} style={{ animationDelay: `${i * 0.1}s` }}>
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
            <div className="section-header" style={{ position: 'sticky', top: 0, background: 'var(--bg-2)', zIndex: 1, paddingBottom: '0.75rem', margin: '-1.5rem -1.5rem 1rem -1.5rem', padding: '1.5rem 1.5rem 0.75rem' }}>
              <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span></span> {t('dashboard.recent_courses')}
              </h2>
              <button className="btn btn-secondary btn-sm" onClick={() => navigate('/courses')}>{t('common.manage')}</button>
            </div>
            {loading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {[1, 2, 3].map(i => <div key={i} className="skeleton skeleton-card" style={{ height: '60px' }} />)}
              </div>
            ) : recentCourses.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state__icon">📭</div>
                <h3>{t('dashboard.no_courses')}</h3>
              </div>
            ) : recentCourses.map(c => (
              <div key={c._id} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.85rem 0', borderBottom: '1px solid var(--border)', cursor: 'pointer', transition: 'all 0.2s ease' }}
                onClick={() => navigate(`/courses/${c._id}`)}
                onMouseEnter={e => e.currentTarget.style.paddingLeft = '0.5rem'}
                onMouseLeave={e => e.currentTarget.style.paddingLeft = '0'}
              >
                <div style={{ fontSize: '1.5rem', width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(108,99,255,0.1)', borderRadius: '10px', flexShrink: 0 }}>📋</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.title}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>{c.group_id?.name || t('courses.group')}</div>
                </div>
                <span className={`tag ${statusColor[c.status] || ''}`}>{t(`status.${c.status}`) || c.status}</span>
              </div>
            ))}
          </div>

          {/* Recent Notifications */}
          <div className="card" style={{ maxHeight: '600px', overflowY: 'auto' }}>
            <div className="section-header" style={{ position: 'sticky', top: 0, background: 'var(--bg-2)', zIndex: 1, paddingBottom: '0.75rem', margin: '-1.5rem -1.5rem 1rem -1.5rem', padding: '1.5rem 1.5rem 0.75rem' }}>
              <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span></span> {t('dashboard.recent_notifications')}
              </h2>
              <button className="btn btn-secondary btn-sm" onClick={() => navigate('/notifications')}>{t('dashboard.view_all_notifs')}</button>
            </div>
            {loading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {[1, 2, 3].map(i => <div key={i} className="skeleton skeleton-card" style={{ height: '60px' }} />)}
              </div>
            ) : recentNotifs.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state__icon">🎉</div>
                <h3>{t('dashboard.no_notifications')}</h3>
              </div>
            ) : recentNotifs.map(n => (
              <div key={n._id} className="notif-item notif-item--unread">
                <div className="notif-dot" />
                <div className="notif-content">
                  <div className="notif-title">{n.title}</div>
                  <div className="notif-body">{n.body}</div>
                  <div className="notif-time">{new Date(n.created_at).toLocaleDateString(i18n.language === 'en' ? 'en-US' : 'vi-VN')}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  )
}
