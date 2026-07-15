import { useEffect, useState, useCallback, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Layout from '../components/Layout'
import CrudModal from '../components/CrudModal'
import BuilderChapterModal from '../components/BuilderChapterModal'
import BuilderLessonModal from '../components/BuilderLessonModal'
import QuizQuestionEditor from '../components/QuizQuestionEditor'
import api from '../api/axios'
import MediaRenderer from '../components/MediaRenderer'
import { useAuth } from '../context/AuthContext'
import { showError } from '../utils/errors'

const buildUploadUrl = (resourceKey) => {
  if (!resourceKey) return '#'
  return `/uploads/lessons/${resourceKey}`
}

export default function CourseDetail() {
  const { t, i18n } = useTranslation()
  const { id } = useParams()
  const navigate = useNavigate()
  
  const [course, setCourse] = useState(null)
  const [openChapter, setOpenChapter] = useState(null)
  const [selectedLesson, setSelectedLesson] = useState(null)
  const [loading, setLoading] = useState(true)
  const [quizzes, setQuizzes] = useState([])
  const [quizModal, setQuizModal] = useState(null)
  const [chapterModal, setChapterModal] = useState(null)
  const [lessonModal, setLessonModal] = useState(null)
  const [editingQuizQuestions, setEditingQuizQuestions] = useState(null)
  
  // Word Import States
  const [showWordImportModal, setShowWordImportModal] = useState(false)
  const [importingWord, setImportingWord] = useState(false)
  const [wordFile, setWordFile] = useState(null)
  const [wordApiKey, setWordApiKey] = useState('')
  const [wordAmount, setWordAmount] = useState(10)
  const [wordTypes, setWordTypes] = useState(['SINGLE_CHOICE', 'MULTIPLE_CHOICE', 'SHORT_ANSWER'])
  const [wordDifficulty, setWordDifficulty] = useState('MEDIUM')
  
  // New States for LMS Player
  const [activeTab, setActiveTab] = useState('overview')
  const [notes, setNotes] = useState(() => localStorage.getItem(`notes_${id}`) || '')
  const [noteSaved, setNoteSaved] = useState(false)
  const [progress, setProgress] = useState(0)

  const { user } = useAuth()
  const canManage = user?.role === 'INSTRUCTOR' || user?.role === 'ADMIN'

  const QUIZ_FIELDS = useMemo(() => [
    { name: 'title',             label: t('course_detail.fields.quiz_title'),   type: 'text',     required: true, placeholder: t('course_detail.fields.quiz_placeholder') },
    { name: 'description',       label: t('assignments.form.desc_label'),          type: 'textarea', placeholder: t('assignments.form.desc_placeholder') },
    { name: 'time_limit_sec',    label: t('quiz.form.time_limit'), type: 'number',   placeholder: 'VD: 600', min: 0 },
    { name: 'max_attempts',      label: t('quiz.form.attempts'),  type: 'number',   default: 1, min: 1 },
    { name: 'passing_score',     label: t('quiz.form.pass_score'),   type: 'number',   default: 70, min: 0, max: 100 },
    { name: 'shuffle_questions', label: t('quiz.form.shuffle'), type: 'checkbox' },
    { name: 'result_visibility', label: t('quiz.form.visibility'), type: 'select',   required: true,
      options: [
        { value: 'IMMEDIATE',      label: t('quiz.form.vis_options.IMMEDIATE') },
        { value: 'AFTER_DEADLINE', label: t('quiz.form.vis_options.AFTER_DEADLINE') },
        { value: 'MANUAL',         label: t('quiz.form.vis_options.MANUAL') }
      ], default: 'IMMEDIATE' 
    },
    { name: 'quiz_type',         label: t('assignments.type'),       type: 'select',   required: true,
      options: [
        { value: 'PRACTICE',       label: t('course_detail.practice_label') },
        { value: 'EXAM',           label: t('course_detail.exam_label') }
      ], default: 'PRACTICE' }
  ], [t])


  const fetchCourse = async () => {
    try {
      const res = await api.get(`/courses/${id}`)
      const data = res.data.data ?? res.data
      setCourse(data)
      try {
        const progRes = await api.get(`/enrollments/my-progress/${id}`)
        setProgress(progRes.data.data?.progress_percent || 0)
      } catch (_) {
        setProgress(0)
      }
    } catch (err) { console.error(err) }
  }

  const fetchAll = useCallback(async () => {
    try {
      const [courseRes, quizzesRes] = await Promise.all([
        api.get(`/courses/${id}`),
        api.get(`/quizzes?course_id=${id}`)
      ])
      const cData = courseRes.data.data ?? courseRes.data
      setCourse(cData)
      if (!openChapter && cData.chapters?.length > 0) {
        setOpenChapter(cData.chapters[0]._id)
        if (cData.chapters[0].lessons?.length > 0) {
          setSelectedLesson(cData.chapters[0].lessons[0])
        }
      }
      setQuizzes(quizzesRes.data)
      try {
        const progRes = await api.get(`/enrollments/my-progress/${id}`)
        setProgress(progRes.data.data?.progress_percent || 0)
      } catch (_) {
        setProgress(0)
      }
    } catch (err) {
      console.error(err)
      navigate('/courses')
    } finally {
      setLoading(false)
    }
  }, [id, navigate, openChapter])

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  const handleCreateLiveRoom = async (quizId) => {
    try {
      const { data } = await api.post('/quiz-rooms', {
        quiz_id: quizId,
        host_id: user._id
      })
      navigate(`/quiz/host/${data.room_code}`)
    } catch (err) {
      alert(t('common.error_fail'))
    }
  }

  const handleQuizSubmit = async (form) => {
    try {
      if (!form._id) {
        await api.post('/quizzes', { ...form, course_id: id })
      } else {
        await api.put(`/quizzes/${form._id}`, form)
      }
      const qRes = await api.get(`/quizzes?course_id=${id}`)
      setQuizzes(qRes.data)
      setQuizModal(null)
      setEditingQuizQuestions(null)
    } catch (err) {
      showError(t, err)
    }
  }

  const handleWordImportSubmit = async () => {
    if (!wordFile) {
      alert(t('course_detail.word_import.select_file_error') || 'Vui lòng chọn file Word (.docx).')
      return
    }
    setImportingWord(true)
    try {
      const formData = new FormData()
      formData.append('file', wordFile)
      formData.append('amount', wordAmount)
      formData.append('types', JSON.stringify(wordTypes))
      formData.append('difficulty', wordDifficulty)
      if (wordApiKey) formData.append('apiKey', wordApiKey)
      
      const res = await api.post('/quizzes/generate-from-file', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      
      setShowWordImportModal(false)
      setWordFile(null)
      setEditingQuizQuestions(res.data)
    } catch (err) {
      console.error(err)
      alert(err.response?.data?.error || err.message || 'Lỗi khi nhập đề từ file Word.')
    } finally {
      setImportingWord(false)
    }
  }

  const handleChapterSubmit = async (form) => {
    try {
      if (chapterModal === 'create') {
        await api.post(`/courses/${id}/chapters`, form)
      } else if (form._id) {
        await api.put(`/courses/${id}/chapters/${form._id}`, form)
      }
      await fetchCourse()
      setChapterModal(null)
    } catch (err) {
      showError(t, err)
    }
  }

  const handleLessonSubmit = async (form) => {
    try {
      const { mode, chapterId, lesson } = lessonModal
      let finalForm = { ...form }
      if (form.file instanceof File) {
        const formData = new FormData()
        formData.append('file', form.file)
        const uploadRes = await api.post('/courses/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        })
        finalForm.resource_key = uploadRes.data.data.resource_key
        delete finalForm.file
      }

      if (mode === 'create') {
        await api.post(`/courses/${id}/chapters/${chapterId}/lessons`, finalForm)
      } else if (lesson?._id) {
        await api.put(`/courses/${id}/chapters/${chapterId}/lessons/${lesson._id}`, finalForm)
      }

      await fetchCourse()
      setLessonModal(null)
    } catch (err) {
      showError(t, err)
    }
  }

  const handleDeleteChapter = async (chapterId) => {
    if (!window.confirm(t('forum.delete_confirm'))) return
    try {
      await api.delete(`/courses/${id}/chapters/${chapterId}`)
      await fetchCourse()
    } catch (err) {
      showError(t, err)
    }
  }

  const handleExport = async (quizId) => {
    try {
      const res = await api.get(`/quizzes/${quizId}/export-excel`, { responseType: 'blob' })
      const blob = new Blob([res.data], { type: 'text/csv; charset=utf-8' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `Grades_${quizId}.csv`)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (err) {
      alert(t('common.error_fail'))
    }
  }

  const handleDeleteQuiz = async (quizId) => {
    if (!window.confirm(t('forum.delete_confirm'))) return
    try {
      await api.delete(`/quizzes/${quizId}`)
      const qRes = await api.get(`/quizzes?course_id=${id}`)
      setQuizzes(qRes.data)
    } catch (err) {
      alert(t('common.error_fail'))
    }
  }

  const saveNotes = () => {
    localStorage.setItem(`notes_${id}`, notes)
    setNoteSaved(true)
    setTimeout(() => setNoteSaved(false), 2000)
  }

  if (loading) return <Layout><div className="spinner-wrap"><div className="spinner" /></div></Layout>
  if (!course) return null

  const locale = i18n.language === 'en' ? 'en-US' : 'vi-VN'
  const contentTypeIcon = { VIDEO: '▶️', DOCUMENT: '📄', EMBED: '🔗', FILE: '📎' }

  return (
    <>
      <Layout>
        <div style={{ padding: '0 0 1.5rem' }}>
          <button className="btn btn-secondary btn-sm" style={{ marginBottom: '1rem', borderRadius: '16px' }} onClick={() => navigate('/courses')}>
            ← {t('course_detail.back')}
          </button>
          <h1 style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>{course.title}</h1>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', fontSize: '0.875rem' }}>
            <span style={{ color: 'var(--text-3)' }}>👤 {course.created_by?.full_name}</span>
            <span style={{ color: 'var(--text-3)' }}>•</span>
            <span style={{ color: 'var(--text-3)' }}>⭐ 4.8 (120 {t('courses.ratings')})</span>
            <span style={{ color: 'var(--text-3)' }}>•</span>
            <span style={{ color: 'var(--text-3)' }}>👨‍🎓 15,204 {t('courses.students') || 'students'}</span>
          </div>
        </div>

        <div className="player-layout">
          {/* Main Player Area */}
          <div className="player-main">
            {selectedLesson ? (
              <div className="player-video-wrapper unselectable" onContextMenu={(e) => e.preventDefault()}>
                {selectedLesson.content_type === 'VIDEO' || selectedLesson.content_type === 'EMBED' ? (
                  <MediaRenderer 
                    url={selectedLesson.content} 
                    type={selectedLesson.content_type === 'VIDEO' ? 'VIDEO' : 'EMBED'} 
                    style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                  />
                ) : (
                  <div style={{ background: 'var(--bg)', color: 'var(--text)', padding: '3rem', width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
                    <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>📄</div>
                    <h3 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>{selectedLesson.title}</h3>
                    <div dangerouslySetInnerHTML={{ __html: selectedLesson.content || t('course_detail.player.no_content') }} style={{ maxWidth: '800px', lineHeight: 1.8, fontSize: '1.1rem' }} />
                    {selectedLesson.resource_key && (
                      <a href={buildUploadUrl(selectedLesson.resource_key)} target="_blank" rel="noreferrer" className="btn btn-primary" style={{ marginTop: '2rem', padding: '0.75rem 2rem', borderRadius: '30px' }}>
                        ⬇️ {t('course_detail.player.download_attachment')}
                      </a>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="player-video-wrapper" style={{ background: 'linear-gradient(45deg, var(--bg-3), var(--bg-2))' }}>
                <h2 style={{ color: 'var(--text-3)' }}>{t('course_detail.start_learning') || 'Select a lesson to start'}</h2>
              </div>
            )}

            {/* Tabs Navigation */}
            <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', padding: '0 2rem', background: 'var(--bg-3)' }}>
              {[
                { id: 'overview', label: t('course_detail.tabs.overview') || 'Overview' },
                { id: 'notes', label: t('course_detail.tabs.notes') || 'Notes' },
                { id: 'qna', label: t('course_detail.tabs.qna') || 'Q&A' },
                { id: 'resources', label: t('course_detail.tabs.resources') || 'Resources' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    padding: '1rem 1.5rem',
                    background: 'transparent',
                    borderBottom: activeTab === tab.id ? '3px solid var(--primary)' : '3px solid transparent',
                    color: activeTab === tab.id ? 'var(--primary)' : 'var(--text-2)',
                    fontWeight: activeTab === tab.id ? 700 : 500,
                    transition: 'all 0.2s',
                    fontSize: '0.9rem'
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="player-content">
              {activeTab === 'overview' && (
                <div>
                  <h2 style={{ marginBottom: '1rem' }}>{course.title}</h2>
                  <p style={{ lineHeight: 1.7, color: 'var(--text-2)', fontSize: '1rem', whiteSpace: 'pre-line' }}>{course.description}</p>
                  <div style={{ marginTop: '2rem', display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
                    <div style={{ background: 'var(--bg-3)', padding: '1rem 1.5rem', borderRadius: '12px', flex: 1, minWidth: '200px' }}>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>{t('courses.form.start_date')}</div>
                      <div style={{ fontWeight: 600, fontSize: '1.1rem' }}>{course.start_date ? new Date(course.start_date).toLocaleDateString(locale) : '—'}</div>
                    </div>
                    <div style={{ background: 'var(--bg-3)', padding: '1rem 1.5rem', borderRadius: '12px', flex: 1, minWidth: '200px' }}>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>{t('courses.form.threshold')}</div>
                      <div style={{ fontWeight: 600, fontSize: '1.1rem' }}>{course.completion_threshold}%</div>
                    </div>
                    <div style={{ background: 'var(--bg-3)', padding: '1rem 1.5rem', borderRadius: '12px', flex: 1, minWidth: '200px' }}>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>{t('courses.form.certificate')}</div>
                      <div style={{ fontWeight: 600, fontSize: '1.1rem', color: course.has_certificate ? 'var(--success)' : 'var(--text)' }}>{course.has_certificate ? 'Yes' : 'No'}</div>
                    </div>
                  </div>
                </div>
              )}
              
              {activeTab === 'notes' && (
                <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: '300px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <p style={{ margin: 0, color: 'var(--text-2)' }}>{t('course_detail.notes_hint')}</p>
                    {noteSaved && <span style={{ color: 'var(--success)', fontWeight: 600, fontSize: '0.875rem' }}>{t('course_detail.notes_saved') || 'Saved!'}</span>}
                  </div>
                  <textarea 
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder={t('course_detail.notes_placeholder') || 'Type your notes here...'}
                    style={{ 
                      flex: 1, width: '100%', padding: '1rem', borderRadius: '12px', 
                      background: 'var(--bg-3)', border: '1px solid var(--border)', color: 'var(--text)',
                      fontFamily: 'inherit', fontSize: '1rem', resize: 'none', outline: 'none'
                    }}
                  />
                  <button className="btn btn-primary" style={{ alignSelf: 'flex-end', marginTop: '1rem', borderRadius: '20px', padding: '0.5rem 1.5rem' }} onClick={saveNotes}>
                    💾 {t('course_detail.notes_save') || 'Save Notes'}
                  </button>
                </div>
              )}

              {activeTab === 'qna' && (
                <div className="empty-state" style={{ padding: '2rem' }}>
                  <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>💬</div>
                  <h3>{t('course_detail.qna_empty_title')}</h3>
                  <p>{t('course_detail.qna_empty_desc')}</p>
                </div>
              )}

              {activeTab === 'resources' && (
                <div className="empty-state" style={{ padding: '2rem' }}>
                  <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📁</div>
                  <h3>{t('course_detail.res_empty_title')}</h3>
                  <p>{t('course_detail.res_empty_desc')}</p>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar Navigation */}
          <div className="player-sidebar">
            <div className="player-sidebar__header">
              <h3 style={{ margin: 0, fontSize: '1.1rem' }}>{t('course_detail.course_content')}</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '0.5rem' }}>
                <div style={{ flex: 1, background: 'var(--bg)', height: '6px', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ width: `${progress}%`, height: '100%', background: 'var(--primary)', transition: 'width 0.3s ease' }} />
                </div>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-3)' }}>{progress}%</span>
              </div>
              {canManage && (
                <button className="btn btn-primary btn-sm" style={{ width: '100%', marginTop: '1rem', justifyContent: 'center' }} onClick={() => setChapterModal('create')}>
                  + {t('course_detail.add_chapter')}
                </button>
              )}
            </div>
            <div className="player-sidebar__content">
              {(!course.chapters || course.chapters.length === 0) && (
                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-3)' }}>{t('course_detail.no_chapters')}</div>
              )}
              
              {course.chapters?.map((ch, ci) => (
                <div key={ch._id} className="accordion-item">
                  <div className="accordion-header" onClick={() => setOpenChapter(openChapter === ch._id ? null : ch._id)}>
                    <div>
                      <div style={{ fontSize: '0.9rem', color: 'var(--text)' }}>{t('course_detail.chapter_label', { index: ci + 1, title: ch.title })}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-3)', fontWeight: 400, marginTop: '2px' }}>
                        {t('course_detail.lessons_count', { count: ch.lessons?.length || 0 })}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {canManage && (
                        <div style={{ display: 'flex', gap: '4px' }} onClick={e => e.stopPropagation()}>
                           <button className="btn btn-secondary btn-sm" style={{ padding: '2px 6px' }} onClick={() => setChapterModal(ch)}>✏️</button>
                           <button className="btn btn-danger btn-sm" style={{ padding: '2px 6px' }} onClick={() => handleDeleteChapter(ch._id)}>🗑️</button>
                        </div>
                      )}
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>{openChapter === ch._id ? '▲' : '▼'}</span>
                    </div>
                  </div>
                  
                  {openChapter === ch._id && (
                    <div className="accordion-body">
                      {ch.lessons?.map((ls) => (
                        <div key={ls._id} 
                          className={`lesson-item ${selectedLesson?._id === ls._id ? 'active' : ''}`}
                          onClick={() => setSelectedLesson(ls)}
                        >
                          <div className="lesson-item__icon">
                            {contentTypeIcon[ls.content_type] || '📄'}
                          </div>
                          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                            <span>{ls.title}</span>
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-3)' }}>
                              {ls.duration_seconds ? `${Math.floor(ls.duration_seconds / 60)} min` : 'Document'}
                            </span>
                          </div>
                          {canManage && (
                            <button 
                              className="btn btn-secondary btn-sm" 
                              style={{ padding: '2px 6px', fontSize: '0.75rem', background: 'transparent' }} 
                              onClick={(e) => { e.stopPropagation(); setLessonModal({ mode: 'edit', chapterId: ch._id, lesson: ls }) }}
                            >✏️</button>
                          )}
                        </div>
                      ))}
                      {canManage && (
                        <div style={{ padding: '12px' }}>
                          <button className="btn btn-secondary btn-sm" style={{ width: '100%', justifyContent: 'center' }} onClick={() => setLessonModal({ mode: 'create', chapterId: ch._id })}>
                            + {t('course_detail.add_lesson')}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}

              {/* Quizzes Section */}
              <div className="accordion-item">
                <div className="accordion-header" style={{ borderTop: '4px solid var(--bg)' }}>
                  <div>
                    <div style={{ fontSize: '0.9rem', color: 'var(--text)' }}>{t('course_detail.quizzes_title')}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-3)', fontWeight: 400, marginTop: '2px' }}>
                      {quizzes.length} bài kiểm tra
                    </div>
                  </div>
                  {canManage && (
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button className="btn btn-secondary btn-sm" onClick={() => setShowWordImportModal(true)}>
                         📝 Tạo từ Word
                      </button>
                      <button className="btn btn-primary btn-sm" onClick={() => setQuizModal('create')}>
                         + {t('course_detail.add_quiz')}
                      </button>
                    </div>
                  )}
                </div>
                <div className="accordion-body" style={{ padding: '12px' }}>
                  {quizzes.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-3)', fontSize: '0.875rem' }}>
                      {t('course_detail.no_quizzes')}
                    </div>
                  )}
                  {quizzes.map(qz => (
                    <div key={qz._id} style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: '12px', padding: '1rem', marginBottom: '8px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <h4 style={{ margin: 0, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                            🧠 {qz.title}
                            <span className={`tag ${qz.quiz_type === 'EXAM' ? 'tag--danger' : 'tag--success'}`} style={{ fontSize: '0.6rem', padding: '2px 6px' }}>
                              {qz.quiz_type === 'EXAM' ? t('course_detail.exam_label') : t('course_detail.practice_label')}
                            </span>
                          </h4>
                          <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: 'var(--text-3)' }}>
                             {t('course_detail.quiz_meta', { count: qz.questions?.length || 0, time: qz.time_limit_sec ? `${Math.floor(qz.time_limit_sec / 60)}m` : t('course_detail.unlimited_time') })}
                          </p>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '12px' }}>
                        <button className="btn btn-primary btn-sm" style={{ flex: 1, justifyContent: 'center' }} onClick={() => navigate(`/quiz/${qz._id}`)}>
                          ▶ {t('course_detail.take_quiz')}
                        </button>
                        {canManage && (
                          <>
                            {(user?.role === 'ADMIN' || !qz.created_by || qz.created_by === user._id) ? (
                              <>
                                <button className="btn btn-secondary btn-sm" title={t('common.edit')} onClick={() => setQuizModal(qz)}>✏️</button>
                                <button className="btn btn-secondary btn-sm" title={t('course_detail.edit_questions')} onClick={() => setEditingQuizQuestions(qz)}>📝</button>
                                <button className="btn btn-secondary btn-sm" title={t('quiz.export_btn')} onClick={() => handleExport(qz._id)}>📊</button>
                                <button className="btn btn-danger btn-sm" title={t('common.delete')} onClick={() => handleDeleteQuiz(qz._id)}>🗑️</button>
                                <button className="btn btn-primary btn-sm" onClick={() => handleCreateLiveRoom(qz._id)}>⚡ Live</button>
                              </>
                            ) : (
                              <button className="btn btn-secondary btn-sm" title={t('quiz.export_btn')} onClick={() => handleExport(qz._id)}>📊</button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </Layout>

      {/* Modals outside Layout for proper fullscreen overlay and z-index */}
      {quizModal && (
        <CrudModal
          title={quizModal === 'create' ? t('course_detail.add_quiz') : `${t('common.manage')}: ${quizModal.title}`}
          fields={QUIZ_FIELDS}
          initialData={quizModal === 'create' ? null : quizModal}
          onSubmit={handleQuizSubmit}
          onClose={() => setQuizModal(null)}
        />
      )}
      {chapterModal && (
        <BuilderChapterModal
          title={chapterModal === 'create' ? t('course_detail.add_chapter') : `${t('common.manage')}: ${chapterModal.title}`}
          initialData={chapterModal === 'create' ? null : chapterModal}
          onSubmit={handleChapterSubmit}
          onClose={() => setChapterModal(null)}
        />
      )}
      {lessonModal && (
        <BuilderLessonModal
          title={lessonModal.mode === 'create' ? t('course_detail.add_lesson') : `${t('common.manage')}: ${lessonModal.lesson?.title}`}
          initialData={lessonModal.mode === 'create' ? null : lessonModal.lesson}
          onSubmit={handleLessonSubmit}
          onClose={() => setLessonModal(null)}
        />
      )}
      {editingQuizQuestions && (
        <QuizQuestionEditor
          quiz={editingQuizQuestions}
          onSave={handleQuizSubmit}
          onCancel={() => setEditingQuizQuestions(null)}
        />
      )}
      {showWordImportModal && (
        <div style={aiOverlayStyle}>
          <div style={aiModalStyle}>
            <div style={aiHeaderStyle}>
              <h3 style={{ margin: 0 }}>📝 Nhập đề thi từ file Word (.docx)</h3>
              <button 
                style={{ background: 'transparent', border: 'none', color: 'var(--text-3)', cursor: 'pointer', fontSize: '1.2rem' }} 
                onClick={() => { setShowWordImportModal(false); setWordFile(null); }}
              >
                ✕
              </button>
            </div>
            
            <div style={aiBodyStyle}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={labelStyle}>Tải lên File Word đề thi (.docx) *</label>
                <div
                  onClick={() => document.getElementById('word-docx-file-input').click()}
                  style={{
                    border: '2px dashed var(--border)', borderRadius: 12,
                    padding: '2rem', textAlign: 'center', cursor: 'pointer',
                    background: 'var(--bg-3)', transition: 'border-color 0.2s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--primary)'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
                >
                  <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>📄</div>
                  {wordFile ? (
                    <div style={{ color: '#38ef7d', fontWeight: 700 }}>
                      Đã chọn: {wordFile.name} ({(wordFile.size / 1024).toFixed(1)} KB)
                    </div>
                  ) : (
                    <>
                      <div style={{ fontWeight: 700, color: 'var(--text-2)' }}>Click hoặc kéo thả file Word (.docx) vào đây</div>
                      <div style={{ color: 'var(--text-3)', fontSize: '0.8rem', marginTop: 4 }}>Chỉ chấp nhận file định dạng .docx (tối đa 10MB)</div>
                    </>
                  )}
                  <input
                    id="word-docx-file-input"
                    type="file"
                    accept=".docx"
                    style={{ display: 'none' }}
                    onChange={e => {
                      const file = e.target.files[0]
                      if (file) {
                        if (file.size > 10 * 1024 * 1024) {
                          alert('Kích thước file vượt quá giới hạn cho phép (tối đa 10MB).')
                          return
                        }
                        setWordFile(file)
                      }
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={labelStyle}>Số lượng câu hỏi tối đa</label>
                  <input
                    type="number"
                    style={inputStyle}
                    min="1"
                    max="50"
                    value={wordAmount}
                    onChange={e => setWordAmount(parseInt(e.target.value) || 10)}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={labelStyle}>Độ khó dự kiến</label>
                  <select
                    style={inputStyle}
                    value={wordDifficulty}
                    onChange={e => setWordDifficulty(e.target.value)}
                  >
                    <option value="EASY">Dễ</option>
                    <option value="MEDIUM">Trung bình</option>
                    <option value="HARD">Khó</option>
                  </select>
                </div>
              </div>

              <div style={{ marginTop: '1rem' }}>
                <label style={labelStyle}>Các loại câu hỏi cần trích xuất</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '6px' }}>
                  {[
                    { value: 'SINGLE_CHOICE', label: 'Trắc nghiệm (1 đáp án)' },
                    { value: 'MULTIPLE_CHOICE', label: 'Trắc nghiệm (Nhiều đáp án)' },
                    { value: 'TRUE_FALSE', label: 'Đúng / Sai' },
                    { value: 'FILL_BLANK', label: 'Điền vào chỗ trống' },
                    { value: 'ORDERING', label: 'Sắp xếp thứ tự' },
                    { value: 'SHORT_ANSWER', label: 'Tự luận' }
                  ].map(t => (
                    <label key={t.value} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.85rem' }}>
                      <input
                        type="checkbox"
                        checked={wordTypes.includes(t.value)}
                        onChange={e => {
                          if (e.target.checked) {
                            setWordTypes([...wordTypes, t.value])
                          } else {
                            setWordTypes(wordTypes.filter(x => x !== t.value))
                          }
                        }}
                      />
                      {t.label}
                    </label>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '1rem' }}>
                <label style={labelStyle}>Gemini API Key (Tùy chọn)</label>
                <input
                  type="password"
                  style={inputStyle}
                  placeholder="Nhập API Key cá nhân nếu Server chưa cấu hình..."
                  value={wordApiKey}
                  onChange={e => setWordApiKey(e.target.value)}
                />
              </div>
              
              <div style={{ marginTop: '0.5rem', padding: '10px 14px', background: 'var(--bg-3)', borderRadius: 10, fontSize: '0.8rem', color: 'var(--text-3)', display: 'flex', alignItems: 'center', gap: 8 }}>
                💡 <span>Tải mẫu cấu trúc file Word tại đây: <a href="/guide_docx_template.md" target="_blank" style={{ color: 'var(--primary)', fontWeight: 600 }}>Hướng dẫn định dạng</a></span>
              </div>
            </div>

            <div style={aiFooterStyle}>
              <button 
                className="btn btn-secondary" 
                onClick={() => { setShowWordImportModal(false); setWordFile(null); }} 
                disabled={importingWord}
              >
                Hủy
              </button>
              <button
                className="btn btn-primary"
                style={{ background: 'linear-gradient(135deg, #a855f7, #6366f1)', border: 'none' }}
                onClick={handleWordImportSubmit}
                disabled={importingWord}
              >
                {importingWord ? 'Đang xử lý...' : 'Bắt đầu trích xuất'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// Modal Styles
const aiOverlayStyle = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,0.6)',
  backdropFilter: 'blur(8px)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 20000,
  padding: '1rem'
}

const aiModalStyle = {
  background: 'var(--bg-2)',
  border: '1px solid var(--border)',
  borderRadius: '20px',
  width: '100%',
  maxWidth: '550px',
  display: 'flex',
  flexDirection: 'column',
  boxShadow: '0 20px 50px rgba(0,0,0,0.4)',
  overflow: 'hidden'
}

const aiHeaderStyle = {
  padding: '1.25rem 1.5rem',
  borderBottom: '1px solid var(--border)',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center'
}

const aiBodyStyle = {
  padding: '1.5rem',
  display: 'flex',
  flexDirection: 'column',
  gap: '12px',
  maxHeight: '70vh',
  overflowY: 'auto'
}

const aiFooterStyle = {
  padding: '1rem 1.5rem',
  borderTop: '1px solid var(--border)',
  display: 'flex',
  justifyContent: 'flex-end',
  gap: '10px'
}

const labelStyle = { 
  display:'block', 
  fontSize: '0.8rem', 
  fontWeight: 600, 
  color: 'var(--text-3)', 
  marginBottom: 8, 
  textTransform:'uppercase', 
  letterSpacing:'0.05em' 
}

const inputStyle = {
  flex: 1, 
  background: 'var(--bg-3)', 
  border: '1px solid var(--border)', 
  borderRadius: 10,
  padding: '0.6rem 1rem', 
  color: 'var(--text)', 
  fontSize: '0.9rem', 
  outline: 'none'
}
