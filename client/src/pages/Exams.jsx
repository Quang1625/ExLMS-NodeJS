import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Layout from '../components/Layout'
import api from '../api/axios'
import { useAuth } from '../context/AuthContext'
import { showError } from '../utils/errors'
import { Shield, Key, Clock, RotateCcw, Target, Play, Trash2, BookOpen, FileText } from 'lucide-react'

const EXAM_COLORS = [
  { gradient: 'linear-gradient(135deg, #6c63ff 0%, #4834d4 100%)', shadow: 'rgba(108,99,255,0.3)' },
  { gradient: 'linear-gradient(135deg, #00d4ff 0%, #0089b3 100%)', shadow: 'rgba(0,212,255,0.3)' },
  { gradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', shadow: 'rgba(245,158,11,0.3)' },
  { gradient: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)', shadow: 'rgba(239,68,68,0.3)' },
]

export default function Exams() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [exams, setExams] = useState([])
  const [loading, setLoading] = useState(true)
  const canManage = user?.role === 'INSTRUCTOR' || user?.role === 'ADMIN'

  useEffect(() => {
    const fetchExams = async () => {
      try {
        const { data } = await api.get('/quizzes/exams')
        setExams(Array.isArray(data) ? data : [])
      } catch (err) {
        console.error('Error fetching exams:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchExams()
  }, [])

  const startExam = async (exam) => {
    const { data: check } = await api.get(`/quizzes/${exam._id}/check-attempt`)
    if (!check.can_attempt) { alert(t('exams.limit_reached')); return }
    const code = prompt(t('exams.room_code_prompt'))
    if (!code) return
    if (code.toUpperCase() !== exam.access_code?.toUpperCase()) { alert(t('exams.invalid_code')); return }
    navigate(`/quiz/${exam._id}`)
  }

  const handleDeleteExam = async (examId) => {
    if (!window.confirm(t('forum.delete_confirm'))) return
    try {
      await api.delete(`/quizzes/${examId}`)
      setExams(exams.filter(ex => ex._id !== examId))
    } catch (err) {
      showError(t, err)
    }
  }

  if (loading) return <Layout><div className="spinner-wrap"><div className="spinner" /></div></Layout>

  return (
    <Layout>
      <div className="page fade-in">
        <div style={{ marginBottom: '2.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: '1px solid var(--border)', paddingBottom: '1.5rem' }}>
          <div>
            <h1 style={{ fontSize: '2.2rem', fontWeight: 800, letterSpacing: '-0.02em', background: 'linear-gradient(135deg, var(--text) 30%, var(--primary-2) 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: '0.4rem' }}>
              {t('exams.title')}
            </h1>
            <p style={{ color: 'var(--text-2)', fontSize: '0.95rem' }}>{t('exams.subtitle')}</p>
          </div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-3)', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--glass)', padding: '0.5rem 1rem', borderRadius: '99px', border: '1px solid var(--border)' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><FileText size={16} /> Tổng số bài thi:</span>
            <strong style={{ color: 'var(--primary-2)' }}>{exams.length}</strong>
          </div>
        </div>

        {exams.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '6rem 2rem', background: 'var(--glass)', border: '1px dashed var(--border)', borderRadius: '24px' }}>
            <FileText size={64} style={{ color: 'var(--text-3)', marginBottom: '1.5rem', filter: 'drop-shadow(0 8px 16px rgba(108,99,255,0.2))' }} />
            <h3 style={{ fontWeight: 800, fontSize: '1.4rem', marginBottom: '0.5rem', color: 'var(--text)' }}>{t('exams.empty_title')}</h3>
            <p style={{ color: 'var(--text-2)', maxWidth: '400px', margin: '0 auto', fontSize: '0.9rem', lineHeight: '1.6' }}>{t('exams.empty_subtitle')}</p>
          </div>
        ) : (
          <div className="grid-3" style={{ gap: '1.75rem' }}>
            {exams.map((exam, i) => {
              const color = EXAM_COLORS[i % EXAM_COLORS.length]
              return (
                <div
                  key={exam._id}
                  className="glass-card-hover"
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    padding: 0,
                    overflow: 'hidden',
                    borderRadius: '24px',
                    background: 'var(--bg-2)',
                    border: '1px solid var(--border)',
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                  }}
                >
                  {/* Card Header Gradient banner */}
                  <div style={{
                    background: color.gradient,
                    padding: '1.75rem 1.5rem',
                    position: 'relative',
                    overflow: 'hidden'
                  }}>
                    {/* Decorative Background Circles */}
                    <div style={{
                      position: 'absolute', top: '-15px', right: '-15px',
                      width: '90px', height: '90px', borderRadius: '50%',
                      background: 'rgba(255,255,255,0.12)', filter: 'blur(5px)'
                    }} />
                    <div style={{
                      position: 'absolute', bottom: '-25px', left: '15px',
                      width: '70px', height: '70px', borderRadius: '50%',
                      background: 'rgba(255,255,255,0.06)', filter: 'blur(3px)'
                    }} />
                    
                    <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
                      <span style={{
                        fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase',
                        letterSpacing: '0.08em', background: 'rgba(255,255,255,0.22)',
                        padding: '3px 10px', borderRadius: '99px', color: '#fff',
                        backdropFilter: 'blur(4px)'
                      }}>
                        {t('course_detail.exam_label')}
                      </span>
                      {exam.enable_anti_cheat && (
                        <span style={{
                          fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase',
                          letterSpacing: '0.08em', background: 'rgba(239, 68, 68, 0.4)',
                          padding: '3px 10px', borderRadius: '99px', color: '#ffb3b3',
                          backdropFilter: 'blur(4px)', display: 'inline-flex', alignItems: 'center', gap: '4px'
                        }}>
                          <Shield size={10} /> Chống gian lận
                        </span>
                      )}
                      {exam.access_code && (
                        <span style={{
                          fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase',
                          letterSpacing: '0.08em', background: 'rgba(245, 158, 11, 0.4)',
                          padding: '3px 10px', borderRadius: '99px', color: '#ffe17d',
                          backdropFilter: 'blur(4px)', display: 'inline-flex', alignItems: 'center', gap: '4px'
                        }}>
                          <Key size={10} /> Cần mã phòng
                        </span>
                      )}
                    </div>

                    <h3 style={{ fontWeight: 800, fontSize: '1.25rem', color: '#fff', lineHeight: 1.35, textShadow: '0 2px 4px rgba(0,0,0,0.15)' }}>
                      {exam.title}
                    </h3>
                    {exam.course_id?.title && (
                      <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.85)', marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 500 }}>
                        <BookOpen size={14} /> <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{exam.course_id.title}</span>
                      </div>
                    )}
                  </div>

                  {/* Card Body Info list */}
                  <div style={{ padding: '1.5rem', flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--bg-2)' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', flex: 1 }}>
                      {[
                        { label: t('quiz.form.time_limit'), value: exam.time_limit_sec ? `${Math.floor(exam.time_limit_sec / 60)} phút` : 'Không giới hạn', icon: <Clock size={14} />, color: 'var(--accent)' },
                        { label: t('quiz.form.attempts'), value: exam.max_attempts ? `${exam.max_attempts} lần` : 'Vô hạn', icon: <RotateCcw size={14} />, color: 'var(--primary-2)' },
                        { label: t('quiz.form.pass_score'), value: `${exam.passing_score}%`, icon: <Target size={14} />, color: 'var(--success)' },
                      ].map((item, idx) => (
                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.88rem' }}>
                          <span style={{ color: 'var(--text-2)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{
                              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                              width: '24px', height: '24px', borderRadius: '6px',
                              background: 'var(--glass)', color: item.color
                            }}>{item.icon}</span>
                            <span>{item.label}</span>
                          </span>
                          <span style={{ fontWeight: 700, color: 'var(--text)' }}>{item.value}</span>
                        </div>
                      ))}
                    </div>

                    <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
                      <button
                        className="btn btn-primary"
                        style={{
                          flex: 1,
                          justifyContent: 'center',
                          padding: '0.75rem 1.25rem',
                          borderRadius: '12px',
                          fontWeight: 750,
                          fontSize: '0.95rem',
                          boxShadow: `0 8px 20px ${color.shadow}`,
                          transition: 'all 0.25s ease'
                        }}
                        onClick={() => startExam(exam)}
                      >
                        <Play size={16} fill="currentColor" style={{ marginRight: '6px' }} /> {t('exams.btn_start')}
                      </button>
                      {canManage && (
                        <button
                          className="btn btn-danger"
                          style={{
                            padding: '0 1rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderRadius: '12px',
                            background: 'rgba(239, 68, 68, 0.08)',
                            border: '1px solid rgba(239, 68, 68, 0.15)',
                            transition: 'all 0.2s ease'
                          }}
                          title={t('common.delete')}
                          onClick={() => handleDeleteExam(exam._id)}
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </Layout>
  )
}
