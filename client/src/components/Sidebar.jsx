import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTranslation } from 'react-i18next'

export default function Sidebar({ isOpen, onClose }) {
  const { t } = useTranslation()
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const navItems = [
    { section: t('sidebar.sections.overview'), links: [
      { to: '/', icon: '🏠', label: t('sidebar.dashboard'), end: true },
      { to: '/notifications', icon: '🔔', label: t('sidebar.notifications') },
      { to: '/calendar', icon: '📅', label: t('sidebar.calendar') },
    ]},
    { section: t('sidebar.sections.learning'), links: [
      { to: '/courses', icon: '📚', label: t('sidebar.courses') },
      { to: '/assignments', icon: '📝', label: t('sidebar.assignments') },
      { to: '/exams', icon: '📋', label: t('sidebar.exams') },
      { to: '/quiz/join', icon: '⚡', label: t('sidebar.quiz_realtime') },
      { to: '/quiz/dashboard', icon: '📊', label: t('sidebar.quiz_dashboard') },
      { to: '/groups', icon: '👥', label: t('sidebar.groups') },
    ]},
    { section: t('sidebar.sections.community'), links: [
      { to: '/forum', icon: '💬', label: t('sidebar.forum') },
    ]},
  ]

  const adminNavItems = [
    { section: t('sidebar.sections.admin'), links: [
      { to: '/admin', icon: '⚙️', label: t('sidebar.admin_users') },
    ]},
  ]

  const handleLogout = async () => {
    if (!window.confirm(t('sidebar.logout_confirm'))) return
    await logout()
    navigate('/login')
    onClose()
  }

  const handleNavClick = () => {
    if (window.innerWidth <= 768) {
      onClose()
    }
  }

  const initials = user?.full_name
    ?.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase() || '?'

  return (
    <aside className={`sidebar ${isOpen ? 'sidebar--open' : ''}`}>
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
                onClick={handleNavClick}
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
                onClick={handleNavClick}
              >
                <span className="icon">{link.icon}</span>
                {link.label}
              </NavLink>
            ))}
          </div>
        ))}

        {/* Logout as nav item */}
        <p className="sidebar__section-label" style={{ marginTop: '0.5rem' }}>{t('sidebar.sections.account')}</p>
        <NavLink
            to="/profile"
            className={({ isActive }) => `sidebar__link${isActive ? ' active' : ''}`}
            onClick={handleNavClick}
        >
            <span className="icon">👤</span>
            {t('sidebar.profile')}
        </NavLink>
        <button
          className="sidebar__link"
          onClick={handleLogout}
          style={{ width: '100%', color: 'var(--danger)', textAlign: 'left' }}
        >
          <span className="icon">🚪</span>
          {t('sidebar.logout')}
        </button>
      </nav>
      
      {/* User info strip at bottom */}
      <div className="sidebar__user" onClick={() => { navigate('/profile'); handleNavClick(); }} style={{ cursor: 'pointer' }}>
        <div className="avatar">{initials}</div>
        <div className="sidebar__user-info">
          <div className="sidebar__user-name">{user?.full_name}</div>
          <div className="sidebar__user-role">{t(`sidebar.roles.${user?.role}`) || user?.role}</div>
        </div>
      </div>

    </aside>
  )
}
