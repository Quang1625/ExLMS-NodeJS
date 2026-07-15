import { useTranslation } from 'react-i18next'
import { useTheme } from '../context/ThemeContext'
import { useNavigate } from 'react-router-dom'
import { useSocket } from '../context/SocketContext'
import { useAuth } from '../context/AuthContext'
import { useState } from 'react'
import {
  Search, Bell, Calendar, Sun, Moon, Palette, ChevronRight
} from 'lucide-react'

export default function Topbar({ title, onMenuClick }) {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const { unreadCount } = useSocket()
  const { theme, toggleTheme, primaryColor, setPrimaryColor } = useTheme()
  const { user } = useAuth()
  const [searchFocused, setSearchFocused] = useState(false)

  const toggleLanguage = () => {
    const nextLang = i18n.language === 'vi' ? 'en' : 'vi'
    i18n.changeLanguage(nextLang)
  }

  const initials = user?.full_name
    ?.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase() || '?'

  const hour = new Date().getHours()
  const greeting = hour < 12 ? t('common.greeting_morning') || 'Chào buổi sáng'
    : hour < 18 ? t('common.greeting_afternoon') || 'Chào buổi chiều'
    : t('common.greeting_evening') || 'Chào buổi tối'

  return (
    <header className="topbar">
      {/* Mobile hamburger */}
      <button
        className="topbar__menu-btn"
        onClick={onMenuClick}
        aria-label="Toggle Menu"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <line x1="3" y1="6" x2="21" y2="6"/>
          <line x1="3" y1="12" x2="21" y2="12"/>
          <line x1="3" y1="18" x2="21" y2="18"/>
        </svg>
      </button>

      {/* Greeting (hidden on mobile) */}
      <div className="topbar__greeting" style={{ display: 'none' }} data-desktop-only="true">
        <span>{greeting}</span>
        <strong>{user?.full_name?.split(' ').pop() || ''}</strong>
      </div>

      {/* Search */}
      <div className={`topbar__search ${searchFocused ? 'topbar__search--focused' : ''}`}>
        <Search size={15} className="topbar__search-icon" />
        <input
          placeholder={t('common.search_placeholder')}
          aria-label={t('common.search_placeholder')}
          onFocus={() => setSearchFocused(true)}
          onBlur={() => setSearchFocused(false)}
        />
        {searchFocused && (
          <span className="topbar__search-kbd">⌘K</span>
        )}
      </div>

      <div className="topbar__actions">
        {/* Color Picker */}
        <div className="topbar__color-wrap" title="Custom Theme Color">
          <Palette size={15} className="topbar__color-icon" />
          <input
            type="color"
            value={primaryColor || '#6c63ff'}
            onChange={(e) => setPrimaryColor(e.target.value)}
            className="topbar__color-input"
            aria-label="Select custom theme color"
          />
        </div>

        {/* Language Toggle */}
        <button
          className={`topbar__icon-btn topbar__lang-btn ${i18n.language === 'en' ? 'topbar__lang-btn--en' : 'topbar__lang-btn--vi'}`}
          onClick={toggleLanguage}
          title={t('common.language_toggle')}
          aria-label={t('common.language_toggle')}
        >
          {i18n.language === 'en' ? 'EN' : 'VI'}
        </button>

        {/* Theme Toggle */}
        <button
          className="topbar__icon-btn topbar__theme-btn"
          onClick={toggleTheme}
          title={t('common.theme_toggle')}
          aria-label={t('common.theme_toggle')}
        >
          {theme === 'dark'
            ? <Moon size={16} strokeWidth={2} />
            : <Sun size={16} strokeWidth={2} />
          }
        </button>

        {/* Calendar */}
        <button
          className="topbar__icon-btn"
          onClick={() => navigate('/calendar')}
          title={t('common.calendar')}
          aria-label={t('common.calendar')}
        >
          <Calendar size={16} strokeWidth={2} />
        </button>

        {/* Notifications */}
        <button
          className={`topbar__icon-btn topbar__notif-btn ${unreadCount > 0 ? 'topbar__notif-btn--active' : ''}`}
          onClick={() => navigate('/notifications')}
          title={t('common.notifications')}
          aria-label={t('common.notifications')}
        >
          <Bell size={16} strokeWidth={2} />
          {unreadCount > 0 && (
            <span className="topbar__badge" aria-label={`${unreadCount} unread notifications`}>
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>

        {/* User Avatar */}
        <button
          className="topbar__user-btn"
          onClick={() => navigate('/profile')}
          title={user?.full_name}
          aria-label="Go to profile"
        >
          <div className="topbar__avatar" style={{ overflow: 'hidden' }}>
            {user?.avatar_key ? (
              <img src={user.avatar_key} alt={user.full_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              initials
            )}
          </div>
          <div className="topbar__user-info">
            <span className="topbar__user-name">{user?.full_name?.split(' ').pop()}</span>
            <span style={{ fontSize: '0.6rem', color: 'var(--text-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              {t(`sidebar.roles.${user?.role}`) || user?.role}
            </span>
          </div>
          <ChevronRight size={12} className="topbar__user-chevron" />
        </button>
      </div>
    </header>
  )
}
