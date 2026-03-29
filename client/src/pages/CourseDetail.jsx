import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import CrudModal from '../components/CrudModal'
import QuizQuestionEditor from '../components/QuizQuestionEditor'
import api from '../api/axios'
import MediaRenderer from '../components/MediaRenderer'
import { useAuth } from '../context/AuthContext'

const QUIZ_FIELDS = [
  { name: 'title',             label: 'Tiêu đề Quiz',   type: 'text',     required: true, placeholder: 'Nhập tên câu đố' },
  { name: 'description',       label: 'Mô tả',          type: 'textarea', placeholder: 'Mô tả chi tiết...' },
  { name: 'time_limit_sec',    label: 'Thời gian (giây)', type: 'number',   placeholder: 'VD: 600 (10 phút)', min: 0 },
  { name: 'max_attempts',      label: 'Số lần làm bài',  type: 'number',   default: 1, min: 1 },
  { name: 'passing_score',     label: 'Điểm đạt (%)',   type: 'number',   default: 70, min: 0, max: 100 },
  { name: 'shuffle_questions', label: 'Xáo trộn câu hỏi', type: 'checkbox', placeholder: 'Ngẫu nhiên thứ tự câu hỏi' },
  { name: 'result_visibility', label: 'Hiển thị kết quả', type: 'select',   required: true,
    options: [
      { value: 'IMMEDIATE',      label: 'Ngay lập tức' },
      { value: 'AFTER_DEADLINE', label: 'Sau khi kết thúc' },
      { value: 'MANUAL',         label: 'Thủ công' }
    ], default: 'IMMEDIATE' 
  },
  { name: 'quiz_type',         label: 'Loại Quiz',       type: 'select',   required: true,
    options: [
      { value: 'PRACTICE',       label: 'Luyện tập' },
      { value: 'EXAM',           label: 'Bài kiểm tra' }
    ], default: 'PRACTICE' }
]

const CHAPTER_FIELDS = [
  { name: 'title',       label: 'Tiêu đề Chương', type: 'text',     required: true, placeholder: 'VD: Chương 1: Cơ bản' },
  { name: 'description', label: 'Mô tả',          type: 'textarea', placeholder: 'Mô tả ngắn gọn về chương...' },
  { name: 'order_index', label: 'Thứ tự',         type: 'number',   placeholder: '1, 2, 3...' },
  { name: 'is_locked',   label: 'Khóa chương',    type: 'checkbox', placeholder: 'Học viên phải hoàn thành chương trước' }
]

const LESSON_FIELDS = [
  { name: 'title',        label: 'Tiêu đề Bài học', type: 'text',     required: true },
  { name: 'content_type', label: 'Loại nội dung',   type: 'select',   required: true, options: [
    { value: 'VIDEO',    label: 'Video' },
    { value: 'DOCUMENT', label: 'Tài liệu (Văn bản)' },
    { value: 'FILE',     label: 'Tệp đính kèm (Slide/PDF)' },
    { value: 'EMBED',    label: 'Nhúng (Youtube/Vimeo)' }
  ], default: 'DOCUMENT' },
  { name: 'content',      label: 'Nội dung / Link nhúng', type: 'textarea', placeholder: 'Nhập nội dung hoặc URL nhúng...' },
  { name: 'file',         label: 'Tải lên Video/Slide',   type: 'file',     accept: 'video/*,.pdf,.ppt,.pptx', placeholder: 'Chọn tệp để tải lên server' },
  { name: 'duration_seconds', label: 'Thời lượng (giây)', type: 'number',   placeholder: 'VD: 300' }
]


