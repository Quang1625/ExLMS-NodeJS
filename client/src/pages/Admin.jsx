import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import Layout from '../components/Layout'
import api from '../api/axios'

export default function Admin() {
  const { t, i18n } = useTranslation()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const { data } = await api.get('/admin/users')
        setUsers(Array.isArray(data) ? data : [])
      } catch (err) {
        console.error('Error fetching users:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchUsers()
  }, [])

  const handleUpdateRole = async (userId, newRole) => {
    try {
      await api.put(`/admin/users/${userId}/role`, { role: newRole })
      setUsers(users.map(u => u._id === userId ? { ...u, role: newRole } : u))
    } catch (err) {
      alert(t('common.error_fail') + ': ' + (err.response?.data?.error || err.message))
    }
  }

  const handleUpdateStatus = async (userId, newStatus) => {
    try {
      await api.put(`/admin/users/${userId}/status`, { status: newStatus })
      setUsers(users.map(u => u._id === userId ? { ...u, status: newStatus } : u))
    } catch (err) {
      alert(t('common.error_fail') + ': ' + (err.response?.data?.error || err.message))
    }
  }

  const filtered = users.filter(u => {
    const matchSearch = u.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchRole = roleFilter === 'all' || u.role === roleFilter
    const matchStatus = statusFilter === 'all' || u.status === statusFilter
    return matchSearch && matchRole && matchStatus
  }) || []

  const counts = {
    total: users?.length || 0,
    admin: users?.filter(u => u.role === 'ADMIN').length || 0,
    instructor: users?.filter(u => u.role === 'INSTRUCTOR').length || 0,
    student: users?.filter(u => u.role === 'STUDENT').length || 0
  }

  const locale = i18n.language === 'en' ? 'en-US' : 'vi-VN'

  if (loading) return <Layout><div className="spinner-wrap"><div className="spinner" /></div></Layout>

  return (
    <Layout>
      <div className="page fade-in" style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ marginBottom: '2.5rem' }}>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 900, letterSpacing: '-0.02em', background: 'linear-gradient(135deg, #fff 0%, var(--text-2) 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: '0.5rem' }}>
            {t('admin.title')}
          </h1>
          <p style={{ color: 'var(--text-3)', fontSize: '1.1rem' }}>{t('admin.subtitle')}</p>
        </div>

        <div className="stat-grid" style={{ marginBottom: '3rem' }}>
          {[
            { icon: '👥', label: t('admin.stats.total'), value: counts.total, color: '#6c63ff', bg: 'rgba(108,99,255,0.1)' },
            { icon: '🛡️', label: t('admin.stats.admin'), value: counts.admin, color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
            { icon: '👨‍🏫', label: t('admin.stats.instructor'), value: counts.instructor, color: '#00d4ff', bg: 'rgba(0,212,255,0.1)' },
            { icon: '🧑‍🎓', label: t('admin.stats.student'), value: counts.student, color: '#22c55e', bg: 'rgba(34,197,94,0.1)' }
          ].map((s, i) => (
            <div key={i} className="stat-card glass-card-hover" style={{ border: `1px solid ${s.bg.replace('0.1', '0.2')}` }}>
              <div className="stat-card__icon" style={{ background: s.bg, color: s.color, fontSize: '1.8rem' }}>{s.icon}</div>
              <div>
                <div className="stat-card__value" style={{ fontSize: '2rem', color: '#fff' }}>{s.value}</div>
                <div className="stat-card__label" style={{ fontWeight: 600, opacity: 0.6 }}>{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="glass-card" style={{ padding: '2rem', border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', gap: '1.25rem', marginBottom: '2.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: '300px' }}>
              <span style={{ position: 'absolute', left: '1.25rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }}>🔍</span>
              <input
                type="text"
                className="form-input"
                placeholder={t('admin.search_placeholder')}
                style={{ paddingLeft: '3rem', borderRadius: '14px', height: '52px' }}
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
            <select className="form-input" style={{ width: 'auto', minWidth: '160px', borderRadius: '14px', height: '52px' }} value={roleFilter} onChange={e => setRoleFilter(e.target.value)}>
              <option value="all">{t('admin.filter.all_roles')}</option>
              <option value="ADMIN">{t('admin.roles.ADMIN')}</option>
              <option value="INSTRUCTOR">{t('admin.roles.INSTRUCTOR')}</option>
              <option value="STUDENT">{t('admin.roles.STUDENT')}</option>
            </select>
            <select className="form-input" style={{ width: 'auto', minWidth: '160px', borderRadius: '14px', height: '52px' }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              <option value="all">{t('admin.filter.all_status')}</option>
              <option value="ACTIVE">{t('admin.status.ACTIVE')}</option>
              <option value="PENDING">{t('admin.status.PENDING')}</option>
              <option value="SUSPENDED">{t('admin.status.SUSPENDED')}</option>
            </select>
          </div>

          <div className="table-wrap" style={{ background: 'var(--bg-3)', borderRadius: '20px', border: '1px solid var(--border)', overflow: 'hidden' }}>
            <table className="table">
              <thead style={{ background: 'rgba(255,255,255,0.02)' }}>
                <tr>
                  <th style={{ padding: '1.25rem 1.5rem' }}>{t('admin.table.user')}</th>
                  <th>{t('admin.table.role')}</th>
                  <th>{t('admin.table.status')}</th>
                  <th>{t('admin.table.created_at')}</th>
                  <th style={{ textAlign: 'right', paddingRight: '1.5rem' }}>{t('admin.table.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan="5" style={{ textAlign: 'center', padding: '6rem 2rem' }}>
                      <div style={{ fontSize: '3rem', marginBottom: '1.5rem', opacity: 0.2 }}>🔍</div>
                      <h3 style={{ opacity: 0.4, fontWeight: 500 }}>{t('admin.no_users')}</h3>
                    </td>
                  </tr>
                ) : filtered.map(u => (
                  <tr key={u._id} className="table-row-hover">
                    <td style={{ padding: '1.25rem 1.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div className="avatar" style={{ width: 44, height: 44, fontSize: '1.1rem', background: 'var(--bg-2)', border: '1px solid var(--border)' }}>
                          {u.full_name?.[0]}
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, color: '#fff', fontSize: '1rem' }}>{u.full_name}</div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-3)' }}>{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <select
                        className="tag-select"
                        value={u.role}
                        onChange={e => handleUpdateRole(u._id, e.target.value)}
                        style={{
                          background: 'rgba(255,255,255,0.05)',
                          color: '#fff',
                          border: '1px solid var(--border)',
                          padding: '6px 12px',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          fontWeight: 600,
                          fontSize: '0.85rem'
                        }}
                      >
                        <option value="ADMIN" style={{ background: 'var(--bg-1)' }}>{t('admin.roles.ADMIN')}</option>
                        <option value="INSTRUCTOR" style={{ background: 'var(--bg-1)' }}>{t('admin.roles.INSTRUCTOR')}</option>
                        <option value="STUDENT" style={{ background: 'var(--bg-1)' }}>{t('admin.roles.STUDENT')}</option>
                      </select>
                    </td>
                    <td>
                      <select
                        className="tag-select"
                        value={u.status}
                        onChange={e => handleUpdateStatus(u._id, e.target.value)}
                        style={{
                          background: u.status === 'ACTIVE' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                          color: u.status === 'ACTIVE' ? '#22c55e' : '#ef4444',
                          border: `1px solid ${u.status === 'ACTIVE' ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}`,
                          padding: '6px 12px',
                          borderRadius: '8px',
                          fontWeight: 700,
                          fontSize: '0.8rem',
                          cursor: 'pointer'
                        }}
                      >
                        <option value="ACTIVE" style={{ background: 'var(--bg-1)' }}>{t('admin.status.ACTIVE')}</option>
                        <option value="PENDING" style={{ background: 'var(--bg-1)' }}>{t('admin.status.PENDING')}</option>
                        <option value="SUSPENDED" style={{ background: 'var(--bg-1)' }}>{t('admin.status.SUSPENDED')}</option>
                        <option value="DELETED" style={{ background: 'var(--bg-1)' }}>{t('admin.status.DELETED')}</option>
                      </select>
                    </td>
                    <td style={{ fontSize: '0.9rem', color: 'var(--text-3)' }}>
                      {new Date(u.created_at).toLocaleDateString(locale, { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td style={{ textAlign: 'right', paddingRight: '1.5rem' }}>
                      <button className="btn btn-sm btn-secondary" style={{ borderRadius: '10px', padding: '8px' }} onClick={() => alert(`${t('admin.table.user')}: ${u.full_name}`)}>
                        <span style={{ fontSize: '1.1rem' }}>ℹ️</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: '0.9rem', color: 'var(--text-3)', fontWeight: 500 }}>
              {t('admin.users_count', { count: filtered.length, total: users.length })}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}
