import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Layout from '../components/Layout'
import api from '../api/axios'

const EXAM_COLORS = [
  { gradient: 'linear-gradient(135deg, #6c63ff 0%, #4834d4 100%)', shadow: 'rgba(108,99,255,0.3)' },
  { gradient: 'linear-gradient(135deg, #00d4ff 0%, #0089b3 100%)', shadow: 'rgba(0,212,255,0.3)' },
  { gradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', shadow: 'rgba(245,158,11,0.3)' },
  { gradient: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)', shadow: 'rgba(239,68,68,0.3)' },
]

export default function Exams() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [exams, setExams] = useState([])
  const [loading, setLoading] = useState(true)

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
    navigate(`/quiz/single/${exam._id}`)
  }

  if (loading) return <Layout><div className="spinner-wrap"><div className="spinner" /></div></Layout>

  return (
    <Layout>
      <div className="page fade-in">
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '1.85rem', fontWeight: 800, marginBottom: '0.25rem' }}>{t('exams.title')}</h1>
          <p style={{ color: 'var(--text-2)' }}>{t('exams.subtitle')}</p>
        </div>

        {exams.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '5rem 2rem' }}>
            <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>📋</div>
            <h3 style={{ fontWeight: 700, marginBottom: '0.5rem' }}>{t('exams.empty_title')}</h3>
            <p style={{ color: 'var(--text-3)', maxWidth: '360px', margin: '0 auto' }}>{t('exams.empty_subtitle')}</p>
          </div>
        ) : (
          <div className="grid-3">
            {exams.map((exam, i) => {
              const color = EXAM_COLORS[i % EXAM_COLORS.length]
              return (
                <div key={exam._id} className="card" style={{ display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }}>
                  {/* Card Header */}
                  <div style={{
                    background: color.gradient,
                    padding: '1.5rem',
                    position: 'relative',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      position: 'absolute', top: '-20px', right: '-20px',
                      width: '80px', height: '80px', borderRadius: '50%',
                      background: 'rgba(255,255,255,0.1)'
                    }} />
                    <div style={{
                      position: 'absolute', bottom: '-30px', left: '20px',
                      width: '60px', height: '60px', borderRadius: '50%',
                      background: 'rgba(255,255,255,0.05)'
                    }} />
                    <span style={{
                      fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase',
                      letterSpacing: '0.1em', background: 'rgba(255,255,255,0.2)',
                      padding: '3px 10px', borderRadius: '99px', color: '#fff'
                    }}>
                      {t('course_detail.exam_label')}
                    </span>
                    <div style={{ fontWeight: 800, fontSize: '1.2rem', marginTop: '0.75rem', color: '#fff', lineHeight: 1.3 }}>
                      {exam.title}
                    </div>
                    {exam.course_id?.title && (
                      <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.7)', marginTop: '0.4rem' }}>
                        📚 {exam.course_id.title}
                      </div>
                    )}
                  </div>

                  {/* Card Body */}
                  <div style={{ padding: '1.25rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', flex: 1 }}>
                      {[
                        { label: t('quiz.form.time_limit'), value: exam.time_limit_sec ? `${Math.floor(exam.time_limit_sec / 60)} min` : '∞', icon: '⏱️' },
                        { label: t('quiz.form.attempts'), value: exam.max_attempts || '∞', icon: '🔄' },
                        { label: t('quiz.form.pass_score'), value: `${exam.passing_score}%`, icon: '🎯' },
                      ].map((item, idx) => (
                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
                          <span style={{ color: 'var(--text-3)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <span style={{ fontSize: '0.9rem' }}>{item.icon}</span> {item.label}
                          </span>
                          <span style={{ fontWeight: 700 }}>{item.value}</span>
                        </div>
                      ))}
                    </div>

                    <button
                      className="btn btn-primary btn-lg"
                      style={{ width: '100%', marginTop: '1.25rem', justifyContent: 'center', boxShadow: `0 4px 16px ${color.shadow}` }}
                      onClick={() => startExam(exam)}
                    >
                      🚀 {t('exams.btn_start')}
                    </button>
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
