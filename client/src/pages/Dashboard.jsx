import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Layout from '../components/Layout'
import { useAuth } from '../context/AuthContext'
import api from '../api/axios'
import {
  BookOpen, Users, FileText, Bell,
  TrendingUp, ArrowRight, Clock, CheckCircle
} from 'lucide-react'

// Animated counter hook
function useCounter(target, duration = 1200) {
  const [count, setCount] = useState(0)
  const [hasStarted, setHasStarted] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting && !hasStarted) setHasStarted(true) },
      { threshold: 0.3 }
    )
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [hasStarted])

  useEffect(() => {
    if (!hasStarted || target === 0) { setCount(target); return }
    const steps = 40
    const increment = target / steps
    const interval = duration / steps
    let current = 0
    const timer = setInterval(() => {
      current += increment
      if (current >= target) { setCount(target); clearInterval(timer) }
      else setCount(Math.floor(current))
    }, interval)
    return () => clearInterval(timer)
  }, [hasStarted, target, duration])

  return [count, ref]
}

function StatCard({ icon: Icon, label, value, color, gradient, index, onClick }) {
  const [count, ref] = useCounter(value)
  return (
    <div
      ref={ref}
      className="dash-stat-card"
      style={{ '--card-color': color, '--card-gradient': gradient, animationDelay: `${index * 0.1}s`, cursor: 'pointer' }}
      onClick={onClick}
    >
      <div className="dash-stat-card__icon">
        <Icon size={22} strokeWidth={1.75} />
      </div>
      <div className="dash-stat-card__body">
        <div className="dash-stat-card__value">{count}</div>
        <div className="dash-stat-card__label">{label}</div>
      </div>
      <div className="dash-stat-card__glow" />
      <TrendingUp size={60} className="dash-stat-card__bg-icon" />
    </div>
  )
}

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
      const rawCourses = courses.data.data ?? courses.data
      const coursesArr = Array.isArray(rawCourses) ? rawCourses.filter(c => c.status !== 'ARCHIVED') : []
      const groupsArr = groups.data.data ?? groups.data
      const assignmentsArr = assignments.data.data ?? assignments.data
      const notifsArr = notifs.data.data ?? notifs.data
      setStats({
        courses: coursesArr.length,
        groups: Array.isArray(groupsArr) ? groupsArr.length : 0,
        assignments: Array.isArray(assignmentsArr) ? assignmentsArr.length : 0,
        notifications: Array.isArray(notifsArr) ? notifsArr.length : 0
      })
      setRecentCourses(coursesArr.slice(0, 8))
      setRecentNotifs(Array.isArray(notifsArr) ? notifsArr.slice(0, 6) : [])
    }).catch(console.error).finally(() => setLoading(false))
  }, [user])

  const statCards = [
    { icon: BookOpen, label: t('dashboard.stats.courses'), value: stats.courses, color: '#6c63ff', gradient: 'linear-gradient(135deg,#6c63ff,#9d98ff)', to: '/courses' },
    { icon: Users, label: t('dashboard.stats.groups'), value: stats.groups, color: '#00d4ff', gradient: 'linear-gradient(135deg,#00d4ff,#00f0c0)', to: '/groups' },
    { icon: FileText, label: t('dashboard.stats.assignments'), value: stats.assignments, color: '#f59e0b', gradient: 'linear-gradient(135deg,#f59e0b,#fbbf24)', to: '/assignments' },
    { icon: Bell, label: t('dashboard.stats.notifications'), value: stats.notifications, color: '#22c55e', gradient: 'linear-gradient(135deg,#22c55e,#4ade80)', to: '/notifications' },
  ]

  const statusColor = { PUBLISHED: 'tag--success', DRAFT: 'tag--warning', ENDED: 'tag--danger', ARCHIVED: '' }
  const courseGradients = [
    'linear-gradient(135deg,#1e1b4b,#4338ca)',
    'linear-gradient(135deg,#0c4a6e,#0369a1)',
    'linear-gradient(135deg,#3b0764,#7c3aed)',
    'linear-gradient(135deg,#064e3b,#059669)',
    'linear-gradient(135deg,#450a0a,#dc2626)',
    'linear-gradient(135deg,#1c1917,#78716c)',
  ]

  const formattedDate = new Intl.DateTimeFormat(i18n.language === 'en' ? 'en-US' : 'vi-VN', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  }).format(new Date())

  const hour = new Date().getHours()
  const greeting = hour < 12 ? '🌅' : hour < 18 ? '☀️' : '🌙'

  const quickActions = [
    { icon: BookOpen, label: t('sidebar.courses'), to: '/courses', color: '#6c63ff' },
    { icon: FileText, label: t('sidebar.assignments'), to: '/assignments', color: '#f59e0b' },
    { icon: Users, label: t('sidebar.groups'), to: '/groups', color: '#00d4ff' },
    { icon: Bell, label: t('sidebar.notifications'), to: '/notifications', color: '#22c55e' },
  ]

  return (
    <Layout>
      <div className="page dash-page fade-in">

        {/* ── Hero Banner ─── */}
        <div className="dash-hero">
          {/* Decorative orbs */}
          <div className="dash-hero__orb dash-hero__orb--1" />
          <div className="dash-hero__orb dash-hero__orb--2" />
          <div className="dash-hero__orb dash-hero__orb--3" />

          <div className="dash-hero__content">
            <div className="dash-hero__greeting">
              <span className="dash-hero__emoji">{greeting}</span>
              <div>
                <h1 className="dash-hero__title">
                  {t('dashboard.greeting', { name: user?.full_name?.split(' ').pop() })}
                </h1>
                <p className="dash-hero__sub">
                  <span className="dash-hero__role">{t(`sidebar.roles.${user?.role}`)}</span>
                  <span className="dash-hero__dot">·</span>
                  {t('dashboard.today', { date: formattedDate })}
                </p>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="dash-hero__actions">
              {quickActions.map(action => {
                const Icon = action.icon
                return (
                  <button
                    key={action.to}
                    className="dash-quick-action"
                    onClick={() => navigate(action.to)}
                    style={{ '--qa-color': action.color }}
                  >
                    <Icon size={16} strokeWidth={2} />
                    <span>{action.label}</span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* ── Stat Cards ─── */}
        <div className="dash-stats stagger-children">
          {statCards.map((s, i) => (
            <StatCard key={s.label} {...s} index={i} onClick={() => navigate(s.to)} />
          ))}
        </div>

        {/* ── Main Content Grid ─── */}
        <div className="dash-grid">
          {/* Recent Courses */}
          <div className="card card--no-hover dash-card">
            <div className="dash-card__header">
              <div className="dash-card__title-wrap">
                <div className="dash-card__icon" style={{ background: 'rgba(108,99,255,0.15)', color: '#6c63ff' }}>
                  <BookOpen size={16} strokeWidth={2} />
                </div>
                <h2 className="dash-card__title">{t('dashboard.recent_courses')}</h2>
              </div>
              <button className="btn btn-secondary btn-sm" onClick={() => navigate('/courses')}>
                {t('common.manage')} <ArrowRight size={13} />
              </button>
            </div>

            <div className="dash-course-list">
              {loading ? (
                [1, 2, 3, 4].map(i => (
                  <div key={i} className="dash-course-item dash-course-item--skeleton">
                    <div className="skeleton" style={{ width: 44, height: 44, borderRadius: 12, flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <div className="skeleton skeleton-text" style={{ width: '70%', marginBottom: 8 }} />
                      <div className="skeleton skeleton-text" style={{ width: '40%' }} />
                    </div>
                  </div>
                ))
              ) : recentCourses.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state__icon">📭</div>
                  <h3>{t('dashboard.no_courses')}</h3>
                </div>
              ) : recentCourses.map((c, i) => (
                <div
                  key={c._id}
                  className="dash-course-item"
                  onClick={() => navigate(`/courses/${c._id}`)}
                >
                  <div
                    className="dash-course-item__thumb"
                    style={{ background: courseGradients[i % courseGradients.length] }}
                  >
                    📋
                  </div>
                  <div className="dash-course-item__body">
                    <div className="dash-course-item__title">{c.title}</div>
                    <div className="dash-course-item__group">
                      <Clock size={11} strokeWidth={2} />
                      {c.group_id?.name || t('courses.group')}
                    </div>
                  </div>
                  <span className={`tag ${statusColor[c.status] || ''}`}>
                    {t(`status.${c.status}`) || c.status}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Notifications */}
          <div className="card card--no-hover dash-card">
            <div className="dash-card__header">
              <div className="dash-card__title-wrap">
                <div className="dash-card__icon" style={{ background: 'rgba(34,197,94,0.15)', color: '#22c55e' }}>
                  <Bell size={16} strokeWidth={2} />
                </div>
                <h2 className="dash-card__title">{t('dashboard.recent_notifications')}</h2>
              </div>
              <button className="btn btn-secondary btn-sm" onClick={() => navigate('/notifications')}>
                {t('dashboard.view_all_notifs')} <ArrowRight size={13} />
              </button>
            </div>

            <div className="dash-notif-list">
              {loading ? (
                [1, 2, 3].map(i => (
                  <div key={i} className="dash-notif-item">
                    <div className="skeleton" style={{ width: 10, height: 10, borderRadius: '50%', flexShrink: 0, marginTop: 4 }} />
                    <div style={{ flex: 1 }}>
                      <div className="skeleton skeleton-text" style={{ width: '80%', marginBottom: 8 }} />
                      <div className="skeleton skeleton-text" style={{ width: '55%' }} />
                    </div>
                  </div>
                ))
              ) : recentNotifs.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state__icon">
                    <CheckCircle size={28} strokeWidth={1.5} style={{ color: '#22c55e' }} />
                  </div>
                  <h3>{t('dashboard.no_notifications')}</h3>
                  <p>Bạn đã đọc tất cả thông báo 🎉</p>
                </div>
              ) : recentNotifs.map(n => (
                <div key={n._id} className="dash-notif-item">
                  <div className="dash-notif-dot" />
                  <div className="dash-notif-content">
                    <div className="dash-notif-title">{n.title}</div>
                    <div className="dash-notif-body">{n.body}</div>
                    <div className="dash-notif-time">
                      <Clock size={11} strokeWidth={2} />
                      {new Date(n.created_at).toLocaleDateString(i18n.language === 'en' ? 'en-US' : 'vi-VN')}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}
