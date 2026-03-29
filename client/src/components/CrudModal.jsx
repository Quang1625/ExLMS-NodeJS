import { useState, useEffect } from 'react'

/**
 * CrudModal – generic create/edit modal
 *
 * Props:
 *  title       : string
 *  fields      : [{ name, label, type, required, options, placeholder }]
 *  initialData : object | null  (null → create mode)
 *  onSubmit    : async (data) => void
 *  onClose     : () => void
 */
export default function CrudModal({ title, fields, initialData, onSubmit, onClose }) {
  const [form, setForm]     = useState({})
  const [loading, setLoading] = useState(false)
  const [error, setError]   = useState('')

  useEffect(() => {
    const init = {}
    fields.forEach(f => {
      init[f.name] = initialData?.[f.name] ?? f.default ?? ''
    })
    setForm(init)
    setError('')
  }, [initialData, fields])

  const handleChange = (name, value, type) => {
    let val = value
    if (type === 'number') {
      val = value === '' ? '' : (parseInt(value) || 0)
    }
    setForm(prev => ({ ...prev, [name]: val }))
  }

  const handleSubmit = async e => {
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
    <div style={overlay} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={modal}>
        {/* Header */}
        <div style={header}>
          <h2 style={{ margin: 0, fontSize: '1.125rem' }}>{title}</h2>
          <button style={closeBtn} onClick={onClose}>✕</button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={body}>
          {error && (
            <div style={errorBox}>{error}</div>
          )}

          {fields.map(f => (
            <div key={f.name} style={fieldWrap}>
              <label style={labelStyle}>
                {f.label}
                {f.required && <span style={{ color: 'var(--danger)', marginLeft: 2 }}>*</span>}
              </label>

              {f.type === 'select' ? (
                <select
                  style={inputStyle}
                  value={form[f.name] ?? ''}
                  onChange={e => handleChange(f.name, e.target.value, f.type)}
                  required={f.required}
                >
                  <option value="">— Chọn —</option>
                  {f.options?.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              ) : f.type === 'textarea' ? (
                <textarea
                  style={{ ...inputStyle, minHeight: 90, resize: 'vertical' }}
                  value={form[f.name] ?? ''}
                  onChange={e => handleChange(f.name, e.target.value, f.type)}
                  placeholder={f.placeholder}
                  required={f.required}
                />
              ) : f.type === 'checkbox' ? (
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={!!form[f.name]}
                    onChange={e => handleChange(f.name, e.target.checked)}
                    style={{ width: 16, height: 16 }}
                  />
                  <span style={{ fontSize: '0.875rem', color: 'var(--text-2)' }}>{f.placeholder}</span>
                </label>
              ) : f.type === 'file' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <input
                    type="file"
                    onChange={e => handleChange(f.name, e.target.files[0], 'file')}
                    accept={f.accept}
                    required={f.required && !initialData}
                    style={{ fontSize: '0.875rem' }}
                  />
                  {initialData?.[f.name] && typeof initialData[f.name] === 'string' && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>
                      Tệp hiện tại: {initialData[f.name]}
                    </div>
                  )}
                </div>
              ) : (
                <input
                  type={f.type || 'text'}
                  style={inputStyle}
                  value={form[f.name] ?? ''}
                  onChange={e => handleChange(f.name, e.target.value, f.type)}
                  placeholder={f.placeholder}
                  required={f.required}
                  min={f.min}
                  max={f.max}
                  step={f.step}
                />
              )}
            </div>
          ))}

          {/* Footer */}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading}>
              Hủy
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={spinner} />Đang lưu…
                </span>
              ) : initialData ? '💾 Lưu thay đổi' : '➕ Tạo mới'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// PropTypes removed – prop-types is not installed in this project

// ── Inline styles ──────────────────────────────────────────────────────────────
const overlay = {
  position:        'fixed',
  inset:           0,
  background:      'rgba(0,0,0,0.6)',
  backdropFilter:  'blur(4px)',
  display:         'flex',
  alignItems:      'center',
  justifyContent:  'center',
  zIndex:          1000,
  padding:         '1rem'
}

const modal = {
  background:   'var(--bg-2)',
  border:       '1px solid var(--border)',
  borderRadius: 'var(--radius)',
  width:        '100%',
  maxWidth:     560,
  maxHeight:    '90vh',
  overflowY:    'auto',
  boxShadow:    '0 24px 64px rgba(0,0,0,0.5)'
}

const header = {
  display:         'flex',
  alignItems:      'center',
  justifyContent:  'space-between',
  padding:         '1.25rem 1.5rem',
  borderBottom:    '1px solid var(--border)',
  position:        'sticky',
  top:             0,
  background:      'var(--bg-2)',
  zIndex:          1
}

const closeBtn = {
  background:   'transparent',
  border:       'none',
  color:        'var(--text-3)',
  cursor:       'pointer',
  fontSize:     '1.1rem',
  padding:      '4px 8px',
  borderRadius: 6
}

const body = { padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '0.875rem' }

const fieldWrap = { display: 'flex', flexDirection: 'column', gap: 5 }

const labelStyle = { fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-2)' }

const inputStyle = {
  background: 'var(--bg-3)',
  border:     '1px solid var(--border)',
  borderRadius: 8,
  padding:    '0.5rem 0.75rem',
  color:      'var(--text)',
  fontSize:   '0.9rem',
  width:      '100%',
  boxSizing:  'border-box',
  outline:    'none',
  transition: 'border-color 0.2s'
}

const errorBox = {
  background:   'rgba(239,68,68,0.12)',
  border:       '1px solid var(--danger)',
  borderRadius: 8,
  padding:      '0.6rem 0.875rem',
  color:        'var(--danger)',
  fontSize:     '0.85rem'
}

const spinner = {
  display:     'inline-block',
  width:       14,
  height:      14,
  border:      '2px solid rgba(255,255,255,0.3)',
  borderTop:   '2px solid #fff',
  borderRadius: '50%',
  animation:   'spin 0.7s linear infinite'
}