function generateSchedulePoints(startDate, endDate, scheduleDaysStr, totalSessions) {
  if (!startDate) return [];
  const start = new Date(startDate);
  // Set end date to max 1 year if missing, just to bound the loop
  const end = endDate ? new Date(endDate) : new Date(start.getTime() + 365 * 24 * 60 * 60 * 1000); 
  
  // parse "T2, T4, T6" or similar
  const daysMap = { 'cn': 0, 't2': 1, 't3': 2, 't4': 3, 't5': 4, 't6': 5, 't7': 6 };
  let allowedDays = [];
  if (scheduleDaysStr) {
    allowedDays = scheduleDaysStr.toLowerCase().split(',').map(s => s.trim()).map(s => daysMap[s]).filter(d => d !== undefined);
  }
  // If no format is matched, assume standard spacing or just weekly based on start date
  if (allowedDays.length === 0 && !scheduleDaysStr) allowedDays = [0,1,2,3,4,5,6];
  else if (allowedDays.length === 0) return [];

  const sessions = [];
  let current = new Date(start);
  let count = 0;
  
  while (current <= end) {
    if (allowedDays.includes(current.getDay())) {
      sessions.push(new Date(current));
      count++;
      if (totalSessions && count >= totalSessions) break;
    }
    current.setDate(current.getDate() + 1);
  }
  return sessions;
}

