import { useState } from 'react'

/**
 * QuizQuestionEditor - Advanced component to manage quiz questions and answers
 * 
 * Props:
 *  quiz     : object (the quiz to edit)
 *  onSave   : async (updatedQuiz) => void
 *  onCancel : () => void
 */
export default function QuizQuestionEditor({ quiz, onSave, onCancel }) {
  const [questions, setQuestions] = useState(quiz.questions || [])
  const [metadata, setMetadata] = useState({
    quiz_type: quiz.quiz_type || 'PRACTICE',
    access_code: quiz.access_code || ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleAddQuestion = () => {
    const newQuestion = {
      content: '',
      question_type: 'SINGLE_CHOICE',
      points: 10,
      explanation: '',
      media_type: 'NONE',
      media_url: '',
      order_index: questions.length,
      answers: [
        { content: '', is_correct: true },
        { content: '', is_correct: false }
      ]
    }
    setQuestions([...questions, newQuestion])
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
      // Uncheck others if single choice
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
    // Basic validation
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i]
      if (!q.content.trim()) return setError(`Câu hỏi #${i+1} chưa có nội dung`)
      if (q.answers.length < 2 && q.question_type !== 'SHORT_ANSWER') return setError(`Câu hỏi #${i+1} cần ít nhất 2 phương án`)
      if (!q.answers.some(a => a.is_correct) && q.question_type !== 'SHORT_ANSWER') return setError(`Câu hỏi #${i+1} chưa chọn đáp án đúng`)
    }

    setLoading(true)
    try {
      await onSave({ ...quiz, ...metadata, questions })
    } catch (err) {
      setError(err?.response?.data?.error || 'Lưu thất bại')
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
            <h2 style={{ margin: 0 }}>Quản lý câu hỏi</h2>
            <p style={{ margin: '4px 0 0', fontSize: '0.9rem', color: 'var(--text-3)' }}>Quiz: {quiz.title}</p>
          </div>
          <div style={{ display:'flex', gap: 10 }}>
            <button className="btn btn-secondary" onClick={onCancel} disabled={loading}>Đóng</button>
            <button className="btn btn-primary" onClick={handleSave} disabled={loading}>
              {loading ? 'Đang lưu...' : '💾 Lưu bộ câu hỏi'}
            </button>
          </div>
        </div>

        {/* Content */}
        <div style={scrollContent}>
          {error && <div style={errorBanner}>{error}</div>}

          {/* Global Settings */}
          <div className="glass-card" style={{ ...questionCard, marginBottom: '2rem', borderTop: '4px solid var(--primary)' }}>
            <h3 style={{ marginBottom: '1.5rem', display:'flex', alignItems:'center', gap:10 }}>⚙️ Cài đặt bài thi</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
              <div>
                <label style={labelStyle}>Loại Quiz</label>
                <select 
                  style={inputStyle}
                  value={metadata.quiz_type}
                  onChange={e => setMetadata({ ...metadata, quiz_type: e.target.value })}
                >
                  <option value="PRACTICE">Luyện tập</option>
                  <option value="EXAM">Bài kiểm tra (Chính thức)</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>Mã phòng thi (Room Code)</label>
                <input 
                  type="text" 
                  style={inputStyle} 
                  placeholder="Ví dụ: EXAM2024"
                  value={metadata.access_code}
                  onChange={e => setMetadata({ ...metadata, access_code: e.target.value.toUpperCase() })}
                />
                <p style={{ fontSize: '0.75rem', color: 'var(--text-3)', marginTop: 4 }}>Bắt buộc nhập mã này để vào thi (chỉ áp dụng cho Exam)</p>
              </div>
            </div>
          </div>

          {questions.length === 0 ? (
            <div style={{ textAlign:'center', padding:'4rem 2rem', background:'var(--bg-3)', borderRadius:12, border:'2px dashed var(--border)' }}>
              <div style={{ fontSize:'3rem', marginBottom:'1rem' }}>🧩</div>
              <h3>Chưa có câu hỏi nào</h3>
              <p style={{ color:'var(--text-3)', marginBottom:'1.5rem' }}>Hãy bắt đầu xây dựng bộ câu hỏi cho Quiz này</p>
              <button className="btn btn-primary" onClick={handleAddQuestion}>➕ Thêm câu hỏi đầu tiên</button>
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
                        <option value="SINGLE_CHOICE">Trắc nghiệm (1 đáp án)</option>
                        <option value="MULTIPLE_CHOICE">Trắc nghiệm (Nhiều đáp án)</option>
                        <option value="TRUE_FALSE">Đúng/Sai</option>
                        <option value="SHORT_ANSWER">Trả lời ngắn</option>
                      </select>
                    </div>
                    <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                       <div style={{ fontSize:'0.8rem', color:'var(--text-3)' }}>
                         Điểm: <input type="number" style={inputMini} value={q.points || 0} onChange={e => handleQuestionChange(qIndex, 'points', parseInt(e.target.value) || 0)} />
                       </div>
                       <button style={btnDelete} onClick={() => handleRemoveQuestion(qIndex)} title="Xóa câu hỏi">✕</button>
                    </div>
                  </div>

                  <div style={{ marginBottom:'1.5rem' }}>
                    <label style={labelStyle}>Nội dung câu hỏi</label>
                    <textarea 
                      style={textareaStyle} 
                      value={q.content} 
                      placeholder="Nhập câu hỏi tại đây..."
                      onChange={e => handleQuestionChange(qIndex, 'content', e.target.value)}
                    />
                  </div>

                  <div style={{ marginBottom:'1.5rem', display:'flex', gap:20, flexWrap:'wrap' }}>
                    <div style={{ flex: '1 1 200px' }}>
                      <label style={labelStyle}>Đính kèm phương tiện (Tùy chọn)</label>
                      <select 
                        style={inputStyle}
                        value={q.media_type || 'NONE'}
                        onChange={e => handleQuestionChange(qIndex, 'media_type', e.target.value)}
                      >
                        <option value="NONE">Không có</option>
                        <option value="IMAGE">Hình ảnh (URL)</option>
                        <option value="VIDEO">Video (URL)</option>
                      </select>
                    </div>
                    {q.media_type && q.media_type !== 'NONE' && (
                      <div style={{ flex: '2 1 400px' }}>
                        <label style={labelStyle}>URL {q.media_type === 'IMAGE' ? 'Ảnh' : 'Video'}</label>
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

                  {q.question_type !== 'SHORT_ANSWER' && (
                    <div>
                      <label style={labelStyle}>Các phương án trả lời</label>
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
                              placeholder={`Phương án ${aIndex + 1}`}
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
                          ➕ Thêm phương án
                        </button>
                      </div>
                    </div>
                  )}

                  <div style={{ marginTop:'1.5rem' }}>
                    <label style={labelStyle}>Giải thích (tùy chọn)</label>
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
                ➕ Thêm câu hỏi mới
              </button>
              <div style={{ height:'4rem' }} /> {/* Spacer */}
            </div>
          )}
        </div>
      </div>
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
