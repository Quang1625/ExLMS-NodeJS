import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../context/AuthContext'
import api from '../api/axios'
import QuizNavbar from '../components/QuizNavbar'
import MediaRenderer from '../components/MediaRenderer'

const AUTOSAVE_KEY = (quizId, userId) => `quiz_progress_${quizId}_${userId}`

export default function QuizSinglePlay() {
  const { t } = useTranslation()
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
  const [showRestorePrompt, setShowRestorePrompt] = useState(false)
  const [savedData, setSavedData] = useState(null)
  const [showNavPanel, setShowNavPanel] = useState(false)

  // Anti-cheat states
  const [violations, setViolations] = useState([])
  const [showViolationWarning, setShowViolationWarning] = useState(false)
  const [lastViolationType, setLastViolationType] = useState('')
  const [isFullscreenActive, setIsFullscreenActive] = useState(false)
  const [showFullscreenModal, setShowFullscreenModal] = useState(false)

  // Drag-and-drop state for ORDERING
  const [orderItems, setOrderItems] = useState({})
  const [dragItem, setDragItem] = useState(null)

  const startedAt = useRef(Date.now())

  // --- Auto Submit when cheat violations limit reached ---
  const handleAutoSubmit = useCallback(async (latestViolations) => {
    try {
      const timeSpent = Math.round((Date.now() - startedAt.current) / 1000)
      const finalResponses = [...responses]
      if (quiz) {
        quiz.questions.forEach((q, idx) => {
          if (q.question_type === 'ORDERING') {
            const items = orderItems[idx] || []
            const existing = finalResponses.findIndex(r => r.question_id === q._id)
            const orderResp = {
              question_id: q._id,
              order_response: items.map(item => item._id)
            }
            if (existing > -1) finalResponses[existing] = { ...finalResponses[existing], ...orderResp }
            else finalResponses.push(orderResp)
          }
        })
      }

      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {})
      }

      const { data } = await api.post(`/quizzes/${id}/attempts`, {
        responses: finalResponses,
        time_spent_sec: timeSpent,
        violations: latestViolations || violations,
        cheat_detected: true
      })

      localStorage.removeItem(AUTOSAVE_KEY(id, user._id))
      setFinished(true)
      navigate(`/quiz/${id}/result/${data.result.attempt_id}`)
    } catch (err) {
      console.error('Lỗi tự động nộp bài:', err)
      navigate('/quiz/dashboard')
    }
  }, [id, responses, orderItems, quiz, navigate, user._id, violations])

  // Bật/tắt chế độ fullscreen
  const requestFullscreen = async () => {
    try {
      const element = document.documentElement
      if (element.requestFullscreen) {
        await element.requestFullscreen()
      } else if (element.webkitRequestFullscreen) {
        await element.webkitRequestFullscreen()
      } else if (element.msRequestFullscreen) {
        await element.msRequestFullscreen()
      }
      setIsFullscreenActive(true)
      setShowFullscreenModal(false)
    } catch (err) {
      console.error('Fullscreen request failed:', err)
    }
  }

  // Lắng nghe sự kiện chống gian lận
  useEffect(() => {
    if (!quiz || !quiz.enable_anti_cheat || finished || loading) return

    // Hỏi bắt đầu chế độ fullscreen nếu bật chống gian lận
    if (!document.fullscreenElement) {
      setShowFullscreenModal(true)
    }

    const logViolation = (type, detail) => {
      const newViolation = {
        type,
        timestamp: new Date().toISOString(),
        detail
      }
      setViolations(prev => {
        const updated = [...prev, newViolation]
        // Save to local storage immediately so it persists on refresh
        const key = AUTOSAVE_KEY(id, user._id)
        const saved = localStorage.getItem(key)
        if (saved) {
          try {
            const parsed = JSON.parse(saved)
            parsed.violations = updated
            localStorage.setItem(key, JSON.stringify(parsed))
          } catch (_) {}
        }
        // Tự động nộp bài nếu vi phạm từ 3 lần trở lên
        if (updated.length >= 3) {
          setTimeout(() => {
            alert('⚠️ Bạn đã vi phạm quy chế thi quá 3 lần (chuyển tab/sao chép/thoát toàn màn hình). Bài thi sẽ được tự động nộp ngay lập tức!');
            // Kích hoạt nộp bài
            handleAutoSubmit(updated);
          }, 100);
        }
        return updated
      })
      setLastViolationType(type)
    }

    const handleVisibilityChange = () => {
      if (document.hidden) {
        logViolation('TAB_SWITCH', 'Sinh viên chuyển sang tab hoặc ứng dụng khác')
      }
    }

    const handleWindowBlur = () => {
      logViolation('WINDOW_BLUR', 'Sinh viên click ra ngoài cửa sổ bài thi')
    }

    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        setIsFullscreenActive(false)
        logViolation('FULLSCREEN_EXIT', 'Sinh viên thoát chế độ toàn màn hình')
        // Bắt buộc quay lại fullscreen
        setShowFullscreenModal(true)
      } else {
        setIsFullscreenActive(true)
      }
    }

    const handleCopyPaste = (e) => {
      e.preventDefault() // Ngăn chặn copy/cut/paste
      logViolation('TAB_SWITCH', 'Sinh viên thực hiện sao chép (copy/cut/paste) tài liệu')
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('blur', handleWindowBlur)
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    document.addEventListener('copy', handleCopyPaste)
    document.addEventListener('cut', handleCopyPaste)
    document.addEventListener('paste', handleCopyPaste)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('blur', handleWindowBlur)
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
      document.removeEventListener('copy', handleCopyPaste)
      document.removeEventListener('cut', handleCopyPaste)
      document.removeEventListener('paste', handleCopyPaste)
    }
  }, [quiz, finished, loading, id, user._id, handleAutoSubmit])

  // --- Load quiz ---
  useEffect(() => {
    const fetchQuiz = async () => {
      try {
        const { data: check } = await api.get(`/quizzes/${id}/check-attempt`)
        if (!check.can_attempt) {
          alert(t('quiz.limit_reached', { score: check.best_score }))
          navigate('/quiz/dashboard')
          return
        }
        const { data } = await api.get(`/quizzes/${id}`)
        setQuiz(data)
        if (data.time_limit_sec) setTimer(data.time_limit_sec)
        else setTimer(-1)

        // Check for saved progress
        const key = AUTOSAVE_KEY(id, user._id)
        const saved = localStorage.getItem(key)
        if (saved) {
          try {
            const parsed = JSON.parse(saved)
            if (parsed.responses && parsed.responses.length > 0) {
              setSavedData(parsed)
              setShowRestorePrompt(true)
            }
          } catch (_) { /* ignore */ }
        }

        // Initialize order items for ORDERING questions
        const initialOrder = {}
        data.questions.forEach((q, idx) => {
          if (q.question_type === 'ORDERING') {
            // Shuffle the answers for display
            initialOrder[idx] = [...q.answers].sort(() => Math.random() - 0.5)
          }
        })
        setOrderItems(initialOrder)
      } catch (err) {
        console.error(err)
        navigate('/quiz/dashboard')
      } finally {
        setLoading(false)
      }
    }
    fetchQuiz()
  }, [id, navigate, t, user._id])

  // --- Auto-save every 30 seconds ---
  useEffect(() => {
    if (!quiz || finished || loading) return
    const key = AUTOSAVE_KEY(id, user._id)
    const interval = setInterval(() => {
      const savePayload = {
        responses,
        currentIndex,
        violations,
        savedAt: new Date().toISOString(),
        quizTitle: quiz.title
      }
      localStorage.setItem(key, JSON.stringify(savePayload))
    }, 30000)
    return () => clearInterval(interval)
  }, [quiz, responses, currentIndex, violations, finished, loading, id, user._id])

  // --- Save on every answer change ---
  const saveProgress = useCallback((newResponses, newIndex) => {
    if (!quiz) return
    const key = AUTOSAVE_KEY(id, user._id)
    localStorage.setItem(key, JSON.stringify({
      responses: newResponses,
      currentIndex: newIndex,
      violations,
      savedAt: new Date().toISOString(),
      quizTitle: quiz.title
    }))
  }, [quiz, id, user._id, violations])


  // --- Timer ---
  const handleSubmit = useCallback(async () => {
    if (submitting) return
    setSubmitting(true)
    try {
      const timeSpent = Math.round((Date.now() - startedAt.current) / 1000)
      
      // Build final responses including ORDERING
      const finalResponses = [...responses]
      if (quiz) {
        quiz.questions.forEach((q, idx) => {
          if (q.question_type === 'ORDERING') {
            const items = orderItems[idx] || []
            const existing = finalResponses.findIndex(r => r.question_id === q._id)
            const orderResp = {
              question_id: q._id,
              order_response: items.map(item => item._id)
            }
            if (existing > -1) finalResponses[existing] = { ...finalResponses[existing], ...orderResp }
            else finalResponses.push(orderResp)
          }
        })
      }

      // Exit fullscreen before navigate
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {})
      }

      const { data } = await api.post(`/quizzes/${id}/attempts`, {
        responses: finalResponses,
        time_spent_sec: timeSpent,
        violations: violations,
        cheat_detected: violations.length > 0
      })

      // Clear saved progress
      localStorage.removeItem(AUTOSAVE_KEY(id, user._id))
      setFinished(true)

      // Navigate to detailed result page
      navigate(`/quiz/${id}/result/${data.result.attempt_id}`)
    } catch (err) {
      const errorMsg = err.response?.data?.error || err.response?.data || err.message
      alert(typeof errorMsg === 'string' ? errorMsg : t('quiz.submit_error'))
    } finally {
      setSubmitting(false)
    }
  }, [id, responses, orderItems, quiz, submitting, navigate, t, user._id, violations])

  useEffect(() => {
    if (loading || finished) return
    if (quiz?.time_limit_sec && timer > 0) {
      const interval = setInterval(() => setTimer(prev => prev - 1), 1000)
      return () => clearInterval(interval)
    } else if (quiz?.time_limit_sec && timer === 0) {
      handleSubmit()
    }
  }, [timer, finished, quiz, loading, handleSubmit])

  // Intercept routing transitions using onExit callback on QuizNavbar
  const handleExit = useCallback(async (targetUrl) => {
    if (finished || submitting) {
      navigate(targetUrl)
      return
    }
    const confirmExit = window.confirm(
      t('quiz.confirm_exit_submit') || 
      'Bạn có chắc chắn muốn thoát? Bài làm của bạn sẽ được tự động nộp với số câu hỏi đã hoàn thành.'
    )
    if (confirmExit) {
      await handleSubmit()
    }
  }, [finished, submitting, handleSubmit, navigate, t])

  // Intercept window reload or tab close
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (quiz && !finished && !submitting) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [quiz, finished, submitting]);

  // --- Answer handlers ---
  const handleSelectAnswer = (answerId) => {
    const question = quiz.questions[currentIndex]
    const newResponses = [...responses]
    const existing = newResponses.findIndex(r => r.question_id === question._id)
    const responseData = { question_id: question._id, selected_answer_id: answerId }
    if (existing > -1) newResponses[existing] = responseData
    else newResponses.push(responseData)
    setResponses(newResponses)
    saveProgress(newResponses, currentIndex)
  }

  const handleToggleMultiAnswer = (answerId) => {
    const question = quiz.questions[currentIndex]
    const newResponses = [...responses]
    const existing = newResponses.findIndex(r => r.question_id === question._id)
    let selectedIds = existing > -1 ? (newResponses[existing].selected_answer_ids || []) : []
    const strId = String(answerId)
    if (selectedIds.map(String).includes(strId)) {
      selectedIds = selectedIds.filter(id => String(id) !== strId)
    } else {
      selectedIds = [...selectedIds, answerId]
    }
    const responseData = { question_id: question._id, selected_answer_ids: selectedIds }
    if (existing > -1) newResponses[existing] = responseData
    else newResponses.push(responseData)
    setResponses(newResponses)
    saveProgress(newResponses, currentIndex)
  }

  const handleTextResponse = (text) => {
    const question = quiz.questions[currentIndex]
    const newResponses = [...responses]
    const existing = newResponses.findIndex(r => r.question_id === question._id)
    const responseData = { question_id: question._id, text_response: text }
    if (existing > -1) newResponses[existing] = responseData
    else newResponses.push(responseData)
    setResponses(newResponses)
    saveProgress(newResponses, currentIndex)
  }

  // --- ORDERING drag-and-drop ---
  const handleDragStart = (idx, item) => {
    setDragItem({ questionIdx: idx, item })
  }

  const handleDragOver = (e) => {
    e.preventDefault()
  }

  const handleDrop = (questionIdx, dropIndex) => {
    if (!dragItem || dragItem.questionIdx !== questionIdx) return
    const items = [...(orderItems[questionIdx] || [])]
    const dragIndex = items.findIndex(i => i._id === dragItem.item._id)
    if (dragIndex === -1) return
    items.splice(dragIndex, 1)
    items.splice(dropIndex, 0, dragItem.item)
    setOrderItems(prev => ({ ...prev, [questionIdx]: items }))
    setDragItem(null)
  }

  // Restore from saved progress
  const handleRestore = () => {
    if (savedData) {
      setResponses(savedData.responses || [])
      setCurrentIndex(savedData.currentIndex || 0)
    }
    setShowRestorePrompt(false)
    setSavedData(null)
  }
  const handleDiscard = () => {
    localStorage.removeItem(AUTOSAVE_KEY(id, user._id))
    setShowRestorePrompt(false)
    setSavedData(null)
  }

  // --- Loading state ---
  if (loading) return (
    <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)' }}>
      <div style={{ textAlign: 'center' }}>
        <div className="spinner" style={{ width: 48, height: 48, margin: '0 auto 1rem', borderWidth: 4, borderColor: 'rgba(255,255,255,0.1)', borderTopColor: '#6c63ff' }} />
        <p style={{ color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>{t('quiz.loading_quiz')}</p>
      </div>
    </div>
  )
  if (!quiz) return null

  const currentQuestion = quiz.questions[currentIndex]
  const currentResponse = responses.find(r => r.question_id === currentQuestion?._id)
  const answeredCount = responses.filter(r => {
    if (r.selected_answer_id) return true
    if (r.selected_answer_ids?.length > 0) return true
    if (r.text_response?.trim()) return true
    if (r.order_response?.length > 0) return true
    return false
  }).length

  const timerDanger = quiz.time_limit_sec && timer < 60 && timer > 0

  return (
    <div className="quiz-page-bg" style={{
      minHeight: '100vh',
      background: 'radial-gradient(circle at top left, rgba(108,99,255,0.08) 0%, transparent 40%), radial-gradient(circle at bottom right, rgba(0,212,255,0.05) 0%, transparent 40%), var(--bg)',
      color: 'var(--text)',
      paddingTop: '100px',
      paddingBottom: '60px',
      transition: 'background 0.3s ease'
    }}>
      <QuizNavbar onExit={handleExit} />

      {/* Modal yêu cầu kích hoạt fullscreen để làm bài */}
      {showFullscreenModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(5, 7, 12, 0.85)',
          backdropFilter: 'blur(16px)', zIndex: 9998,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
        }}>
          <div style={{
            background: 'var(--bg-2)', border: '1px solid rgba(239, 68, 68, 0.25)',
            borderRadius: 24, padding: '2.5rem', maxWidth: 460, width: '100%',
            boxShadow: '0 30px 60px rgba(0,0,0,0.5), 0 0 40px rgba(239, 68, 68, 0.1)', textAlign: 'center'
          }}>
            <div style={{ fontSize: '4.5rem', marginBottom: '1.25rem', filter: 'drop-shadow(0 8px 16px rgba(239,68,68,0.2))' }}>🖥️</div>
            <h3 style={{ fontWeight: 800, color: 'var(--danger)', fontSize: '1.5rem', marginBottom: '0.75rem', letterSpacing: '-0.01em' }}>Bắt buộc Toàn màn hình</h3>
            <p style={{ color: 'var(--text-2)', fontSize: '0.92rem', marginBottom: '1.75rem', lineHeight: 1.6 }}>
              Bài kiểm tra này yêu cầu bảo mật cao. Bạn buộc phải thực hiện làm bài ở chế độ toàn màn hình. Mọi hành vi thoát toàn màn hình hoặc chuyển tab sẽ bị ghi nhận vào nhật ký nộp cho giảng viên.
            </p>
            <button
              onClick={requestFullscreen}
              className="btn btn-primary"
              style={{
                width: '100%', padding: '0.9rem', borderRadius: 12,
                background: 'linear-gradient(135deg, var(--primary), var(--primary-2))',
                fontWeight: 700, border: 'none', cursor: 'pointer', fontSize: '1rem',
                boxShadow: '0 8px 24px rgba(108,99,255,0.35)'
              }}
            >
              🚀 Bắt đầu làm bài (Toàn màn hình)
            </button>
          </div>
        </div>
      )}

      {/* Restore Prompt Modal */}
      {showRestorePrompt && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(5, 7, 12, 0.8)',
          backdropFilter: 'blur(12px)', zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
        }}>
          <div style={{
            background: 'var(--bg-2)', border: '1px solid var(--border)',
            borderRadius: 24, padding: '2.5rem', maxWidth: 430, width: '100%',
            boxShadow: '0 30px 60px rgba(0,0,0,0.6)', textAlign: 'center'
          }}>
            <div style={{ fontSize: '3.5rem', marginBottom: '1.25rem', filter: 'drop-shadow(0 8px 16px rgba(108,99,255,0.2))' }}>💾</div>
            <h3 style={{ fontWeight: 800, fontSize: '1.4rem', marginBottom: '0.75rem', color: 'var(--text)' }}>Tiếp tục bài làm?</h3>
            <p style={{ color: 'var(--text-2)', fontSize: '0.9rem', marginBottom: '0.5rem', lineHeight: 1.5 }}>
              Hệ thống phát hiện tiến trình làm bài chưa hoàn thành của bạn.
            </p>
            {savedData?.savedAt && (
              <p style={{ color: 'var(--text-3)', fontSize: '0.8rem', marginBottom: '1.75rem', fontWeight: 500 }}>
                Đã lưu lúc: {new Date(savedData.savedAt).toLocaleString('vi-VN')}
              </p>
            )}
            <div style={{ display: 'flex', gap: '0.85rem' }}>
              <button onClick={handleDiscard} className="btn btn-secondary" style={{ flex: 1, borderRadius: 12, padding: '0.75rem' }}>
                🗑️ Bắt đầu lại
              </button>
              <button onClick={handleRestore} className="btn btn-primary" style={{ flex: 1, borderRadius: 12, padding: '0.75rem' }}>
                ▶️ Tiếp tục
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="quiz-play-container">
        {/* Progress Bar */}
        <div style={{ position: 'relative', height: 8, background: 'var(--glass)', borderRadius: 99, marginBottom: '2rem', overflow: 'hidden', border: '1px solid var(--border)' }}>
          <div style={{
            height: '100%', borderRadius: 99,
            background: 'linear-gradient(to right, var(--primary), var(--accent))',
            width: `${((currentIndex + 1) / quiz.questions.length) * 100}%`,
            transition: 'width 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
            boxShadow: '0 0 10px var(--primary-dim)'
          }} />
        </div>

        {/* Header */}
        <div className="quiz-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'var(--glass)', padding: '0.5rem 1.25rem', borderRadius: '14px', border: '1px solid var(--border)' }}>
            <span style={{ fontSize: '1.2rem', animation: timerDanger ? 'pulse 1s infinite' : 'none' }}>⏱️</span>
            <span style={{
              fontSize: '1.4rem', fontWeight: 800,
              color: timerDanger ? 'var(--danger)' : 'var(--text)',
              fontFamily: 'var(--font-mono)',
              textShadow: timerDanger ? '0 0 8px rgba(239, 68, 68, 0.4)' : 'none'
            }}>
              {quiz.time_limit_sec ? `${Math.floor(timer / 60)}:${String(timer % 60).padStart(2, '0')}` : '∞'}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            {/* Nav panel toggle */}
            <button
              onClick={() => setShowNavPanel(p => !p)}
              style={{
                background: 'var(--glass)', border: '1px solid var(--border)',
                borderRadius: 12, padding: '8px 16px', color: 'var(--text)', cursor: 'pointer',
                fontSize: '0.85rem', fontWeight: 700, transition: 'all 0.2s ease',
                display: 'flex', alignItems: 'center', gap: '0.4rem'
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--glass-hover)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'var(--glass)' }}
            >
              🗺️ Bản đồ: {answeredCount}/{quiz.questions.length}
            </button>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-3)', fontWeight: 600, textTransform: 'uppercase' }}>{t('quiz.question_label')}</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text)' }}>{currentIndex + 1}/{quiz.questions.length}</div>
            </div>
          </div>
        </div>

        {/* Navigation Panel */}
        {showNavPanel && (
          <div style={{
            background: 'var(--bg-2)',
            border: '1px solid var(--border)',
            borderRadius: 24,
            padding: '1.5rem',
            marginBottom: '2rem',
            boxShadow: 'var(--shadow-lg)',
            animation: 'scaleIn 0.3s ease'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Bản đồ câu hỏi
              </div>
              <button onClick={() => setShowNavPanel(false)} style={{ color: 'var(--text-3)', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}>Đóng ✕</button>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem' }}>
              {quiz.questions.map((q, idx) => {
                const resp = responses.find(r => r.question_id === q._id)
                const isAnswered = resp && (resp.selected_answer_id || resp.selected_answer_ids?.length > 0 || resp.text_response?.trim() || resp.order_response?.length > 0)
                return (
                  <button
                    key={idx}
                    onClick={() => { setCurrentIndex(idx); setShowNavPanel(false) }}
                    style={{
                      width: 40, height: 40, borderRadius: 12, border: 'none',
                      fontWeight: 800, fontSize: '0.9rem', cursor: 'pointer',
                      background: currentIndex === idx
                        ? 'var(--primary)'
                        : isAnswered
                          ? 'rgba(34, 197, 94, 0.15)'
                          : 'var(--glass)',
                      color: currentIndex === idx
                        ? 'white'
                        : isAnswered
                          ? 'var(--success)'
                          : 'var(--text-2)',
                      border: currentIndex === idx
                        ? '2px solid white'
                        : isAnswered
                          ? '1px solid rgba(34, 197, 94, 0.3)'
                          : '1px solid var(--border)',
                      boxShadow: currentIndex === idx ? '0 0 12px var(--primary-dim)' : 'none',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    {idx + 1}
                  </button>
                )
              })}
            </div>
            <div style={{ display: 'flex', gap: '1.5rem', marginTop: '1.25rem', fontSize: '0.8rem', color: 'var(--text-3)', borderTop: '1px solid var(--border)', paddingTop: '0.75rem' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--text-3)' }} /> Chưa trả lời</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--success)' }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--success)' }} /> Đã trả lời</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--primary)' }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--primary)' }} /> Câu hiện tại</span>
            </div>
          </div>
        )}

        {/* Question Card */}
        <div className="question-card">
          {/* Question type badge */}
          <div style={{ marginBottom: '1.25rem' }}>
            <span style={{
              fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em',
              background: 'rgba(108,99,255,0.12)', color: 'var(--primary-2)',
              padding: '6px 14px', borderRadius: 100, border: '1px solid rgba(108,99,255,0.2)'
            }}>
              {getQuestionTypeLabel(currentQuestion.question_type)}
            </span>
          </div>
          <h1 className="question-text">{currentQuestion.content}</h1>
          {(currentQuestion.media_url || currentQuestion.image_url || currentQuestion.video_url) && (
            <MediaRenderer
              url={currentQuestion.media_url || currentQuestion.image_url || currentQuestion.video_url}
              type={currentQuestion.media_type}
              style={{ margin: '2rem auto 0', maxWidth: '100%', borderRadius: '16px', overflow: 'hidden', boxShadow: 'var(--shadow)' }}
            />
          )}
        </div>

        {/* Answers Area */}
        {renderAnswerArea(currentQuestion, currentIndex, currentResponse, orderItems, {
          handleSelectAnswer,
          handleToggleMultiAnswer,
          handleTextResponse,
          handleDragStart,
          handleDragOver,
          handleDrop,
          setOrderItems
        })}

        {/* Navigation Buttons */}
        <div style={{ marginTop: '3rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
          <button
            className="btn btn-secondary"
            disabled={currentIndex === 0}
            onClick={() => setCurrentIndex(i => i - 1)}
            style={{ borderRadius: '12px', padding: '0.75rem 1.5rem', fontWeight: 700 }}
          >
            ← {t('quiz.prev_btn')}
          </button>

          {currentIndex === quiz.questions.length - 1 ? (
            <button className="btn btn-primary" onClick={handleSubmit} disabled={submitting}
              style={{
                background: 'linear-gradient(135deg, #10b981, #059669)',
                borderRadius: '12px',
                padding: '0.75rem 2rem',
                fontWeight: 800,
                boxShadow: '0 8px 24px rgba(16, 185, 129, 0.25)'
              }}>
              {submitting ? t('quiz.submitting') : `🚀 ${t('quiz.submit_btn')}`}
            </button>
          ) : (
            <button className="btn btn-primary" onClick={() => setCurrentIndex(i => i + 1)}
              style={{ borderRadius: '12px', padding: '0.75rem 1.5rem', fontWeight: 700 }}>
              {t('quiz.next_btn')} →
            </button>
          )}
        </div>

        {/* Auto-save indicator */}
        <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', fontWeight: 500 }}>
            💾 Tiến trình tự động lưu mỗi 30 giây
          </span>
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  )
}

function getQuestionTypeLabel(type) {
  const labels = {
    SINGLE_CHOICE: '🔘 Một đáp án',
    MULTIPLE_CHOICE: '☑️ Nhiều đáp án',
    TRUE_FALSE: '✔️ Đúng / Sai',
    FILL_BLANK: '✍️ Điền khuyết',
    SHORT_ANSWER: '📝 Tự luận',
    ORDERING: '🔀 Sắp xếp thứ tự'
  }
  return labels[type] || type
}

function renderAnswerArea(question, questionIdx, currentResponse, orderItems, handlers) {
  const { handleSelectAnswer, handleToggleMultiAnswer, handleTextResponse, handleDragStart, handleDragOver, handleDrop } = handlers

  if (question.question_type === 'SINGLE_CHOICE' || question.question_type === 'TRUE_FALSE') {
    return (
      <div className="answers-grid">
        {question.answers?.map((ans, i) => {
          const isSelected = currentResponse?.selected_answer_id === ans._id || String(currentResponse?.selected_answer_id) === String(ans._id)
          return (
            <button
              key={ans._id}
              className={`answer-btn variant-${i % 4} ${isSelected ? 'selected' : ''}`}
              onClick={() => handleSelectAnswer(ans._id)}
            >
              <span className="symbol" style={{ position: 'absolute', top: '50%', transform: 'translateY(-50%)', left: '1.5rem', opacity: 0.8, fontSize: '1.3rem', fontWeight: 'bold' }}>
                {['▲', '◆', '●', '■'][i % 4]}
              </span>
              <span>{ans.content}</span>
            </button>
          )
        })}
      </div>
    )
  }

  if (question.question_type === 'MULTIPLE_CHOICE') {
    const selectedIds = (currentResponse?.selected_answer_ids || []).map(String)
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', marginTop: '1rem' }}>
        <p style={{ color: 'var(--text-3)', fontSize: '0.85rem', fontStyle: 'italic', marginBottom: '0.25rem', fontWeight: 500 }}>
          💡 Chọn tất cả đáp án đúng
        </p>
        {question.answers?.map((ans, i) => {
          const isSelected = selectedIds.includes(String(ans._id))
          return (
            <button
              key={ans._id}
              onClick={() => handleToggleMultiAnswer(ans._id)}
              style={{
                display: 'flex', alignItems: 'center', gap: '1rem',
                padding: '1.15rem 1.5rem', borderRadius: 16, cursor: 'pointer',
                background: isSelected ? 'var(--primary-dim)' : 'var(--bg-2)',
                border: isSelected ? '2px solid var(--primary)' : '1px solid var(--border)',
                color: 'var(--text)', textAlign: 'left', transition: 'all 0.2s ease', fontWeight: 600,
                fontSize: '1.05rem', boxShadow: 'var(--shadow)'
              }}
              onMouseEnter={e => { if (!isSelected) e.currentTarget.style.borderColor = 'var(--border-hover)' }}
              onMouseLeave={e => { if (!isSelected) e.currentTarget.style.borderColor = 'var(--border)' }}
            >
              <span style={{
                width: 24, height: 24, borderRadius: 6, flexShrink: 0,
                background: isSelected ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
                border: `2px solid ${isSelected ? 'var(--primary)' : 'var(--border)'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.85rem', transition: 'all 0.2s', color: 'white'
              }}>
                {isSelected ? '✓' : ''}
              </span>
              {ans.content}
            </button>
          )
        })}
      </div>
    )
  }

  if (question.question_type === 'FILL_BLANK') {
    return (
      <div style={{ marginTop: '1.5rem' }}>
        <p style={{ color: 'var(--text-3)', fontSize: '0.85rem', fontStyle: 'italic', marginBottom: '1rem', fontWeight: 500 }}>
          ✍️ Điền câu trả lời vào ô bên dưới
        </p>
        <input
          type="text"
          value={currentResponse?.text_response || ''}
          onChange={e => handleTextResponse(e.target.value)}
          placeholder="Nhập câu trả lời của bạn..."
          style={{
            width: '100%', padding: '1.25rem 1.5rem',
            background: 'var(--bg-2)', border: '2px solid var(--border)',
            borderRadius: 16, color: 'var(--text)', fontSize: '1.1rem', fontWeight: 600,
            outline: 'none', transition: 'all 0.25s ease',
            boxSizing: 'border-box', boxShadow: 'var(--shadow)'
          }}
          onFocus={e => { e.target.style.borderColor = 'var(--primary)'; e.target.style.boxShadow = '0 0 15px var(--primary-dim)' }}
          onBlur={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.boxShadow = 'var(--shadow)' }}
        />
      </div>
    )
  }

  if (question.question_type === 'SHORT_ANSWER') {
    return (
      <div style={{ marginTop: '1.5rem' }}>
        <p style={{ color: 'var(--text-3)', fontSize: '0.85rem', fontStyle: 'italic', marginBottom: '1rem', fontWeight: 500 }}>
          📝 Viết câu trả lời ngắn gọn của bạn
        </p>
        <textarea
          value={currentResponse?.text_response || ''}
          onChange={e => handleTextResponse(e.target.value)}
          placeholder="Nhập câu trả lời của bạn..."
          rows={5}
          style={{
            width: '100%', padding: '1.25rem 1.5rem',
            background: 'var(--bg-2)', border: '2px solid var(--border)',
            borderRadius: 16, color: 'var(--text)', fontSize: '1.05rem',
            outline: 'none', resize: 'vertical', transition: 'all 0.25s ease',
            fontFamily: 'inherit', lineHeight: 1.6, boxSizing: 'border-box',
            boxShadow: 'var(--shadow)'
          }}
          onFocus={e => { e.target.style.borderColor = 'var(--primary)'; e.target.style.boxShadow = '0 0 15px var(--primary-dim)' }}
          onBlur={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.boxShadow = 'var(--shadow)' }}
        />
      </div>
    )
  }

  if (question.question_type === 'ORDERING') {
    const items = orderItems[questionIdx] || question.answers || []
    return (
      <div style={{ marginTop: '1.5rem' }}>
        <p style={{ color: 'var(--text-3)', fontSize: '0.85rem', fontStyle: 'italic', marginBottom: '1rem', fontWeight: 500 }}>
          🔀 Kéo và thả để sắp xếp theo thứ tự đúng
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {items.map((item, dropIdx) => {
            const isDragging = dragItem?.item?._id === item._id
            return (
              <div
                key={item._id}
                draggable
                onDragStart={() => handleDragStart(questionIdx, item)}
                onDragOver={handleDragOver}
                onDrop={() => handleDrop(questionIdx, dropIdx)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '1rem',
                  padding: '1rem 1.5rem', borderRadius: 16,
                  background: isDragging ? 'var(--primary-dim)' : 'var(--bg-2)',
                  border: isDragging ? '2px solid var(--primary)' : '1px solid var(--border)',
                  cursor: 'grab', transition: 'all 0.2s ease',
                  color: 'var(--text)', fontWeight: 600, userSelect: 'none',
                  boxShadow: 'var(--shadow)'
                }}
                onMouseEnter={e => { if (!isDragging) e.currentTarget.style.borderColor = 'var(--border-hover)' }}
                onMouseLeave={e => { if (!isDragging) e.currentTarget.style.borderColor = 'var(--border)' }}
              >
                <span style={{
                  width: 32, height: 32, borderRadius: 10,
                  background: 'var(--glass)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 800, fontSize: '0.9rem', flexShrink: 0,
                  border: '1px solid var(--border)', color: 'var(--text-2)'
                }}>
                  {dropIdx + 1}
                </span>
                <span style={{ fontSize: '1.1rem', color: 'var(--text-3)' }}>⠿</span>
                <span style={{ flex: 1, fontSize: '1.05rem' }}>{item.content}</span>
              </div>
            )
          })}
        </div>
        <p style={{ color: 'var(--text-3)', fontSize: '0.8rem', marginTop: '1rem', textAlign: 'center', fontWeight: 500 }}>
          💡 Bạn có thể kéo thả các thẻ đáp án để thay đổi vị trí
        </p>
      </div>
    )
  }

  return null
}
