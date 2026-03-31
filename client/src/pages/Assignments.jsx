import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import CrudModal from '../components/CrudModal'
import api from '../api/axios'
import { useAuth } from '../context/AuthContext'

const STATUS_LABEL = { DRAFT: 'Nháp', PUBLISHED: 'Đang mở', CLOSED: 'Đã đóng' }
const STATUS_CLASS = { DRAFT: 'tag--warning', PUBLISHED: 'tag--success', CLOSED: 'tag--danger' }
const SUB_TYPES    = ['FILE', 'TEXT', 'URL', 'MIXED']

const FIELDS = (groups = []) => [
  { name: 'group_id',        label: 'Nhóm học',      type: 'select',   required: true,
    options: groups.map(g => ({ value: g._id, label: g.name })) },
  { name: 'title',           label: 'Tên bài tập',   type: 'text',     required: true, placeholder: 'Nhập tên bài tập' },
  { name: 'description',     label: 'Mô tả',          type: 'textarea', placeholder: 'Mô tả chi tiết...' },
  { name: 'max_score',       label: 'Điểm tối đa',   type: 'number',   required: true, min: 1, placeholder: '100' },
  { name: 'due_at',          label: 'Hạn nộp',        type: 'datetime-local', required: true },
  { name: 'submission_type', label: 'Hình thức nộp', type: 'select',   required: true,
    options: SUB_TYPES.map(v => ({ value: v, label: v })) },
  { name: 'allow_late',      label: 'Cho phép nộp trễ', type: 'checkbox', placeholder: 'Cho phép nộp bài sau hạn' },
  { name: 'status',          label: 'Trạng thái',    type: 'select',   required: true,
    options: Object.entries(STATUS_LABEL).map(([v, l]) => ({ value: v, label: l })),
    default: 'DRAFT' }
]

export default function Assignments() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const canManage = user?.role === 'ADMIN' || user?.role === 'INSTRUCTOR'

  const [assignments, setAssignments] = useState([])
  const [groups,      setGroups]      = useState([])
  const [loading,     setLoading]     = useState(true)
  const [modal,       setModal]       = useState(null)   // null | 'create' | assignment object
  const [deleting,    setDeleting]    = useState(null)

  const fetchAssignments = useCallback(() => {
    setLoading(true)
    api.get('/assignments')
      .then(r => setAssignments(r.data.data ?? r.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    fetchAssignments()
    if (canManage) {
      api.get('/study-groups').then(r => setGroups(r.data.data ?? r.data)).catch(console.error)
    }
  }, [fetchAssignments, canManage])

  const isOverdue = a => new Date(a.due_at) < new Date() && a.status !== 'CLOSED'

  const handleSubmit = async form => {
    if (modal === 'create') {
      await api.post('/assignments', form)
    } else {
      await api.put(`/assignments/${modal._id}`, form)
    }
    setModal(null)
    fetchAssignments()
  }

  const handleDelete = async id => {
    if (!window.confirm('Bạn có chắc muốn xóa bài tập này?')) return
    setDeleting(id)
    try {
      await api.delete(`/assignments/${id}`)
      setAssignments(prev => prev.filter(a => a._id !== id))
    } catch (err) {
      alert(err?.response?.data?.error || 'Xóa thất bại')
    } finally {
      setDeleting(null)
    }
  }

  const editInitial = a => ({
    ...a,
    group_id:  a.group_id?._id || a.group_id,
    due_at:    a.due_at ? new Date(a.due_at).toISOString().slice(0, 16) : ''
  })

  return (
    <Layout>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1>Bài tập 📝</h1>
            <p>Quản lý và theo dõi bài tập của bạn</p>
          </div>
          {canManage && (
            <button className="btn btn-primary" onClick={() => setModal('create')}>
              ➕ Tạo bài tập
            </button>
          )}
        </div>
      </div>

      {loading ? <div className="spinner-wrap"><div className="spinner" /></div>
      : assignments.length === 0 ? (
        <div className="empty-state fade-in">
          <div className="empty-state__icon">📝</div>
          <h3>Chưa có bài tập nào</h3>
          {canManage && <p>Nhấn "Tạo bài tập" để bắt đầu.</p>}
        </div>
      ) : (
        <div className="grid-auto fade-in" style={{ gap: '1.5rem' }}>
          {assignments.map(a => {
            const overdue = isOverdue(a)
            return (
              <div key={a._id} className="glass-card-hover" onClick={() => navigate(`/assignments/${a._id}`)} style={{ cursor: 'pointer' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1rem' }}>
                  <div className={`status-badge ${STATUS_CLASS[a.status].replace('tag--', 'status-badge--')}`}>
                    {STATUS_LABEL[a.status]}
                  </div>
                  {overdue && <span className="status-badge status-badge--danger">⚠️ Quá hạn</span>}
                </div>

                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem', color: '#fff' }}>{a.title}</h3>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-3)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  👥 {a.group_id?.name || '—'}
                </p>

                <div style={{ flex: 1 }}>
                  {a.description && (
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-2)', lineClamp: 2, WebkitLineClamp: 2, display: '-webkit-box', WebkitBoxOrient: 'vertical', overflow: 'hidden', marginBottom: '1rem' }}>
                      {a.description}
                    </p>
                  )}
                </div>

                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '12px', marginBottom: '1.5rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-3)', textTransform: 'uppercase', fontWeight: 700 }}>Hạn nộp</div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: overdue ? 'var(--danger)' : 'var(--text)' }}>
                      {new Date(a.due_at).toLocaleDateString('vi-VN')}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-3)', textTransform: 'uppercase', fontWeight: 700 }}>Điểm tối đa</div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--primary-2)' }}>{a.max_score}</div>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-3)', fontWeight: 500 }}>
                    ⌨️ {a.submission_type}
                  </span>
                  {canManage && (
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        className="topbar__icon-btn"
                        onClick={(e) => { e.stopPropagation(); setModal(a) }}
                        style={{ width: '32px', height: '32px' }}
                      >✏️</button>
                      <button
                        className="topbar__icon-btn"
                        onClick={(e) => { e.stopPropagation(); handleDelete(a._id) }}
                        style={{ width: '32px', height: '32px', color: 'var(--danger)' }}
                        disabled={deleting === a._id}
                      >{deleting === a._id ? '…' : '🗑️'}</button>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Role badge */}
      {user && (
        <div style={{ textAlign: 'right', marginTop: '1rem', fontSize: '0.75rem', color: 'var(--text-3)' }}>
          Đang đăng nhập: <strong>{user.full_name}</strong> · Vai trò: <strong>{user.role}</strong>
        </div>
      )}

      {/* Modal */}
      {modal && (
        <CrudModal
          title={modal === 'create' ? 'Tạo bài tập mới' : `Sửa: ${modal.title}`}
          fields={FIELDS(groups)}
          initialData={modal === 'create' ? null : editInitial(modal)}
          onSubmit={handleSubmit}
          onClose={() => setModal(null)}
        />
      )}
    </Layout>
  )
}
