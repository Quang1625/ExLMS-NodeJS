import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import CrudModal from '../components/CrudModal'
import api from '../api/axios'
import { useAuth } from '../context/AuthContext'

const STATUS_LABEL = { PUBLISHED: 'Đang mở', DRAFT: 'Nháp', ENDED: 'Kết thúc', ARCHIVED: 'Lưu trữ' }
const STATUS_CLASS = { PUBLISHED: 'tag--success', DRAFT: 'tag--warning', ENDED: 'tag--danger', ARCHIVED: '' }
const ICONS = ['📘', '📗', '📙', '📕', '📓', '📒']
const QUIZ_FIELDS = [
  { name: 'title',             label: 'Tiêu đề Quiz',   type: 'text',     required: true, placeholder: 'Nhập tên câu đố' },
  { name: 'description',       label: 'Mô tả',          type: 'textarea', placeholder: 'Mô tả chi tiết...' },
  { name: 'time_limit_sec',    label: 'Thời gian (giây)', type: 'number',   placeholder: 'VD: 600 (10 phút)', min: 0 },
  { name: 'max_attempts',      label: 'Số lần làm bài',  type: 'number',   default: 1, min: 1 },
  { name: 'passing_score',     label: 'Điểm đạt (%)',   type: 'number',   default: 70, min: 0, max: 100 },
  { name: 'shuffle_questions', label: 'Xáo trộn câu hỏi', type: 'checkbox', placeholder: 'Ngẫu nhiên thứ tự câu hỏi' },
  { name: 'result_visibility', label: 'Hiển thị kết quả', type: 'select',   required: true,
    options: [
      { value: 'IMMEDIATE',      label: 'Ngay lập tức' },
      { value: 'AFTER_DEADLINE', label: 'Sau khi kết thúc' },
      { value: 'MANUAL',         label: 'Thủ công' }
    ], default: 'IMMEDIATE' }
]

const COURSE_FIELDS = (groups = []) => [
  { name: 'group_id',              label: 'Nhóm học',    type: 'select',  required: true,
    options: groups.map(g => ({ value: g._id, label: g.name })) },
  { name: 'title',                 label: 'Tiêu đề',     type: 'text',    required: true, placeholder: 'Tên khóa học' },
  { name: 'description',           label: 'Mô tả',        type: 'textarea', placeholder: 'Mô tả chi tiết...' },
  { name: 'status',                label: 'Trạng thái',  type: 'select',  required: true,
    options: [
      { value: 'DRAFT',     label: 'Nháp' },
      { value: 'PUBLISHED', label: 'Đang mở' },
      { value: 'ENDED',     label: 'Kết thúc' }
    ], default: 'DRAFT' },
  { name: 'start_date',            label: 'Ngày bắt đầu', type: 'date' },
  { name: 'end_date',              label: 'Ngày kết thúc', type: 'date' },
  { name: 'start_time',            label: 'Giờ học', type: 'time' },
  { name: 'end_time',              label: 'Giờ kết thúc', type: 'time' },
  { name: 'total_sessions',        label: 'Số buổi học', type: 'number', min: 1, placeholder: 'VD: 12' },
  { name: 'schedule_days',         label: 'Lịch học (Thứ)', type: 'text', placeholder: 'VD: Thứ 2, Thứ 4' },
  { name: 'completion_threshold',  label: 'Ngưỡng hoàn thành (%)', type: 'number', min: 0, max: 100, placeholder: '80', default: 80 },
  { name: 'has_certificate',       label: 'Cấp chứng chỉ', type: 'checkbox', placeholder: 'Cấp chứng chỉ khi hoàn thành' }
]

