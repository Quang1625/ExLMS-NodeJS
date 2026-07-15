import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import api from '../api/axios'

/**
 * QuizQuestionEditor - Advanced component to manage quiz questions and answers
 */
export default function QuizQuestionEditor({ quiz, onSave, onCancel }) {
  const { t } = useTranslation()
  const [questions, setQuestions] = useState(quiz.questions || [])
  const [metadata, setMetadata] = useState({
    quiz_type: quiz.quiz_type || 'PRACTICE',
    access_code: quiz.access_code || '',
    enable_anti_cheat: quiz.enable_anti_cheat || false
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // AI Generation States
  const [showAiModal, setShowAiModal] = useState(false)
  const [aiPrompt, setAiPrompt] = useState('')
  const [aiAmount, setAiAmount] = useState(5)
  const [aiTypes, setAiTypes] = useState(['SINGLE_CHOICE', 'MULTIPLE_CHOICE'])
  const [aiDifficulty, setAiDifficulty] = useState('MEDIUM')
  const [aiApiKey, setAiApiKey] = useState('')
  const [generating, setGenerating] = useState(false)
  const [aiSourceType, setAiSourceType] = useState('text') // 'text' | 'file'
  const [aiFile, setAiFile] = useState(null)

  const handleGenerateQuestions = async () => {
    if (aiSourceType === 'text' && !aiPrompt.trim()) {
      alert('Vui lòng nhập chủ đề hoặc nội dung tài liệu học tập.')
      return
    }
    if (aiSourceType === 'file' && !aiFile) {
      alert('Vui lòng chọn hoặc kéo thả một file Word (.docx).')
      return
    }
    if (aiTypes.length === 0) {
      alert('Vui lòng chọn ít nhất 1 loại câu hỏi.')
      return
    }

    setGenerating(true)
    try {
      let responseData;
      if (aiSourceType === 'file') {
        const formData = new FormData()
        formData.append('file', aiFile)
        formData.append('amount', aiAmount)
        formData.append('types', JSON.stringify(aiTypes))
        formData.append('difficulty', aiDifficulty)
        if (aiApiKey) formData.append('apiKey', aiApiKey)

        const { data } = await api.post('/quizzes/generate-from-file', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        })
        responseData = data
      } else {
        const { data } = await api.post('/quizzes/generate-questions', {
          topic: aiPrompt,
          amount: aiAmount,
          types: aiTypes,
          difficulty: aiDifficulty,
          apiKey: aiApiKey || undefined
        })
        responseData = data
      }

      const startOrder = questions.length
      const newQuestions = responseData.map((q, index) => ({
        ...q,
        order_index: startOrder + index,
        answers: Array.isArray(q.answers) ? q.answers.map(a => ({
          content: a.content || '',
          is_correct: !!a.is_correct,
          correct_order: a.correct_order
        })) : [],
        blank_answers: q.blank_answers || []
      }))

      setQuestions([...questions, ...newQuestions])
      setShowAiModal(false)
      setAiPrompt('')
      setAiFile(null)
      alert(`Đã sinh tự động thành công ${newQuestions.length} câu hỏi!`)
    } catch (err) {
      alert(err.response?.data?.error || err.message || 'Lỗi khi tạo câu hỏi tự động.')
    } finally {
      setGenerating(false)
    }
  }

  const handleAddQuestion = () => {
    const newQuestion = {
      content: '',
      question_type: 'SINGLE_CHOICE',
      points: 10,
      explanation: '',
      media_type: 'NONE',
      media_url: '',
      order_index: questions.length,
      blank_answers: [],
      answers: [
        { content: '', is_correct: true },
        { content: '', is_correct: false }
      ]
    }
    setQuestions([...questions, newQuestion])
  }

  const handleAddBlankAnswer = (qIndex) => {
    const next = [...questions]
    next[qIndex] = { ...next[qIndex], blank_answers: [...(next[qIndex].blank_answers || []), ''] }
    setQuestions(next)
  }

  const handleBlankAnswerChange = (qIndex, aIndex, value) => {
    const next = [...questions]
    const blanks = [...(next[qIndex].blank_answers || [])]
    blanks[aIndex] = value
    next[qIndex] = { ...next[qIndex], blank_answers: blanks }
    setQuestions(next)
  }

  const handleRemoveBlankAnswer = (qIndex, aIndex) => {
    const next = [...questions]
    next[qIndex] = { ...next[qIndex], blank_answers: (next[qIndex].blank_answers || []).filter((_, i) => i !== aIndex) }
    setQuestions(next)
  }

  // ORDERING: move answer up/down to define correct order
  const handleOrderingMove = (qIndex, aIndex, direction) => {
    const next = [...questions]
    const answers = [...next[qIndex].answers]
    const swapIdx = aIndex + direction
    if (swapIdx < 0 || swapIdx >= answers.length) return
    const temp = answers[aIndex]
    answers[aIndex] = answers[swapIdx]
    answers[swapIdx] = temp
    // Update correct_order
    const updated = answers.map((a, i) => ({ ...a, is_correct: true, correct_order: i }))
    next[qIndex] = { ...next[qIndex], answers: updated }
    setQuestions(next)
  }

  const handleRemoveQuestion = (index) => {
    setQuestions(questions.filter((_, i) => i !== index))
  }

  const handleQuestionChange = (index, field, value) => {
    const next = [...questions]
    next[index] = { ...next[index], [field]: value }
    setQuestions(next)
  }

  const handleAddAnswer = (qIndex) => {
    const next = [...questions]
    next[qIndex].answers.push({ content: '', is_correct: false })
    setQuestions(next)
  }

  const handleRemoveAnswer = (qIndex, aIndex) => {
    const next = [...questions]
    next[qIndex].answers = next[qIndex].answers.filter((_, i) => i !== aIndex)
    setQuestions(next)
  }

  const handleAnswerChange = (qIndex, aIndex, field, value) => {
    const next = [...questions]
    const question = next[qIndex]
    
    if (field === 'is_correct' && (question.question_type === 'SINGLE_CHOICE' || question.question_type === 'TRUE_FALSE')) {
      question.answers = question.answers.map((a, i) => ({
        ...a,
        is_correct: i === aIndex ? value : false
      }))
    } else {
      question.answers[aIndex] = { ...question.answers[aIndex], [field]: value }
    }
    setQuestions(next)
  }

  const handleSave = async () => {
    setError('')
    
    // First, validate all questions
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i]
      if (!q.content.trim()) return setError(t('quiz.editor.validation.content_empty', { index: i + 1 }))
      
      if (q.question_type === 'FILL_BLANK') {
        if (!q.blank_answers || q.blank_answers.filter(a => a.trim()).length === 0)
          return setError(`Câu hỏi ${i + 1}: Điền khuyết phải có ít nhất 1 đáp án chấp nhận được.`)
      } else if (q.question_type === 'ORDERING') {
        if (q.answers.length < 2) return setError(`Câu hỏi ${i + 1}: Sắp xếp phải có ít nhất 2 mục.`)
        if (q.answers.some(a => !a.content.trim()))
          return setError(`Câu hỏi ${i + 1}: Các mục sắp xếp không được để trống.`)
      } else if (q.question_type !== 'SHORT_ANSWER') {
        if (q.answers.length < 2) return setError(t('quiz.editor.validation.min_answers', { index: i + 1 }))
        if (!q.answers.some(a => a.is_correct)) return setError(t('quiz.editor.validation.no_correct', { index: i + 1 }))
        if (q.answers.some(a => !a.content.trim()))
          return setError(`Câu hỏi ${i + 1}: Các lựa chọn đáp án không được để trống.`)
      }
    }

    // Sanitize the questions payload to match backend schema requirements
    const sanitizedQuestions = questions.map(q => {
      let answers = q.answers || []
      let blank_answers = q.blank_answers || []

      if (q.question_type === 'SHORT_ANSWER') {
        answers = []
        blank_answers = []
      } else if (q.question_type === 'FILL_BLANK') {
        answers = []
        blank_answers = blank_answers.filter(a => a.trim() !== '')
      } else {
        blank_answers = []
        // Clean up answers properties if needed
        answers = answers.map(a => ({
          content: a.content.trim(),
          is_correct: !!a.is_correct,
          order_index: a.order_index
        }))
      }

      return {
        ...q,
        answers,
        blank_answers
      }
    })

    setLoading(true)
    try {
      await onSave({ ...quiz, ...metadata, questions: sanitizedQuestions })
    } catch (err) {
      setError(err?.response?.data?.error || t('common.error_fail'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={overlay}>
      <div style={editorContainer}>
        {/* Header */}
        <div style={header}>
          <div>
            <h2 style={{ margin: 0 }}>{t('quiz.editor.manage_questions')}</h2>
            <p style={{ margin: '4px 0 0', fontSize: '0.9rem', color: 'var(--text-3)' }}>Quiz: {quiz.title}</p>
          </div>
          <div style={{ display:'flex', gap: 10 }}>
            <button className="btn btn-secondary" onClick={onCancel} disabled={loading}>{t('common.close')}</button>
            <button className="btn btn-primary" style={{ background: 'linear-gradient(135deg, #a855f7, #6366f1)', border: 'none' }} onClick={() => setShowAiModal(true)} disabled={loading}>
              ✨ Tạo câu hỏi bằng AI
            </button>
            <button className="btn btn-primary" onClick={handleSave} disabled={loading}>
              {loading ? t('profile.saving') : `💾 ${t('quiz.editor.save_questions')}`}
            </button>
          </div>
        </div>

        {/* Content */}
        <div style={scrollContent}>
          {error && <div style={errorBanner}>{error}</div>}

          {/* Global Settings */}
          <div className="glass-card" style={{ ...questionCard, marginBottom: '2rem', borderTop: '4px solid var(--primary)' }}>
            <h3 style={{ marginBottom: '1.5rem', display:'flex', alignItems:'center', gap:10 }}>⚙️ {t('quiz.editor.quiz_settings')}</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
              <div>
                <label style={labelStyle}>{t('quiz.editor.quiz_type')}</label>
                <select 
                  style={inputStyle}
                  value={metadata.quiz_type}
                  onChange={e => setMetadata({ ...metadata, quiz_type: e.target.value })}
                >
                  <option value="PRACTICE">{t('course_detail.practice_label')}</option>
                  <option value="EXAM">{t('course_detail.exam_label')}</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>{t('quiz.editor.access_code')}</label>
                <input 
                  type="text" 
                  style={inputStyle} 
                  placeholder="Ví dụ: EXAM2024"
                  value={metadata.access_code}
                  onChange={e => setMetadata({ ...metadata, access_code: e.target.value.toUpperCase() })}
                />
                <p style={{ fontSize: '0.75rem', color: 'var(--text-3)', marginTop: 4 }}>{t('quiz.editor.access_code_hint')}</p>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <label style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', userSelect: 'none' }}>
                  <input 
                    type="checkbox" 
                    checked={metadata.enable_anti_cheat}
                    onChange={e => setMetadata({ ...metadata, enable_anti_cheat: e.target.checked })}
                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                  />
                  <span>🛡️ Kích hoạt Chống Gian Lận</span>
                </label>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-3)', marginTop: 4 }}>Bắt buộc sinh viên bật toàn màn hình, ghi lại lịch sử khi chuyển tab.</p>
              </div>
            </div>
          </div>

          {questions.length === 0 ? (
            <div style={{ textAlign:'center', padding:'4rem 2rem', background:'var(--bg-3)', borderRadius:12, border:'2px dashed var(--border)' }}>
              <div style={{ fontSize:'3rem', marginBottom:'1rem' }}>🧩</div>
              <h3>{t('quiz.editor.no_questions')}</h3>
              <p style={{ color:'var(--text-3)', marginBottom:'1.5rem' }}>{t('quiz.editor.no_questions_subtitle')}</p>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                <button className="btn btn-primary" onClick={handleAddQuestion}>➕ {t('quiz.editor.add_first_question')}</button>
                <button className="btn btn-primary" style={{ background: 'linear-gradient(135deg, #a855f7, #6366f1)', border: 'none' }} onClick={() => setShowAiModal(true)}>
                  ✨ Tạo bằng AI
                </button>
              </div>
            </div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:'2rem' }}>
              {questions.map((q, qIndex) => (
                <div key={qIndex} className="glass-card" style={questionCard}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'1.5rem', alignItems:'start' }}>
                    <div style={{ display:'flex', gap:10, alignItems:'center' }}>
                      <span style={qNumber}>{qIndex + 1}</span>
                      <select 
                        style={selectMini}
                        value={q.question_type}
                        onChange={e => handleQuestionChange(qIndex, 'question_type', e.target.value)}
                      >
                        <option value="SINGLE_CHOICE">{t('quiz.editor.types.SINGLE_CHOICE')}</option>
                        <option value="MULTIPLE_CHOICE">{t('quiz.editor.types.MULTIPLE_CHOICE')}</option>
                        <option value="TRUE_FALSE">{t('quiz.editor.types.TRUE_FALSE')}</option>
                        <option value="FILL_BLANK">{t('quiz.editor.types.FILL_BLANK')}</option>
                        <option value="ORDERING">{t('quiz.editor.types.ORDERING')}</option>
                        <option value="SHORT_ANSWER">{t('quiz.editor.types.SHORT_ANSWER')}</option>
                      </select>
                    </div>
                    <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                       <div style={{ fontSize:'0.8rem', color:'var(--text-3)' }}>
                         {t('quiz.editor.points')}: <input type="number" style={inputMini} value={q.points || 0} onChange={e => handleQuestionChange(qIndex, 'points', parseInt(e.target.value) || 0)} />
                       </div>
                       <button style={btnDelete} onClick={() => handleRemoveQuestion(qIndex)} title="Xóa câu hỏi">✕</button>
                    </div>
                  </div>

                  <div style={{ marginBottom:'1.5rem' }}>
                    <label style={labelStyle}>{t('quiz.editor.question_content')}</label>
                    <textarea 
                      style={textareaStyle} 
                      value={q.content} 
                      placeholder="Nhập câu hỏi tại đây..."
                      onChange={e => handleQuestionChange(qIndex, 'content', e.target.value)}
                    />
                  </div>

                  <div style={{ marginBottom:'1.5rem', display:'flex', gap:20, flexWrap:'wrap' }}>
                    <div style={{ flex: '1 1 200px' }}>
                      <label style={labelStyle}>{t('quiz.editor.media_attach')}</label>
                      <select 
                        style={inputStyle}
                        value={q.media_type || 'NONE'}
                        onChange={e => handleQuestionChange(qIndex, 'media_type', e.target.value)}
                      >
                        <option value="NONE">{t('quiz.editor.none')}</option>
                        <option value="IMAGE">{t('quiz.editor.image_url')}</option>
                        <option value="VIDEO">{t('quiz.editor.video_url')}</option>
                      </select>
                    </div>
                    {q.media_type && q.media_type !== 'NONE' && (
                      <div style={{ flex: '2 1 400px' }}>
                        <label style={labelStyle}>URL {q.media_type === 'IMAGE' ? t('course_detail.fields.file_label') : 'Video'}</label>
                        <input 
                          type="text" 
                          style={inputStyle} 
                          value={q.media_url || ''} 
                          placeholder={`Dán URL ${q.media_type === 'IMAGE' ? 'hình ảnh' : 'video'} tại đây...`}
                          onChange={e => handleQuestionChange(qIndex, 'media_url', e.target.value)}
                        />
                      </div>
                    )}
                  </div>

                  {/* FILL_BLANK: multiple accepted answers */}
                  {q.question_type === 'FILL_BLANK' && (
                    <div>
                      <label style={labelStyle}>✍️ Các đáp án chấp nhận được (không phân biệt hoa/thường)</label>
                      <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                        {(q.blank_answers || []).map((ba, baIdx) => (
                          <div key={baIdx} style={{ display:'flex', gap:10, alignItems:'center' }}>
                            <span style={{ width:24, height:24, borderRadius:6, background:'rgba(56,239,125,0.15)', color:'#38ef7d', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:800, flexShrink:0 }}>✓</span>
                            <input
                              type="text" style={inputStyle}
                              value={ba}
                              placeholder={`Đáp án chấp nhận ${baIdx + 1} (VD: Hà Nội)`}
                              onChange={e => handleBlankAnswerChange(qIndex, baIdx, e.target.value)}
                            />
                            <button style={btnDeleteSmall} onClick={() => handleRemoveBlankAnswer(qIndex, baIdx)}>✕</button>
                          </div>
                        ))}
                        <button className="btn btn-sm" style={{ alignSelf:'flex-start', marginTop:5, color:'var(--primary)' }}
                          onClick={() => handleAddBlankAnswer(qIndex)}>
                          ➕ Thêm đáp án chấp nhận
                        </button>
                      </div>
                      <p style={{ fontSize:'0.75rem', color:'var(--text-3)', marginTop:8 }}>💡 Hệ thống sẽ chấp nhận bất kỳ đáp án nào trong danh sách này (không phân biệt chữ hoa/thường)</p>
                    </div>
                  )}

                  {/* ORDERING: drag to define correct order */}
                  {q.question_type === 'ORDERING' && (
                    <div>
                      <label style={labelStyle}>🔀 Các mục cần sắp xếp (thứ tự từ trên xuống là thứ tự ĐÚNG)</label>
                      <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                        {q.answers.map((a, aIndex) => (
                          <div key={aIndex} style={{ display:'flex', gap:10, alignItems:'center' }}>
                            <span style={{ width:28, height:28, background:'var(--primary)', color:'white', borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center', fontWeight:800, fontSize:'0.85rem', flexShrink:0 }}>{aIndex + 1}</span>
                            <input
                              type="text" style={inputStyle}
                              value={a.content}
                              placeholder={`Mục thứ ${aIndex + 1}`}
                              onChange={e => handleAnswerChange(qIndex, aIndex, 'content', e.target.value)}
                            />
                            <div style={{ display:'flex', flexDirection:'column', gap:2 }}>
                              <button style={{ ...btnDeleteSmall, background:'rgba(108,99,255,0.1)', color:'var(--primary)', fontSize:'0.7rem' }}
                                onClick={() => handleOrderingMove(qIndex, aIndex, -1)} disabled={aIndex === 0}>▲</button>
                              <button style={{ ...btnDeleteSmall, background:'rgba(108,99,255,0.1)', color:'var(--primary)', fontSize:'0.7rem' }}
                                onClick={() => handleOrderingMove(qIndex, aIndex, 1)} disabled={aIndex === q.answers.length - 1}>▼</button>
                            </div>
                            <button style={btnDeleteSmall} onClick={() => handleRemoveAnswer(qIndex, aIndex)}>✕</button>
                          </div>
                        ))}
                        <button className="btn btn-sm" style={{ alignSelf:'flex-start', marginTop:5, color:'var(--primary)' }}
                          onClick={() => handleAddAnswer(qIndex)}>
                          ➕ Thêm mục
                        </button>
                      </div>
                      <p style={{ fontSize:'0.75rem', color:'var(--text-3)', marginTop:8 }}>💡 Sử dụng mũi tên ▲▼ để sắp xếp thứ tự đúng. Người học sẽ kéo thả để sắp xếp lại.</p>
                    </div>
                  )}

                  {/* Regular choice answers */}
                  {(q.question_type === 'SINGLE_CHOICE' || q.question_type === 'MULTIPLE_CHOICE' || q.question_type === 'TRUE_FALSE') && (
                    <div>
                      <label style={labelStyle}>{t('quiz.editor.answers_label')}</label>
                      <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                        {q.answers.map((a, aIndex) => (
                          <div key={aIndex} style={{ display:'flex', gap:10, alignItems:'center' }}>
                            <input 
                              type={q.question_type === 'MULTIPLE_CHOICE' ? 'checkbox' : 'radio'}
                              checked={a.is_correct}
                              onChange={e => handleAnswerChange(qIndex, aIndex, 'is_correct', e.target.checked)}
                              style={{ width:18, height:18, accentColor:'var(--primary)' }}
                            />
                            <input 
                              type="text" 
                              style={inputStyle} 
                              value={a.content} 
                              placeholder={`${t('quiz.editor.add_answer')} ${aIndex + 1}`}
                              onChange={e => handleAnswerChange(qIndex, aIndex, 'content', e.target.value)}
                            />
                            <button style={btnDeleteSmall} onClick={() => handleRemoveAnswer(qIndex, aIndex)}>✕</button>
                          </div>
                        ))}
                        <button 
                          className="btn btn-sm" 
                          style={{ alignSelf:'flex-start', marginTop:5, color:'var(--primary)' }}
                          onClick={() => handleAddAnswer(qIndex)}
                        >
                          ➕ {t('quiz.editor.add_answer')}
                        </button>
                      </div>
                    </div>
                  )}

                  <div style={{ marginTop:'1.5rem' }}>
                    <label style={labelStyle}>{t('quiz.editor.explanation')}</label>
                    <input 
                      type="text" 
                      style={inputStyle} 
                      value={q.explanation} 
                      placeholder="Giải thích vì sao đáp án này đúng..."
                      onChange={e => handleQuestionChange(qIndex, 'explanation', e.target.value)}
                    />
                  </div>
                </div>
              ))}
              
              <button className="btn btn-primary" style={{ padding:'1rem', alignSelf:'center', marginTop:'1rem' }} onClick={handleAddQuestion}>
                ➕ {t('quiz.editor.add_new_question')}
              </button>
              <div style={{ height:'4rem' }} />
            </div>
          )}
        </div>
      </div>

      {showAiModal && (
        <div style={aiOverlayStyle}>
          <div style={aiModalStyle}>
            <div style={aiHeaderStyle}>
              <h3 style={{ margin: 0 }}>✨ Tạo câu hỏi tự động bằng AI (Gemini)</h3>
              <button style={{ background: 'transparent', border: 'none', color: 'var(--text-3)', cursor: 'pointer', fontSize: '1.2rem' }} onClick={() => setShowAiModal(false)}>✕</button>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', background: 'var(--bg-3)' }}>
              <button
                style={{
                  flex: 1, padding: '12px', background: aiSourceType === 'text' ? 'var(--bg-2)' : 'transparent',
                  border: 'none', color: aiSourceType === 'text' ? 'var(--primary)' : 'var(--text-3)',
                  fontWeight: 700, borderBottom: aiSourceType === 'text' ? '2px solid var(--primary)' : 'none', cursor: 'pointer',
                  fontSize: '0.85rem'
                }}
                onClick={() => setAiSourceType('text')}
              >
                📝 Chủ đề / Từ khóa
              </button>
              <button
                style={{
                  flex: 1, padding: '12px', background: aiSourceType === 'file' ? 'var(--bg-2)' : 'transparent',
                  border: 'none', color: aiSourceType === 'file' ? 'var(--primary)' : 'var(--text-3)',
                  fontWeight: 700, borderBottom: aiSourceType === 'file' ? '2px solid var(--primary)' : 'none', cursor: 'pointer',
                  fontSize: '0.85rem'
                }}
                onClick={() => setAiSourceType('file')}
              >
                📄 Tải file Word (.docx)
              </button>
            </div>
            
            <div style={aiBodyStyle}>
              {aiSourceType === 'text' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={labelStyle}>Chủ đề hoặc nội dung tài liệu học tập *</label>
                  <textarea
                    style={{ ...textareaStyle, minHeight: '120px' }}
                    placeholder="Ví dụ: Nhập chủ đề 'Lập trình hướng đối tượng trong C++' hoặc dán nội dung bài đọc của bạn tại đây để AI phân tích và sinh câu hỏi..."
                    value={aiPrompt}
                    onChange={e => setAiPrompt(e.target.value)}
                  />
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={labelStyle}>Tải lên File Word đề thi (.docx) *</label>
                  <div
                    onClick={() => document.getElementById('ai-docx-file-input').click()}
                    style={{
                      border: '2px dashed var(--border)', borderRadius: 12,
                      padding: '2rem', textAlign: 'center', cursor: 'pointer',
                      background: 'var(--bg-3)', transition: 'border-color 0.2s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--primary)'}
                    onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
                  >
                    <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>📄</div>
                    {aiFile ? (
                      <div style={{ color: '#38ef7d', fontWeight: 700 }}>
                        Đã chọn: {aiFile.name} ({(aiFile.size / 1024).toFixed(1)} KB)
                      </div>
                    ) : (
                      <>
                        <div style={{ fontWeight: 700, color: 'var(--text-2)' }}>Click hoặc kéo thả file Word (.docx) vào đây</div>
                        <div style={{ color: 'var(--text-3)', fontSize: '0.8rem', marginTop: 4 }}>Chỉ chấp nhận file định dạng .docx</div>
                      </>
                    )}
                    <input
                      id="ai-docx-file-input"
                      type="file"
                      accept=".docx"
                      style={{ display: 'none' }}
                      onChange={e => {
                        const file = e.target.files[0]
                        if (file) setAiFile(file)
                      }}
                    />
                  </div>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={labelStyle}>Số lượng câu hỏi</label>
                  <input
                    type="number"
                    style={inputStyle}
                    min="1"
                    max="20"
                    value={aiAmount}
                    onChange={e => setAiAmount(parseInt(e.target.value) || 1)}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={labelStyle}>Độ khó</label>
                  <select
                    style={inputStyle}
                    value={aiDifficulty}
                    onChange={e => setAiDifficulty(e.target.value)}
                  >
                    <option value="EASY">Dễ</option>
                    <option value="MEDIUM">Trung bình</option>
                    <option value="HARD">Khó</option>
                  </select>
                </div>
              </div>

              <div style={{ marginTop: '1rem' }}>
                <label style={labelStyle}>Các loại câu hỏi cần tạo</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '6px' }}>
                  {[
                    { value: 'SINGLE_CHOICE', label: 'Trắc nghiệm (1 đáp án)' },
                    { value: 'MULTIPLE_CHOICE', label: 'Trắc nghiệm (Nhiều đáp án)' },
                    { value: 'TRUE_FALSE', label: 'Đúng / Sai' },
                    { value: 'FILL_BLANK', label: 'Điền vào chỗ trống' },
                    { value: 'ORDERING', label: 'Sắp xếp thứ tự' },
                    { value: 'SHORT_ANSWER', label: 'Tự luận ngắn' }
                  ].map(t => (
                    <label key={t.value} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.85rem' }}>
                      <input
                        type="checkbox"
                        checked={aiTypes.includes(t.value)}
                        onChange={e => {
                          if (e.target.checked) {
                            setAiTypes([...aiTypes, t.value])
                          } else {
                            setAiTypes(aiTypes.filter(x => x !== t.value))
                          }
                        }}
                      />
                      {t.label}
                    </label>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '1rem' }}>
                <label style={labelStyle}>Gemini API Key (Tùy chọn)</label>
                <input
                  type="password"
                  style={inputStyle}
                  placeholder="Nhập API Key cá nhân của bạn nếu Server chưa cấu hình..."
                  value={aiApiKey}
                  onChange={e => setAiApiKey(e.target.value)}
                />
                <p style={{ fontSize: '0.75rem', color: 'var(--text-3)', margin: 0 }}>
                  Nếu để trống, server sẽ sử dụng khóa API mặc định được cấu hình trong tệp môi trường của máy chủ.
                </p>
              </div>
            </div>

            <div style={aiFooterStyle}>
              <button className="btn btn-secondary" onClick={() => setShowAiModal(false)} disabled={generating}>Hủy</button>
              <button
                className="btn btn-primary"
                style={{ background: 'linear-gradient(135deg, #a855f7, #6366f1)', border: 'none' }}
                onClick={handleGenerateQuestions}
                disabled={generating}
              >
                {generating ? '✨ Đang tạo...' : '✨ Bắt đầu tạo'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Styles
const overlay = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)',
  backdropFilter: 'blur(8px)', zIndex: 10000, display: 'flex', justifyContent: 'center', padding: '2rem 1rem'
}

const editorContainer = {
  background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: '24px',
  width: '100%', maxWidth: '1000px', display: 'flex', flexDirection: 'column', overflow: 'hidden',
  boxShadow: '0 30px 60px rgba(0,0,0,0.5)'
}

const header = {
  padding: '1.5rem 2rem', borderBottom: '1px solid var(--border)', background: 'var(--bg-2)',
  display: 'flex', justifyContent: 'space-between', alignItems: 'center'
}

const scrollContent = {
  flex: 1, overflowY: 'auto', padding: '2rem'
}

const questionCard = {
  padding: '2rem', marginBottom: 0, border: '1px solid var(--border)', borderRadius: '20px'
}

const qNumber = {
  width:32, height:32, background:'var(--primary)', color:'white', borderRadius:'50%',
  display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, fontSize:'0.9rem'
}

const selectMini = {
  background: 'var(--bg-3)', border: '1px solid var(--border)', borderRadius: 8,
  padding: '4px 10px', color: 'var(--text)', fontSize: '0.85rem', outline:'none'
}

const inputMini = {
  background: 'var(--bg-3)', border: '1px solid var(--border)', borderRadius: 8,
  padding: '4px 8px', color: 'var(--text)', fontSize: '0.85rem', width: 50, outline:'none'
}

const labelStyle = { display:'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-3)', marginBottom: 8, textTransform:'uppercase', letterSpacing:'0.05em' }

const textareaStyle = {
  width:'100%', background:'var(--bg-3)', border:'1px solid var(--border)', borderRadius:12,
  padding:'1rem', color:'var(--text)', minHeight:90, outline:'none', fontSize:'1rem'
}

const inputStyle = {
  flex: 1, background: 'var(--bg-3)', border: '1px solid var(--border)', borderRadius: 10,
  padding: '0.6rem 1rem', color: 'var(--text)', fontSize: '0.9rem', outline: 'none'
}

const btnDelete = {
  background: 'rgba(239,68,68,0.1)', color: 'var(--danger)', border: 'none',
  width: 32, height: 32, borderRadius: 8, cursor: 'pointer', fontSize: '1.1rem'
}

const btnDeleteSmall = {
  background: 'transparent', color: 'var(--text-3)', border: 'none',
  width: 24, height: 24, borderRadius: 6, cursor: 'pointer', fontSize: '0.9rem'
}

const errorBanner = {
  background: 'rgba(239,68,68,0.1)', border: '1px solid var(--danger)', color: 'var(--danger)',
  padding: '1rem', borderRadius: 12, marginBottom: '2rem', fontWeight: 600, textAlign: 'center'
}

const aiOverlayStyle = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,0.6)',
  backdropFilter: 'blur(8px)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 20000,
  padding: '1rem'
}

const aiModalStyle = {
  background: 'var(--bg-2)',
  border: '1px solid var(--border)',
  borderRadius: '20px',
  width: '100%',
  maxWidth: '550px',
  display: 'flex',
  flexDirection: 'column',
  boxShadow: '0 20px 50px rgba(0,0,0,0.4)',
  overflow: 'hidden'
}

const aiHeaderStyle = {
  padding: '1.25rem 1.5rem',
  borderBottom: '1px solid var(--border)',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center'
}

const aiBodyStyle = {
  padding: '1.5rem',
  display: 'flex',
  flexDirection: 'column',
  gap: '12px',
  maxHeight: '70vh',
  overflowY: 'auto'
}

const aiFooterStyle = {
  padding: '1rem 1.5rem',
  borderTop: '1px solid var(--border)',
  display: 'flex',
  justifyContent: 'flex-end',
  gap: '10px'
}
