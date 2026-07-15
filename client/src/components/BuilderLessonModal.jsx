import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'

export default function BuilderLessonModal({ title, initialData, onSubmit, onClose }) {
  const { t } = useTranslation()

  const TYPES = [
    { id: 'VIDEO', label: t('builder.types.video'), icon: '▶️', desc: t('builder.types.video_desc') },
    { id: 'DOCUMENT', label: t('builder.types.doc'), icon: '📄', desc: t('builder.types.doc_desc') },
    { id: 'FILE', label: t('builder.types.file'), icon: '📎', desc: t('builder.types.file_desc') },
    { id: 'EMBED', label: t('builder.types.embed'), icon: '🔗', desc: t('builder.types.embed_desc') }
  ]

  const [form, setForm] = useState({
    title: '',
    description: '',
    content_type: 'VIDEO',
    content: '',
    duration_seconds: 0
  })
  const [file, setFile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [isDragOver, setIsDragOver] = useState(false)
  
  const fileInputRef = useRef(null)

  useEffect(() => {
    if (initialData) {
      setForm({
        title: initialData.title || '',
        description: initialData.description || '',
        content_type: initialData.content_type || 'VIDEO',
        content: initialData.content || '',
        duration_seconds: initialData.duration_seconds || 0
      })
    }
  }, [initialData])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    
    // Validation
    if (!form.title) {
      setError(t('builder.lesson_title_req'))
      return
    }
    
    if (['VIDEO', 'FILE'].includes(form.content_type) && !file && !form.content && !initialData?.resource_key) {
      setError(t('builder.lesson_file_req'))
      return
    }

    setLoading(true)
    try {
      const submitData = { ...form }
      if (file) submitData.file = file
      await onSubmit(submitData)
    } catch (err) {
      setError(err?.response?.data?.error || err.message || 'Đã xảy ra lỗi')
    } finally {
      setLoading(false)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragOver(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0])
    }
  }

  const renderContentEditor = () => {
    switch (form.content_type) {
      case 'DOCUMENT':
      case 'EMBED':
        return (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: 'var(--text-2)' }}>
              {form.content_type === 'DOCUMENT' ? t('builder.content_doc') : t('builder.content_embed')}
            </label>
            <textarea 
              value={form.content} 
              onChange={e => setForm({...form, content: e.target.value})} 
              placeholder={form.content_type === 'DOCUMENT' ? t('builder.content_doc_ph') : t('builder.content_embed_ph')}
              style={{ flex: 1, width: '100%', padding: '1rem', borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--bg-3)', color: 'var(--text)', outline: 'none', resize: 'vertical', fontFamily: 'inherit', minHeight: '300px' }}
            />
          </div>
        )
      case 'VIDEO':
      case 'FILE':
      default:
        return (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: 'var(--text-2)' }}>{t('builder.content_upload')}</label>
            <div 
              className={`drag-drop-zone ${isDragOver ? 'dragover' : ''}`}
              onDragOver={(e) => { e.preventDefault(); setIsDragOver(true) }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="drag-drop-zone__icon">☁️</div>
              <h3 style={{ margin: 0, color: 'var(--text)' }}>{t('builder.drag_drop')}</h3>
              <p style={{ margin: 0, color: 'var(--text-3)', fontSize: '0.875rem' }}>{t('builder.drag_drop_hint')}</p>
              
              {file && (
                <div style={{ marginTop: '1rem', padding: '0.5rem 1rem', background: 'var(--primary-2)', color: 'white', borderRadius: '8px', fontWeight: 600 }}>
                  {t('builder.file_selected')} {file.name}
                </div>
              )}
              
              {(!file && initialData?.resource_key) && (
                <div style={{ marginTop: '1rem', padding: '0.5rem 1rem', background: 'var(--bg)', color: 'var(--text)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                  {t('builder.file_current')} {initialData.resource_key}
                </div>
              )}

              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={(e) => { if (e.target.files[0]) setFile(e.target.files[0]) }} 
                style={{ display: 'none' }} 
                accept={form.content_type === 'VIDEO' ? 'video/*' : '.pdf,.doc,.docx,.ppt,.pptx,.zip'}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '1.5rem', marginBottom: '1.5rem' }}>
              <hr style={{ flex: 1, borderColor: 'var(--border)' }} />
              <span style={{ color: 'var(--text-3)', fontSize: '0.875rem' }}>{t('builder.or_link')}</span>
              <hr style={{ flex: 1, borderColor: 'var(--border)' }} />
            </div>

            <input 
              type="text" 
              value={form.content} 
              onChange={e => setForm({...form, content: e.target.value})} 
              placeholder={t('builder.link_ph')}
              style={{ width: '100%', padding: '0.75rem', borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--bg-3)', color: 'var(--text)', outline: 'none' }}
            />
          </div>
        )
    }
  }

  return (
    <div className="builder-modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="builder-modal">
        <div className="builder-modal__header">
          <h2 style={{ margin: 0, fontSize: '1.25rem' }}>{title}</h2>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-3)', fontSize: '1.2rem', cursor: 'pointer' }}>✕</button>
        </div>
        
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
          <div className="builder-modal__content">
            {/* Left Column: Settings */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', paddingRight: '2rem', borderRight: '1px solid var(--border)' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: 'var(--text-2)' }}>{t('builder.lesson_title')} <span style={{ color: 'var(--danger)' }}>*</span></label>
                <input 
                  type="text" 
                  value={form.title} 
                  onChange={e => setForm({...form, title: e.target.value})} 
                  placeholder={t('builder.lesson_title_ph')}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--bg-3)', color: 'var(--text)', outline: 'none', fontSize: '1rem', fontWeight: 600 }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: 'var(--text-2)' }}>{t('builder.lesson_desc')}</label>
                <textarea 
                  value={form.description} 
                  onChange={e => setForm({...form, description: e.target.value})} 
                  placeholder={t('builder.lesson_desc_ph')}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--bg-3)', color: 'var(--text)', outline: 'none', minHeight: '80px', resize: 'vertical' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: 'var(--text-2)' }}>{t('builder.lesson_type')} <span style={{ color: 'var(--danger)' }}>*</span></label>
                <div className="type-selector">
                  {TYPES.map(type => (
                    <div 
                      key={type.id} 
                      className={`type-btn ${form.content_type === type.id ? 'active' : ''}`}
                      onClick={() => setForm({...form, content_type: type.id})}
                    >
                      <div className="type-btn__icon">{type.icon}</div>
                      <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{type.label}</div>
                    </div>
                  ))}
                </div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-3)', textAlign: 'center' }}>
                  {TYPES.find(t => t.id === form.content_type)?.desc}
                </p>
              </div>

              {form.content_type === 'VIDEO' && (
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: 'var(--text-2)' }}>{t('builder.lesson_duration')}</label>
                  <input 
                    type="number" 
                    value={form.duration_seconds} 
                    onChange={e => setForm({...form, duration_seconds: parseInt(e.target.value) || 0})} 
                    placeholder={t('builder.lesson_duration_ph')}
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--bg-3)', color: 'var(--text)', outline: 'none' }}
                  />
                </div>
              )}
            </div>

            {/* Right Column: Content Editor */}
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {error && (
                <div style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid var(--danger)', borderRadius: 8, padding: '0.75rem', color: 'var(--danger)', marginBottom: '1rem' }}>
                  {error}
                </div>
              )}
              {renderContentEditor()}
            </div>
          </div>

          <div className="builder-modal__footer">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading}>{t('builder.cancel')}</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? t('builder.uploading') : (initialData ? t('builder.save_changes') : t('builder.create_lesson'))}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
