import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import api from '../api/axios'
import QuizNavbar from '../components/QuizNavbar'
import MediaRenderer from '../components/MediaRenderer'

export default function QuizResultDetail() {
  const { t } = useTranslation()
  const { id, attemptId } = useParams()
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [expandedQuestions, setExpandedQuestions] = useState({})

  useEffect(() => {
    const fetchResult = async () => {
      try {
        const { data: result } = await api.get(`/quizzes/${id}/attempts/${attemptId}`)
        setData(result)
      } catch (err) {
        console.error(err)
        navigate('/quiz/dashboard')
      } finally {
        setLoading(false)
      }
    }
    fetchResult()
  }, [id, attemptId, navigate])

  const toggleQuestion = (idx) => {
    setExpandedQuestions(prev => ({ ...prev, [idx]: !prev[idx] }))
  }

  const formatTime = (sec) => {
    if (!sec) return '--'
    const m = Math.floor(sec / 60)
    const s = sec % 60
    return m > 0 ? `${m}p ${s}s` : `${s}s`
  }

  if (loading) return (
    <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', background: 'var(--quiz-bg, linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%))' }}>
      <div style={{ textAlign: 'center' }}>
        <div className="spinner" style={{ width: 48, height: 48, margin: '0 auto 1rem', borderWidth: 4 }} />
        <p style={{ color: 'rgba(255,255,255,0.7)' }}>Đang tải kết quả...</p>
      </div>
    </div>
  )

  if (!data) return null

  const { attempt, quiz, review, summary } = data
  const isPassed = attempt.is_passed
  const scoreColor = isPassed ? '#38ef7d' : '#ff6b67'
  const circlePercent = attempt.score || 0
  const circumference = 2 * Math.PI * 54
  const dashOffset = circumference - (circlePercent / 100) * circumference

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
      paddingBottom: '4rem'
    }}>
      <QuizNavbar />

      <div style={{ maxWidth: 860, margin: '0 auto', padding: '2rem 1rem' }}>

        {/* Score Card */}
        <div style={{
          background: 'rgba(255,255,255,0.07)',
          backdropFilter: 'blur(20px)',
          border: `1px solid ${isPassed ? 'rgba(56,239,125,0.3)' : 'rgba(255,107,103,0.3)'}`,
          borderRadius: 28,
          padding: '2.5rem 2rem',
          textAlign: 'center',
          marginBottom: '2rem',
          boxShadow: `0 20px 60px ${isPassed ? 'rgba(56,239,125,0.1)' : 'rgba(255,107,103,0.1)'}`
        }}>
          {/* Circle Score */}
          <div style={{ position: 'relative', width: 140, height: 140, margin: '0 auto 1.5rem' }}>
            <svg width="140" height="140" viewBox="0 0 140 140" style={{ transform: 'rotate(-90deg)' }}>
              <circle cx="70" cy="70" r="54" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="10" />
              <circle
                cx="70" cy="70" r="54" fill="none"
                stroke={scoreColor} strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={dashOffset}
                style={{ transition: 'stroke-dashoffset 1.5s ease-in-out' }}
              />
            </svg>
            <div style={{
              position: 'absolute', inset: 0, display: 'flex',
              flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
            }}>
              <span style={{ fontSize: '2rem', fontWeight: 900, color: scoreColor, lineHeight: 1 }}>
                {attempt.score}%
              </span>
              <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>
                {t('quiz.score')}
              </span>
            </div>
          </div>

          {/* Status Badge */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: isPassed ? 'rgba(56,239,125,0.15)' : 'rgba(255,107,103,0.15)',
            border: `1px solid ${scoreColor}`,
            color: scoreColor, borderRadius: 100,
            padding: '6px 20px', fontWeight: 800,
            fontSize: '1rem', marginBottom: '1rem',
            textTransform: 'uppercase', letterSpacing: '0.1em'
          }}>
            {isPassed ? '🏆' : '📝'} {isPassed ? t('quiz.passed') : t('quiz.failed')}
          </div>

          <h2 style={{ color: '#fff', fontSize: '1.4rem', fontWeight: 700, marginBottom: '0.5rem' }}>
            {quiz.title}
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem' }}>
            {t('quiz.attempt_number')} #{attempt.attempt_number}
          </p>

          {/* Stats Row */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '1.5rem', marginTop: '2rem', flexWrap: 'wrap' }}>
            {[
              { label: 'Câu đúng', value: summary.correct, icon: '✅', color: '#38ef7d' },
              { label: 'Câu sai', value: summary.incorrect, icon: '❌', color: '#ff6b67' },
              { label: 'Bỏ qua', value: summary.skipped, icon: '⏭️', color: '#fbbf24' },
              { label: 'Thời gian', value: formatTime(attempt.time_spent_sec), icon: '⏱️', color: '#60a5fa' }
            ].map((s, i) => (
              <div key={i} style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 16, padding: '1rem 1.5rem',
                minWidth: 100, textAlign: 'center'
              }}>
                <div style={{ fontSize: '1.5rem', marginBottom: 4 }}>{s.icon}</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 900, color: s.color }}>{s.value}</div>
                <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginBottom: '2.5rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => navigate('/quiz/dashboard')}
            className="btn btn-secondary"
            style={{ padding: '0.85rem 2rem', borderRadius: 100, fontWeight: 700, fontSize: '0.95rem' }}
          >
            📊 Về Dashboard
          </button>
          <button
            onClick={() => navigate('/exams')}
            className="btn btn-secondary"
            style={{ padding: '0.85rem 2rem', borderRadius: 100, fontWeight: 700, fontSize: '0.95rem' }}
          >
            📋 Danh sách bài thi
          </button>
        </div>

        {/* Question Review */}
        <div style={{ marginBottom: '1.5rem' }}>
          <h2 style={{ color: '#fff', fontSize: '1.3rem', fontWeight: 800, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            🔍 Xem lại từng câu hỏi
            <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.07)', padding: '3px 12px', borderRadius: 100 }}>
              {review.length} câu
            </span>
          </h2>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {review.map((q, idx) => {
            const isExpanded = expandedQuestions[idx]
            const statusColor = q.is_correct ? '#38ef7d' : (q.user_answer === null || (Array.isArray(q.user_answer) && q.user_answer.length === 0)) ? '#fbbf24' : '#ff6b67'
            const statusIcon = q.is_correct ? '✅' : (q.user_answer === null || (Array.isArray(q.user_answer) && q.user_answer.length === 0)) ? '⏭️' : '❌'
            const statusText = q.is_correct ? 'Đúng' : (q.user_answer === null || (Array.isArray(q.user_answer) && q.user_answer.length === 0)) ? 'Bỏ qua' : 'Sai'

            return (
              <div
                key={q.question_id}
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  backdropFilter: 'blur(10px)',
                  border: `1px solid ${isExpanded ? statusColor + '50' : 'rgba(255,255,255,0.1)'}`,
                  borderLeft: `4px solid ${statusColor}`,
                  borderRadius: 20,
                  overflow: 'hidden',
                  transition: 'border-color 0.2s'
                }}
              >
                {/* Question Header (always visible) */}
                <div
                  style={{
                    display: 'flex', alignItems: 'flex-start', gap: '1rem',
                    padding: '1.25rem 1.5rem', cursor: 'pointer'
                  }}
                  onClick={() => toggleQuestion(idx)}
                >
                  {/* Number */}
                  <div style={{
                    width: 32, height: 32, borderRadius: '50%',
                    background: statusColor + '20', color: statusColor,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 800, fontSize: '0.85rem', flexShrink: 0
                  }}>
                    {idx + 1}
                  </div>

                  {/* Content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{
                      color: '#fff', fontWeight: 600, fontSize: '0.95rem',
                      margin: 0, lineHeight: 1.5,
                      display: '-webkit-box', WebkitLineClamp: isExpanded ? 'unset' : 2,
                      WebkitBoxOrient: 'vertical', overflow: 'hidden'
                    }}>
                      {q.content}
                    </p>
                  </div>

                  {/* Status + Points */}
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ color: statusColor, fontWeight: 800, fontSize: '0.85rem', marginBottom: 4 }}>
                      {statusIcon} {statusText}
                    </div>
                    <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem' }}>
                      {q.points_earned}/{q.points} điểm
                    </div>
                    <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.75rem', marginTop: 4 }}>
                      {isExpanded ? '▲ Thu gọn' : '▼ Xem chi tiết'}
                    </div>
                  </div>
                </div>

                {/* Expanded Detail */}
                {isExpanded && (
                  <div style={{ padding: '0 1.5rem 1.5rem', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                    {/* Media */}
                    {q.media_url && (
                      <div style={{ marginTop: '1rem' }}>
                        <MediaRenderer url={q.media_url} type={q.media_type} style={{ maxWidth: 400 }} />
                      </div>
                    )}

                    {/* Answer comparison */}
                    <div style={{ marginTop: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      {/* User's answer */}
                      <div style={{
                        background: q.is_correct ? 'rgba(56,239,125,0.08)' : 'rgba(255,107,103,0.08)',
                        border: `1px solid ${q.is_correct ? 'rgba(56,239,125,0.2)' : 'rgba(255,107,103,0.2)'}`,
                        borderRadius: 12, padding: '0.875rem 1rem'
                      }}>
                        <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
                          📝 Câu trả lời của bạn
                        </div>
                        <div style={{ color: q.is_correct ? '#38ef7d' : '#ff6b67', fontWeight: 600, fontSize: '0.9rem' }}>
                          {renderAnswerDisplay(q.user_answer, q.question_type)}
                        </div>
                      </div>

                      {/* Correct answer (only show when wrong) */}
                      {!q.is_correct && q.correct_answer !== null && (
                        <div style={{
                          background: 'rgba(56,239,125,0.08)',
                          border: '1px solid rgba(56,239,125,0.2)',
                          borderRadius: 12, padding: '0.875rem 1rem'
                        }}>
                          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
                            ✅ Đáp án đúng
                          </div>
                          <div style={{ color: '#38ef7d', fontWeight: 600, fontSize: '0.9rem' }}>
                            {renderAnswerDisplay(q.correct_answer, q.question_type)}
                          </div>
                        </div>
                      )}

                      {/* Short answer note */}
                      {q.question_type === 'SHORT_ANSWER' && (
                        <div style={{
                          background: 'rgba(251,191,36,0.08)',
                          border: '1px solid rgba(251,191,36,0.2)',
                          borderRadius: 12, padding: '0.875rem 1rem'
                        }}>
                          <div style={{ color: '#fbbf24', fontSize: '0.85rem', fontWeight: 600 }}>
                            💬 Câu hỏi tự luận – giảng viên sẽ chấm điểm thủ công
                          </div>
                        </div>
                      )}

                      {/* Explanation */}
                      {q.explanation && (
                        <div style={{
                          background: 'rgba(108,99,255,0.08)',
                          border: '1px solid rgba(108,99,255,0.2)',
                          borderRadius: 12, padding: '0.875rem 1rem'
                        }}>
                          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
                            💡 Giải thích
                          </div>
                          <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.9rem', lineHeight: 1.6 }}>
                            {q.explanation}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Bottom actions */}
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '3rem' }}>
          <button
            onClick={() => navigate('/quiz/dashboard')}
            className="btn btn-primary"
            style={{ padding: '1rem 2.5rem', borderRadius: 100, fontWeight: 700 }}
          >
            🏠 Về trang chủ Quiz
          </button>
        </div>
      </div>
    </div>
  )
}

function renderAnswerDisplay(answer, questionType) {
  if (answer === null || answer === undefined) {
    return <span style={{ opacity: 0.5, fontStyle: 'italic' }}>Không trả lời</span>
  }
  if (Array.isArray(answer)) {
    if (answer.length === 0) {
      return <span style={{ opacity: 0.5, fontStyle: 'italic' }}>Không trả lời</span>
    }
    if (questionType === 'ORDERING') {
      return (
        <ol style={{ margin: 0, paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: 4 }}>
          {answer.map((item, i) => (
            <li key={i} style={{ lineHeight: 1.5 }}>{item}</li>
          ))}
        </ol>
      )
    }
    return (
      <ul style={{ margin: 0, paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: 4 }}>
        {answer.map((item, i) => (
          <li key={i} style={{ lineHeight: 1.5 }}>{item}</li>
        ))}
      </ul>
    )
  }
  return <span>{answer}</span>
}
