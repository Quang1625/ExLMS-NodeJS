import { useEffect, useState } from 'react'
import Layout from '../components/Layout'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import api from '../api/axios'

const ROLES    = ['STUDENT', 'INSTRUCTOR', 'ADMIN']
const STATUSES = ['ACTIVE', 'PENDING', 'SUSPENDED', 'DELETED']

const ROLE_CLASS   = { ADMIN: 'tag--danger', INSTRUCTOR: 'tag--primary', STUDENT: 'tag--success' }
const STATUS_CLASS = { ACTIVE: 'tag--success', PENDING: 'tag--warning', SUSPENDED: 'tag--danger', DELETED: '' }
const ROLE_VN      = { ADMIN: 'Quản trị viên', INSTRUCTOR: 'Giảng viên', STUDENT: 'Sinh viên' }
const STATUS_VN    = { ACTIVE: 'Hoạt động', PENDING: 'Chờ duyệt', SUSPENDED: 'Tạm khóa', DELETED: 'Đã xóa' }

export default function Admin() {
  const { user: me } = useAuth()
  const navigate     = useNavigate()
  const [users,   setUsers]   = useState([])
  const [loading, setLoading] = useState(true)
  const [search,  setSearch]  = useState('')
  const [filterRole,   setFilterRole]   = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [saving, setSaving] = useState(null) // userId being saved

  // Guard: only ADMIN can access
  useEffect(() => {
    if (me && me.role !== 'ADMIN') navigate('/')
  }, [me])

  useEffect(() => {
    api.get('/users')
      .then(r => setUsers(r.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const handleChange = async (userId, field, value) => {
    // Optimistic update
    setUsers(prev => prev.map(u => u._id === userId ? { ...u, [field]: value } : u))
    setSaving(userId)
    try {
      await api.patch(`/users/${userId}/role-status`, { [field]: value })
    } catch (err) {
      alert('Cập nhật thất bại: ' + (err.response?.data?.error || err.message))
      // Rollback on error — refetch
      api.get('/users').then(r => setUsers(r.data))
    } finally {
      setSaving(null)
    }
  }

  const filtered = users.filter(u => {
    const matchSearch = search === '' ||
      u.full_name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
    const matchRole   = filterRole   === 'all' || u.role   === filterRole
    const matchStatus = filterStatus === 'all' || u.status === filterStatus
    return matchSearch && matchRole && matchStatus
  })

  const counts = {
    total:      users.length,
    admin:      users.filter(u => u.role === 'ADMIN').length,
    instructor: users.filter(u => u.role === 'INSTRUCTOR').length,
    student:    users.filter(u => u.role === 'STUDENT').length,
    pending:    users.filter(u => u.status === 'PENDING').length,
  }

  return (
    <Layout>
      <div className="page-header">
        <h1>⚙️ Quản trị hệ thống</h1>
        <p>Quản lý người dùng và phân quyền</p>
      </div>

      {/* Stats */}
      <div className="stat-grid" style={{ marginBottom:'1.5rem' }}>
        {[
          { icon:'👥', label:'Tổng người dùng', value: counts.total,      color:'#6c63ff', bg:'rgba(108,99,255,0.1)' },
          { icon:'🛡️', label:'Quản trị viên',   value: counts.admin,      color:'#ef4444', bg:'rgba(239,68,68,0.1)'  },
          { icon:'🎓', label:'Giảng viên',       value: counts.instructor, color:'#00d4ff', bg:'rgba(0,212,255,0.1)'  },
          { icon:'📚', label:'Sinh viên',         value: counts.student,   color:'#22c55e', bg:'rgba(34,197,94,0.1)'  },
          { icon:'⏳', label:'Chờ duyệt',         value: counts.pending,   color:'#f59e0b', bg:'rgba(245,158,11,0.1)' },
        ].map(s => (
          <div className="stat-card" key={s.label}>
            <div className="stat-card__icon" style={{ background:s.bg, color:s.color }}>{s.icon}</div>
            <div>
              <div className="stat-card__value" style={{ color:s.color }}>{s.value}</div>
              <div className="stat-card__label">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display:'flex', gap:'0.75rem', flexWrap:'wrap', marginBottom:'1.25rem', alignItems:'center' }}>
        <input
          className="form-input" placeholder="🔍 Tìm tên hoặc email..."
          style={{ flex:1, minWidth:200, maxWidth:340 }}
          value={search} onChange={e => setSearch(e.target.value)}
        />
        <select className="form-input form-select" style={{ width:'auto' }}
          value={filterRole} onChange={e => setFilterRole(e.target.value)}>
          <option value="all">Tất cả vai trò</option>
          {ROLES.map(r => <option key={r} value={r}>{ROLE_VN[r]}</option>)}
        </select>
        <select className="form-input form-select" style={{ width:'auto' }}
          value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="all">Tất cả trạng thái</option>
          {STATUSES.map(s => <option key={s} value={s}>{STATUS_VN[s]}</option>)}
        </select>
        <span style={{ fontSize:'0.8rem', color:'var(--text-3)' }}>
          {filtered.length} / {users.length} người dùng
        </span>
      </div>

      {/* Users table */}
      <div className="card" style={{ padding:0, overflow:'hidden' }}>
        {loading ? (
          <div className="spinner-wrap"><div className="spinner" /></div>
        ) : filtered.length === 0 ? (
          <div className="empty-state" style={{ padding:'3rem' }}>
            <div className="empty-state__icon">🔍</div>
            <h3>Không tìm thấy người dùng nào</h3>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Người dùng</th>
                  <th>Vai trò</th>
                  <th>Trạng thái</th>
                  <th>Ngày tạo</th>
                  <th>Đăng nhập cuối</th>
                  <th style={{ textAlign:'center' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((u, i) => (
                  <tr key={u._id} style={{ opacity: saving === u._id ? 0.6 : 1, transition:'opacity 0.2s' }}>
                    <td style={{ color:'var(--text-3)', fontSize:'0.8rem' }}>{i + 1}</td>
                    <td>
                      <div style={{ display:'flex', alignItems:'center', gap:'0.75rem' }}>
                        <div className="avatar" style={{ width:34, height:34, fontSize:'0.8rem', flexShrink:0 }}>
                          {u.full_name?.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontWeight:600, fontSize:'0.875rem' }}>
                            {u.full_name}
                            {u._id === me?._id && (
                              <span className="tag tag--primary" style={{ marginLeft:6, fontSize:'0.65rem' }}>Bạn</span>
                            )}
                          </div>
                          <div style={{ fontSize:'0.75rem', color:'var(--text-3)' }}>{u.email}</div>
                        </div>
                      </div>
                    </td>

                    {/* Role selector */}
                    <td>
                      <select
                        className="form-input form-select"
                        style={{ padding:'4px 8px', fontSize:'0.8rem', width:'auto', cursor:'pointer' }}
                        value={u.role}
                        disabled={u._id === me?._id} // can't change own role
                        onChange={e => handleChange(u._id, 'role', e.target.value)}
                      >
                        {ROLES.map(r => <option key={r} value={r}>{ROLE_VN[r]}</option>)}
                      </select>
                    </td>

                    {/* Status selector */}
                    <td>
                      <select
                        className="form-input form-select"
                        style={{ padding:'4px 8px', fontSize:'0.8rem', width:'auto', cursor:'pointer' }}
                        value={u.status}
                        disabled={u._id === me?._id}
                        onChange={e => handleChange(u._id, 'status', e.target.value)}
                      >
                        {STATUSES.map(s => <option key={s} value={s}>{STATUS_VN[s]}</option>)}
                      </select>
                    </td>

                    <td style={{ fontSize:'0.8rem', color:'var(--text-3)' }}>
                      {u.created_at ? new Date(u.created_at).toLocaleDateString('vi-VN') : '—'}
                    </td>
                    <td style={{ fontSize:'0.8rem', color:'var(--text-3)' }}>
                      {u.last_login_at ? new Date(u.last_login_at).toLocaleDateString('vi-VN') : '—'}
                    </td>

                    <td style={{ textAlign:'center' }}>
                      {saving === u._id ? (
                        <span style={{ fontSize:'0.75rem', color:'var(--text-3)' }}>⏳ Đang lưu...</span>
                      ) : (
                        <span style={{ fontSize:'0.75rem', color:'var(--success)' }}>✓</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Layout>
  )
}
