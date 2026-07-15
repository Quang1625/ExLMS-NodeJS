import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'

export default function BuilderChapterModal({ title, initialData, onSubmit, onClose }) {
  const { t } = useTranslation()
  const [form, setForm] = useState({
    title: '',
    description: '',
    order_index: 0,
    is_locked: false
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (initialData) {
      setForm({
        title: initialData.title || '',
        description: initialData.description || '',
        order_index: initialData.order_index || 0,
        is_locked: initialData.is_locked || false
      })
    }
  }, [initialData])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await onSubmit(form)
    } catch (err) {
      setError(err?.response?.data?.error || err.message || 'Đã xảy ra lỗi')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="builder-modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="builder-modal" style={{ maxWidth: '600px' }}>
        <div className="builder-modal__header">
          <h2 style={{ margin: 0, fontSize: '1.25rem' }}>{title}</h2>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-3)', fontSize: '1.2rem', cursor: 'pointer' }}>✕</button>
        </div>
        
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <div className="builder-modal__content" style={{ gridTemplateColumns: '1fr', padding: '1.5rem 2rem' }}>
            {error && (
              <div style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid var(--danger)', borderRadius: 8, padding: '0.75rem', color: 'var(--danger)', marginBottom: '1rem' }}>
                {error}
              </div>
            )}
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: 'var(--text-2)' }}>{t('builder.chapter_title')} <span style={{ color: 'var(--danger)' }}>*</span></label>
                <input 
                  type="text" 
                  value={form.title} 
                  onChange={e => setForm({...form, title: e.target.value})} 
                  required 
                  placeholder={t('builder.chapter_title_ph')}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--bg-3)', color: 'var(--text)', outline: 'none', fontSize: '1rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: 'var(--text-2)' }}>{t('builder.chapter_desc')}</label>
                <textarea 
                  value={form.description} 
                  onChange={e => setForm({...form, description: e.target.value})} 
                  placeholder={t('builder.chapter_desc_ph')}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--bg-3)', color: 'var(--text)', outline: 'none', minHeight: '100px', resize: 'vertical', fontFamily: 'inherit' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '2rem' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: 'var(--text-2)' }}>{t('builder.chapter_order')}</label>
                  <input 
                    type="number" 
                    value={form.order_index} 
                    onChange={e => setForm({...form, order_index: parseInt(e.target.value) || 0})} 
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--bg-3)', color: 'var(--text)', outline: 'none' }}
                  />
                </div>
                
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: 'var(--text-2)' }}>{t('builder.chapter_lock')}</label>
                  <label className="toggle-switch">
                    <input 
                      type="checkbox" 
                      checked={form.is_locked} 
                      onChange={e => setForm({...form, is_locked: e.target.checked})} 
                    />
                    <span className="toggle-slider"></span>
                  </label>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-3)', marginTop: '4px' }}>{t('builder.chapter_lock_hint')}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="builder-modal__footer">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading}>{t('builder.cancel')}</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? t('builder.saving') : (initialData ? t('builder.save_changes') : t('builder.create_chapter'))}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
