import { useEffect, useState, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Layout from '../components/Layout'
import CrudModal from '../components/CrudModal'
import api from '../api/axios'
import { useAuth } from '../context/AuthContext'

const SUB_TYPES = ['FILE', 'TEXT', 'URL', 'MIXED']
const STATUS_CLASS = { DRAFT: 'tag--warning', PUBLISHED: 'tag--success', CLOSED: 'tag--danger' }

export default function Assignments() {
  const { t, i18n } = useTranslation()
  const { user } = useAuth()
  const navigate = useNavigate()
  const canManage = user?.role === 'ADMIN' || user?.role === 'INSTRUCTOR'

  const [assignments, setAssignments] = useState([])
  const [groups,      setGroups]      = useState([])
  const [loading,     setLoading]     = useState(true)
  const [modal,       setModal]       = useState(null)
  const [deleting,    setDeleting]    = useState(null)

  const STATUS_LABEL = useMemo(() => ({
    DRAFT: t('status.DRAFT'),
    PUBLISHED: t('status.PUBLISHED'),
    CLOSED: t('status.ENDED')
  }), [t])

  const FIELDS = useMemo(() => [
    { name: 'group_id',        label: t('assignments.form.group_label'),      type: 'select',   required: true,
      options: groups.map(g => ({ value: g._id, label: g.name })) },
    { name: 'title',           label: t('assignments.form.title_label'),   type: 'text',     required: true, placeholder: t('assignments.form.title_label') },
    { name: 'description',     label: t('assignments.form.desc_label'),          type: 'textarea', placeholder: t('assignments.form.desc_label') },
    { name: 'max_score',       label: t('assignments.form.max_score_label'),   type: 'number',   required: true, min: 1, placeholder: '100' },
    { name: 'due_at',          label: t('assignments.form.due_at_label'),        type: 'datetime-local', required: true },
    { name: 'submission_type', label: t('assignments.form.type_label'), type: 'select',   required: true,
      options: SUB_TYPES.map(v => ({ value: v, label: v })) },
    { name: 'allow_late',      label: t('assignments.form.allow_late'), type: 'checkbox' },
    { name: 'status',          label: t('assignments.form.status_label'),    type: 'select',   required: true,
      options: Object.entries(STATUS_LABEL).map(([v, l]) => ({ value: v, label: l })),
      default: 'DRAFT' }
  ], [t, groups, STATUS_LABEL])

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
    if (!window.confirm(t('assignments.delete_confirm'))) return
    setDeleting(id)
    try {
      await api.delete(`/assignments/${id}`)
      setAssignments(prev => prev.filter(a => a._id !== id))
    } catch (err) {
      alert(err?.response?.data?.error || t('assignments.delete_fail'))
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
            <h1>{t('assignments.title')} 📝</h1>
            <p>{t('assignments.subtitle')}</p>
          </div>
          {canManage && (
            <button className="btn btn-primary" onClick={() => setModal('create')}>
              ➕ {t('assignments.add_assignment')}
            </button>
          )}
        </div>
      </div>

      {loading ? <div className="spinner-wrap"><div className="spinner" /></div>
      : assignments.length === 0 ? (
        <div className="empty-state fade-in">
          <div className="empty-state__icon">📝</div>
          <h3>{t('assignments.no_assignments')}</h3>
          {canManage && <p>{t('assignments.start_guide')}</p>}
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
                  {overdue && <span className="status-badge status-badge--danger">⚠️ {t('assignments.overdue')}</span>}
                </div>

                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--text)' }}>{a.title}</h3>
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
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-3)', textTransform: 'uppercase', fontWeight: 700 }}>{t('assignments.due_date')}</div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: overdue ? 'var(--danger)' : 'var(--text)' }}>
                      {new Date(a.due_at).toLocaleDateString(i18n.language === 'en' ? 'en-US' : 'vi-VN')}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-3)', textTransform: 'uppercase', fontWeight: 700 }}>{t('assignments.max_score')}</div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--primary-2)' }}>{a.max_score}</div>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-3)', fontWeight: 500 }}>
                    ⌨️ {t('assignments.type')}: {a.submission_type}
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

      {user && (
        <div style={{ textAlign: 'right', marginTop: '1rem', fontSize: '0.75rem', color: 'var(--text-3)' }}>
          {t('courses.logged_in_as', { name: user.full_name, role: t(`sidebar.roles.${user.role}`) })}
        </div>
      )}

      {modal && (
        <CrudModal
          title={modal === 'create' ? t('assignments.form.create_title') : t('assignments.form.edit_title', { title: modal.title })}
          fields={FIELDS}
          initialData={modal === 'create' ? null : editInitial(modal)}
          onSubmit={handleSubmit}
          onClose={() => setModal(null)}
        />
      )}
    </Layout>
  )
}
