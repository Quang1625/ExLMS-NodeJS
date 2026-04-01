import { useTranslation } from 'react-i18next'
import { useTheme } from '../context/ThemeContext'
import { useNavigate } from 'react-router-dom'
import { useSocket } from '../context/SocketContext'

export default function Topbar({ title, onMenuClick }) {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const { unreadCount } = useSocket()
  const { theme, toggleTheme } = useTheme()

  const toggleLanguage = () => {
    const nextLang = i18n.language === 'vi' ? 'en' : 'vi'
    i18n.changeLanguage(nextLang)
  }
  
  return (
    <header className="topbar">
      <button className="topbar__menu-btn" onClick={onMenuClick}>☰</button>
      
      <div className="topbar__search">
        <span className="topbar__search-icon">🔍</span>
        <input placeholder={t('common.search_placeholder')} />
      </div>
      <div className="topbar__actions">
        <button 
          className="topbar__icon-btn" 
          onClick={toggleLanguage} 
          title={t('common.language_toggle')}
          style={{ 
            fontWeight: 800, fontSize: '0.7rem', letterSpacing: '0.02em',
            background: i18n.language === 'en' ? 'rgba(108,99,255,0.15)' : 'rgba(0,212,255,0.15)',
            color: i18n.language === 'en' ? 'var(--primary-2)' : 'var(--accent)'
          }}
        >
          {i18n.language === 'en' ? 'EN' : 'VI'}
        </button>
        <button 
          className="topbar__icon-btn" 
          onClick={toggleTheme} 
          title={t('common.theme_toggle')}
          style={{ fontSize: '1.1rem' }}
        >
          {theme === 'dark' ? '🌙' : '☀️'}
        </button>
        <button className="topbar__icon-btn" onClick={() => navigate('/calendar')} title={t('common.calendar')}>
          📅
        </button>
        <button 
          className="topbar__icon-btn" 
          onClick={() => navigate('/notifications')} 
          title={t('common.notifications')}
          style={unreadCount > 0 ? { background: 'rgba(108,99,255,0.15)' } : {}}
        >
          🔔
          {unreadCount > 0 && (
            <span className="badge" style={{ 
              background: 'linear-gradient(135deg, var(--primary), var(--accent))',
              boxShadow: '0 2px 8px rgba(108,99,255,0.4)'
            }}>
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      </div>
    </header>
  )
}
