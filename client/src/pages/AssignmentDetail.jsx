import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Layout from '../components/Layout'
import api from '../api/axios'
import { useAuth } from '../context/AuthContext'

export default function AssignmentDetail() {
  const { t, i18n } = useTranslation()
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  
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

  const fetchData = useCallback(async () => {
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
  }, [id, canManage, navigate])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleStudentSubmit = async (e) => {
    e.preventDefault()
    if (!studentFiles.length && !textContent) return alert(t('forum.form.error_empty'))
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
      alert(t('assignment_detail.confirm_submit'))
      setStudentFiles([])
      fetchData()
    } catch (err) {
      alert(err.response?.data?.error || t('common.error_fail'))
    } finally {
      setSubmitting(false)
    }
  }

  const handleGrade = async (e) => {
    e.preventDefault()
    const { _id, score, feedback } = gradeModal
    try {
      await api.put(`/assignments/submissions/${_id}/grade`, { score, feedback })
      alert(t('common.status'))
      setGradeModal(null)
      fetchData()
    } catch (err) {
      alert(err.response?.data?.error || t('common.error_fail'))
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
      alert(t('common.status'))
      setEditFiles([])
      fetchData()
    } catch (err) {
      alert(err.response?.data?.error || t('common.error_fail'))
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

  const locale = i18n.language === 'en' ? 'en-US' : 'vi-VN'
  const isOverdue = new Date(assignment.due_at) < new Date()
  const mySub = assignment.my_submission

  const renderStudentView = () => (
    <div className="grid-2 fade-in" style={{ alignItems: 'start', gap: '2rem' }}>
      <div className="glass-card-hover" style={{ padding: '2.5rem' }}>
        <h3 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '1.5rem', color: '#fff' }}>{t('assignment_detail.assignment_content')}</h3>
        <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6, color: 'var(--text-2)', fontSize: '1rem' }}>
          {assignment.description || t('assignment_detail.no_description')}
        </div>
        
        {assignment.attachments?.length > 0 && (
          <div style={{ marginTop: '2.5rem', paddingTop: '2rem', borderTop: '1px solid var(--border)' }}>
            <h4 style={{ fontSize: '1.1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              📎 {t('assignment_detail.attachments', { count: assignment.attachments.length })}
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
        <h3 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '1.5rem', color: '#fff' }}>{t('assignment_detail.submission_status')}</h3>
        
        <div style={{ background: 'var(--bg-3)', padding: '1.5rem', borderRadius: '20px', marginBottom: '2rem', border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', alignItems: 'center' }}>
            <span style={{ color: 'var(--text-3)', fontWeight: 600 }}>{t('assignment_detail.status_label')}</span>
            <div className={`status-badge ${
              !mySub ? (isOverdue ? 'status-badge--danger' : '')
               : mySub.status === 'LATE' ? 'status-badge--warning'
               : mySub.status === 'GRADED' ? 'status-badge--success'
               : 'status-badge--primary'
            }`}>
              {!mySub ? (isOverdue ? t('assignments.overdue') : t('assignments.no_assignments'))
               : mySub.status === 'LATE' ? t('assignment_detail.admin.table.pending') : t('status.COMPLETED')}
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'var(--text-3)', fontWeight: 600 }}>{t('assignment_detail.due_at')}</span>
            <strong style={{ fontSize: '0.95rem' }}>{new Date(assignment.due_at).toLocaleString(locale)}</strong>
          </div>

          {mySub?.grade?.status === 'GRADED' && (
            <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border)' }}>
              <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-3)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>{t('assignment_detail.score_achieved')}</div>
                <div style={{ fontSize: '3rem', fontWeight: 900, color: 'var(--primary-2)', lineHeight: 1 }}>
                  {mySub.grade.score}<span style={{ fontSize: '1.5rem', opacity: 0.5, fontWeight: 500 }}>/{assignment.max_score}</span>
                </div>
              </div>
              {mySub.grade.feedback && (
                <div style={{ background: 'rgba(108, 99, 255, 0.05)', padding: '1rem', borderRadius: '12px', border: '1px solid rgba(108, 99, 255, 0.1)' }}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--primary-2)', fontWeight: 700, marginBottom: '4px' }}>{t('assignment_detail.instructor_feedback')}</div>
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-2)', lineHeight: 1.5 }}>"{mySub.grade.feedback}"</p>
                </div>
              )}
            </div>
          )}
        </div>

        {(!isOverdue || assignment.allow_late) && (!mySub || mySub.status !== 'GRADED') && (
          <form onSubmit={handleStudentSubmit} className="fade-in">
            <h4 style={{ marginBottom: '1rem', fontWeight: 700 }}>{mySub ? t('assignment_detail.update_submission') : t('assignment_detail.new_submission')}</h4>
            
            {['TEXT', 'MIXED'].includes(assignment.submission_type) && (
              <div className="form-group">
                <textarea 
                  className="form-input" 
                  rows="5" 
                  placeholder={t('assignment_detail.text_placeholder')}
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
                    {studentFiles.length > 0 ? t('assignment_detail.file_selected', { count: studentFiles.length }) : t('assignment_detail.file_upload_label')}
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-3)' }}>
                    {t('assignment_detail.file_hint')}
                  </div>
                </div>
              </div>
            )}
            
            <button className="btn btn-primary" type="submit" disabled={submitting} style={{ width: '100%', justifyContent: 'center', padding: '1rem', borderRadius: '16px', fontSize: '1rem' }}>
              {submitting ? t('assignment_detail.submitting') : `✨ ${t('assignment_detail.confirm_submit')}`}
            </button>
          </form>
        )}
      </div>
    </div>
  )

  const renderAdminView = () => (
    <div className="fade-in">
      <div className="tab-nav" style={{ marginBottom: '2rem' }}>
        <button 
          className={`tab-nav__btn ${activeTab === 'content' ? 'active' : ''}`}
          onClick={() => setActiveTab('content')}
        >{t('assignment_detail.content_tab')}</button>
        <button 
          className={`tab-nav__btn ${activeTab === 'submissions' ? 'active' : ''}`}
          onClick={() => setActiveTab('submissions')}
        >
          {t('assignment_detail.submissions_tab', { count: dashboard.filter(d => d.submission).length, total: dashboard.length })}
        </button>
      </div>

      {activeTab === 'content' && (
        <form className="glass-card-hover" onSubmit={handleEditAssignment} style={{ padding: '3rem' }}>
          <div style={{ marginBottom: '2.5rem' }}>
            <h2 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '0.5rem', color: '#fff' }}>⚙️ {t('assignment_detail.admin.settings_title')}</h2>
            <p style={{ color: 'var(--text-3)' }}>{t('assignment_detail.admin.settings_subtitle')}</p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <div className="grid-2" style={{ gap: '2rem' }}>
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="form-label">{t('assignments.form.title_label')}</label>
                <input name="title" className="form-input" defaultValue={assignment.title} required style={{ borderRadius: '12px' }} />
              </div>
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="form-label">{t('assignments.form.desc_label')}</label>
                <textarea name="description" className="form-input" rows="6" defaultValue={assignment.description} style={{ borderRadius: '16px' }}></textarea>
              </div>
              <div className="form-group">
                <label className="form-label">{t('assignments.form.due_at_label')}</label>
                <input name="due_at" type="datetime-local" className="form-input" defaultValue={new Date(assignment.due_at).toISOString().slice(0, 16)} required style={{ borderRadius: '12px' }} />
              </div>
              <div className="form-group">
                <label className="form-label">{t('assignments.form.max_score_label')}</label>
                <input name="max_score" type="number" className="form-input" defaultValue={assignment.max_score} required style={{ borderRadius: '12px' }} />
              </div>
            </div>

            <div style={{ background: 'var(--bg-3)', padding: '2rem', borderRadius: '24px', border: '1px solid var(--border)' }}>
              <h4 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '10px' }}>📎 {t('assignment_detail.admin.manage_docs')}</h4>
              
              <div style={{ marginBottom: '2rem' }}>
                <input 
                  type="file" multiple ref={editFileRef} style={{ display: 'none' }}
                  onChange={e => setEditFiles(e.target.files)}
                />
                <div className="dropzone-modern" onClick={() => editFileRef.current?.click()} style={{ background: 'var(--bg-2)' }}>
                  <div className="dropzone-modern__icon">📂</div>
                  <div style={{ fontWeight: 700 }}>
                    {editFiles.length > 0 ? t('assignment_detail.file_selected', { count: editFiles.length }) : t('assignment_detail.admin.upload_new_doc')}
                  </div>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-3)' }}>{t('assignment_detail.admin.upload_hint')}</p>
                </div>
              </div>

              {assignment.attachments?.length > 0 && (
                <div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-3)', marginBottom: '1rem', textTransform: 'uppercase' }}>{t('assignment_detail.admin.current_docs')}</div>
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
              <button type="button" className="btn btn-secondary" onClick={() => fetchData()}>{t('assignment_detail.admin.cancel_edit')}</button>
              <button type="submit" className="btn btn-primary" disabled={savingEdit} style={{ padding: '0.75rem 2rem' }}>
                {savingEdit ? t('common.loading') : `💾 ${t('assignment_detail.admin.save_edit')}`}
              </button>
            </div>
          </div>
        </form>
      )}

      {activeTab === 'submissions' && (
        <div className="glass-card-hover" style={{ padding: '2.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#fff' }}>🗳️ {t('assignment_detail.admin.submissions_title')}</h2>
              <p style={{ color: 'var(--text-3)' }}>{t('assignment_detail.admin.submissions_subtitle')}</p>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button className="btn btn-secondary btn-sm" onClick={handleExport} style={{ borderRadius: '12px' }}>📊 {t('assignment_detail.admin.export_report')}</button>
              <button className="btn btn-primary btn-sm" onClick={handleZip} style={{ borderRadius: '12px' }}>📦 {t('assignment_detail.admin.download_zip')}</button>
            </div>
          </div>
          
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>{t('assignment_detail.admin.table.student')}</th>
                  <th>{t('assignment_detail.admin.table.status')}</th>
                  <th>{t('assignment_detail.admin.table.submitted_at')}</th>
                  <th>{t('assignment_detail.admin.table.attachments')}</th>
                  <th>{t('assignment_detail.admin.table.score')}</th>
                  <th style={{ textAlign: 'right' }}>{t('assignment_detail.admin.table.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {dashboard.map(d => (
                  <tr key={d.student._id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div className="avatar" style={{ width: '32px', height: '32px', fontSize: '0.75rem' }}>
                          {d.student.full_name?.split(' ').pop()[0]}
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
                         {t(`assignment_detail.admin.table.${d.status.toLowerCase()}`) || d.status}
                      </div>
                    </td>
                    <td>
                      {d.submission ? (
                        <div style={{ fontSize: '0.85rem' }}>
                          <div style={{ fontWeight: 600 }}>{new Date(d.submission.submitted_at).toLocaleDateString(locale)}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>{new Date(d.submission.submitted_at).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })}</div>
                        </div>
                      ) : '—'}
                    </td>
                    <td>
                      {d.submission?.files?.length > 0 ? (
                        <div className="status-badge status-badge--primary" style={{ cursor: 'pointer' }} onClick={() => window.open(d.submission.files[0].file_url, '_blank')}>
                          📄 {t('assignment_detail.file_selected', { count: d.submission.files.length }).split(' ')[1]}
                        </div>
                      ) : d.submission?.text_content ? (
                        <div className="status-badge" style={{ opacity: 0.6 }}>📝 {t('assignment_detail.admin.table.text_only')}</div>
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
                         {d.submission?.grade?.status === 'GRADED' ? t('assignment_detail.admin.grade_modal.edit_grade') : t('assignment_detail.admin.grade_modal.grade_now')}
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
            <h2 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '1.5rem', color: '#fff' }}>{t('assignment_detail.admin.grade_modal.title')}</h2>
            
            <form onSubmit={handleGrade} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div className="form-group">
                <label className="form-label">{t('assignment_detail.admin.grade_modal.score_label', { max: assignment.max_score })}</label>
                <input 
                  type="number" className="form-input" max={assignment.max_score} min={0} required
                  value={gradeModal.score || ''} autoFocus
                  onChange={e => setGradeModal({...gradeModal, score: Number(e.target.value)})}
                  style={{ borderRadius: '12px', fontSize: '1.25rem', fontWeight: 700 }}
                />
              </div>
              <div className="form-group">
                <label className="form-label">{t('assignment_detail.admin.grade_modal.feedback_label')}</label>
                <textarea 
                  className="form-input" rows="4" 
                  placeholder={t('assignment_detail.admin.grade_modal.feedback_placeholder')}
                  value={gradeModal.feedback || ''}
                  onChange={e => setGradeModal({...gradeModal, feedback: e.target.value})}
                  style={{ borderRadius: '16px' }}
                ></textarea>
              </div>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setGradeModal(null)}>{t('assignment_detail.admin.grade_modal.cancel')}</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 2 }}>💾 {t('assignment_detail.admin.grade_modal.save')}</button>
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
          ← {t('assignment_detail.back')}
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
                  ⏰ {t('assignment_detail.due_at')} {new Date(assignment.due_at).toLocaleString(locale)}
                </span>
                <span className="status-badge">💯 {t('assignments.max_score')}: {assignment.max_score}</span>
              </div>
            </div>
          </div>
        </div>

        {canManage ? renderAdminView() : renderStudentView()}
      </div>
    </Layout>
  )
}