export default function CourseDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [course, setCourse] = useState(null)
  const [openChapter, setOpenChapter] = useState(null)
  const [selectedLesson, setSelectedLesson] = useState(null)
  const [loading, setLoading] = useState(true)
  const [quizzes, setQuizzes] = useState([])
  const [quizModal, setQuizModal] = useState(null)
  const [chapterModal, setChapterModal] = useState(null)
  const [lessonModal, setLessonModal] = useState(null)
  const [editingQuizQuestions, setEditingQuizQuestions] = useState(null)
  const { user } = useAuth()
  const canManage = user?.role === 'INSTRUCTOR' || user?.role === 'ADMIN'

  const fetchCourse = async () => {
    try {
      const res = await api.get(`/courses/${id}`)
      const data = res.data.data ?? res.data
      setCourse(data)
      if (!openChapter) {
        setOpenChapter(data.chapters?.[0]?._id)
      }
    } catch (err) { console.error(err) }
  }

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [courseRes, quizzesRes] = await Promise.all([
          api.get(`/courses/${id}`),
          api.get(`/quizzes?course_id=${id}`)
        ])
        setCourse(courseRes.data.data ?? courseRes.data)
        setOpenChapter(courseRes.data.data?.chapters?.[0]?._id ?? courseRes.data?.chapters?.[0]?._id)
        setQuizzes(quizzesRes.data)
      } catch (err) {
        console.error(err)
        navigate('/courses')
      } finally {
        setLoading(false)
      }
    }
    fetchAll()
  }, [id])


  if (loading) return <Layout><div className="spinner-wrap"><div className="spinner" /></div></Layout>
  if (!course) return null

  const contentTypeIcon = { VIDEO: '🎬', DOCUMENT: '📄', EMBED: '🔗', FILE: '📎' }
  const sessions = course.start_date ? generateSchedulePoints(course.start_date, course.end_date, course.schedule_days, course.total_sessions) : [];

  const handleStartLearning = () => {
    if (course.chapters?.length > 0) {
      setOpenChapter(course.chapters[0]._id);
      if (course.chapters[0].lessons?.length > 0) {
        setSelectedLesson(course.chapters[0].lessons[0]);
      }
      const el = document.getElementById('course-content');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }
  }

  const handleCreateLiveRoom = async (quizId) => {
    try {
      const { data } = await api.post('/quiz-rooms', {
        quiz_id: quizId,
        host_id: user._id
      })
      navigate(`/quiz/host/${data.room_code}`)
    } catch (err) {
      console.error(err)
      alert('Không thể tạo phòng Live. Vui lòng thử lại.')
    }
  }

  const handleQuizSubmit = async (form) => {
    if (quizModal === 'create') {
      await api.post('/quizzes', { ...form, course_id: id })
    } else if (form._id) {
       await api.put(`/quizzes/${form._id}`, form)
    }
    
    // Refresh quizzes
    const qRes = await api.get(`/quizzes?course_id=${id}`)
    setQuizzes(qRes.data)
    setQuizModal(null)
    setEditingQuizQuestions(null)
  }

  const handleChapterSubmit = async (form) => {
    if (chapterModal === 'create') {
      await api.post(`/courses/${id}/chapters`, form)
    } else if (form._id) {
      await api.put(`/courses/${id}/chapters/${form._id}`, form)
    }
    await fetchCourse()
    setChapterModal(null)
  }

  const handleLessonSubmit = async (form) => {
    const { mode, chapterId, lesson } = lessonModal
    let finalForm = { ...form }

    // Handle file upload if present
    if (form.file instanceof File) {
      const formData = new FormData()
      formData.append('file', form.file)
      const uploadRes = await api.post('/courses/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      finalForm.resource_key = uploadRes.data.data.resource_key
      delete finalForm.file
    }

    if (mode === 'create') {
      await api.post(`/courses/${id}/chapters/${chapterId}/lessons`, finalForm)
    } else if (lesson?._id) {
      // Logic for updating lesson could be added to backend, 
      // but for now we focus on creation as requested
      alert('Tính năng cập nhật bài học đang được hoàn thiện. Vui lòng xóa và tạo lại nếu cần thay đổi lớn.')
    }
    await fetchCourse()
    setLessonModal(null)
  }

  const handleDeleteChapter = async (chapterId) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa chương này và tất cả bài học bên trong?')) return
    try {
      await api.delete(`/courses/${id}/chapters/${chapterId}`)
      await fetchCourse()
    } catch (err) { alert(err.response?.data?.error || 'Lỗi khi xóa chương') }
  }


  const handleExport = async (quizId) => {
    try {
      console.log('📊 Starting export for quiz:', quizId)
      const res = await api.get(`/quizzes/${quizId}/export-excel`, { responseType: 'blob' })
      console.log('✅ Export response received, size:', res.data.size)
      const blob = new Blob([res.data], { type: 'text/csv; charset=utf-8' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', 'Bang_diem.csv')
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (err) {
      console.error('❌ Export failed!')
      console.error('Status:', err.response?.status)
      console.error('Data:', err.response?.data)
      console.error('Message:', err.message)
      alert(`Lỗi khi xuất bảng điểm (${err.response?.status || 'network'}): ${err.message}`)
    }
  }

  return (
    <Layout>
      <button className="btn btn-secondary btn-sm" style={{ marginBottom:'1.5rem' }} onClick={() => navigate('/courses')}>
        ← Quay lại
      </button>

      <div className="page-header">
        <h1>{course.title}</h1>
        <p>{course.description}</p>
        <div style={{ display:'flex', gap:'0.75rem', marginTop:'0.75rem', flexWrap:'wrap' }}>
          <span className="tag tag--primary">👤 {course.created_by?.full_name}</span>
          <span className="tag tag--primary">📁 {course.group_id?.name}</span>
          <span className="tag">📚 {course.chapters?.length || 0} chương</span>
        </div>
      </div>

      <div className="grid-2" style={{ alignItems:'start' }}>
        {/* Chapters sidebar */}
        <div id="course-content">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ margin: 0, color:'var(--text-2)' }}>Nội dung khóa học</h3>
            {canManage && (
              <button className="btn btn-primary btn-sm" onClick={() => setChapterModal('create')}>
                ➕ Thêm Chương
              </button>
            )}
          </div>
          
          {(!course.chapters || course.chapters.length === 0) && (
            <div className="empty-state"><div className="empty-state__icon">📭</div><h3>Chưa có chương nào</h3></div>
          )}

          {course.chapters?.map((ch, ci) => (
            <div key={ch._id} style={{ marginBottom:'0.5rem' }}>
              <button
                onClick={() => setOpenChapter(openChapter === ch._id ? null : ch._id)}
                style={{
                  width:'100%', display:'flex', alignItems:'center', justifyContent:'space-between',
                  padding:'0.875rem 1rem', background:'var(--bg-2)', border:'1px solid var(--border)',
                  borderRadius:'var(--radius-sm)', color:'var(--text)', fontSize:'0.875rem', fontWeight:600,
                  cursor:'pointer', transition:'var(--transition)'
                }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>📂 Chương {ci + 1}: {ch.title}</span>
                  {canManage && (
                    <div style={{ display: 'flex', gap: '4px' }} onClick={e => e.stopPropagation()}>
                       <button className="btn btn-secondary btn-sm" style={{ padding: '2px 6px' }} onClick={() => setChapterModal(ch)}>✏️</button>
                       <button className="btn btn-danger btn-sm" style={{ padding: '2px 6px' }} onClick={() => handleDeleteChapter(ch._id)}>🗑️</button>
                    </div>
                  )}
                </span>
                <span style={{ color:'var(--text-3)' }}>{ch.lessons?.length || 0} bài · {openChapter === ch._id ? '▲' : '▼'}</span>
              </button>
              {openChapter === ch._id && (
                <div style={{ background:'var(--bg-3)', borderRadius:'0 0 8px 8px', overflow:'hidden', paddingBottom: canManage ? '8px' : 0 }}>

                  {ch.lessons?.map((ls, li) => (
                    <div key={ls._id} 
                      onClick={() => setSelectedLesson(ls)}
                      style={{
                        display:'flex', alignItems:'center', gap:'0.75rem',
                        padding:'0.75rem 1rem', borderBottom:'1px solid var(--border)',
                        fontSize:'0.875rem', cursor:'pointer', transition:'var(--transition)',
                        background: selectedLesson?._id === ls._id ? 'var(--primary-2)' : 'transparent',
                        color: selectedLesson?._id === ls._id ? 'white' : 'var(--text)'
                      }}>
                      <span>{contentTypeIcon[ls.content_type] || '📄'}</span>
                      <span style={{ flex:1 }}>{ls.title}</span>
                      {ls.duration_seconds && (
                        <span style={{ color: selectedLesson?._id === ls._id ? 'rgba(255,255,255,0.8)' : 'var(--text-3)', fontSize:'0.75rem' }}>
                          {Math.floor(ls.duration_seconds / 60)}:{String(ls.duration_seconds % 60).padStart(2,'0')}
                        </span>
                      )}
                    </div>
                  ))}
                  {(!ch.lessons || ch.lessons.length === 0) && (
                    <div style={{ padding:'1rem', color:'var(--text-3)', fontSize:'0.875rem', textAlign:'center' }}>Chưa có bài học</div>
                  )}
                  {canManage && (
                    <div style={{ padding: '8px 1rem' }}>
                      <button 
                        className="btn btn-secondary btn-sm" 
                        style={{ width: '100%', justifyContent: 'center', borderStyle: 'dashed' }}
                        onClick={() => setLessonModal({ mode: 'create', chapterId: ch._id })}
                      >
                        ➕ Thêm Bài học mới
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}

          {/* Quizzes Section */}
          <div style={{ marginTop: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '8px' }}>
              <h3 style={{ margin: 0, color: 'var(--text-2)' }}>Câu đố & Bài kiểm tra</h3>
              {(user?.role === 'INSTRUCTOR' || user?.role === 'ADMIN') && (
                <button className="btn btn-primary btn-sm" onClick={() => setQuizModal('create')}>
                  ➕ Tạo Quiz mới
                </button>
              )}
            </div>
            {quizzes.length === 0 && (
              <div className="card" style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-3)' }}>
                Chưa có câu đố nào cho khóa học này.
              </div>
            )}
            {quizzes.map(qz => (
              <div key={qz._id} className="card" style={{ marginBottom: '0.75rem', padding: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h4 style={{ margin: 0 }}>
                      🧠 {qz.title}
                      <span className={`tag ${qz.quiz_type === 'EXAM' ? 'tag--danger' : 'tag--success'}`} style={{ fontSize: '0.6rem', marginLeft: '10px' }}>
                        {qz.quiz_type === 'EXAM' ? 'BÀI KIỂM TRA' : 'LUYỆN TẬP'}
                      </span>
                    </h4>
                    <p style={{ margin: '4px 0 0', fontSize: '0.8rem' }}>{qz.questions?.length || 0} câu hỏi · {qz.time_limit_sec ? `${Math.floor(qz.time_limit_sec / 60)} phút` : 'Không giới hạn thời gian'}</p>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button className="btn btn-secondary btn-sm" onClick={() => navigate(`/quiz/${qz._id}`)}>
                      Làm bài
                    </button>
                    {(user?.role === 'INSTRUCTOR' || user?.role === 'ADMIN') && (
                      <>
                        <button className="btn btn-secondary btn-sm" onClick={() => setQuizModal(qz)} title="Sửa thông tin">
                          ✏️
                        </button>
                        <button className="btn btn-secondary btn-sm" onClick={() => setEditingQuizQuestions(qz)} title="Sửa câu hỏi">
                          📝
                        </button>
                        <button 
                          className="btn btn-secondary btn-sm" 
                          onClick={() => handleExport(qz._id)}
                          title="Xuất bảng điểm (Excel)"
                        >
                          📊
                        </button>
                        <button 
                          className="btn btn-danger btn-sm" 
                          onClick={async () => {
                            if (window.confirm(`Bạn có chắc chắn muốn xóa Quiz "${qz.title}" không?`)) {
                              try {
                                await api.delete(`/quizzes/${qz._id}`);
                                setQuizzes(prev => prev.filter(q => q._id !== qz._id));
                              } catch (err) {
                                console.error(err);
                                alert('Không thể xóa Quiz. Vui lòng thử lại.');
                              }
                            }
                          }} 
                          title="Xóa Quiz"
                        >
                          🗑️
                        </button>
                        <button className="btn btn-primary btn-sm" onClick={() => handleCreateLiveRoom(qz._id)}>
                          ⚡ Tạo phòng Live
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>


        {/* Course info */}
        <div>
          <div className="card">
            <h3 style={{ marginBottom:'1rem' }}>Thông tin khóa học</h3>
            <div style={{ display:'flex', flexDirection:'column', gap:'0.75rem', fontSize:'0.875rem' }}>
              {[
                course.total_sessions ? ['📖 Số buổi học', `${course.total_sessions} buổi`] : null,
                course.schedule_days || course.start_time ? ['📅 Lịch học', `${course.schedule_days || ''} ${course.start_time && course.end_time ? `(${course.start_time} - ${course.end_time})` : course.start_time ? `(${course.start_time})` : ''}`.trim()] : null,
                ['📅 Bắt đầu', course.start_date ? new Date(course.start_date).toLocaleDateString('vi-VN') : '—'],
                ['📅 Kết thúc', course.end_date ? new Date(course.end_date).toLocaleDateString('vi-VN') : '—'],
                ['🎯 Hoàn thành', `${course.completion_threshold}% bài học`],
                ['🏆 Chứng chỉ', course.has_certificate ? 'Có' : 'Không'],
              ].filter(Boolean).map(([label, val]) => (
                <div key={label} style={{ display:'flex', justifyContent:'space-between', borderBottom:'1px solid var(--border)', paddingBottom:'0.5rem' }}>
                  <span style={{ color:'var(--text-3)' }}>{label}</span>
                  <span style={{ fontWeight:600 }}>{val}</span>
                </div>
              ))}
            </div>
            <button className="btn btn-primary" onClick={handleStartLearning} style={{ width:'100%', justifyContent:'center', marginTop:'1.5rem' }}>
              🚀 Bắt đầu học
            </button>
          </div>

          <div className="card" style={{ marginTop: '1.5rem' }}>
            <h3 style={{ marginBottom: '1rem' }}>Lịch trình chi tiết</h3>
            {sessions.length > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '8px' }}>
                {sessions.map((d, i) => {
                  const today = new Date();
                  today.setHours(0,0,0,0);
                  const dStart = new Date(d);
                  dStart.setHours(0,0,0,0);
                  const isPast = dStart < today;
                  const isToday = dStart.getTime() === today.getTime();
                  return (
                    <div key={i} style={{
                        padding: '8px', borderRadius: '8px', 
                        border: `1px solid ${isToday ? 'var(--primary)' : 'var(--border)'}`,
                        background: isPast ? 'var(--bg-3)' : isToday ? 'rgba(108,99,255,0.1)' : 'var(--bg-2)',
                        color: isPast ? 'var(--text-3)' : 'var(--text)',
                        textAlign: 'center', fontSize: '0.8rem'
                    }}>
                      <div style={{ fontWeight: 600, marginBottom: 2 }}>Buổi {i+1}</div>
                      <div>{d.toLocaleDateString('vi-VN')}</div>
                      {course.start_time && <div style={{ fontSize: '0.7rem', color:'var(--text-3)' }}>{course.start_time}</div>}
                    </div>
                  )
                })}
              </div>
            ) : (
              <p style={{ fontSize: '0.875rem', color: 'var(--text-3)' }}>Chưa có thông tin lịch học cụ thể.</p>
            )}
          </div>
        </div>
      </div>

      {/* Lesson Player Modal */}
      {selectedLesson && (
        <div style={{ position:'fixed', top:0, left:0, right:0, bottom:0, background:'rgba(0,0,0,0.85)', zIndex:9999, display:'flex', flexDirection:'column' }}>
          <div style={{ padding:'1.5rem', display:'flex', justifyContent:'space-between', alignItems:'center', color:'white', borderBottom:'1px solid rgba(255,255,255,0.1)' }}>
            <h2 style={{ margin:0, fontSize:'1.25rem' }}>{contentTypeIcon[selectedLesson.content_type]} {selectedLesson.title}</h2>
            <button onClick={() => setSelectedLesson(null)} style={{ background:'transparent', border:'none', color:'white', fontSize:'2rem', cursor:'pointer', lineHeight:1 }}>&times;</button>
          </div>
          <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', padding:'2rem' }}>
            {selectedLesson.content_type === 'VIDEO' || selectedLesson.content_type === 'EMBED' ? (
              <MediaRenderer 
                url={selectedLesson.content} 
                type={selectedLesson.content_type === 'VIDEO' ? 'VIDEO' : 'EMBED'} 
                style={{ width:'100%', maxWidth:'1000px', height: selectedLesson.content_type === 'EMBED' ? '80vh' : 'auto', maxHeight:'80vh' }}
              />
            ) : (
              <div style={{ background:'var(--bg)', color:'var(--text)', padding:'3rem', borderRadius:8, maxWidth:'800px', width:'100%', boxShadow:'0 10px 30px rgba(0,0,0,0.5)' }}>
                <h3 style={{ marginBottom:'1rem' }}>Tài liệu bài học</h3>
                <div style={{ minHeight:'150px', background:'var(--bg-2)', padding:'1.5rem', borderRadius:8, marginBottom:'1.5rem' }}>
                  <p>{selectedLesson.content || 'Không có mô tả nội dung.'}</p>
                </div>
                {selectedLesson.resource_key && (
                  <a 
                    href={`http://localhost:3001/uploads/lessons/${selectedLesson.resource_key}`} 
                    target="_blank" 
                    rel="noreferrer" 
                    className="btn btn-primary"
                  >
                    ⬇️ Tải xuống tài liệu đính kèm
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
      )}
      {/* Quiz Modal */}
      {quizModal && (
        <CrudModal
          title={quizModal === 'create' ? 'Tạo câu đố mới' : `Sửa: ${quizModal.title}`}
          fields={QUIZ_FIELDS}
          initialData={quizModal === 'create' ? null : quizModal}
          onSubmit={handleQuizSubmit}
          onClose={() => setQuizModal(null)}
        />
      )}
      {/* Chapter Modal */}
      {chapterModal && (
        <CrudModal
          title={chapterModal === 'create' ? 'Tạo chương mới' : `Sửa chương: ${chapterModal.title}`}
          fields={CHAPTER_FIELDS}
          initialData={chapterModal === 'create' ? null : chapterModal}
          onSubmit={handleChapterSubmit}
          onClose={() => setChapterModal(null)}
        />
      )}
      {/* Lesson Modal */}
      {lessonModal && (
        <CrudModal
          title={lessonModal.mode === 'create' ? 'Thêm bài học mới' : `Sửa bài học: ${lessonModal.lesson?.title}`}
          fields={LESSON_FIELDS}
          initialData={lessonModal.mode === 'create' ? null : lessonModal.lesson}
          onSubmit={handleLessonSubmit}
          onClose={() => setLessonModal(null)}
        />
      )}
      {/* Question Editor Overlay */}

      {editingQuizQuestions && (
        <QuizQuestionEditor
          quiz={editingQuizQuestions}
          onSave={handleQuizSubmit}
          onCancel={() => setEditingQuizQuestions(null)}
        />
      )}
    </Layout>
  )
}
