import { useState, useEffect } from 'react'
import Layout from '../components/Layout'
import { useAuth } from '../context/AuthContext'
import api from '../api/axios'

export default function Profile() {
  const { user, updateUserInfo } = useAuth()
  const [formData, setFormData] = useState({
    full_name: '',
    bio: '',
    avatar_url: ''
  })
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })

  useEffect(() => {
    if (user) {
      setFormData({
        full_name: user.full_name || '',
        bio: user.bio || '',
        avatar_url: user.avatar_url || ''
      })
    }
  }, [user])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage({ type: '', text: '' })

    try {
      const { data } = await api.put(`/users/${user._id}`, formData)
      updateUserInfo(data)
      setMessage({ type: 'success', text: 'Cập nhật thông tin thành công!' })
    } catch (err) {
      console.error(err)
      setMessage({ type: 'error', text: err.response?.data?.error || 'Có lỗi xảy ra, vui lòng thử lại.' })
    } finally {
      setLoading(false)
    }
  }

  const initials = user?.full_name
    ?.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase() || '?'

  const roleLabel = { ADMIN: 'Quản trị viên', INSTRUCTOR: 'Giảng viên', STUDENT: 'Sinh viên' }

  return (
    <Layout>
      <div className="page fade-in">
        <div className="page-header">
          <h1>Trang cá nhân</h1>
          <p>Quản lý thông tin tài khoản và tùy chỉnh hồ sơ của bạn</p>
        </div>

        <div className="grid-2">
          {/* Profile Card */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem', textAlign: 'center' }}>
            <div className="avatar" style={{ width: 100, height: 100, fontSize: '2.5rem' }}>
              {initials}
            </div>
            <div>
              <h2 style={{ marginBottom: '0.25rem' }}>{user?.full_name}</h2>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-3)' }}>{user?.email}</p>
              <div className="tag tag--primary" style={{ marginTop: '0.75rem' }}>
                {roleLabel[user?.role] || user?.role}
              </div>
            </div>
            
            <div style={{ width: '100%', borderTop: '1px solid var(--border)', paddingTop: '1.5rem', marginTop: '0.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', fontSize: '0.875rem' }}>
                <span style={{ color: 'var(--text-3)' }}>Trạng thái</span>
                <span className="tag tag--success">Đang hoạt động</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                <span style={{ color: 'var(--text-3)' }}>Tham gia từ</span>
                <span>{user?.created_at ? new Date(user.created_at).toLocaleDateString('vi-VN') : 'Mới đây'}</span>
              </div>
            </div>
          </div>

          {/* Edit Form */}
          <div className="card">
            <h3 style={{ marginBottom: '1.5rem' }}>Chỉnh sửa hồ sơ</h3>
            
            {message.text && (
              <div className={`alert alert-${message.type === 'success' ? 'success' : 'error'}`}>
                {message.text}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Họ và tên</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.full_name}
                  onChange={e => setFormData({ ...formData, full_name: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Email (Không thể thay đổi)</label>
                <input
                  type="email"
                  className="form-input"
                  value={user?.email || ''}
                  disabled
                  style={{ opacity: 0.6, cursor: 'not-allowed' }}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Tiểu sử (Bio)</label>
                <textarea
                  className="form-input"
                  rows="4"
                  value={formData.bio}
                  onChange={e => setFormData({ ...formData, bio: e.target.value })}
                  placeholder="Giới thiệu ngắn gọn về bản thân..."
                />
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? 'Đang lưu...' : 'Lưu thay đổi'}
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => setFormData({ full_name: user.full_name, bio: user.bio })}>
                  Hủy
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </Layout>
  )
}
