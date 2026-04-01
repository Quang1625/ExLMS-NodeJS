import { useEffect, useState, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Layout from '../components/Layout'
import CrudModal from '../components/CrudModal'
import api from '../api/axios'
import { useAuth } from '../context/AuthContext'


export default function Groups() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const canManage = user?.role === 'ADMIN' || user?.role === 'INSTRUCTOR'

  const [groups,   setGroups]   = useState([])
  const [loading,  setLoading]  = useState(true)
  const [modal,    setModal]    = useState(null)
  const [deleting, setDeleting] = useState(null)
  const navigate = useNavigate()

  const GROUP_FIELDS = useMemo(() => [
    { name: 'name',        label: t('groups.form.title_label'),     type: 'text',     required: true, placeholder: t('groups.form.name_placeholder') },
    { name: 'description', label: t('groups.form.desc_label'),         type: 'textarea', placeholder: t('groups.form.desc_placeholder') },
    { name: 'category',    label: t('groups.form.category_label'),      type: 'text',     placeholder: t('groups.form.category_placeholder') },
    { name: 'visibility',  label: t('common.status'),        type: 'select',   required: true, grid: 'half',
      options: [
        { value: 'PUBLIC', label: `🌐 ${t('groups.visibility.PUBLIC')}` }, 
        { value: 'PRIVATE', label: `🔒 ${t('groups.visibility.PRIVATE')}` }
      ],
      default: 'PUBLIC' },
    { name: 'max_members', label: t('groups.form.max_members_label'), type: 'number', min: 2, placeholder: '50', default: 50, grid: 'half' }
  ], [t])

  const fetchGroups = useCallback(() => {
    setLoading(true)
    api.get('/study-groups')
      .then(r => setGroups(r.data.data ?? r.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { fetchGroups() }, [fetchGroups])

  const handleSubmit = async form => {
    if (modal === 'create') {
      await api.post('/study-groups', form)
    } else {
      await api.put(`/study-groups/${modal._id}`, form)
    }
    setModal(null)
    fetchGroups()
  }

  const handleDelete = async (e, id) => {
    e.stopPropagation()
    if (!window.confirm(t('groups.delete_confirm'))) return
    setDeleting(id)
    try {
      await api.delete(`/study-groups/${id}`)
      setGroups(prev => prev.filter(g => g._id !== id))
    } catch (err) {
      alert(err?.response?.data?.error || t('common.error_fail'))
    } finally {
      setDeleting(null)
    }
  }

  const editInitial = g => ({
    name:        g.name,
    description: g.description || '',
    category:    g.category || '',
    visibility:  g.visibility,
    max_members: g.max_members
  })

  const handleJoin = async (e, g) => {
    e.stopPropagation()
    const msg = g.visibility === 'PRIVATE' ? prompt(t('groups.join_modal.message_placeholder')) : ''
    if (g.visibility === 'PRIVATE' && msg === null) return // cancelled

    try {
       await api.post(`/study-groups/${g._id}/join-requests`, { message: msg })
      alert(t('groups.join_modal.success'))
      fetchGroups()
    } catch (err) {
      alert(err?.response?.data?.error || t('common.error_fail'))
    }
  }

  const getJoinStatus = (g) => {
    if (!user) return null
    if (canManage) return 'MEMBER'
    
    const isMember = g.members?.some(m => m.user_id === user._id || m.user_id?._id === user._id)
    if (isMember) return 'MEMBER'

    const hasPending = g.join_requests?.some(r => r.user_id === user._id && r.status === 'PENDING')
    if (hasPending) return 'PENDING'

    return 'NONE'
  }

  const COLORS = ['#6c63ff','#00d4ff','#f59e0b','#22c55e','#ef4444','#a855f7']
  const visIcon = { PUBLIC: '🌐', PRIVATE: '🔒' }

  return (
    <Layout>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1>{t('groups.title')} 👥</h1>
            <p>{t('groups.subtitle', { count: groups.length })}</p>
          </div>
          {canManage && (
            <button className="btn btn-primary" onClick={() => setModal('create')}>
              + {t('groups.create_group')}
            </button>
          )}
        </div>
      </div>

      {loading ? <div className="spinner-wrap"><div className="spinner" /></div>
      : groups.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state__icon">👥</div>
          <h3>{t('groups.no_groups')}</h3>
          {canManage && <p>{t('common.start_guide', { action: t('groups.create_group') })}</p>}
        </div>
      ) : (
        <div className="grid-auto">
          {groups.map((g, i) => (
            <div className="card" key={g._id} style={{ cursor: 'pointer', position: 'relative' }}
              onClick={() => navigate(`/groups/${g._id}`)}>
              {/* Color bar */}
              <div style={{
                height: 8, margin: '-1.5rem -1.5rem 1.25rem',
                borderRadius: 'var(--radius) var(--radius) 0 0',
                background: `linear-gradient(135deg, ${COLORS[i % COLORS.length]}, ${COLORS[(i + 2) % COLORS.length]})`
              }} />

              {/* Name + visibility + manage buttons */}
              <div style={{ display: 'flex', alignItems: 'start', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                <h3 style={{ margin: 0, flex: 1 }}>{g.name}</h3>
                <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                  <span title={g.visibility}>{visIcon[g.visibility]}</span>
                  {canManage && (
                    <>
                      <button
                        className="btn btn-secondary btn-sm"
                        title={t('common.manage')}
                        onClick={e => { e.stopPropagation(); setModal(g) }}
                        style={{ padding: '2px 8px', fontSize: '0.8rem' }}
                      >✏️</button>
                      <button
                        className="btn btn-sm"
                        title={t('common.delete')}
                        style={{ background: 'var(--danger)', color: '#fff', padding: '2px 8px', fontSize: '0.8rem' }}
                        onClick={e => handleDelete(e, g._id)}
                        disabled={deleting === g._id}
                      >{deleting === g._id ? '…' : '🗑️'}</button>
                    </>
                  )}
                </div>
              </div>

              <p style={{ fontSize: '0.85rem', marginBottom: '1rem', WebkitLineClamp: 2, display: '-webkit-box', WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                {g.description || t('common.no_description')}
              </p>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-3)' }}>
                <span>👤 {t('groups.members_count', { count: g.member_count })}</span>
                <span>👑 {g.owner_id?.full_name || 'GV'}</span>
              </div>

              {getJoinStatus(g) === 'MEMBER' ? (
                <button className="btn btn-primary btn-sm" style={{ width: '100%', justifyContent: 'center', marginTop: '1rem' }}
                  onClick={e => { e.stopPropagation(); navigate(`/groups/${g._id}`) }}>
                  {t('groups.joined')} →
                </button>
              ) : getJoinStatus(g) === 'PENDING' ? (
                <button className="btn btn-secondary btn-sm" disabled style={{ width: '100%', justifyContent: 'center', marginTop: '1rem' }}>
                  ⏳ {t('groups.pending')}
                </button>
              ) : (
                <button className="btn btn-primary btn-sm" style={{ width: '100%', justifyContent: 'center', marginTop: '1rem' }}
                  onClick={e => handleJoin(e, g)}>
                  {g.visibility === 'PUBLIC' ? t('groups.join') : t('groups.join')}
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Role badge */}
      {user && (
        <div style={{ textAlign: 'right', marginTop: '1rem', fontSize: '0.75rem', color: 'var(--text-3)' }}>
          {t('courses.logged_in_as', { name: user.full_name, role: user.role })}
        </div>
      )}

      {modal && (
        <CrudModal
          title={modal === 'create' ? t('groups.create_group') : `${t('common.manage')}: ${modal.name}`}
          fields={GROUP_FIELDS}
          initialData={modal === 'create' ? null : editInitial(modal)}
          onSubmit={handleSubmit}
          onClose={() => setModal(null)}
        />
      )}
    </Layout>
  )
}
