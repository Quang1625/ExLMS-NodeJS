import { useEffect, useState } from 'react'
import Layout from '../components/Layout'
import { useAuth } from '../context/AuthContext'
import api from '../api/axios'

const DAYS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7']
const MONTHS = ['Tháng 1','Tháng 2','Tháng 3','Tháng 4','Tháng 5','Tháng 6','Tháng 7','Tháng 8','Tháng 9','Tháng 10','Tháng 11','Tháng 12']
const EVENT_COLORS = { MEETING:'#6c63ff', ASSIGNMENT_DUE:'#ef4444', QUIZ:'#f59e0b', COURSE_START:'#22c55e', COURSE_END:'#94a3b8', COURSE_SESSION:'#10b981', PERSONAL:'#00d4ff', SYSTEM:'#a855f7' }

export default function Calendar() {
  const { user } = useAuth()
  const [events, setEvents] = useState([])
  const [date, setDate] = useState(new Date())
  const [selectedEvent, setSelectedEvent] = useState(null)
  const [selectedDay, setSelectedDay] = useState(null)

  const year = date.getFullYear()
  const month = date.getMonth()
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const daysInPrev = new Date(year, month, 0).getDate()

  useEffect(() => {
    const start = new Date(year, month, 1).toISOString()
    const end = new Date(year, month + 1, 0).toISOString()
    if (user?._id)
      api.get(`/calendar-events?user_id=${user._id}&start_date=${start}&end_date=${end}`)
        .then(r => setEvents(r.data))
        .catch(console.error)
  }, [year, month, user])

  const eventsOn = (d) => events.filter(e => {
    const ed = new Date(e.start_at)
    return ed.getFullYear() === year && ed.getMonth() === month && ed.getDate() === d
  })

  const today = new Date()
  const isToday = (d) => today.getFullYear() === year && today.getMonth() === month && today.getDate() === d

  const cells = []
  // prev month days
  for (let i = firstDay - 1; i >= 0; i--) cells.push({ day: daysInPrev - i, type: 'prev' })
  // current month
  for (let d = 1; d <= daysInMonth; d++) cells.push({ day: d, type: 'cur' })
  // next month
  const remaining = 42 - cells.length
  for (let d = 1; d <= remaining; d++) cells.push({ day: d, type: 'next' })

  // Simple modal style inline or using existing ones
  const renderEventDetails = (e) => (
    <div className="card" style={{ marginBottom: '1rem', borderLeft: `4px solid ${EVENT_COLORS[e.event_type] || '#6c63ff'}` }}>
      <h3 style={{ marginBottom: 4 }}>{e.title}</h3>
      <div style={{ fontSize: '0.8rem', color: 'var(--text-2)', marginBottom: 8 }}>
        {new Date(e.start_at).toLocaleString('vi-VN')}
        {e.end_at ? ` - ${new Date(e.end_at).toLocaleString('vi-VN')}` : ''}
      </div>
      <span className="tag" style={{ background: (EVENT_COLORS[e.event_type] || '#6c63ff') + '33', color: EVENT_COLORS[e.event_type] || 'var(--primary)', marginBottom: 8 }}>
        {e.event_type === 'COURSE_SESSION' ? 'Lịch học' : e.event_type.replace('_', ' ')}
      </span>
      {e.description && <p style={{ fontSize: '0.9rem', marginTop: 8 }}>{e.description}</p>}
      {e.source?.entity_id && (
        <a href={`/${e.source.entity_type.toLowerCase()}s/${e.source.entity_id}`} 
           className="btn btn-primary btn-sm" 
           style={{ marginTop: '0.75rem', display: 'inline-block' }}>
          Xem chi tiết
        </a>
      )}
    </div>
  )

  return (
    <Layout>
      <div className="page-header" style={{ marginBottom: '3rem' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap: '2rem', flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ fontSize: '2.5rem', fontWeight: 800, letterSpacing: '-0.02em', background: 'linear-gradient(135deg, #fff 0%, var(--text-2) 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Lịch biểu 📅
            </h1>
            <p style={{ fontSize: '1.1rem', marginTop: '0.5rem', color: 'var(--primary-2)', fontWeight: 600 }}>
              {MONTHS[month]} {year}
            </p>
          </div>
          <div style={{ display:'flex', gap:'0.75rem', alignItems:'center', background: 'var(--bg-2)', padding: '6px', borderRadius: '16px', border: '1px solid var(--border)' }}>
            <button className="btn btn-secondary btn-sm" style={{ borderRadius: '12px', border: 'none' }} onClick={() => setDate(new Date(year, month - 1, 1))}>
              <span style={{ fontSize: '1.2rem' }}>‹</span>
            </button>
            <button className="btn btn-primary btn-sm" style={{ borderRadius: '12px', padding: '6px 16px' }} onClick={() => setDate(new Date())}>Hôm nay</button>
            <button className="btn btn-secondary btn-sm" style={{ borderRadius: '12px', border: 'none' }} onClick={() => setDate(new Date(year, month + 1, 1))}>
              <span style={{ fontSize: '1.2rem' }}>›</span>
            </button>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="calendar-legend">
        {Object.entries(EVENT_COLORS).map(([type, color]) => (
          <div key={type} className="calendar-legend__item">
            <div className="calendar-legend__dot" style={{ background: color, boxShadow: `0 0 10px ${color}44` }} />
            {type === 'COURSE_SESSION' ? 'Lịch học' : type.replace('_', ' ')}
          </div>
        ))}
      </div>

      <div className="calendar-grid fade-in">
        {DAYS.map(d => <div key={d} className="calendar-day-header">{d}</div>)}
        {cells.map((cell, i) => {
          const evs = cell.type === 'cur' ? eventsOn(cell.day) : []
          return (
            <div key={i} 
                 className={`calendar-cell ${cell.type !== 'cur' ? 'calendar-cell--other-month' : ''} ${isToday(cell.day) && cell.type === 'cur' ? 'calendar-cell--today' : ''}`}
                 onClick={() => {
                   if (cell.type === 'cur' && evs.length > 0) setSelectedDay({ day: cell.day, month, year, events: evs })
                 }}
                 style={{ cursor: cell.type === 'cur' && evs.length > 0 ? 'pointer' : 'default' }}>
              <div className="calendar-cell__num" style={{ color: isToday(cell.day) && cell.type === 'cur' ? 'var(--primary-2)' : undefined }}>
                {cell.day}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {evs.slice(0, 3).map(e => (
                  <div key={e._id} className="calendar-event" title={e.title}
                    onClick={(event) => { event.stopPropagation(); setSelectedEvent(e); }}
                    style={{ background: (EVENT_COLORS[e.event_type] || '#6c63ff') + '22', color: EVENT_COLORS[e.event_type] || 'var(--primary-2)', borderLeft: `3px solid ${EVENT_COLORS[e.event_type]}` }}>
                    {e.title}
                  </div>
                ))}
                {evs.length > 3 && (
                  <div style={{ fontSize:'0.7rem', color:'var(--text-3)', fontWeight: 600, paddingLeft: '4px' }}>
                    + {evs.length - 3} sự kiện khác
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Event Details Modal */}
      {selectedEvent && (
        <div className="modal-overlay" onClick={() => setSelectedEvent(null)}>
          <div className="modal-content fade-in" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setSelectedEvent(null)}>×</button>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '2rem', color: '#fff' }}>Chi tiết lịch trình</h2>
            {renderEventDetails(selectedEvent)}
            <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setSelectedEvent(null)}>Đóng</button>
            </div>
          </div>
        </div>
      )}

      {/* Day Events Modal */}
      {selectedDay && !selectedEvent && (
        <div className="modal-overlay" onClick={() => setSelectedDay(null)}>
          <div className="modal-content fade-in" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setSelectedDay(null)}>×</button>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.5rem', color: '#fff' }}>Lịch trình</h2>
            <p style={{ color: 'var(--primary-2)', fontWeight: 600, marginBottom: '2.5rem' }}>Ngày {selectedDay.day} thg {selectedDay.month + 1}, {selectedDay.year}</p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {selectedDay.events.map(e => (
                <div key={e._id} onClick={() => setSelectedEvent(e)} style={{ cursor: 'pointer', transition: 'transform 0.2s' }} onMouseEnter={e => e.currentTarget.style.transform = 'translateX(8px)'} onMouseLeave={e => e.currentTarget.style.transform = 'translateX(0)'}>
                  {renderEventDetails(e)}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}
