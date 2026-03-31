import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../api/axios'
import QuizNavbar from '../components/QuizNavbar'
import MediaRenderer from '../components/MediaRenderer'

export default function QuizSinglePlay() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [quiz, setQuiz] = useState(null)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [responses, setResponses] = useState([])
  const [timer, setTimer] = useState(null)
  const [finished, setFinished] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchQuiz = async () => {
      try {
        // Check if allowed first
        const { data: check } = await api.get(`/quizzes/${id}/check-attempt`);
        if (!check.can_attempt) {
          alert(`Bạn đã hết lượt làm bài cho kỳ thi này! Điểm cao nhất: ${check.best_score}%`);
          navigate('/quiz/dashboard');
          return;
        }

        const { data } = await api.get(`/quizzes/${id}`)
        setQuiz(data)
        if (data.time_limit_sec) setTimer(data.time_limit_sec)
        else setTimer(-1) // No limit
      } catch (err) {
        console.error(err)
        navigate('/quiz/dashboard')
      } finally {
        setLoading(false)
      }
    }
    fetchQuiz()
  }, [id, navigate])

  useEffect(() => {
    if (loading || finished) return

    if (quiz?.time_limit_sec && timer > 0) {
      const interval = setInterval(() => setTimer(t => t - 1), 1000)
      return () => clearInterval(interval)
    } else if (quiz?.time_limit_sec && timer === 0) {
      handleSubmit()
    }
  }, [timer, finished, quiz, loading])

  const handleSelectAnswer = (answerId) => {
    const question = quiz.questions[currentIndex]
    const newResponses = [...responses]
    const existing = newResponses.findIndex(r => r.question_id === question._id)
    
    const responseData = {
      question_id: question._id,
      selected_answer_id: answerId
    }

    if (existing > -1) newResponses[existing] = responseData
    else newResponses.push(responseData)
    
    setResponses(newResponses)
  }

  const handleSubmit = async () => {
    if (submitting) return
    setSubmitting(true)
    try {
      const { data } = await api.post(`/quizzes/${id}/attempts`, {
        responses
      })
      setFinished(true)
      alert(`Bạn đã hoàn thành bài thi! Điểm số: ${data.result.score}%`)
      navigate('/quiz/dashboard')
    } catch (err) {
      const errorMsg = err.response?.data?.error || err.response?.data || err.message
      console.error('Submit Error Details:', JSON.stringify(err.response?.data || {}, null, 2))
      alert(errorMsg || 'Lỗi khi nộp bài. Vui lòng thử lại.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <div className="quiz-page-bg center-content"><h1>Đang tải bài thi...</h1></div>
  if (!quiz) return null

  const currentQuestion = quiz.questions[currentIndex]
  const currentResponse = responses.find(r => r.question_id === currentQuestion?._id)

  return (
    <div className="quiz-page-bg">
      <QuizNavbar />
      <div className="quiz-play-container">
        <div className="quiz-progress-bar" style={{ width: `${((currentIndex + 1) / quiz.questions.length) * 100}%` }}></div>

        <div className="quiz-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <span style={{ fontSize: '1.5rem' }}>⏱️ Thời gian:</span>
            <span style={{ fontSize: '2rem', fontWeight: 900, color: timer < 60 ? 'var(--danger)' : 'white' }}>
              {quiz.time_limit_sec ? `${Math.floor(timer / 60)}:${String(timer % 60).padStart(2, '0')}` : '∞'}
            </span>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.8rem', opacity: 0.7 }}>Câu hỏi</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{currentIndex + 1} / {quiz.questions.length}</div>
          </div>
        </div>

        <div className="question-card">
          <h1 className="question-text">{currentQuestion.content}</h1>
          <MediaRenderer 
            url={currentQuestion.media_url || currentQuestion.image_url || currentQuestion.video_url} 
            type={currentQuestion.media_type} 
            style={{ margin: '0 auto 2rem', maxWidth: '600px' }}
          />
        </div>

        <div className="answers-grid">
          {currentQuestion.answers?.map((ans, i) => (
            <button
              key={ans._id}
              className={`answer-btn variant-${i % 4} ${currentResponse?.selected_answer_id === ans._id ? 'selected' : ''}`}
              onClick={() => handleSelectAnswer(ans._id)}
              style={{ border: currentResponse?.selected_answer_id === ans._id ? '4px solid white' : 'none' }}
            >
              <span style={{ position: 'absolute', top: '1rem', left: '1.5rem', opacity: 0.3, fontSize: '2rem' }}>
                {['▲', '◆', '●', '■'][i % 4]}
              </span>
              <span style={{ marginLeft: '2.5rem' }}>{ans.content}</span>
            </button>
          ))}
        </div>

        <div style={{ marginTop: '3rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button 
            className="btn btn-secondary" 
            disabled={currentIndex === 0}
            onClick={() => setCurrentIndex(i => i - 1)}
          >
            ⬅️ Câu trước
          </button>
          
          {currentIndex === quiz.questions.length - 1 ? (
            <button className="btn btn-primary" onClick={handleSubmit} disabled={submitting}>
              {submitting ? 'Đang nộp...' : '🏁 Nộp bài thi'}
            </button>
          ) : (
            <button className="btn btn-primary" onClick={() => setCurrentIndex(i => i + 1)}>
              Câu sau ➡️
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
