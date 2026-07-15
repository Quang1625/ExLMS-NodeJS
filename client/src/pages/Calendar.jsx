import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Layout from '../components/Layout'
import api from '../api/axios'

const EVENT_COLORS = {
  COURSE_SESSION: { bg: 'rgba(108,99,255,0.18)', border: '#6c63ff', dot: '#6c63ff' },
  ASSIGNMENT_DUE: { bg: 'rgba(245,158,11,0.18)', border: '#f59e0b', dot: '#f59e0b' },
  MEETING:        { bg: 'rgba(0,212,255,0.18)',   border: '#00d4ff', dot: '#00d4ff' },
  QUIZ:           { bg: 'rgba(239,68,68,0.18)',   border: '#ef4444', dot: '#ef4444' },
  COURSE_START:   { bg: 'rgba(34,197,94,0.18)',   border: '#22c55e', dot: '#22c55e' },
  COURSE_END:     { bg: 'rgba(239,68,68,0.18)',   border: '#ef4444', dot: '#ef4444' },
  PERSONAL:       { bg: 'rgba(139,133,255,0.18)', border: '#8b85ff', dot: '#8b85ff' },
  SYSTEM:         { bg: 'rgba(148,163,184,0.18)', border: '#94a3b8', dot: '#94a3b8' },
}

const getDetailLink = (event) => {
  const src = event.source
  if (!src?.entity_id) return null
  switch (src.entity_type) {
    case 'COURSE':     return `/courses/${src.entity_id}`
    case 'ASSIGNMENT': return `/assignments/${src.entity_id}`
    case 'QUIZ':       return `/quiz/dashboard`
    case 'MEETING':    return event.group_id ? `/groups/${event.group_id}?tab=meetings` : `/groups`
    default:           return null
  }
}

