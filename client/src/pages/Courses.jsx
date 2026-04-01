import { useEffect, useState, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Layout from '../components/Layout'
import CrudModal from '../components/CrudModal'
import api from '../api/axios'
import { useAuth } from '../context/AuthContext'

const ICONS = ['📘', '📗', '📙', '📕', '📓', '📒']

export default function Courses() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const navigate = useNavigate()
  
  const isAdmin   = user?.role === 'ADMIN'
  const canManage = user?.role === 'ADMIN' || user?.role === 'INSTRUCTOR'

  const [courses,  setCourses]  = useState([])
  const [groups,   setGroups]   = useState([])
  const [filter,   setFilter]   = useState('all')
  const [loading,  setLoading]  = useState(true)
  const [modal,    setModal]    = useState(null)
  const [quizModal, setQuizModal] = useState(null)
  const [deleting, setDeleting] = useState(null)

  const STATUS_LABEL = useMemo(() => ({
    PUBLISHED: t('status.PUBLISHED'),
    DRAFT: t('status.DRAFT'),
    ENDED: t('status.ENDED'),
    ARCHIVED: t('status.ARCHIVED')
  }), [t])

  const STATUS_CLASS = { PUBLISHED: 'tag--success', DRAFT: 'tag--warning', ENDED: 'tag--danger', ARCHIVED: '' }

  const QUIZ_FIELDS = useMemo(() => [
    { name: 'title',             label: t('quiz.form.title'),   type: 'text',     required: true, placeholder: t('quiz.form.title') },
    { name: 'description',       label: t('quiz.form.desc'),    type: 'textarea', placeholder: t('quiz.form.desc') },
    { name: 'time_limit_sec',    label: t('quiz.form.time_limit'), type: 'number',   placeholder: 'VD: 600', min: 0 },
    { name: 'max_attempts',      label: t('quiz.form.attempts'),  type: 'number',   default: 1, min: 1 },
    { name: 'passing_score',     label: t('quiz.form.pass_score'),   type: 'number',   default: 70, min: 0, max: 100 },
    { name: 'shuffle_questions', label: t('quiz.form.shuffle'), type: 'checkbox' },
    { name: 'result_visibility', label: t('quiz.form.visibility'), type: 'select',   required: true,
      options: [
        { value: 'IMMEDIATE',      label: t('quiz.form.vis_options.IMMEDIATE') },
        { value: 'AFTER_DEADLINE', label: t('quiz.form.vis_options.AFTER_DEADLINE') },
        { value: 'MANUAL',         label: t('quiz.form.vis_options.MANUAL') }
      ], default: 'IMMEDIATE' }
  ], [t])

  const COURSE_FIELDS = useMemo(() => [
    { name: 'group_id',              label: t('courses.form.group_label'),    type: 'select',  required: true,
      options: groups.map(g => ({ value: g._id, label: g.name })) },
    { name: 'title',                 label: t('courses.form.title_label'),     type: 'text',    required: true, placeholder: t('courses.form.title_label') },
    { name: 'description',           label: t('courses.form.desc_label'),        type: 'textarea', placeholder: t('courses.form.desc_label') },
    { name: 'status',                label: t('courses.form.status_label'),  type: 'select',  required: true,
      options: [
        { value: 'DRAFT',     label: t('status.DRAFT') },
        { value: 'PUBLISHED', label: t('status.PUBLISHED') },
        { value: 'ENDED',     label: t('status.ENDED') }
      ], default: 'DRAFT' },
    { name: 'start_date',            label: t('courses.form.start_date'), type: 'date' },
    { name: 'end_date',              label: t('courses.form.end_date'), type: 'date' },
    { name: 'start_time',            label: t('courses.form.start_time'), type: 'time' },
    { name: 'end_time',              label: t('courses.form.end_time'), type: 'time' },
    { name: 'total_sessions',        label: t('courses.form.total_sessions'), type: 'number', min: 1, placeholder: 'VD: 12' },
    { name: 'schedule_days',         label: t('courses.form.schedule_days'), type: 'text', placeholder: 'VD: Thứ 2, Thứ 4' },
    { name: 'completion_threshold',  label: t('courses.form.threshold'), type: 'number', min: 0, max: 100, placeholder: '80', default: 80 },
    { name: 'has_certificate',       label: t('courses.form.certificate'), type: 'checkbox' }
  ], [t, groups])

  const fetchCourses = useCallback(() => {
    setLoading(true)
    api.get('/courses')
      .then(r => setCourses(r.data.data ?? r.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    fetchCourses()
    if (canManage) {
      api.get('/study-groups').then(r => setGroups(r.data.data ?? r.data)).catch(console.error)
    }
  }, [fetchCourses, canManage])

  const filtered = filter === 'all' ? courses : courses.filter(c => c.status === filter)

  const handleSubmit = async form => {
    if (modal === 'create') {
      await api.post('/courses', form)
    } else {
      await api.put(`/courses/${modal._id}`, form)
    }
    setModal(null)
    fetchCourses()
  }

  const handleDelete = async (e, id) => {
    e.stopPropagation()
    if (!window.confirm(t('courses.delete_confirm'))) return
    setDeleting(id)
    try {
      await api.delete(`/courses/${id}`)
      fetchCourses()
    } catch (err) {
      alert(err?.response?.data?.error || t('courses.delete_fail'))
    } finally {
      setDeleting(null)
    }
  }

  const editInitial = c => ({
    group_id:             c.group_id?._id || c.group_id,
    title:                c.title,
    description:          c.description || '',
    status:               c.status,
    start_date:           c.start_date ? c.start_date.slice(0, 10) : '',
    end_date:             c.end_date   ? c.end_date.slice(0, 10)   : '',
    start_time:           c.start_time || '',
    end_time:             c.end_time || '',
    total_sessions:       c.total_sessions || '',
    schedule_days:        c.schedule_days || '',
    completion_threshold: c.completion_threshold ?? 80,
    has_certificate:      c.has_certificate ?? false
  })

  const handleQuizSubmit = async (form) => {
    await api.post('/quizzes', { ...form, course_id: quizModal._id })
    setQuizModal(null)
    alert(t('quiz.create_success'))
  }

  const getCourseAccess = (c) => {
    if (canManage) return { canAccess: true, label: t('courses.access.enter'), onClick: () => navigate(`/courses/${c._id}`) }
    
    const group = c.group_id
    if (!group) return { canAccess: false, label: t('courses.access.no_group') }

    if (group.members) {
      const isMember = group.members.some(m => 
        (m.user_id === user._id || m.user_id?._id === user._id) && m.status === 'ACTIVE'
      )
      if (isMember) {
        return { canAccess: true, label: t('courses.access.enter'), onClick: () => navigate(`/courses/${c._id}`) }
      }
    }
    
    return { 
      canAccess: false, 
      label: t('courses.access.require_member'), 
      onClick: (e) => { e.stopPropagation(); navigate(`/groups/${group._id || group}`) }
    }
  }

  return (
    <Layout>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1>{t('courses.title')} 📚</h1>
            <p>{t('courses.total', { count: courses.length })}</p>
          </div>

          {isAdmin && (
            <button className="btn btn-primary" onClick={() => setModal('create')}>
              ➕ {t('courses.add_course')}
            </button>
          )}
        </div>
      </div>

      {canManage && !isAdmin && (
        <div style={{
          background: 'rgba(245,158,11,0.1)', border: '1px solid var(--warning)',
          borderRadius: 8, padding: '0.6rem 1rem', marginBottom: '1rem',
          fontSize: '0.8125rem', color: 'var(--warning)', display: 'flex', alignItems: 'center', gap: 6
        }}>
          🔒 {t('courses.admin_only_create')}
        </div>
      )}

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {[
          ['all', t('common.all') || 'All'], 
          ['PUBLISHED', t('status.PUBLISHED')], 
          ['DRAFT', t('status.DRAFT')], 
          ['ENDED', t('status.ENDED')]
        ].map(([val, label]) => (
          <button key={val}
            className={`btn btn-sm ${filter === val ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setFilter(val)}>{label}</button>
        ))}
      </div>

      {loading ? <div className="spinner-wrap"><div className="spinner" /></div>
      : filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state__icon">📭</div>
          <h3>{t('courses.no_courses')}</h3>
        </div>
      ) : (
        <div className="grid-auto">
          {filtered.map((c, i) => (
            <div className="course-card" key={c._id} style={{ cursor: 'pointer', position: 'relative' }}
              onClick={() => navigate(`/courses/${c._id}`)}>
              <div className="course-card__thumb">
                <span>{ICONS[i % ICONS.length]}</span>
                <span className={`course-card__status tag ${STATUS_CLASS[c.status]}`}>
                  {STATUS_LABEL[c.status]}
                </span>
              </div>

              <div className="course-card__body">
                <div style={{ display: 'flex', alignItems: 'start', justifyContent: 'space-between', gap: 6 }}>
                  <div className="course-card__title" style={{ flex: 1 }}>{c.title}</div>
                  {canManage && (
                    <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                      <button
                        className="btn btn-secondary btn-sm"
                        title={t('quiz.create_title', { title: '' })}
                        onClick={e => { e.stopPropagation(); setQuizModal(c) }}
                        style={{ padding: '2px 7px', fontSize: '0.8rem', background: 'var(--primary-2)', color: '#fff' }}
                      >➕Q</button>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={e => { e.stopPropagation(); setModal(c) }}
                        style={{ padding: '2px 7px', fontSize: '0.8rem' }}
                      >✏️</button>
                      <button
                        className="btn btn-sm"
                        style={{ background: 'var(--danger)', color: '#fff', padding: '2px 7px', fontSize: '0.8rem' }}
                        onClick={e => handleDelete(e, c._id)}
                        disabled={deleting === c._id}
                      >{deleting === c._id ? '…' : '🗑️'}</button>
                    </div>
                  )}
                </div>

                <div className="course-card__meta">
                  <span>👤 {c.created_by?.full_name || t('courses.instructor')}</span>
                  <span>📁 {c.group_id?.name || t('courses.group')}</span>
                  {c.total_sessions ? <span>📖 {t('courses.sessions', { count: c.total_sessions })}</span> : <span>📖 {t('courses.chapters', { count: c.chapters?.length || 0 })}</span>}
                  {(c.schedule_days || c.start_time) && <span>📅 {c.schedule_days || ''} {c.start_time && c.end_time ? `(${c.start_time} - ${c.end_time})` : c.start_time ? `(${c.start_time})` : ''}</span>}
                </div>

                <div className="progress-bar">
                  <div className="progress-bar__fill" style={{ width: '0%' }} />
                </div>

                {(() => {
                  const access = getCourseAccess(c);
                  return (
                    <button 
                      className={`btn btn-sm ${access.canAccess ? 'btn-primary' : 'btn-secondary'}`} 
                      style={{ width: '100%', justifyContent: 'center', marginTop: '1rem' }}
                      onClick={access.onClick}
                    >
                      {access.label}
                    </button>
                  )
                })()}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Role badge */}
      {user && (
        <div style={{ textAlign: 'right', marginTop: '1rem', fontSize: '0.75rem', color: 'var(--text-3)' }}>
          {t('courses.logged_in_as', { name: user.full_name, role: t(`sidebar.roles.${user.role}`) })}
        </div>
      )}

      {modal && (
        <CrudModal
          title={modal === 'create' ? t('courses.form.create_title') : t('courses.form.edit_title', { title: modal.title })}
          fields={COURSE_FIELDS}
          initialData={modal === 'create' ? null : editInitial(modal)}
          onSubmit={handleSubmit}
          onClose={() => setModal(null)}
        />
      )}
      {quizModal && (
        <CrudModal
          title={t('quiz.create_title', { title: quizModal.title })}
          fields={QUIZ_FIELDS}
          initialData={null}
          onSubmit={handleQuizSubmit}
          onClose={() => setQuizModal(null)}
        />
      )}
    </Layout>
  )
}
