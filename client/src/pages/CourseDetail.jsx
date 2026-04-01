import { useEffect, useState, useCallback, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Layout from '../components/Layout'
import CrudModal from '../components/CrudModal'
import QuizQuestionEditor from '../components/QuizQuestionEditor'
import api from '../api/axios'
import MediaRenderer from '../components/MediaRenderer'
import { useAuth } from '../context/AuthContext'

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

  const CHAPTER_FIELDS = useMemo(() => [
    { name: 'title',       label: t('course_detail.fields.chapter_title'), type: 'text',     required: true, placeholder: t('course_detail.fields.chapter_placeholder') },
    { name: 'description', label: t('assignments.form.desc_label'),          type: 'textarea' },
    { name: 'order_index', label: t('course_detail.fields.order_index'),         type: 'number' },
    { name: 'is_locked',   label: t('course_detail.fields.lock_chapter'),    type: 'checkbox' }
  ], [t])

  const LESSON_FIELDS = useMemo(() => [
    { name: 'title',        label: t('course_detail.fields.lesson_title'), type: 'text',     required: true },
    { name: 'description',  label: t('assignments.form.desc_label'), type: 'textarea' },
    { name: 'content_type', label: t('course_detail.fields.content_type'),   type: 'select',   required: true, options: [
      { value: 'VIDEO',    label: t('course_detail.fields.types.VIDEO') },
      { value: 'DOCUMENT', label: t('course_detail.fields.types.DOCUMENT') },
      { value: 'FILE',     label: t('course_detail.fields.types.FILE') },
      { value: 'EMBED',    label: t('course_detail.fields.types.EMBED') }
    ], default: 'DOCUMENT' },
    { name: 'content',      label: t('course_detail.fields.content_label'), type: 'textarea' },
    { name: 'file',         label: t('course_detail.fields.file_label'),   type: 'file',     accept: 'video/*,.pdf,.ppt,.pptx' },
    { name: 'duration_seconds', label: t('course_detail.fields.duration'), type: 'number' }
  ], [t])

  const fetchCourse = async () => {
    try {
      const res = await api.get(`/courses/${id}`)
      const data = res.data.data ?? res.data
      setCourse(data)
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
      }
      setQuizzes(quizzesRes.data)
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

  const handleStartLearning = () => {
    if (course.chapters?.length > 0) {
      setOpenChapter(course.chapters[0]._id);
      if (course.chapters[0].lessons?.length > 0) {
        setSelectedLesson(course.chapters[0].lessons[0]);
      }
      const el = document.getElementById('course-content');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }
  }

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
      if (quizModal === 'create') {
        await api.post('/quizzes', { ...form, course_id: id })
      } else if (form._id) {
        await api.put(`/quizzes/${form._id}`, form)
      }
      const qRes = await api.get(`/quizzes?course_id=${id}`)
      setQuizzes(qRes.data)
      setQuizModal(null)
      setEditingQuizQuestions(null)
    } catch (err) { alert(t('common.error_fail')) }
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
    } catch (err) { alert(t('common.error_fail')) }
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
      }
      await fetchCourse()
      setLessonModal(null)
    } catch (err) { alert(t('common.error_fail')) }
  }

  const handleDeleteChapter = async (chapterId) => {
    if (!window.confirm(t('forum.delete_confirm'))) return
    try {
      await api.delete(`/courses/${id}/chapters/${chapterId}`)
      await fetchCourse()
    } catch (err) { alert(t('common.error_fail')) }
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

  if (loading) return <Layout><div className="spinner-wrap"><div className="spinner" /></div></Layout>
  if (!course) return null

  const locale = i18n.language === 'en' ? 'en-US' : 'vi-VN'
  const contentTypeIcon = { VIDEO: '🎬', DOCUMENT: '📄', EMBED: '🔗', FILE: '📎' }

  return (
    <Layout>
      <div className="page-header">
        <button className="btn btn-secondary btn-sm" style={{ marginBottom:'1rem' }} onClick={() => navigate('/courses')}>
          ← {t('course_detail.back')}
        </button>
        <h1>{course.title}</h1>
        <p>{course.description}</p>
        <div style={{ display:'flex', gap:'0.75rem', marginTop:'0.75rem', flexWrap:'wrap' }}>
          <span className="tag tag--primary">👤 {course.created_by?.full_name}</span>
          <span className="tag tag--primary">📁 {course.group_id?.name}</span>
          <span className="tag">📚 {t('courses.chapters', { count: course.chapters?.length || 0 })}</span>
        </div>
      </div>

      <div className="grid-2" style={{ alignItems:'start' }}>
        <div id="course-content">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ margin: 0 }}>{t('course_detail.course_content')}</h3>
            {canManage && (
              <button className="btn btn-primary btn-sm" onClick={() => setChapterModal('create')}>
                + {t('course_detail.add_chapter')}
              </button>
            )}
          </div>
          
          {(!course.chapters || course.chapters.length === 0) && (
            <div className="empty-state"><h3>{t('course_detail.no_chapters')}</h3></div>
          )}

          {course.chapters?.map((ch, ci) => (
            <div key={ch._id} style={{ marginBottom:'0.5rem' }}>
              <button
                onClick={() => setOpenChapter(openChapter === ch._id ? null : ch._id)}
                style={{
                  width:'100%', display:'flex', alignItems:'center', justifyContent:'space-between',
                  padding:'0.875rem 1rem', background:'var(--bg-2)', border:'1px solid var(--border)',
                  borderRadius:'var(--radius-sm)', color:'var(--text)', fontSize:'0.875rem', fontWeight:600,
                  cursor:'pointer'
                }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>📂 {t('course_detail.chapter_label', { index: ci + 1, title: ch.title })}</span>
                  {canManage && (
                    <div style={{ display: 'flex', gap: '4px' }} onClick={e => e.stopPropagation()}>
                       <button className="btn btn-secondary btn-sm" style={{ padding: '2px 6px' }} onClick={() => setChapterModal(ch)}>✏️</button>
                       <button className="btn btn-danger btn-sm" style={{ padding: '2px 6px' }} onClick={() => handleDeleteChapter(ch._id)}>🗑️</button>
                    </div>
                  )}
                </span>
                <span>{t('course_detail.lessons_count', { count: ch.lessons?.length || 0 })} {openChapter === ch._id ? '▲' : '▼'}</span>
              </button>
              {openChapter === ch._id && (
                <div style={{ background:'var(--bg-3)', borderRadius:'0 0 8px 8px', overflow:'hidden' }}>
                  {ch.lessons?.map((ls) => (
                    <div key={ls._id} 
                      onClick={() => setSelectedLesson(ls)}
                      style={{
                        display:'flex', alignItems:'center', gap:'0.75rem',
                        padding:'0.75rem 1rem', borderBottom:'1px solid var(--border)',
                        fontSize:'0.875rem', cursor:'pointer',
                        background: selectedLesson?._id === ls._id ? 'var(--primary-2)' : 'transparent',
                        color: selectedLesson?._id === ls._id ? 'white' : 'var(--text)'
                      }}>
                      <span>{contentTypeIcon[ls.content_type] || '📄'}</span>
                      <span style={{ flex:1 }}>{ls.title}</span>
                    </div>
                  ))}
                  {canManage && (
                    <div style={{ padding: '8px 1rem' }}>
                      <button className="btn btn-secondary btn-sm" style={{ width: '100%', justifyContent: 'center' }} onClick={() => setLessonModal({ mode: 'create', chapterId: ch._id })}>
                        + {t('course_detail.add_lesson')}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}

          <div style={{ marginTop: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0 }}>{t('course_detail.quizzes_title')}</h3>
              {canManage && (
                <button className="btn btn-primary btn-sm" onClick={() => setQuizModal('create')}>
                   + {t('course_detail.add_quiz')}
                </button>
              )}
            </div>
            {quizzes.length === 0 && (
              <div className="card" style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-3)' }}>
                {t('course_detail.no_quizzes')}
              </div>
            )}
            {quizzes.map(qz => (
              <div key={qz._id} className="card" style={{ marginBottom: '0.75rem', padding: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h4 style={{ margin: 0 }}>
                      🧠 {qz.title}
                      <span className={`tag ${qz.quiz_type === 'EXAM' ? 'tag--danger' : 'tag--success'}`} style={{ fontSize: '0.6rem', marginLeft: '10px' }}>
                        {qz.quiz_type === 'EXAM' ? t('course_detail.exam_label') : t('course_detail.practice_label')}
                      </span>
                    </h4>
                    <p style={{ margin: '4px 0 0', fontSize: '0.8rem' }}>
                       {t('course_detail.quiz_meta', { count: qz.questions?.length || 0, time: qz.time_limit_sec ? `${Math.floor(qz.time_limit_sec / 60)}m` : t('course_detail.unlimited_time') })}
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button className="btn btn-secondary btn-sm" onClick={() => navigate(`/quiz/${qz._id}`)}>
                      {t('course_detail.take_quiz')}
                    </button>
                    {canManage && (
                      <>
                        <button className="btn btn-secondary btn-sm" onClick={() => setQuizModal(qz)}>✏️</button>
                        <button className="btn btn-secondary btn-sm" onClick={() => setEditingQuizQuestions(qz)}>📝</button>
                        <button className="btn btn-secondary btn-sm" onClick={() => handleExport(qz._id)}>📊</button>
                        <button className="btn btn-primary btn-sm" onClick={() => handleCreateLiveRoom(qz._id)}>⚡ Live</button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="card">
            <h3 style={{ marginBottom:'1rem' }}>{t('course_detail.course_info')}</h3>
            <div style={{ display:'flex', flexDirection:'column', gap:'0.75rem', fontSize:'0.875rem' }}>
              {[
                [t('courses.form.start_date'), course.start_date ? new Date(course.start_date).toLocaleDateString(locale) : '—'],
                [t('courses.form.end_date'), course.end_date ? new Date(course.end_date).toLocaleDateString(locale) : '—'],
                [t('courses.form.threshold'), `${course.completion_threshold}%`],
                [t('courses.form.certificate'), course.has_certificate ? t('common.status') : 'No'],
              ].map(([label, val]) => (
                <div key={label} style={{ display:'flex', justifyContent:'space-between', borderBottom:'1px solid var(--border)', paddingBottom:'0.5rem' }}>
                  <span style={{ color:'var(--text-3)' }}>{label}</span>
                  <span style={{ fontWeight:600 }}>{val}</span>
                </div>
              ))}
            </div>
            <button className="btn btn-primary" onClick={handleStartLearning} style={{ width:'100%', justifyContent:'center', marginTop:'1.5rem' }}>
              {t('course_detail.start_learning')}
            </button>
          </div>
        </div>
      </div>

      {selectedLesson && (
        <div style={{ position:'fixed', top:0, left:0, right:0, bottom:0, background:'rgba(0,0,0,0.85)', zIndex:9999, display:'flex', flexDirection:'column' }}>
          <div style={{ padding:'1.5rem', display:'flex', justifyContent:'space-between', alignItems:'center', color:'white' }}>
            <h2 style={{ margin:0 }}>{selectedLesson.title}</h2>
            <button onClick={() => setSelectedLesson(null)} style={{ background:'transparent', border:'none', color:'white', fontSize:'2rem', cursor:'pointer' }}>&times;</button>
          </div>
          <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', padding:'2rem' }}>
            {selectedLesson.content_type === 'VIDEO' || selectedLesson.content_type === 'EMBED' ? (
              <MediaRenderer 
                url={selectedLesson.content} 
                type={selectedLesson.content_type === 'VIDEO' ? 'VIDEO' : 'EMBED'} 
                style={{ width:'100%', maxWidth:'1000px', height:'70vh' }}
              />
            ) : (
              <div style={{ background:'var(--bg)', color:'var(--text)', padding:'3rem', borderRadius:8, maxWidth:'800px', width:'100%' }}>
                <h3>{t('course_detail.player.document_title')}</h3>
                <p>{selectedLesson.content || t('course_detail.player.no_content')}</p>
                {selectedLesson.resource_key && (
                  <a href={buildUploadUrl(selectedLesson.resource_key)} target="_blank" rel="noreferrer" className="btn btn-primary">
                    {t('course_detail.player.download_attachment')}
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
      )}

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
        <CrudModal
          title={chapterModal === 'create' ? t('course_detail.add_chapter') : `${t('common.manage')}: ${chapterModal.title}`}
          fields={CHAPTER_FIELDS}
          initialData={chapterModal === 'create' ? null : chapterModal}
          onSubmit={handleChapterSubmit}
          onClose={() => setChapterModal(null)}
        />
      )}
      {lessonModal && (
        <CrudModal
          title={lessonModal.mode === 'create' ? t('course_detail.add_lesson') : `${t('common.manage')}: ${lessonModal.lesson?.title}`}
          fields={LESSON_FIELDS}
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
    </Layout>
  )
}
