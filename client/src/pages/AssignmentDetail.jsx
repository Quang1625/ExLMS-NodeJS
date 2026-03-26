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

  // ---- Views ----

  const renderStudentView = () => (
    <div className="grid-2" style={{ alignItems: 'start', gap: '1.5rem' }}>
      <div className="card">
        <h3>Nội dung bài tập</h3>
        <div style={{ whiteSpace: 'pre-wrap', marginTop: '1rem', lineHeight: 1.5 }}>{assignment.description || 'Không có mô tả'}</div>
        
        {assignment.attachments?.length > 0 && (
          <div style={{ marginTop: '1.5rem' }}>
            <h4>📎 File đính kèm ({assignment.attachments.length})</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
              {assignment.attachments.map(f => (
                <a key={f._id} href={f.file_url} target="_blank" rel="noreferrer" className="tag tag--primary" style={{ display: 'inline-block', width: 'fit-content' }}>
                  📄 {f.file_name} ({(f.file_size / 1024 / 1024).toFixed(2)} MB)
                </a>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="card">
        <h3>Tình trạng nộp bài</h3>
        <div style={{ marginTop: '1rem', background: 'var(--bg-2)', padding: '1rem', borderRadius: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span style={{ color: 'var(--text-3)' }}>Trạng thái:</span>
            <strong>
              {!mySub ? (isOverdue ? <span style={{ color:'var(--danger)' }}>Chưa nộp (Quá hạn)</span> : <span>Chưa nộp</span>)
               : mySub.status === 'LATE' ? <span style={{ color:'var(--warning)' }}>Nộp trễ</span>
               : mySub.status === 'GRADED' ? <span style={{ color:'var(--success)' }}>Đã chấm điểm</span>
               : <span style={{ color:'var(--primary)' }}>Đã nộp</span>}
            </strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span style={{ color: 'var(--text-3)' }}>Hạn nộp:</span>
            <strong>{new Date(assignment.due_at).toLocaleString('vi-VN')} {isOverdue && '⚠️'}</strong>
          </div>

          {mySub?.grade?.status === 'GRADED' && (
            <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ color: 'var(--text-3)' }}>Điểm số:</span>
                <strong style={{ fontSize: '1.25rem', color: 'var(--primary-2)' }}>
                  {mySub.grade.score} / {assignment.max_score}
                </strong>
              </div>
              {mySub.grade.feedback && (
                <div style={{ background: 'var(--bg-3)', padding: '0.75rem', borderRadius: 4, marginTop: '0.5rem', fontSize: '0.875rem' }}>
                  <strong>Nhận xét:</strong> {mySub.grade.feedback}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Upload Form */}
        {(!isOverdue || assignment.allow_late) && (!mySub || mySub.status !== 'GRADED') && (
          <form style={{ marginTop: '1.5rem' }} onSubmit={handleStudentSubmit}>
            <h4>Cập nhật bài làm</h4>
            {['TEXT', 'MIXED'].includes(assignment.submission_type) && (
              <textarea 
                className="input" 
                rows="4" 
                placeholder="Nhập câu trả lời bằng văn bản..."
                value={textContent}
                onChange={e => setTextContent(e.target.value)}
                style={{ marginTop: '0.5rem', marginBottom: '1rem' }}
              />
            )}
            
            {['FILE', 'MIXED'].includes(assignment.submission_type) && (
              <div style={{ marginBottom: '1rem' }}>
                <input 
                  type="file" 
                  multiple 
                  ref={fileInputRef}
                  style={{ display: 'none' }}
                  onChange={e => setStudentFiles(e.target.files)}
                  accept=".pdf,.doc,.docx,.ppt,.pptx,.zip,.txt"
                />
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  style={{ border: '2px dashed var(--border)', padding: '2rem', textAlign: 'center', borderRadius: 8, cursor: 'pointer', background: 'var(--bg-2)' }}
                >
                  {studentFiles.length > 0 ? (
                    <strong>Đã chọn {studentFiles.length} file đính kèm.</strong>
                  ) : (
                     <div style={{ color: 'var(--text-3)' }}>
                       <div style={{ fontSize: '2rem' }}>☁️</div>
                       Click để chọn file bài làm (Tối đa 25MB)
                     </div>
                  )}
                </div>
              </div>
            )}
            
            <button className="btn btn-primary" type="submit" disabled={submitting} style={{ width: '100%', justifyContent: 'center' }}>
              {submitting ? 'Đang tải lên...' : 'Nộp bài'}
            </button>
          </form>
        )}
      </div>
    </div>
  )

  const renderAdminView = () => (
    <div>
      <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid var(--border)', marginBottom: '1.5rem' }}>
        <button 
          className={`tab-btn ${activeTab === 'content' ? 'active' : ''}`}
          onClick={() => setActiveTab('content')}
          style={{ padding: '0.75rem 1rem', background: 'none', border: 'none', borderBottom: activeTab === 'content' ? '2px solid var(--primary)' : '2px solid transparent', color: activeTab === 'content' ? 'var(--primary)' : 'var(--text-2)', fontWeight: 600, cursor: 'pointer' }}
        >Nội dung & Cài đặt</button>
        <button 
          className={`tab-btn ${activeTab === 'submissions' ? 'active' : ''}`}
          onClick={() => setActiveTab('submissions')}
          style={{ padding: '0.75rem 1rem', background: 'none', border: 'none', borderBottom: activeTab === 'submissions' ? '2px solid var(--primary)' : '2px solid transparent', color: activeTab === 'submissions' ? 'var(--primary)' : 'var(--text-2)', fontWeight: 600, cursor: 'pointer' }}
        >Bài nộp & Chấm điểm ({dashboard.filter(d => d.submission).length}/{dashboard.length})</button>
      </div>

      {activeTab === 'content' && (
        <form className="card" onSubmit={handleEditAssignment} style={{ borderTop: '4px solid var(--primary)', borderRadius: '12px', padding: '2rem' }}>
          <div style={{ marginBottom: '2rem' }}>
            <h3 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text)', marginBottom: '0.5rem' }}>✨ Cập nhật Bài tập</h3>
            <p style={{ color: 'var(--text-3)', fontSize: '0.9rem' }}>Chỉnh sửa thông tin chi tiết, hình thức nộp và tài liệu đính kèm cho bài tập này.</p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Group 1: General Info */}
            <div style={{ padding: '1.5rem', background: 'var(--bg-2)', borderRadius: '12px', border: '1px solid var(--border)' }}>
              <h4 style={{ marginBottom: '1rem', color: 'var(--primary-2)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span>📝</span> Thông tin chung
              </h4>
              <div className="grid-2" style={{ gap: '1.25rem' }}>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label className="label" style={{ fontWeight: 600 }}>Tiêu đề bài tập</label>
                  <input name="title" className="input" defaultValue={assignment.title} required style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border)', width: '100%', transition: 'all 0.2s', outline: 'none' }} />
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label className="label" style={{ fontWeight: 600 }}>Nội dung / Mô tả</label>
                  <textarea name="description" className="input" rows="5" defaultValue={assignment.description} style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border)', width: '100%', resize: 'vertical' }}></textarea>
                </div>
              </div>
            </div>

            {/* Group 2: Settings */}
            <div style={{ padding: '1.5rem', background: 'var(--bg-2)', borderRadius: '12px', border: '1px solid var(--border)' }}>
              <h4 style={{ marginBottom: '1rem', color: 'var(--primary-2)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span>⚙️</span> Cài đặt nộp bài
              </h4>
              <div className="grid-2" style={{ gap: '1.25rem' }}>
                <div>
                  <label className="label" style={{ fontWeight: 600 }}>Hạn nộp</label>
                  <input name="due_at" type="datetime-local" className="input" defaultValue={new Date(assignment.due_at).toISOString().slice(0, 16)} required style={{ padding: '0.75rem', borderRadius: '8px' }} />
                </div>
                <div>
                  <label className="label" style={{ fontWeight: 600 }}>Điểm tối đa</label>
                  <input name="max_score" type="number" className="input" defaultValue={assignment.max_score} required style={{ padding: '0.75rem', borderRadius: '8px' }} />
                </div>
                <div>
                  <label className="label" style={{ fontWeight: 600 }}>Hình thức nộp</label>
                  <select name="submission_type" className="input" defaultValue={assignment.submission_type} style={{ padding: '0.75rem', borderRadius: '8px', backgroundColor: 'var(--bg-1)' }}>
                    <option value="FILE">Chỉ Upload File</option>
                    <option value="TEXT">Chỉ Văn bản</option>
                    <option value="MIXED">Cả hai</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Group 3: Attachments */}
            <div style={{ padding: '1.5rem', background: 'var(--bg-2)', borderRadius: '12px', border: '1px solid var(--border)' }}>
              <h4 style={{ marginBottom: '1rem', color: 'var(--primary-2)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span>📎</span> Tài liệu đính kèm
              </h4>
              <p style={{ color: 'var(--text-3)', fontSize: '0.85rem', marginBottom: '1rem' }}>Sẽ ghi đè các file cũ nếu có tải lên mới. Tối đa 50MB.</p>
              
              {assignment.attachments?.length > 0 && (
                <div style={{ marginBottom: '1.5rem', padding: '1rem', background: 'var(--bg-3)', borderRadius: '8px' }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-2)', marginBottom: '0.75rem' }}>File hiện tại:</div>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {assignment.attachments.map(f => (
                      <span key={f._id} className="tag" style={{ background: 'var(--primary-light, #eef2ff)', color: 'var(--primary, #4f46e5)', border: '1px solid var(--border)', padding: '0.4rem 0.8rem', borderRadius: '20px' }}>
                         📄 {f.file_name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              
              <input 
                type="file" multiple ref={editFileRef} style={{ display: 'none' }}
                onChange={e => setEditFiles(e.target.files)}
              />
              <div 
                onClick={() => editFileRef.current?.click()}
                style={{ 
                  border: '2px dashed #94a3b8', 
                  padding: '2.5rem 1rem', 
                  textAlign: 'center', 
                  borderRadius: '12px', 
                  cursor: 'pointer', 
                  backgroundColor: editFiles.length > 0 ? 'rgba(34, 197, 94, 0.05)' : 'var(--bg-3)',
                  transition: 'all 0.2s',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
                onMouseOver={(e) => e.currentTarget.style.borderColor = 'var(--primary)'}
                onMouseOut={(e) => e.currentTarget.style.borderColor = '#94a3b8'}
              >
                <div style={{ fontSize: '2.5rem', opacity: 0.8 }}>📁</div>
                <div style={{ fontWeight: 600, color: 'var(--text-2)' }}>
                  {editFiles.length > 0 ? `Đã chọn ${editFiles.length} file mới` : 'Click để chọn file hoặc kéo thả vào đây'}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-3)' }}>Hỗ trợ PDF, DOCX, ZIP, PPTX...</div>
              </div>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
              <button type="submit" className="btn btn-primary" disabled={savingEdit} style={{ 
                padding: '0.875rem 2rem', 
                fontSize: '1rem', 
                fontWeight: 600, 
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgba(79, 70, 229, 0.2), 0 2px 4px -2px rgba(79, 70, 229, 0.2)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                {savingEdit ? '⏳ Đang lưu...' : '💾 Lưu thay đổi'}
              </button>
            </div>
          </div>
        </form>
      )}

      {activeTab === 'submissions' && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h3>Thống kê Bài nộp</h3>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button className="btn btn-secondary btn-sm" onClick={handleExport}>📊 Xuất Excel</button>
              <button className="btn btn-secondary btn-sm" onClick={handleZip}>📦 Tải ZIP Tất cả</button>
            </div>
          </div>
          
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Sinh viên</th>
                  <th>Trạng thái</th>
                  <th>Thời gian nộp</th>
                  <th>Bài làm</th>
                  <th>Điểm</th>
                  <th>Hành động</th>
                </tr>
              </thead>
              <tbody>
                {dashboard.map(d => (
                  <tr key={d.student._id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{d.student.full_name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>{d.student.email}</div>
                    </td>
                    <td>
                      {d.status === 'PENDING' ? <span className="tag">Chưa nộp</span>
                       : d.status === 'LATE_NO_SUBMISSION' ? <span className="tag tag--danger">Quá hạn</span>
                       : d.status === 'LATE' ? <span className="tag tag--warning">Nộp trễ</span>
                       : d.status === 'GRADED' ? <span className="tag tag--success">Đã chấm</span>
                       : <span className="tag tag--primary">Đã nộp</span>}
                    </td>
                    <td>
                      {d.submission ? new Date(d.submission.submitted_at).toLocaleString('vi-VN') : '—'}
                    </td>
                    <td>
                      {d.submission?.files?.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          {d.submission.files.map(f => (
                            <a key={f._id} href={f.file_url} target="_blank" rel="noreferrer" title={f.file_name}>
                              📄 {f.file_name.length > 20 ? f.file_name.slice(0, 20) + '...' : f.file_name}
                            </a>
                          ))}
                        </div>
                      ) : d.submission?.text_content ? (
                        <span style={{ color: 'var(--text-3)', fontSize: '0.85rem' }}>Chỉ Text</span>
                      ) : '—'}
                    </td>
                    <td>
                      {d.submission?.grade?.status === 'GRADED' ? (
                        <strong style={{ color: 'var(--primary-2)' }}>{d.submission.grade.score} / {assignment.max_score}</strong>
                      ) : '—'}
                    </td>
                    <td>
                      <button 
                        className="btn btn-sm btn-primary" 
                        disabled={!d.submission}
                        onClick={() => setGradeModal({
                          _id: d.submission._id,
                          score: d.submission.grade?.score,
                          feedback: d.submission.grade?.feedback
                        })}
                      >
                        Chấm điểm
                      </button>
                    </td>
                  </tr>
                ))}
                {dashboard.length === 0 && (
                  <tr><td colSpan="6" style={{ textAlign: 'center', padding: '1rem' }}>Chưa có sinh viên nào trong nhóm học này</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
      
      {gradeModal && (
        <div className="modal-overlay" onClick={() => setGradeModal(null)}>
          <div className="modal-content card" onClick={e => e.stopPropagation()} style={{ width: 400 }}>
            <h3>Chấm điểm bài nộp</h3>
            <form onSubmit={handleGrade} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
              <div>
                <label className="label">Điểm số (Tối đa {assignment.max_score})</label>
                <input 
                  type="number" className="input" max={assignment.max_score} min={0} required
                  value={gradeModal.score || ''} autoFocus
                  onChange={e => setGradeModal({...gradeModal, score: Number(e.target.value)})}
                />
              </div>
              <div>
                <label className="label">Nhận xét (Feedback)</label>
                <textarea 
                  className="input" rows="4" 
                  value={gradeModal.feedback || ''}
                  onChange={e => setGradeModal({...gradeModal, feedback: e.target.value})}
                ></textarea>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setGradeModal(null)}>Hủy</button>
                <button type="submit" className="btn btn-primary">Lưu điểm</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )

  return (
    <Layout>
      <button className="btn btn-secondary btn-sm" style={{ marginBottom:'1.5rem' }} onClick={() => navigate('/assignments')}>
        ← Quay lại Danh sách
      </button>

      <div className="page-header">
        <h1>{assignment.title}</h1>
        <div style={{ display:'flex', gap:'0.75rem', marginTop:'0.75rem', flexWrap:'wrap' }}>
          <span className="tag tag--primary">👤 {assignment.created_by?.full_name}</span>
          <span className="tag tag--primary">📁 Nhóm: {assignment.group_id?.name}</span>
          <span className="tag tag--warning">⏰ Hạn nộp: {new Date(assignment.due_at).toLocaleString('vi-VN')}</span>
          <span className="tag">💯 Điểm tối đa: {assignment.max_score}</span>
        </div>
      </div>

      {canManage ? renderAdminView() : renderStudentView()}

    </Layout>
  )
}
