import { useState, useEffect } from 'react'
import { Save, Plus, X } from 'lucide-react'


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
      if (f.type === 'checkbox') {
        init[f.name] = initialData?.[f.name] ?? f.default ?? false
      } else {
        init[f.name] = initialData?.[f.name] ?? f.default ?? ''
      }
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
      const cleanedForm = { ...form }
      fields.forEach(f => {
        if (cleanedForm[f.name] === '') {
          if (f.type === 'number' || f.type === 'checkbox') {
            delete cleanedForm[f.name]
          }
        }
        if (f.type === 'checkbox') {
          cleanedForm[f.name] = !!cleanedForm[f.name]
        }
      })
      await onSubmit(cleanedForm)
    } catch (err) {
      setError(err?.response?.data?.error || err.message || 'Đã xảy ra lỗi')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal-content fade-in" style={{ padding: '2rem' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
          <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700 }}>{title}</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close modal" style={{ position: 'static', transform: 'none' }}>
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {error && (
            <div className="alert alert-error" style={{ margin: 0 }}>{error}</div>
          )}

          <div style={fieldsGrid}>
            {fields.map(f => (
              <div key={f.name} style={{ ...fieldWrap, gridColumn: f.grid === 'half' ? 'span 1' : 'span 2' }}>
                <label className="form-label" style={{ marginBottom: '0.25rem', fontSize: '0.8125rem' }}>
                  {f.label}
                  {f.required && <span style={{ color: 'var(--danger)', marginLeft: 2 }}>*</span>}
                </label>

              {f.type === 'select' ? (
                <select
                  className="form-input form-select"
                  value={form[f.name] ?? ''}
                  onChange={e => handleChange(f.name, e.target.value, f.type)}
                  required={f.required}
                  style={{ cursor: 'pointer' }}
                >
                  <option value="">— Chọn —</option>
                  {f.options?.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              ) : f.type === 'textarea' ? (
                <textarea
                  className="form-input"
                  style={{ minHeight: 90, resize: 'vertical' }}
                  value={form[f.name] ?? ''}
                  onChange={e => handleChange(f.name, e.target.value, f.type)}
                  placeholder={f.placeholder}
                  required={f.required}
                />
              ) : f.type === 'checkbox' ? (
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginTop: '0.25rem' }}>
                  <input
                    type="checkbox"
                    checked={!!form[f.name]}
                    onChange={e => handleChange(f.name, e.target.checked)}
                    style={{ width: 18, height: 18, cursor: 'pointer' }}
                  />
                  <span style={{ fontSize: '0.875rem', color: 'var(--text-2)' }}>{f.placeholder}</span>
                </label>
              ) : f.type === 'file' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <input
                    type="file"
                    className="form-input"
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
                  className="form-input"
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
          </div>

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
              ) : initialData ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Save size={16} /> Lưu thay đổi
                </span>
              ) : (
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Plus size={16} /> Tạo mới
                </span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// PropTypes removed – prop-types is not installed in this project

// ── Inline styles ──────────────────────────────────────────────────────────────
const fieldsGrid = {
  display: 'grid',
  gridTemplateColumns: 'repeat(2, 1fr)',
  gap: '1rem'
}

const fieldWrap = { display: 'flex', flexDirection: 'column', gap: 6 }

const spinner = {
  display:     'inline-block',
  width:       14,
  height:      14,
  border:      '2px solid rgba(255,255,255,0.3)',
  borderTop:   '2px solid #fff',
  borderRadius: '50%',
  animation:   'spin 0.7s linear infinite'
}
