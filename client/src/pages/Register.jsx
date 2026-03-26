import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Register() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ full_name: '', email: '', password: '', role: 'STUDENT' })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  const submit = async e => {
    e.preventDefault()
    setError(''); setSuccess(''); setLoading(true)
    try {
      const data = await register(form)
      setSuccess(data.message)
      if (form.role === 'STUDENT') setTimeout(() => navigate('/login'), 1500)
    } catch (err) {
      setError(err.response?.data?.error || 'Đăng ký thất bại')
    } finally { setLoading(false) }
  }

  return (
    <div className="auth-page">
      <div className="auth-card fade-in">
        <div className="auth-logo">
          <div className="auth-logo-icon">🎓</div>
          <span className="auth-logo-text">ExLMS</span>
        </div>
        <h1 className="auth-title">Tạo tài khoản</h1>
        <p className="auth-subtitle">Tham gia cộng đồng học tập ExLMS</p>

        {error   && <div className="alert alert-error">⚠️ {error}</div>}
        {success && <div className="alert alert-success">✅ {success}</div>}

        <form onSubmit={submit}>
          <div className="form-group">
            <label className="form-label">Họ và tên</label>
            <input className="form-input" placeholder="Nguyễn Văn A"
              value={form.full_name} onChange={set('full_name')} required />
          </div>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input className="form-input" type="email" placeholder="your@email.com"
              value={form.email} onChange={set('email')} required />
          </div>
          <div className="form-group">
            <label className="form-label">Mật khẩu</label>
            <input className="form-input" type="password" placeholder="Ít nhất 6 ký tự"
              value={form.password} onChange={set('password')} required minLength={6} />
          </div>
          <div className="form-group">
            <label className="form-label">Vai trò</label>
            <select className="form-input form-select" value={form.role} onChange={set('role')}>
              <option value="STUDENT">Sinh viên</option>
              <option value="INSTRUCTOR">Giảng viên (cần Admin duyệt)</option>
            </select>
          </div>
          <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}
            disabled={loading}>
            {loading ? '⏳ Đang xử lý...' : '✨ Đăng ký'}
          </button>
        </form>

        <p className="auth-footer">
          Đã có tài khoản? <Link to="/login">Đăng nhập</Link>
        </p>
      </div>
    </div>
  )
}
