import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTranslation } from 'react-i18next'
import {
  Home, Bell, Calendar, BookOpen, FileText, ClipboardList,
  Zap, BarChart2, Users, MessageSquare, Settings, LogOut, User, Database
} from 'lucide-react'

export default function Sidebar({ isOpen, onClose }) {
  const { t } = useTranslation()
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const navItems = [
    {
      section: t('sidebar.sections.overview'),
      links: [
        { to: '/', icon: Home, label: t('sidebar.dashboard'), end: true },
        { to: '/notifications', icon: Bell, label: t('sidebar.notifications') },
        { to: '/calendar', icon: Calendar, label: t('sidebar.calendar') },
      ]
    },
    {
      section: t('sidebar.sections.learning'),
      links: [
        { to: '/courses', icon: BookOpen, label: t('sidebar.courses') },
        { to: '/assignments', icon: FileText, label: t('sidebar.assignments') },
        { to: '/exams', icon: ClipboardList, label: t('sidebar.exams') },
        { to: '/quiz/join', icon: Zap, label: t('sidebar.quiz_realtime') },
        { to: '/quiz/dashboard', icon: BarChart2, label: t('sidebar.quiz_dashboard') },
        { to: '/groups', icon: Users, label: t('sidebar.groups') },
      ]
    },
    {
      section: t('sidebar.sections.community'),
      links: [
        { to: '/forum', icon: MessageSquare, label: t('sidebar.forum') },
      ]
    },
  ]

  const adminNavItems = [
    {
      section: t('sidebar.sections.admin'),
      links: [
        { to: '/admin', icon: Settings, label: t('sidebar.admin_users') },
        { to: '/admin/quiz-manager', icon: Database, label: t('sidebar.quiz_manager') },
      ]
    },
  ]

  const handleLogout = async () => {
    if (!window.confirm(t('sidebar.logout_confirm'))) return
    await logout()
    navigate('/login')
    onClose()
  }

  const handleNavClick = () => {
    if (window.innerWidth <= 768) onClose()
  }

  const initials = user?.full_name
    ?.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase() || '?'

  return (
    <aside className={`sidebar ${isOpen ? 'sidebar--open' : ''}`}>
      {/* Logo */}
      <div className="sidebar__logo">
        <div className="sidebar__logo-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M12 3L20 7.5V16.5L12 21L4 16.5V7.5L12 3Z" fill="url(#logoGrad)" />
            <path d="M12 8L8 10.5V15.5L12 18L16 15.5V10.5L12 8Z" fill="white" fillOpacity="0.4"/>
            <defs>
              <linearGradient id="logoGrad" x1="4" y1="3" x2="20" y2="21" gradientUnits="userSpaceOnUse">
                <stop stopColor="#6c63ff"/>
                <stop offset="1" stopColor="#00d4ff"/>
              </linearGradient>
            </defs>
          </svg>
        </div>
        <span className="sidebar__logo-text">Ex<span>LMS</span></span>
      </div>

      {/* Navigation */}
      <nav className="sidebar__nav" aria-label="Main Navigation">
        {navItems.map(section => (
          <div key={section.section} className="sidebar__section" role="group">
            <p className="sidebar__section-label">{section.section}</p>
            {section.links.map(link => {
              const Icon = link.icon
              return (
                <NavLink
                  key={link.to}
                  to={link.to}
                  end={link.end}
                  className={({ isActive }) => `sidebar__link${isActive ? ' active' : ''}`}
                  onClick={handleNavClick}
                >
                  <span className="sidebar__link-icon">
                    <Icon size={16} strokeWidth={2} />
                  </span>
                  <span className="sidebar__link-label">{link.label}</span>
                </NavLink>
              )
            })}
          </div>
        ))}

        {/* Admin section - show for ADMIN and INSTRUCTOR */}
        {(user?.role === 'ADMIN' || user?.role === 'INSTRUCTOR') && adminNavItems.map(section => {
          const filteredLinks = section.links.filter(link => {
            if (link.to === '/admin' && user?.role !== 'ADMIN') return false
            return true
          })
          if (filteredLinks.length === 0) return null
          return (
            <div key={section.section} className="sidebar__section">
              <p className="sidebar__section-label sidebar__section-label--admin">{section.section}</p>
              {filteredLinks.map(link => {
                const Icon = link.icon
                return (
                  <NavLink
                    key={link.to}
                    to={link.to}
                    className={({ isActive }) => `sidebar__link${isActive ? ' active' : ''}`}
                    onClick={handleNavClick}
                  >
                    <span className="sidebar__link-icon">
                      <Icon size={16} strokeWidth={2} />
                    </span>
                    <span className="sidebar__link-label">{link.label}</span>
                  </NavLink>
                )
              })}
            </div>
          )
        })}

        {/* Account section */}
        <div className="sidebar__section">
          <p className="sidebar__section-label">{t('sidebar.sections.account')}</p>
          <NavLink
            to="/profile"
            className={({ isActive }) => `sidebar__link${isActive ? ' active' : ''}`}
            onClick={handleNavClick}
          >
            <span className="sidebar__link-icon"><User size={16} strokeWidth={2} /></span>
            <span className="sidebar__link-label">{t('sidebar.profile')}</span>
          </NavLink>
          <button
            className="sidebar__link sidebar__link--danger"
            onClick={handleLogout}
            aria-label={t('sidebar.logout')}
          >
            <span className="sidebar__link-icon"><LogOut size={16} strokeWidth={2} /></span>
            <span className="sidebar__link-label">{t('sidebar.logout')}</span>
          </button>
        </div>
      </nav>

      {/* User Panel */}
      <div
        className="sidebar__user"
        onClick={() => { navigate('/profile'); handleNavClick() }}
        role="button"
        tabIndex={0}
        aria-label={t('sidebar.profile')}
        onKeyDown={e => e.key === 'Enter' && navigate('/profile')}
      >
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <div className="sidebar__avatar" style={{ overflow: 'hidden' }}>
            {user?.avatar_key ? (
              <img src={user.avatar_key} alt={user.full_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <span>{initials}</span>
            )}
            <div className="sidebar__avatar-ring" />
          </div>
          {/* Online dot */}
          <span style={{
            position: 'absolute', bottom: 0, right: 0,
            width: 10, height: 10, borderRadius: '50%',
            background: 'var(--success)',
            border: '2px solid var(--bg)',
            boxShadow: '0 0 6px rgba(34,197,94,0.5)'
          }} title="Online" />
        </div>
        <div className="sidebar__user-info">
          <div className="sidebar__user-name">{user?.full_name}</div>
          <div className="sidebar__user-role">{t(`sidebar.roles.${user?.role}`) || user?.role}</div>
        </div>
        <div className="sidebar__user-chevron">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 18l6-6-6-6"/>
          </svg>
        </div>
      </div>
    </aside>
  )
}

