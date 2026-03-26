import { useNavigate } from 'react-router-dom'

export default function QuizNavbar() {
  const navigate = useNavigate()

  return (
    <nav className="quiz-navbar">
      <div className="quiz-navbar__logo" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
        <span style={{ fontSize: '1.5rem' }}>🎓</span>
        <span>ExLMS</span>
      </div>
      <div className="quiz-navbar__links">
        <button className="quiz-navbar__link" onClick={() => navigate('/')}>🏠 Dashboard</button>
        <button className="quiz-navbar__link" onClick={() => navigate('/courses')}>📚 Khóa học</button>
        <button className="quiz-navbar__link" onClick={() => navigate('/quiz/dashboard')}>📊 Kết quả</button>
      </div>
      <button className="quiz-navbar__exit quiz-navbar__link" onClick={() => navigate('/courses')} style={{ cursor: 'pointer' }}>
        🚪 Thoát
      </button>
    </nav>
  )
}
