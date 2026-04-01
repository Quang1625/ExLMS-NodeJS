import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Layout from '../components/Layout'
import api from '../api/axios'
import { useAuth } from '../context/AuthContext'

export default function ForumNew() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [tags, setTags] = useState([])
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [selectedTags, setSelectedTags] = useState([])
  const [attachments, setAttachments] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    api.get('/forum/tags')
      .then(res => setTags(res.data))
      .catch(() => setTags([]))
      .finally(() => setLoading(false))
  }, [])

  const toggleTag = (tagId) => {
    setSelectedTags(prev => prev.includes(tagId) ? prev.filter(t => t !== tagId) : [...prev, tagId])
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!title.trim() || !content.trim()) {
      setError(t('forum.form.error_empty'))
      return
    }
    setError('')
    setSaving(true)

    try {
      const formData = new FormData();
      formData.append('title', title.trim());
      formData.append('content', content.trim());
      formData.append('author_id', user?._id);
      selectedTags.forEach(tagId => formData.append('tag_ids', tagId));
      attachments.forEach(file => formData.append('attachments', file));

      const { data } = await api.post('/forum/posts', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      navigate(`/forum/${data._id}`);
    } catch (err) {
      console.error(err)
      setError(err.response?.data?.error || t('forum.form.error_fail'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Layout>
      <div className="page-header fade-in" style={{ 
        display:'flex', 
        alignItems:'flex-end', 
        justifyContent:'space-between',
        paddingBottom: '1.5rem',
        borderBottom: '1px solid var(--border)',
        marginBottom: '2.5rem'
      }}>
        <div>
          <h1 style={{ fontSize: '2.25rem', marginBottom: '0.5rem', color: 'var(--text)' }}>✍️ {t('forum.form.title')}</h1>
          <p style={{ fontSize: '1rem', color: 'var(--text-3)' }}>{t('forum.form.subtitle')}</p>
        </div>
        <button className="btn btn-secondary" style={{ borderRadius: '12px', padding: '10px 20px' }} onClick={() => navigate('/forum')}>
          ← {t('forum.form.back')}
        </button>
      </div>

      {loading ? (
        <div className="spinner-wrap"><div className="spinner" /></div>
      ) : (
        <div className="card fade-in" style={{ 
          maxWidth: 900, 
          margin: '0 auto', 
          padding: '2.5rem', 
          borderRadius: '32px', 
          background: 'var(--bg-2)',
          border: '1px solid var(--border)',
          boxShadow: 'var(--shadow-lg)'
        }}>
          <form onSubmit={handleSubmit}>
            <div style={{ display:'flex', flexDirection:'column', gap:'1.75rem' }}>
              <div>
                <label className="form-label" style={{ color: 'var(--text)', fontWeight: 700, fontSize: '1.1rem', marginBottom: '0.75rem' }}>{t('forum.form.field_title')}</label>
                <input
                  className="form-input"
                  style={{ padding: '1rem', fontSize: '1.1rem', borderRadius: '16px' }}
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder={t('forum.form.field_title_placeholder')}
                />
              </div>

              <div>
                <label className="form-label" style={{ color: 'var(--text)', fontWeight: 700, fontSize: '1.1rem', marginBottom: '0.75rem' }}>{t('forum.form.field_content')}</label>
                <textarea
                  className="form-input"
                  style={{ padding: '1.25rem', fontSize: '1rem', borderRadius: '20px', lineHeight: 1.6 }}
                  rows={10}
                  value={content}
                  onChange={e => setContent(e.target.value)}
                  placeholder={t('forum.form.field_content_placeholder')}
                />
              </div>

              <div>
                <label className="form-label" style={{ color: 'var(--text)', fontWeight: 700, fontSize: '1.1rem', marginBottom: '0.75rem' }}>{t('forum.form.field_tags')}</label>
                <div style={{ 
                  display:'flex', 
                  gap:'0.75rem', 
                  flexWrap:'wrap',
                  padding: '1.25rem',
                  background: 'var(--bg-3)',
                  borderRadius: '20px',
                  border: '1px solid var(--border)'
                }}>
                  {tags.map(tag => {
                    const isSelected = selectedTags.includes(tag._id);
                    return (
                      <button
                        key={tag._id}
                        type="button"
                        onClick={() => toggleTag(tag._id)}
                        className="tag"
                        style={{ 
                          cursor:'pointer', 
                          padding: '10px 20px', 
                          fontSize: '0.9rem',
                          background: isSelected ? tag.color : tag.color + '15', 
                          color: isSelected ? '#fff' : tag.color,
                          border: `1px solid ${isSelected ? tag.color : tag.color + '30'}`,
                          transition: 'all 0.2s ease',
                          fontWeight: 700
                        }}
                      >
                        {tag.name}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div>
                <label className="form-label" style={{ color: 'var(--text)', fontWeight: 700, fontSize: '1.1rem', marginBottom: '0.75rem' }}>{t('forum.form.field_attachments')}</label>
                <div style={{ 
                  padding: '1.5rem',
                  border: '2px dashed var(--border)',
                  borderRadius: '20px',
                  textAlign: 'center',
                  background: 'var(--glass)',
                  cursor: 'pointer'
                }} onClick={() => document.getElementById('file-upload').click()}>
                  <input
                    id="file-upload"
                    type="file"
                    multiple
                    style={{ display: 'none' }}
                    accept="image/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,application/zip,text/plain"
                    onChange={e => setAttachments(Array.from(e.target.files))}
                  />
                  <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📁</div>
                  <div style={{ fontWeight: 600, color: 'var(--text-2)' }}>{t('forum.form.field_attachments_placeholder')}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-3)', marginTop: '0.5rem' }}>{t('forum.form.field_attachments_hint')}</div>
                </div>
                {attachments.length > 0 && (
                  <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {attachments.map((f, i) => (
                      <span key={i} className="tag tag--primary" style={{ padding: '6px 12px', borderRadius: '8px' }}>
                        {f.name} ({(f.size / 1024).toFixed(1)} KB)
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {error && <div className="alert alert-error" style={{ borderRadius: '14px' }}>{error}</div>}

              <div style={{ display:'flex', gap:'1rem', marginTop:'1rem', paddingTop: '2rem', borderTop: '1px solid var(--border)' }}>
                <button className="btn btn-primary" style={{ padding: '12px 32px', borderRadius: '16px', fontSize: '1rem' }} disabled={saving}>
                  {saving ? t('auth.register.processing') : t('forum.form.submit')}
                </button>
                <button className="btn btn-secondary" style={{ padding: '12px 24px', borderRadius: '16px' }} type="button" onClick={() => navigate('/forum')}>
                  {t('forum.form.cancel')}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
    </Layout>
  )
}
