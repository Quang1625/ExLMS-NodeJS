import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import api from '../api/axios'
import { useAuth } from '../context/AuthContext'

export default function AssignmentDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user, token } = useAuth()
  
  const canManage = user?.role === 'ADMIN' || user?.role === 'INSTRUCTOR'
  
  const [assignment, setAssignment] = useState(null)
  const [loading, setLoading] = useState(true)
  
  // Admin Dashboard State
  const [activeTab, setActiveTab] = useState('content') // 'content' | 'submissions'
  const [dashboard, setDashboard] = useState([])
  const [gradeModal, setGradeModal] = useState(null)
  
  // Student Submit State
  const [studentFiles, setStudentFiles] = useState([])
  const [textContent, setTextContent] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const fileInputRef = useRef(null)

  // Edit Assignment State
  const [editFiles, setEditFiles] = useState([])
  const editFileRef = useRef(null)
  const [savingEdit, setSavingEdit] = useState(false)

  useEffect(() => {
    fetchData()
  }, [id])

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await api.get(`/assignments/${id}`)
      setAssignment(res.data.data)
      if (canManage) {
        const dRes = await api.get(`/assignments/${id}/dashboard`)
        setDashboard(dRes.data.data || [])
      }
    } catch (err) {
      console.error(err)
      navigate('/assignments')
    } finally {
      setLoading(false)
    }
  }

  const handleStudentSubmit = async (e) => {
    e.preventDefault()
    if (!studentFiles.length && !textContent) return alert('Vui lòng đính kèm file hoặc nhập nội dung')
    setSubmitting(true)
    
    try {
      const formData = new FormData()
      formData.append('text_content', textContent)
      if (studentFiles.length > 0) {
        Array.from(studentFiles).forEach(f => formData.append('files', f))
      }
      
      await api.post(`/assignments/${id}/submissions`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      alert('Nộp bài thành công!')
      setStudentFiles([])
      fetchData()
    } catch (err) {
      alert(err.response?.data?.error || 'Lỗi khi nộp bài')
    } finally {
      setSubmitting(false)
    }
  }

  const handleGrade = async (e) => {
    e.preventDefault()
    const { _id, score, feedback } = gradeModal
    try {
      await api.put(`/assignments/submissions/${_id}/grade`, { score, feedback })
      alert('Chấm điểm thành công')
      setGradeModal(null)
      fetchData()
    } catch (err) {
      alert(err.response?.data?.error || 'Lỗi chấm điểm')
    }
  }

  const handleEditAssignment = async (e) => {
    e.preventDefault()
    const form = new FormData(e.target)
    if (editFiles.length > 0) {
      Array.from(editFiles).forEach(f => form.append('files', f))
    }
    
    setSavingEdit(true)
    try {
      await api.put(`/assignments/${id}`, form, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      alert('Cập nhật bài tập thành công')
      setEditFiles([])
      fetchData()
    } catch (err) {
      alert(err.response?.data?.error || 'Lỗi cập nhật')
    } finally {
      setSavingEdit(false)
    }
  }

  const handleExport = () => {
    window.open(`/api/assignments/${id}/export?token=${localStorage.getItem('access_token') || ''}`, '_blank')
  }

  const handleZip = () => {
    window.open(`/api/assignments/${id}/download-all?token=${localStorage.getItem('access_token') || ''}`, '_blank')
  }

  if (loading) return <Layout><div className="spinner-wrap"><div className="spinner" /></div></Layout>
  if (!assignment) return null

  const isOverdue = new Date(assignment.due_at) < new Date()
  const mySub = assignment.my_submission
  const renderStudentView = () => (
    <div className="grid-2 fade-in" style={{ alignItems: 'start', gap: '2rem' }}>
      <div className="glass-card-hover" style={{ padding: '2.5rem' }}>
        <h3 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '1.5rem', color: '#fff' }}>Nội dung bài tập</h3>
        <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6, color: 'var(--text-2)', fontSize: '1rem' }}>
          {assignment.description || 'Không có mô tả chi tiết cho bài tập này.'}
        </div>
        
        {assignment.attachments?.length > 0 && (
          <div style={{ marginTop: '2.5rem', paddingTop: '2rem', borderTop: '1px solid var(--border)' }}>
            <h4 style={{ fontSize: '1.1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              📎 Tài liệu đính kèm ({assignment.attachments.length})
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {assignment.attachments.map(f => (
                <a key={f._id} href={f.file_url} target="_blank" rel="noreferrer" className="btn btn-secondary btn-sm" style={{ justifyContent: 'flex-start', padding: '12px 16px', borderRadius: '12px' }}>
                  📄 {f.file_name} <span style={{ opacity: 0.5, fontSize: '0.75rem', marginLeft: 'auto' }}>({(f.file_size / 1024 / 1024).toFixed(2)} MB)</span>
                </a>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="glass-card-hover" style={{ padding: '2.5rem' }}>
        <h3 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '1.5rem', color: '#fff' }}>Tình trạng nộp bài</h3>
        
        <div style={{ background: 'var(--bg-3)', padding: '1.5rem', borderRadius: '20px', marginBottom: '2rem', border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', alignItems: 'center' }}>
            <span style={{ color: 'var(--text-3)', fontWeight: 600 }}>Trạng thái:</span>
            <div className={`status-badge ${
              !mySub ? (isOverdue ? 'status-badge--danger' : '')
               : mySub.status === 'LATE' ? 'status-badge--warning'
               : mySub.status === 'GRADED' ? 'status-badge--success'
               : 'status-badge--primary'
            }`}>
              {!mySub ? (isOverdue ? 'Quá hạn' : 'Chưa nộp')
               : mySub.status === 'LATE' ? 'Nộp trễ'
               : mySub.status === 'GRADED' ? 'Đã chấm điểm'
               : 'Đã nộp'}
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'var(--text-3)', fontWeight: 600 }}>Hạn nộp:</span>
            <strong style={{ fontSize: '0.95rem' }}>{new Date(assignment.due_at).toLocaleString('vi-VN')}</strong>
          </div>

          {mySub?.grade?.status === 'GRADED' && (
            <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border)' }}>
              <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-3)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>Điểm số đạt được</div>
                <div style={{ fontSize: '3rem', fontWeight: 900, color: 'var(--primary-2)', lineHeight: 1 }}>
                  {mySub.grade.score}<span style={{ fontSize: '1.5rem', opacity: 0.5, fontWeight: 500 }}>/{assignment.max_score}</span>
                </div>
              </div>
              {mySub.grade.feedback && (
                <div style={{ background: 'rgba(108, 99, 255, 0.05)', padding: '1rem', borderRadius: '12px', border: '1px solid rgba(108, 99, 255, 0.1)' }}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--primary-2)', fontWeight: 700, marginBottom: '4px' }}>PHẢN HỒI TỪ GIẢNG VIÊN:</div>
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-2)', lineHeight: 1.5 }}>"{mySub.grade.feedback}"</p>
                </div>
              )}
            </div>
          )}
        </div>

        {(!isOverdue || assignment.allow_late) && (!mySub || mySub.status !== 'GRADED') && (
          <form onSubmit={handleStudentSubmit} className="fade-in">
            <h4 style={{ marginBottom: '1rem', fontWeight: 700 }}>{mySub ? 'Cập nhật lại bài làm' : 'Nộp bài làm mới'}</h4>
            
            {['TEXT', 'MIXED'].includes(assignment.submission_type) && (
              <div className="form-group">
                <textarea 
                  className="form-input" 
                  rows="5" 
                  placeholder="Nhập nội dung bài làm của bạn tại đây..."
                  value={textContent}
                  onChange={e => setTextContent(e.target.value)}
                  style={{ borderRadius: '16px' }}
                />
              </div>
            )}
            
            {['FILE', 'MIXED'].includes(assignment.submission_type) && (
              <div className="form-group">
                <input 
                  type="file" multiple ref={fileInputRef} style={{ display: 'none' }}
                  onChange={e => setStudentFiles(e.target.files)}
                />
                <div className="dropzone-modern" onClick={() => fileInputRef.current?.click()}>
                  <div className="dropzone-modern__icon">
                    {studentFiles.length > 0 ? '✅' : '📤'}
                  </div>
                  <div style={{ fontWeight: 700 }}>
                    {studentFiles.length > 0 ? `Đã chọn ${studentFiles.length} tệp tin` : 'Tải lên các tệp tin bài làm'}
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-3)' }}>
                    Kéo thả hoặc click để chọn (Tối đa 25MB)
                  </div>
                </div>
              </div>
            )}
            
            <button className="btn btn-primary" type="submit" disabled={submitting} style={{ width: '100%', justifyContent: 'center', padding: '1rem', borderRadius: '16px', fontSize: '1rem' }}>
              {submitting ? '🚀 Đang gửi bài...' : '✨ Xác nhận nộp bài'}
            </button>
          </form>
        )}
      </div>
    </div>
  )

  const renderAdminView = () => (
    <div className="fade-in">
      <div className="tab-nav">
        <button 
          className={`tab-nav__btn ${activeTab === 'content' ? 'active' : ''}`}
          onClick={() => setActiveTab('content')}
        >Nội dung & Cài đặt</button>
        <button 
          className={`tab-nav__btn ${activeTab === 'submissions' ? 'active' : ''}`}
          onClick={() => setActiveTab('submissions')}
        >
          Bài nộp ({dashboard.filter(d => d.submission).length}/{dashboard.length})
        </button>
      </div>

      {activeTab === 'content' && (
        <form className="glass-card-hover" onSubmit={handleEditAssignment} style={{ padding: '3rem' }}>
          <div style={{ marginBottom: '2.5rem' }}>
            <h2 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '0.5rem', color: '#fff' }}>⚙️ Cài đặt Bài tập</h2>
            <p style={{ color: 'var(--text-3)' }}>Quản lý chi tiết bài tập, tài liệu và các thiết lập nộp bài.</p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <div className="grid-2" style={{ gap: '2rem' }}>
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="form-label">Tiêu đề bài tập</label>
                <input name="title" className="form-input" defaultValue={assignment.title} required style={{ borderRadius: '12px' }} />
              </div>
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="form-label">Mô tả bài tập</label>
                <textarea name="description" className="form-input" rows="6" defaultValue={assignment.description} style={{ borderRadius: '16px' }}></textarea>
              </div>
              <div className="form-group">
                <label className="form-label">Hạn nộp</label>
                <input name="due_at" type="datetime-local" className="form-input" defaultValue={new Date(assignment.due_at).toISOString().slice(0, 16)} required style={{ borderRadius: '12px' }} />
              </div>
              <div className="form-group">
                <label className="form-label">Điểm tối đa</label>
                <input name="max_score" type="number" className="form-input" defaultValue={assignment.max_score} required style={{ borderRadius: '12px' }} />
              </div>
            </div>

            <div style={{ background: 'var(--bg-3)', padding: '2rem', borderRadius: '24px', border: '1px solid var(--border)' }}>
              <h4 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '10px' }}>📎 Quản lý tài liệu</h4>
              
              <div style={{ marginBottom: '2rem' }}>
                <input 
                  type="file" multiple ref={editFileRef} style={{ display: 'none' }}
                  onChange={e => setEditFiles(e.target.files)}
                />
                <div className="dropzone-modern" onClick={() => editFileRef.current?.click()} style={{ background: 'var(--bg-2)' }}>
                  <div className="dropzone-modern__icon">📂</div>
                  <div style={{ fontWeight: 700 }}>
                    {editFiles.length > 0 ? `Đã chọn thêm ${editFiles.length} tệp mới` : 'Tải lên tài liệu hướng dẫn mới'}
                  </div>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-3)' }}>Lưu ý: Các tệp mới sẽ được thêm vào danh sách tài liệu.</p>
                </div>
              </div>

              {assignment.attachments?.length > 0 && (
                <div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-3)', marginBottom: '1rem', textTransform: 'uppercase' }}>Danh sách tài liệu hiện tại:</div>
                  <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                    {assignment.attachments.map(f => (
                      <div key={f._id} className="status-badge status-badge--primary" style={{ padding: '8px 16px' }}>
                        📄 {f.file_name}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
              <button type="button" className="btn btn-secondary" onClick={() => fetchData()}>Hủy thay đổi</button>
              <button type="submit" className="btn btn-primary" disabled={savingEdit} style={{ padding: '0.75rem 2rem' }}>
                {savingEdit ? '⏳ Đang lưu...' : '💾 Cập nhật bài tập'}
              </button>
            </div>
          </div>
        </form>
      )}

      {activeTab === 'submissions' && (
        <div className="glass-card-hover" style={{ padding: '2.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#fff' }}>🗳️ Danh sách bài nộp</h2>
              <p style={{ color: 'var(--text-3)' }}>Theo dõi, quản lý và chấm điểm bài làm của sinh viên.</p>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button className="btn btn-secondary btn-sm" onClick={handleExport} style={{ borderRadius: '12px' }}>📊 Xuất báo cáo</button>
              <button className="btn btn-primary btn-sm" onClick={handleZip} style={{ borderRadius: '12px' }}>📦 Tải tất cả ZIP</button>
            </div>
          </div>
          
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Sinh viên</th>
                  <th>Trạng thái</th>
                  <th>Thời gian nộp</th>
                  <th>Tệp đính kèm</th>
                  <th>Điểm số</th>
                  <th style={{ textAlign: 'right' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {dashboard.map(d => (
                  <tr key={d.student._id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div className="avatar" style={{ width: '32px', height: '32px', fontSize: '0.75rem' }}>
                          {d.student.full_name.split(' ').pop()[0]}
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, color: '#fff' }}>{d.student.full_name}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>{d.student.email}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className={`status-badge ${
                        d.status === 'PENDING' ? ''
                         : d.status === 'LATE_NO_SUBMISSION' ? 'status-badge--danger'
                         : d.status === 'LATE' ? 'status-badge--warning'
                         : d.status === 'GRADED' ? 'status-badge--success'
                         : 'status-badge--primary'
                      }`}>
                        {d.status === 'PENDING' ? 'Chưa nộp'
                         : d.status === 'LATE_NO_SUBMISSION' ? 'Quá hạn'
                         : d.status === 'LATE' ? 'Nộp trễ'
                         : d.status === 'GRADED' ? 'Đã chấm'
                         : 'Đã nộp'}
                      </div>
                    </td>
                    <td>
                      {d.submission ? (
                        <div style={{ fontSize: '0.85rem' }}>
                          <div style={{ fontWeight: 600 }}>{new Date(d.submission.submitted_at).toLocaleDateString('vi-VN')}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>{new Date(d.submission.submitted_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</div>
                        </div>
                      ) : '—'}
                    </td>
                    <td>
                      {d.submission?.files?.length > 0 ? (
                        <div className="status-badge status-badge--primary" style={{ cursor: 'pointer' }} onClick={() => window.open(d.submission.files[0].file_url, '_blank')}>
                          📄 {d.submission.files.length} Tệp
                        </div>
                      ) : d.submission?.text_content ? (
                        <div className="status-badge" style={{ opacity: 0.6 }}>📝 Văn bản</div>
                      ) : '—'}
                    </td>
                    <td>
                      {d.submission?.grade?.status === 'GRADED' ? (
                        <strong style={{ color: 'var(--primary-2)', fontSize: '1.1rem' }}>{d.submission.grade.score} <span style={{ fontSize: '0.8rem', opacity: 0.5 }}>/{assignment.max_score}</span></strong>
                      ) : '—'}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button 
                        className={`btn btn-sm ${d.submission?.grade?.status === 'GRADED' ? 'btn-secondary' : 'btn-primary'}`}
                        disabled={!d.submission}
                        style={{ borderRadius: '10px' }}
                        onClick={() => setGradeModal({
                          _id: d.submission._id,
                          score: d.submission.grade?.score,
                          feedback: d.submission.grade?.feedback
                        })}
                      >
                        {d.submission?.grade?.status === 'GRADED' ? 'Sửa điểm' : 'Chấm điểm'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      
      {gradeModal && (
        <div className="modal-overlay" onClick={() => setGradeModal(null)}>
          <div className="modal-content fade-in" onClick={e => e.stopPropagation()} style={{ maxWidth: '450px' }}>
            <button className="modal-close" onClick={() => setGradeModal(null)}>×</button>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '1.5rem', color: '#fff' }}>Chấm điểm</h2>
            
            <form onSubmit={handleGrade} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div className="form-group">
                <label className="form-label">Điểm số (Thang điểm {assignment.max_score})</label>
                <input 
                  type="number" className="form-input" max={assignment.max_score} min={0} required
                  value={gradeModal.score || ''} autoFocus
                  onChange={e => setGradeModal({...gradeModal, score: Number(e.target.value)})}
                  style={{ borderRadius: '12px', fontSize: '1.25rem', fontWeight: 700 }}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Nhận xét & Góp ý</label>
                <textarea 
                  className="form-input" rows="4" 
                  placeholder="Nhập nhận xét cho sinh viên..."
                  value={gradeModal.feedback || ''}
                  onChange={e => setGradeModal({...gradeModal, feedback: e.target.value})}
                  style={{ borderRadius: '16px' }}
                ></textarea>
              </div>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setGradeModal(null)}>Hủy</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 2 }}>💾 Lưu kết quả</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )

  return (
    <Layout>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <button className="btn btn-secondary btn-sm" style={{ marginBottom:'2rem', borderRadius: '12px' }} onClick={() => navigate('/assignments')}>
          ← Quay lại danh sách
        </button>

        <div className="page-header" style={{ marginBottom: '2.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '1.5rem' }}>
            <div>
              <h1 style={{ fontSize: '2.5rem', fontWeight: 800, letterSpacing: '-0.03em', background: 'linear-gradient(135deg, #fff 0%, var(--text-2) 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                {assignment.title}
              </h1>
              <div style={{ display:'flex', gap:'0.75rem', marginTop:'1rem', flexWrap:'wrap' }}>
                <span className="status-badge status-badge--primary">👤 {assignment.created_by?.full_name}</span>
                <span className="status-badge status-badge--primary">📁 {assignment.group_id?.name}</span>
                <span className={`status-badge ${isOverdue ? 'status-badge--danger' : 'status-badge--warning'}`}>
                  ⏰ Hạn nộp: {new Date(assignment.due_at).toLocaleString('vi-VN')}
                </span>
                <span className="status-badge">💯 Tối đa: {assignment.max_score}</span>
              </div>
            </div>
          </div>
        </div>

        {canManage ? renderAdminView() : renderStudentView()}
      </div>
    </Layout>
  )
}
