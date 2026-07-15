import { useEffect, useState, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Layout from '../components/Layout'
import CrudModal from '../components/CrudModal'
import api from '../api/axios'
import { useAuth } from '../context/AuthContext'
import { Search, SlidersHorizontal, Plus, BookOpen, Book, Bookmark, GraduationCap, Award, Library, Lock, User, Star, Folder, Edit3, Trash2, PlusCircle } from 'lucide-react'

const ICONS = [
  <BookOpen size={48} style={{ opacity: 0.8 }} />,
  <Book size={48} style={{ opacity: 0.8 }} />,
  <Bookmark size={48} style={{ opacity: 0.8 }} />,
  <GraduationCap size={48} style={{ opacity: 0.8 }} />,
  <Award size={48} style={{ opacity: 0.8 }} />,
  <Library size={48} style={{ opacity: 0.8 }} />
]
const GRADIENTS = [
  'linear-gradient(135deg,#1e1b4b,#4338ca)',
  'linear-gradient(135deg,#0c4a6e,#0369a1)',
  'linear-gradient(135deg,#3b0764,#7c3aed)',
  'linear-gradient(135deg,#064e3b,#059669)',
  'linear-gradient(135deg,#450a0a,#dc2626)',
  'linear-gradient(135deg,#1c1917,#57534e)',
]

export default function Courses() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const navigate = useNavigate()

  const isAdmin   = user?.role === 'ADMIN'
  const canManage = user?.role === 'ADMIN' || user?.role === 'INSTRUCTOR'

  const [courses,  setCourses]  = useState([])
  const [groups,   setGroups]   = useState([])
  const [filter,   setFilter]   = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState('newest')
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

  const STATUS_COLOR = {
    PUBLISHED: '#22c55e',
    DRAFT: '#f59e0b',
    ENDED: 'var(--text-3)',
    ARCHIVED: 'var(--text-3)',
  }

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

  const filtered = useMemo(() => {
    let result = courses;
    if (filter !== 'all') {
      result = result.filter(c => c.status === filter)
    } else {
      result = result.filter(c => c.status !== 'ARCHIVED')
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(c => c.title.toLowerCase().includes(q) || c.description?.toLowerCase().includes(q))
    }
    result = [...result].sort((a, b) => {
      if (sortBy === 'newest') return new Date(b.created_at || 0) - new Date(a.created_at || 0)
      if (sortBy === 'oldest') return new Date(a.created_at || 0) - new Date(b.created_at || 0)
      if (sortBy === 'a_z') return a.title.localeCompare(b.title)
      if (sortBy === 'z_a') return b.title.localeCompare(a.title)
      return 0
    })
    return result;
  }, [courses, filter, searchQuery, sortBy])

  const activeCoursesCount = useMemo(() => {
    return courses.filter(c => c.status !== 'ARCHIVED').length
  }, [courses])

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

  const filterOptions = useMemo(() => {
    const opts = [
      { val: 'all',       label: t('common.all') || 'Tất cả' },
      { val: 'PUBLISHED', label: t('status.PUBLISHED') },
      { val: 'DRAFT',     label: t('status.DRAFT') },
      { val: 'ENDED',     label: t('status.ENDED') },
    ]
    if (canManage) {
      opts.push({ val: 'ARCHIVED', label: t('status.ARCHIVED') || 'Đã lưu trữ' })
    }
    return opts
  }, [t, canManage])

  return (
    <Layout>
      {/* ── Page Header ── */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(108,99,255,0.12) 0%, rgba(0,212,255,0.06) 100%)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '20px',
        padding: '2rem 2.5rem',
        marginBottom: '1.75rem',
        position: 'relative', overflow: 'hidden',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1.25rem'
      }}>
        {/* Decorative orb */}
        <div style={{
          position: 'absolute', top: '-50px', right: '-30px',
          width: '220px', height: '220px', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(108,99,255,0.15) 0%, transparent 70%)',
          pointerEvents: 'none'
        }} />
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.35rem' }}>
            <div style={{
              width: 40, height: 40, borderRadius: '12px',
              background: 'linear-gradient(135deg, var(--primary), var(--accent))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', flexShrink: 0,
              boxShadow: '0 6px 16px rgba(108,99,255,0.35)'
            }}><BookOpen size={20} /></div>
            <h1 style={{ margin: 0, fontSize: '1.75rem' }}>{t('courses.title')}</h1>
          </div>
          <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-2)' }}>
            {t('courses.total', { count: activeCoursesCount })}
            {filtered.length !== activeCoursesCount && (
              <span style={{ color: 'var(--primary-2)', marginLeft: '0.5rem', fontWeight: 600 }}>
                · {filtered.length} kết quả lọc
              </span>
            )}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          {canManage && !isAdmin && (
            <div style={{
              background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)',
              borderRadius: '10px', padding: '0.5rem 0.875rem',
              fontSize: '0.78rem', color: 'var(--warning)',
              display: 'flex', alignItems: 'center', gap: '6px'
            }}>
              <Lock size={12} /> {t('courses.admin_only_create')}
            </div>
          )}
          {isAdmin && (
            <button
              className="btn btn-primary"
              onClick={() => setModal('create')}
              style={{ gap: '0.5rem' }}
            >
              <Plus size={16} strokeWidth={2.5} />
              {t('courses.add_course')}
            </button>
          )}
        </div>
      </div>

      {/* ── Toolbar ── */}
      <div style={{
        display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center',
        background: 'var(--bg-2)', padding: '0.875rem 1.25rem',
        borderRadius: '16px', border: '1px solid var(--border)', marginBottom: '2rem'
      }}>
        {/* Filter Pills */}
        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
          {filterOptions.map(({ val, label }) => (
            <button
              key={val}
              onClick={() => setFilter(val)}
              style={{
                padding: '0.4rem 1rem',
                borderRadius: '99px',
                fontSize: '0.8rem', fontWeight: 600,
                border: filter === val ? '1.5px solid var(--primary)' : '1.5px solid var(--border)',
                background: filter === val
                  ? 'linear-gradient(135deg, var(--primary), var(--primary-2))'
                  : 'transparent',
                color: filter === val ? '#fff' : 'var(--text-2)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: filter === val ? '0 4px 14px rgba(108,99,255,0.3)' : 'none',
              }}
            >{label}</button>
          ))}
        </div>

        <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.75rem', flex: 1, maxWidth: '480px', justifyContent: 'flex-end' }}>
          {/* Search */}
          <div style={{ position: 'relative', flex: 1, maxWidth: '280px' }}>
            <Search size={15} style={{
              position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)',
              color: 'var(--text-3)', pointerEvents: 'none'
            }} />
            <input
              type="text"
              placeholder={t('courses.search_placeholder') || 'Tìm khoá học...'}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{
                width: '100%', padding: '0.5rem 1rem 0.5rem 2.25rem',
                borderRadius: '99px', border: '1.5px solid var(--border)',
                background: 'var(--bg-3)', color: 'var(--text)',
                outline: 'none', fontSize: '0.82rem',
                transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
                fontFamily: 'inherit'
              }}
              onFocus={e => { e.target.style.borderColor = 'var(--primary)'; e.target.style.boxShadow = '0 0 0 3px rgba(108,99,255,0.15)'; }}
              onBlur={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.boxShadow = 'none'; }}
            />
          </div>

          {/* Sort */}
          <div style={{ position: 'relative' }}>
            <SlidersHorizontal size={14} style={{
              position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)',
              color: 'var(--text-3)', pointerEvents: 'none'
            }} />
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
              style={{
                padding: '0.5rem 1rem 0.5rem 2.125rem',
                borderRadius: '99px', border: '1.5px solid var(--border)',
                background: 'var(--bg-3)', color: 'var(--text)',
                outline: 'none', cursor: 'pointer', fontSize: '0.82rem',
                fontFamily: 'inherit', appearance: 'none'
              }}
            >
              <option value="newest">{t('courses.sort_newest') || 'Mới nhất'}</option>
              <option value="oldest">{t('courses.sort_oldest') || 'Cũ nhất'}</option>
              <option value="a_z">{t('courses.sort_a_z') || 'A-Z'}</option>
              <option value="z_a">{t('courses.sort_z_a') || 'Z-A'}</option>
            </select>
          </div>
        </div>
      </div>

      {/* ── Course Grid ── */}
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
          {[1,2,3,4,5,6].map(i => (
            <div key={i} style={{ borderRadius: '20px', overflow: 'hidden', background: 'var(--bg-2)', border: '1px solid var(--border)' }}>
              <div className="skeleton" style={{ height: 160 }} />
              <div style={{ padding: '1.25rem' }}>
                <div className="skeleton skeleton-text" style={{ width: '80%', marginBottom: 10 }} />
                <div className="skeleton skeleton-text" style={{ width: '55%', marginBottom: 10 }} />
                <div className="skeleton skeleton-text" style={{ width: '40%' }} />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state" style={{ background: 'var(--bg-2)', borderRadius: '20px', padding: '5rem 2rem' }}>
          <div className="empty-state__icon">
            <BookOpen size={64} style={{ color: 'var(--text-3)', opacity: 0.8 }} />
          </div>
          <h3>{t('courses.no_courses')}</h3>
          <p>{searchQuery ? 'Không tìm thấy kết quả phù hợp' : 'Chưa có khoá học nào'}</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: '1.5rem' }}>
          {filtered.map((c, i) => {
            const mockStudents = Math.floor((c._id?.charCodeAt(0) || 50) * 3.7 + 10) % 490 + 15
            const mockRating = ((c._id?.charCodeAt(1) || 40) % 10 / 10 + 4).toFixed(1)
            const access = getCourseAccess(c)
            return (
              <div
                className="course-card-v2"
                key={c._id}
                onClick={() => navigate(`/courses/${c._id}`)}
                style={{ cursor: 'pointer' }}
              >
                {/* Cover */}
                <div style={{
                  height: '160px',
                  background: GRADIENTS[i % GRADIENTS.length],
                  position: 'relative', display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                  fontSize: '3.5rem', overflow: 'hidden'
                }}>
                  {ICONS[i % ICONS.length]}
                  {/* Shimmer on hover via CSS */}
                  <div style={{
                    position: 'absolute', inset: 0,
                    background: 'linear-gradient(to bottom, transparent 40%, rgba(0,0,0,0.5))'
                  }} />
                  {/* Status Badge */}
                  <span style={{
                    position: 'absolute', top: 12, right: 12,
                    background: `${STATUS_COLOR[c.status]}22`,
                    backdropFilter: 'blur(8px)',
                    border: `1px solid ${STATUS_COLOR[c.status]}60`,
                    color: STATUS_COLOR[c.status],
                    padding: '3px 12px', borderRadius: '20px',
                    fontSize: '0.72rem', fontWeight: 700,
                  }}>
                    {STATUS_LABEL[c.status]}
                  </span>
                </div>

                {/* Body */}
                <div style={{ padding: '1.375rem', display: 'flex', flexDirection: 'column', gap: '0.625rem', flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                    <h3 style={{
                      fontSize: '1rem', fontWeight: 700, lineHeight: 1.4,
                      margin: 0, color: 'var(--text)',
                      display: '-webkit-box', WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical', overflow: 'hidden'
                    }}>{c.title}</h3>
                    {canManage && (
                      <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                        <button
                          className="btn btn-sm"
                          title="Tạo Quiz"
                          onClick={e => { e.stopPropagation(); setQuizModal(c) }}
                          style={{
                            padding: '4px 8px', fontSize: '0.72rem',
                            background: 'var(--primary-dim)', color: 'var(--primary-2)', border: '1px solid rgba(108,99,255,0.3)',
                            borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center'
                          }}
                        ><PlusCircle size={13} /></button>
                        <button
                          className="btn btn-sm"
                          onClick={e => { e.stopPropagation(); setModal(c) }}
                          style={{ padding: '4px 8px', fontSize: '0.72rem', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        ><Edit3 size={13} /></button>
                        <button
                          className="btn btn-sm"
                          style={{ background: 'rgba(239,68,68,0.12)', color: 'var(--danger)', padding: '4px 8px', fontSize: '0.72rem', borderRadius: '8px', border: '1px solid rgba(239,68,68,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                          onClick={e => handleDelete(e, c._id)}
                          disabled={deleting === c._id}
                        >{deleting === c._id ? '…' : <Trash2 size={13} />}</button>
                      </div>
                    )}
                  </div>

                  {/* Instructor & Rating */}
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-3)', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><User size={13} /> {c.created_by?.full_name || t('courses.instructor')}</span>
                    <span style={{ color: 'var(--border)' }}>·</span>
                    <span style={{ color: '#f59e0b', display: 'inline-flex', alignItems: 'center', gap: '4px' }}><Star size={13} fill="#f59e0b" stroke="#f59e0b" /> {mockRating}</span>
                    <span style={{ color: 'var(--border)' }}>·</span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><GraduationCap size={13} /> {mockStudents}</span>
                  </div>

                  {/* Description */}
                  <p style={{
                    fontSize: '0.83rem', color: 'var(--text-2)', margin: 0,
                    display: '-webkit-box', WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: 1.55
                  }}>
                    {c.description || t('course_detail.no_desc')}
                  </p>

                  {/* Meta Row */}
                  <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    marginTop: 'auto', paddingTop: '0.75rem',
                    borderTop: '1px dashed var(--border)',
                    fontSize: '0.78rem', color: 'var(--text-2)'
                  }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><Folder size={12} /> {c.group_id?.name || t('courses.group')}</span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <BookOpen size={12} />
                        {c.total_sessions
                          ? t('courses.sessions', { count: c.total_sessions })
                          : t('courses.chapters', { count: c.chapters?.length || 0 })}
                      </span>
                    </div>
                    <span style={{ fontWeight: 700, color: 'var(--primary-2)', fontSize: '1rem' }}>
                      {t('courses.price_free') || 'Free'}
                    </span>
                  </div>

                  {/* Access Button */}
                  <button
                    className={`btn ${access.canAccess ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ width: '100%', justifyContent: 'center', borderRadius: '12px' }}
                    onClick={e => { e.stopPropagation(); access.onClick && access.onClick(e) }}
                  >
                    {access.label}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {user && (
        <div style={{ textAlign: 'center', marginTop: '3rem', fontSize: '0.8rem', color: 'var(--text-3)', padding: '1rem' }}>
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
