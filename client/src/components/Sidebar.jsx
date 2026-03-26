import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const navItems = [
  { section: 'Tổng quan', links: [
    { to: '/', icon: '🏠', label: 'Dashboard', end: true },
    { to: '/notifications', icon: '🔔', label: 'Thông báo' },
    { to: '/calendar', icon: '📅', label: 'Lịch biểu' },
  ]},
  { section: 'Học tập', links: [
    { to: '/courses', icon: '📚', label: 'Khóa học' },
    { to: '/assignments', icon: '📝', label: 'Bài tập' },
    { to: '/exams', icon: '📋', label: 'Bài kiểm tra' },
    { to: '/quiz/join', icon: '⚡', label: 'Quiz Realtime' },
    { to: '/quiz/dashboard', icon: '📊', label: 'Bảng điều khiển Quiz' },
    { to: '/groups', icon: '👥', label: 'Nhóm học' },
  ]},
  { section: 'Cộng đồng', links: [
    { to: '/forum', icon: '💬', label: 'Diễn đàn' },
  ]},
]

const adminNavItems = [
  { section: 'Quản trị', links: [
    { to: '/admin', icon: '⚙️', label: 'Quản lý người dùng' },
  ]},
]

export default function Sidebar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    if (!window.confirm('Bạn có chắc muốn đăng xuất không?')) return
    await logout()
    navigate('/login')
  }

  const initials = user?.full_name
    ?.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase() || '?'

  const roleLabel = { ADMIN: 'Quản trị viên', INSTRUCTOR: 'Giảng viên', STUDENT: 'Sinh viên' }

  return (
    <aside className="sidebar">
      <div className="sidebar__logo">
        <div className="sidebar__logo-icon">🎓</div>
        <span className="sidebar__logo-text">Ex<span>LMS</span></span>
      </div>

      <nav className="sidebar__nav">
        {navItems.map(section => (
          <div key={section.section}>
            <p className="sidebar__section-label">{section.section}</p>
            {section.links.map(link => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                className={({ isActive }) => `sidebar__link${isActive ? ' active' : ''}`}
              >
                <span className="icon">{link.icon}</span>
                {link.label}
              </NavLink>
            ))}
          </div>
        ))}

        {/* Admin section - ADMIN only */}
        {user?.role === 'ADMIN' && adminNavItems.map(section => (
          <div key={section.section}>
            <p className="sidebar__section-label" style={{ color:'rgba(239,68,68,0.7)' }}>{section.section}</p>
            {section.links.map(link => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) => `sidebar__link${isActive ? ' active' : ''}`}
              >
                <span className="icon">{link.icon}</span>
                {link.label}
              </NavLink>
            ))}
          </div>
        ))}

        {/* Logout as nav item */}
        <p className="sidebar__section-label" style={{ marginTop: '0.5rem' }}>Tài khoản</p>
        <NavLink
            to="/profile"
            className={({ isActive }) => `sidebar__link${isActive ? ' active' : ''}`}
        >
            <span className="icon">👤</span>
            Trang cá nhân
        </NavLink>
        <button
          className="sidebar__link"
          onClick={handleLogout}
          style={{ width: '100%', color: 'var(--danger)', textAlign: 'left' }}
        >
          <span className="icon">🚪</span>
          Đăng xuất
        </button>
      </nav>
      
      {/* User info strip at bottom */}
      <div className="sidebar__user" onClick={() => navigate('/profile')} style={{ cursor: 'pointer' }}>
        <div className="avatar">{initials}</div>
        <div className="sidebar__user-info">
          <div className="sidebar__user-name">{user?.full_name}</div>
          <div className="sidebar__user-role">{roleLabel[user?.role] || user?.role}</div>
        </div>
      </div>

    </aside>
  )
}
