import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

export default function QuizNavbar() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  return (
    <nav className="quiz-navbar">
      <div className="quiz-navbar__logo" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
        <span style={{ fontSize: '1.5rem' }}>🎓</span>
        <span>ExLMS</span>
      </div>
      <div className="quiz-navbar__links">
        <button className="quiz-navbar__link" onClick={() => navigate('/')}>🏠 {t('sidebar.dashboard')}</button>
        <button className="quiz-navbar__link" onClick={() => navigate('/courses')}>📚 {t('sidebar.courses')}</button>
        <button className="quiz-navbar__link" onClick={() => navigate('/quiz/dashboard')}>📊 {t('sidebar.quiz_dashboard')}</button>
      </div>
      <button className="quiz-navbar__exit quiz-navbar__link" onClick={() => navigate('/courses')} style={{ cursor: 'pointer' }}>
        🚪 {t('common.exit') || 'Thoát'}
      </button>
    </nav>
  )
}
