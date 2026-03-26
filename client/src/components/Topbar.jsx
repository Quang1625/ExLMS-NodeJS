import { useNavigate } from 'react-router-dom'
import { useSocket } from '../context/SocketContext'

export default function Topbar({ title }) {
  const navigate = useNavigate()
  const { unreadCount } = useSocket()
  
  return (
    <header className="topbar">
      <div className="topbar__search">
        <span className="topbar__search-icon">🔍</span>
        <input placeholder="Tìm kiếm khóa học, bài tập..." />
      </div>
      <div className="topbar__actions">
        <button className="topbar__icon-btn" onClick={() => navigate('/calendar')}>📅</button>
        <button className="topbar__icon-btn" onClick={() => navigate('/notifications')}>
          🔔{unreadCount > 0 && <span className="badge">{unreadCount}</span>}
        </button>
      </div>
    </header>
  )
}
