import { useState, useEffect } from 'react'
import { useParams, useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../context/AuthContext'
import { useSocket } from '../context/SocketContext'
import api from '../api/axios'
import QuizNavbar from '../components/QuizNavbar'
import MediaRenderer from '../components/MediaRenderer'

export default function QuizPlay() {
  const { t } = useTranslation()
  const { code } = useParams()
  const { state } = useLocation()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { socket } = useSocket()

  const [room, setRoom] = useState(null)
  const [currentQuestion, setCurrentQuestion] = useState(null)
  const [currentIndex, setCurrentIndex] = useState(state?.questionIndex || 0)
  const [timer, setTimer] = useState(30)
  const [answered, setAnswered] = useState(false)
  const [feedback, setFeedback] = useState(null)

  useEffect(() => {
    const fetchRoom = async () => {
      try {
        const { data } = await api.get(`/quiz-rooms/${code}`)
        setRoom(data)
        const q = data.quiz_id.questions[currentIndex]
        setCurrentQuestion(q)
        if (socket) {
          socket.emit('quiz:join_room', { roomCode: code, userId: user?._id, name: user?.full_name })
        }
      } catch (err) {
        console.error(err)
      }
    }
    fetchRoom()

    if (!socket) return

    socket.on('quiz:next_question', ({ questionIndex }) => {
      setCurrentIndex(questionIndex)
      setAnswered(false)
      setFeedback(null)
      setTimer(30)
    })

    socket.on('quiz:finished', (finalPlayers) => {
      navigate(`/quiz/result/${code}`, { state: { players: finalPlayers } })
    })

    socket.on('quiz:answer_result', ({ isCorrect }) => {
      setFeedback(isCorrect ? t('quiz.correct') : t('quiz.incorrect'))
    })

    return () => {
      socket.off('quiz:next_question')
      socket.off('quiz:finished')
      socket.off('quiz:answer_result')
    }
  }, [code, socket, user, navigate, currentIndex, t])

  useEffect(() => {
    if (timer > 0 && !answered) {
      const interval = setInterval(() => setTimer(t => t - 1), 1000)
      return () => clearInterval(interval)
    }
  }, [timer, answered])

  useEffect(() => {
    if (room) {
      setCurrentQuestion(room.quiz_id.questions[currentIndex])
    }
  }, [currentIndex, room])

  const submitAnswer = (answer) => {
    if (answered || !currentQuestion) return
    setAnswered(true)

    setFeedback(t('quiz.checking'))
    
    if (socket) {
      socket.emit('quiz:submit_answer', {
        roomCode: code,
        userId: user?._id,
        questionId: currentQuestion._id,
        answerId: answer._id
      })
    }
  }

  if (!currentQuestion) return (
    <div className="quiz-page-bg" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <h1>{t('quiz.loading_question')}</h1>
    </div>
  )

  return (
    <div className="quiz-page-bg">
      <QuizNavbar />
      <div className="quiz-play-container">
        <div className="quiz-progress-bar" style={{ width: `${room ? ((currentIndex + 1) / room.quiz_id.questions.length) * 100 : 0}%` }}></div>

        <div className="quiz-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <span style={{ fontSize: '2rem' }}>⏱️</span>
            <span style={{ fontSize: '2.5rem', fontWeight: 900 }}>{timer}s</span>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.8rem', opacity: 0.7, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{t('quiz.progress')}</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{currentIndex + 1} / {room?.quiz_id.questions.length || 0}</div>
          </div>
        </div>

        <div className="question-card">
          <h1 className="question-text">{currentQuestion.content}</h1>
          <MediaRenderer 
            url={currentQuestion.media_url || currentQuestion.image_url || currentQuestion.video_url} 
            type={currentQuestion.media_type} 
            style={{ margin: '0 auto 2rem', maxWidth: currentQuestion.media_type === 'VIDEO' ? '800px' : '600px' }}
          />
        </div>

        <div className="answers-grid">
          {currentQuestion.answers?.map((ans, i) => (
            <button
              key={i}
              className={`answer-btn variant-${i % 4}`}
              onClick={() => submitAnswer(ans)}
              disabled={answered || timer === 0}
            >
              <span style={{ position: 'absolute', top: '1rem', left: '1.5rem', opacity: 0.3, fontSize: '2rem' }}>{['▲', '◆', '●', '■'][i % 4]}</span>
              <span style={{ marginLeft: '2.5rem' }}>{ans.content}</span>
            </button>
          ))}
        </div>

        {feedback && (
          <div className={`feedback-overlay ${
             feedback === t('quiz.correct') ? 'correct' : 
             feedback === t('quiz.incorrect') ? 'incorrect' : 'submitted'
          }`}>
            <div style={{ fontSize: '8rem', marginBottom: '1rem' }}>
              {feedback === t('quiz.correct') ? '✅' : feedback === t('quiz.incorrect') ? '❌' : '⚡'}
            </div>
            <h2>{feedback}</h2>
            <p style={{ fontSize: '1.5rem', opacity: 0.8, letterSpacing: '0.05em' }}>
              {feedback === t('quiz.checking') ? t('quiz.please_wait') : t('quiz.waiting_next')}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
