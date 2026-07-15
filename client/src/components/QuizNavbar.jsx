import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

export default function QuizNavbar({ onExit }) {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const handleNav = (target) => {
    if (onExit) {
      onExit(target)
    } else {
      navigate(target)
    }
  }

  return (
    <nav className="quiz-navbar">
      <div className="quiz-navbar__logo" onClick={() => handleNav('/')} style={{ cursor: 'pointer' }}>
        <span style={{ fontSize: '1.5rem' }}>🎓</span>
        <span>ExLMS</span>
      </div>
      <div className="quiz-navbar__links">
        <button className="quiz-navbar__link" onClick={() => handleNav('/')}>🏠 {t('sidebar.dashboard')}</button>
        <button className="quiz-navbar__link" onClick={() => handleNav('/courses')}>📚 {t('sidebar.courses')}</button>
        <button className="quiz-navbar__link" onClick={() => handleNav('/quiz/dashboard')}>📊 {t('sidebar.quiz_dashboard')}</button>
      </div>
      <button className="quiz-navbar__exit quiz-navbar__link" onClick={() => handleNav('/courses')} style={{ cursor: 'pointer' }}>
        🚪 {t('common.exit') || 'Thoát'}
      </button>
    </nav>
  )
}