export default function Calendar() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedDay, setSelectedDay] = useState(null)

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  useEffect(() => {
    const fetchEvents = async () => {
      setLoading(true)
      try {
        const start_date = new Date(year, month, 1).toISOString()
        const end_date = new Date(year, month + 1, 0, 23, 59, 59).toISOString()
        const { data } = await api.get('/calendar-events', { params: { start_date, end_date } })
        setEvents(Array.isArray(data) ? data : [])
      } catch (err) {
        console.error('Error fetching calendar events:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchEvents()
  }, [year, month])

  const daysInMonth = (y, m) => new Date(y, m + 1, 0).getDate()
  const startDayOfMonth = (y, m) => new Date(y, m, 1).getDay()

  const prevMonth = () => setCurrentDate(new Date(year, month - 1))
  const nextMonth = () => setCurrentDate(new Date(year, month + 1))
  const goToday = () => setCurrentDate(new Date())

  const calendarDays = []
  const totalDays = daysInMonth(year, month)
  const startDay = startDayOfMonth(year, month)

  for (let i = 0; i < startDay; i++) calendarDays.push(null)
  for (let i = 1; i <= totalDays; i++) {
    const dayEvents = (events || []).filter(e => {
      const d = new Date(e.start_at)
      return d.getFullYear() === year && d.getMonth() === month && d.getDate() === i
    })
    calendarDays.push({ day: i, events: dayEvents })
  }

  const getEventLabel = (type) => t(`calendar.event_types.${type}`) || type.replace(/_/g, ' ')
  const getColor = (type) => EVENT_COLORS[type] || EVENT_COLORS.SYSTEM
  const isToday = (day) => day === new Date().getDate() && month === new Date().getMonth() && year === new Date().getFullYear()

  const monthsList = t('calendar.months', { returnObjects: true })
  const locale = i18n.language === 'en' ? 'en-US' : 'vi-VN'
  const dayHeaders = i18n.language === 'en'
    ? ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    : ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7']

  const todayEventCount = (events || []).filter(e => {
    const d = new Date(e.start_at)
    const now = new Date()
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate()
  }).length

  const totalEventCount = (events || []).length

  const handleViewDetail = (event) => {
    const link = getDetailLink(event)
    if (link) {
      setSelectedDay(null)
      navigate(link)
    }
  }

  if (loading) return <Layout><div className="spinner-wrap"><div className="spinner" /></div></Layout>

  return (
    <Layout>
      <div className="page fade-in">
        {/* Header */}
        <div className="cal-header">
          <div className="cal-header__left">
            <h1 className="cal-title">{t('calendar.title')}</h1>
            <p className="cal-subtitle">{monthsList[month]} {year}</p>
          </div>
          <div className="cal-header__right">
            <div className="cal-stats">
              <div className="cal-stat">
                <span className="cal-stat__num">{totalEventCount}</span>
                <span className="cal-stat__label">{t('calendar.total_events')}</span>
              </div>
              <div className="cal-stat">
                <span className="cal-stat__num" style={{ color: 'var(--success)' }}>{todayEventCount}</span>
                <span className="cal-stat__label">{t('calendar.today_events')}</span>
              </div>
            </div>
            <div className="cal-nav">
              <button className="cal-nav__btn" onClick={prevMonth}>‹</button>
              <button className="cal-nav__today" onClick={goToday}>{t('calendar.today')}</button>
              <button className="cal-nav__btn" onClick={nextMonth}>›</button>
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="cal-legend">
          {Object.entries(EVENT_COLORS).slice(0, 4).map(([type, color]) => (
            <div key={type} className="cal-legend__item">
              <span className="cal-legend__dot" style={{ background: color.dot }} />
              <span>{getEventLabel(type)}</span>
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="cal-grid-wrap">
          <div className="cal-grid">
            {dayHeaders.map(d => (
              <div key={d} className="cal-grid__header">{d}</div>
            ))}
            {calendarDays.map((d, i) => (
              <div
                key={i}
                className={`cal-cell ${!d ? 'cal-cell--empty' : ''} ${d && isToday(d.day) ? 'cal-cell--today' : ''} ${d?.events?.length ? 'cal-cell--has-events' : ''}`}
                onClick={() => d && setSelectedDay({ ...d, month, year })}
              >
                {d && (
                  <>
                    <span className={`cal-cell__num ${isToday(d.day) ? 'cal-cell__num--today' : ''}`}>{d.day}</span>
                    <div className="cal-cell__events">
                      {d.events.slice(0, 2).map((e, idx) => (
                        <div key={idx} className="cal-cell__event" style={{ background: getColor(e.event_type).bg, borderLeft: `3px solid ${getColor(e.event_type).border}` }}>
                          {e.title?.replace(/^(Buổi học|Hạn nộp|Lịch họp):\s*/i, '').substring(0, 18)}
                        </div>
                      ))}
                      {d.events.length > 2 && (
                        <div className="cal-cell__more">+{d.events.length - 2}</div>
                      )}
                    </div>
                    {d.events.length > 0 && (
                      <div className="cal-cell__dots">
                        {d.events.slice(0, 4).map((e, idx) => (
                          <span key={idx} className="cal-cell__dot" style={{ background: getColor(e.event_type).dot }} />
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Day Detail Modal */}
        {selectedDay && (
          <div className="cal-modal-overlay" onClick={() => setSelectedDay(null)}>
            <div className="cal-modal" onClick={e => e.stopPropagation()}>
              <div className="cal-modal__header">
                <div>
                  <div className="cal-modal__day">{selectedDay.day}</div>
                  <div className="cal-modal__month">{monthsList[selectedDay.month]} {selectedDay.year}</div>
                </div>
                <button className="cal-modal__close" onClick={() => setSelectedDay(null)}>✕</button>
              </div>
              <div className="cal-modal__count">
                {selectedDay.events.length} {t('calendar.events_on_day')}
              </div>
              <div className="cal-modal__list">
                {selectedDay.events.length === 0 ? (
                  <div className="cal-modal__empty">
                    <span style={{ fontSize: '2.5rem' }}>📅</span>
                    <p>{t('calendar.no_events')}</p>
                  </div>
                ) : selectedDay.events.map((e, i) => {
                  const color = getColor(e.event_type)
                  const detailLink = getDetailLink(e)
                  return (
                    <div key={i} className="cal-modal__event" style={{ borderLeft: `4px solid ${color.border}` }}>
                      <div className="cal-modal__event-header">
                        <span className="cal-modal__event-type" style={{ background: color.bg, color: color.border }}>{getEventLabel(e.event_type)}</span>
                        <span className="cal-modal__event-time">
                          {new Date(e.start_at).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })}
                          {e.end_at && ` – ${new Date(e.end_at).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })}`}
                        </span>
                      </div>
                      <div className="cal-modal__event-title">{e.title}</div>
                      {e.description && <p className="cal-modal__event-desc">{e.description}</p>}
                      
                      {/* View Detail Button */}
                      {detailLink && (
                        <button
                          className="btn btn-sm"
                          onClick={() => handleViewDetail(e)}
                          style={{
                            marginTop: '0.75rem',
                            background: color.bg,
                            color: color.border,
                            border: `1px solid ${color.border}30`,
                            fontWeight: 700,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.4rem'
                          }}
                        >
                          🔗 {t('calendar.view_detail')}
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}