export default function Courses() {
  const { user } = useAuth()
  const isAdmin   = user?.role === 'ADMIN'
  const canManage = user?.role === 'ADMIN' || user?.role === 'INSTRUCTOR'

  const [courses,  setCourses]  = useState([])
  const [groups,   setGroups]   = useState([])
  const [filter,   setFilter]   = useState('all')
  const [loading,  setLoading]  = useState(true)
  const [modal,    setModal]    = useState(null)
  const [quizModal, setQuizModal] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const navigate = useNavigate()

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
    if (!window.confirm('Bạn có chắc muốn lưu trữ (xóa) khóa học này?')) return
    setDeleting(id)
    try {
      await api.delete(`/courses/${id}`)
      fetchCourses()
    } catch (err) {
      alert(err?.response?.data?.error || 'Xóa thất bại')
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
    alert('Tạo Quiz thành công!')
  }

  
  const getCourseAccess = (c) => {
    if (canManage) return { canAccess: true, label: 'Vào học →', onClick: () => navigate(`/courses/${c._id}`) }
    
   
    const group = c.group_id
    if (!group) return { canAccess: false, label: '🔒 Khóa học chưa Gán nhóm' }

    if (group.members) {
      const isMember = group.members.some(m => 
        (m.user_id === user._id || m.user_id?._id === user._id) && m.status === 'ACTIVE'
      )
      if (isMember) {
        return { canAccess: true, label: 'Vào học →', onClick: () => navigate(`/courses/${c._id}`) }
      }
    }
    
    return { 
      canAccess: false, 
      label: '🔒 Yêu cầu thành viên nhóm', 
      onClick: (e) => { e.stopPropagation(); navigate(`/groups/${group._id || group}`) }
    }
  }

  return (
    <Layout>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1>Khóa học 📚</h1>
            <p>Tổng cộng {courses.length} khóa học</p>
          </div>

          {/* ⚠️ Tạo khóa học: CHỈ ADMIN */}
          {isAdmin && (
            <button className="btn btn-primary" onClick={() => setModal('create')}>
              ➕ Tạo khóa học
            </button>
          )}
        </div>
      </div>

      {/* ADMIN-only notice for instructors */}
      {canManage && !isAdmin && (
        <div style={{
          background: 'rgba(245,158,11,0.1)', border: '1px solid var(--warning)',
          borderRadius: 8, padding: '0.6rem 1rem', marginBottom: '1rem',
          fontSize: '0.8125rem', color: 'var(--warning)', display: 'flex', alignItems: 'center', gap: 6
        }}>
          🔒 Chỉ Admin mới có quyền tạo khóa học mới. Bạn có thể chỉnh sửa và xóa.
        </div>
      )}

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {[['all', 'Tất cả'], ['PUBLISHED', 'Đang mở'], ['DRAFT', 'Nháp'], ['ENDED', 'Kết thúc']].map(([val, label]) => (
          <button key={val}
            className={`btn btn-sm ${filter === val ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setFilter(val)}>{label}</button>
        ))}
      </div>

      {loading ? <div className="spinner-wrap"><div className="spinner" /></div>
      : filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state__icon">📭</div>
          <h3>Không có khóa học nào</h3>
          <p>Chưa có khóa học phù hợp với bộ lọc này.</p>
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
                        title="Tạo Quiz"
                        onClick={e => { e.stopPropagation(); setQuizModal(c) }}
                        style={{ padding: '2px 7px', fontSize: '0.8rem', background: 'var(--primary-2)', color: '#fff' }}
                      >➕Q</button>
                      <button
                        className="btn btn-secondary btn-sm"
                        title="Sửa"
                        onClick={e => { e.stopPropagation(); setModal(c) }}
                        style={{ padding: '2px 7px', fontSize: '0.8rem' }}
                      >✏️</button>
                      <button
                        className="btn btn-sm"
                        title="Lưu trữ"
                        style={{ background: 'var(--danger)', color: '#fff', padding: '2px 7px', fontSize: '0.8rem' }}
                        onClick={e => handleDelete(e, c._id)}
                        disabled={deleting === c._id}
                      >{deleting === c._id ? '…' : '🗑️'}</button>
                    </div>
                  )}
                </div>

                <div className="course-card__meta">
                  <span>👤 {c.created_by?.full_name || 'Giảng viên'}</span>
                  <span>📁 {c.group_id?.name || 'Nhóm'}</span>
                  {c.total_sessions ? <span>📖 {c.total_sessions} buổi</span> : <span>📖 {c.chapters?.length || 0} chương</span>}
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
          Đang đăng nhập: <strong>{user.full_name}</strong> · Vai trò: <strong>{user.role}</strong>
        </div>
      )}

      {modal && (
        <CrudModal
          title={modal === 'create' ? 'Tạo khóa học mới' : `Sửa: ${modal.title}`}
          fields={COURSE_FIELDS(groups)}
          initialData={modal === 'create' ? null : editInitial(modal)}
          onSubmit={handleSubmit}
          onClose={() => setModal(null)}
        />
      )}
      {quizModal && (
        <CrudModal
          title={`Tạo Quiz mới: ${quizModal.title}`}
          fields={QUIZ_FIELDS}
          initialData={null}
          onSubmit={handleQuizSubmit}
          onClose={() => setQuizModal(null)}
        />
      )}
    </Layout>
  )
}
