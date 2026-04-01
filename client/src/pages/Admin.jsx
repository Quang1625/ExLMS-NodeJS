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
      <div className="page fade-in">
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '1.85rem', fontWeight: 800, marginBottom: '0.25rem' }}>{t('admin.title')}</h1>
          <p style={{ color: 'var(--text-2)' }}>{t('admin.subtitle')}</p>
        </div>

        <div className="stat-grid" style={{ marginBottom: '2.5rem' }}>
          {[
            { icon:'👥', label: t('admin.stats.total'), value: counts.total,      color:'#6c63ff', bg:'rgba(108,99,255,0.1)' },
            { icon:'🛡️', label: t('admin.stats.admin'),   value: counts.admin,      color:'#ef4444', bg:'rgba(239,68,68,0.1)'  },
            { icon:'👨‍🏫', label: t('admin.stats.instructor'), value: counts.instructor, color:'#00d4ff', bg:'rgba(0,212,255,0.1)'  },
            { icon:'🧑‍🎓', label: t('admin.stats.student'),    value: counts.student,    color:'#22c55e', bg:'rgba(34,197,94,0.1)'   }
          ].map((s, i) => (
            <div key={i} className="stat-card">
              <div className="stat-card__icon" style={{ background: s.bg, color: s.color, fontSize: '1.5rem' }}>{s.icon}</div>
              <div>
                <div className="stat-card__value" style={{ color: s.color }}>{s.value}</div>
                <div className="stat-card__label">{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
            <input 
              type="text" 
              className="form-input" 
              placeholder={t('admin.search_placeholder')}
              style={{ flex: 1, minWidth: '250px' }}
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
            <select className="form-input" style={{ width: 'auto' }} value={roleFilter} onChange={e => setRoleFilter(e.target.value)}>
              <option value="all">{t('admin.filter.all_roles')}</option>
              <option value="ADMIN">{t('admin.roles.ADMIN')}</option>
              <option value="INSTRUCTOR">{t('admin.roles.INSTRUCTOR')}</option>
              <option value="STUDENT">{t('admin.roles.STUDENT')}</option>
            </select>
            <select className="form-input" style={{ width: 'auto' }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              <option value="all">{t('admin.filter.all_status')}</option>
              <option value="ACTIVE">{t('admin.status.ACTIVE')}</option>
              <option value="PENDING">{t('admin.status.PENDING')}</option>
              <option value="SUSPENDED">{t('admin.status.SUSPENDED')}</option>
            </select>
          </div>

          <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
             <div style={{ fontSize: '0.9rem', opacity: 0.7 }}>
                {t('admin.users_count', { count: filtered.length, total: users.length })}
             </div>
          </div>

          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>{t('admin.table.user')}</th>
                  <th>{t('admin.table.role')}</th>
                  <th>{t('admin.table.status')}</th>
                  <th>{t('admin.table.created_at')}</th>
                  <th style={{ textAlign: 'right' }}>{t('admin.table.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan="5" style={{ textAlign: 'center', padding: '4rem' }}>
                      <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>🔍</div>
                      <h3 style={{ opacity: 0.5 }}>{t('admin.no_users')}</h3>
                    </td>
                  </tr>
                ) : filtered.map(u => (
                  <tr key={u._id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div className="avatar" style={{ width: 40, height: 40, fontSize: '1rem' }}>{u.full_name?.[0]}</div>
                        <div>
                          <div style={{ fontWeight: 600 }}>{u.full_name}</div>
                          <div style={{ fontSize: '0.75rem', opacity: 0.6 }}>{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <select 
                        className="tag-select" 
                        value={u.role} 
                        onChange={e => handleUpdateRole(u._id, e.target.value)}
                        style={{ background: 'rgba(255,255,255,0.05)', color: 'inherit', border: 'none', padding: '4px 8px', borderRadius: '4px' }}
                      >
                         <option value="ADMIN">{t('admin.roles.ADMIN')}</option>
                         <option value="INSTRUCTOR">{t('admin.roles.INSTRUCTOR')}</option>
                         <option value="STUDENT">{t('admin.roles.STUDENT')}</option>
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
                          border: 'none', padding: '4px 8px', borderRadius: '4px', fontWeight: 600 
                        }}
                      >
                         <option value="ACTIVE">{t('admin.status.ACTIVE')}</option>
                         <option value="PENDING">{t('admin.status.PENDING')}</option>
                         <option value="SUSPENDED">{t('admin.status.SUSPENDED')}</option>
                         <option value="DELETED">{t('admin.status.DELETED')}</option>
                      </select>
                    </td>
                    <td style={{ fontSize: '0.85rem', opacity: 0.7 }}>
                      {new Date(u.created_at).toLocaleDateString(locale)}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                       <button className="btn btn-sm btn-secondary" onClick={() => alert(`${t('admin.table.user')}: ${u.full_name}`)}>ℹ️</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Layout>
  )
}
