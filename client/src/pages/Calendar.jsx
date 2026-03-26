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
      <div className="page-header">
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div>
            <h1>Lịch biểu 📅</h1>
            <p>{MONTHS[month]} {year}</p>
          </div>
          <div style={{ display:'flex', gap:'0.5rem', alignItems:'center' }}>
            <button className="btn btn-secondary btn-sm" onClick={() => setDate(new Date(year, month - 1, 1))}>‹ Trước</button>
            <button className="btn btn-secondary btn-sm" onClick={() => setDate(new Date())}>Hôm nay</button>
            <button className="btn btn-secondary btn-sm" onClick={() => setDate(new Date(year, month + 1, 1))}>Sau ›</button>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div style={{ display:'flex', gap:'0.75rem', flexWrap:'wrap', marginBottom:'1rem' }}>
        {Object.entries(EVENT_COLORS).map(([type, color]) => (
          <div key={type} style={{ display:'flex', alignItems:'center', gap:'5px', fontSize:'0.75rem', color:'var(--text-3)' }}>
            <div style={{ width:10, height:10, borderRadius:2, background:color }} />
            {type.replace('_', ' ')}
          </div>
        ))}
      </div>

      <div className="calendar-grid">
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
              <div className="calendar-cell__num" style={{ color: isToday(cell.day) && cell.type === 'cur' ? 'var(--primary)' : undefined }}>
                {cell.day}
              </div>
              {evs.slice(0, 3).map(e => (
                <div key={e._id} className="calendar-event" title={e.title}
                  onClick={(event) => { event.stopPropagation(); setSelectedEvent(e); }}
                  style={{ background: (EVENT_COLORS[e.event_type] || '#6c63ff') + '33', color: EVENT_COLORS[e.event_type] || 'var(--primary-2)' }}>
                  {e.title}
                </div>
              ))}
              {evs.length > 3 && <div style={{ fontSize:'0.65rem', color:'var(--text-3)' }}>+{evs.length - 3} nữa</div>}
            </div>
          )
        })}
      </div>

      {/* Event Details Modal */}
      {selectedEvent && (
        <div style={{ position:'fixed', top:0, left:0, right:0, bottom:0, background:'rgba(0,0,0,0.6)', zIndex:999, display:'flex', alignItems:'center', justifyContent:'center', backdropFilter:'blur(4px)' }}
             onClick={() => setSelectedEvent(null)}>
          <div className="card fade-in" style={{ width:'100%', maxWidth:500, padding:'2rem', background:'var(--bg)', position:'relative' }} onClick={e => e.stopPropagation()}>
            <button onClick={() => setSelectedEvent(null)} style={{ position:'absolute', top:'1rem', right:'1rem', fontSize:'1.5rem', color:'var(--text-3)' }}>×</button>
            <h2 style={{ marginBottom:'1rem' }}>Chi tiết lịch trình</h2>
            {renderEventDetails(selectedEvent)}
          </div>
        </div>
      )}

      {/* Day Events Modal */}
      {selectedDay && !selectedEvent && (
        <div style={{ position:'fixed', top:0, left:0, right:0, bottom:0, background:'rgba(0,0,0,0.6)', zIndex:999, display:'flex', alignItems:'center', justifyContent:'center', backdropFilter:'blur(4px)' }}
             onClick={() => setSelectedDay(null)}>
          <div className="card fade-in" style={{ width:'100%', maxWidth:600, maxHeight:'80vh', overflowY:'auto', padding:'2rem', background:'var(--bg)', position:'relative' }} onClick={e => e.stopPropagation()}>
            <button onClick={() => setSelectedDay(null)} style={{ position:'absolute', top:'1rem', right:'1rem', fontSize:'1.5rem', color:'var(--text-3)' }}>×</button>
            <h2 style={{ marginBottom:'1.5rem' }}>Lịch trình ngày {selectedDay.day}/{selectedDay.month + 1}/{selectedDay.year}</h2>
            {selectedDay.events.map(e => (
              <div key={e._id} onClick={() => setSelectedEvent(e)} style={{ cursor: 'pointer' }}>
                {renderEventDetails(e)}
              </div>
            ))}
          </div>
        </div>
      )}
    </Layout>
  )
}
