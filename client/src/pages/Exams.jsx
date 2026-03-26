import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import api from '../api/axios'
import { useAuth } from '../context/AuthContext'

export default function Exams() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [exams, setExams] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchExams = async () => {
      try {
        const { data } = await api.get('/quizzes?quiz_type=EXAM')
        setExams(data)
      } catch (err) {
        console.error('Error fetching exams:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchExams()
  }, [])

  const handleStartExam = (exam) => {
    if (exam.access_code) {
      const code = prompt('Vui lòng nhập Mã phòng thi để bắt đầu:');
      if (code === null) return; // Cancelled
      if (code.toUpperCase() !== exam.access_code.toUpperCase()) {
        alert('Mã phòng thi không chính xác!');
        return;
      }
    }
    navigate(`/quiz/${exam._id}`);
  };

  return (
    <Layout>
      <div className="page-header">
        <h1>Bài kiểm tra 📋</h1>
        <p>Danh sách các bài kiểm tra và thi học kỳ dành cho bạn</p>
      </div>

      {loading ? (
        <div className="spinner-wrap"><div className="spinner" /></div>
      ) : exams.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state__icon">📋</div>
          <h3>Không có bài kiểm tra nào</h3>
          <p>Hiện tại không có bài kiểm tra nào được chỉ định cho bạn.</p>
        </div>
      ) : (
        <div className="grid-2">
          {exams.map(exam => (
            <div key={exam._id} className="card glass-card" style={{ padding: '2rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1.5rem' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.4rem' }}>{exam.title}</h3>
                  <p style={{ color: 'var(--text-3)', margin: '4px 0' }}>{exam.course_id?.title}</p>
                </div>
                <span className="tag tag--danger">EXAM</span>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '2rem' }}>
                <div style={{ background: 'var(--bg-3)', padding: '1rem', borderRadius: '12px' }}>
                  <div style={{ fontSize: '0.75rem', opacity: 0.7 }}>CÂU HỎI</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 700 }}>{exam.questions?.length || 0}</div>
                </div>
                <div style={{ background: 'var(--bg-3)', padding: '1rem', borderRadius: '12px' }}>
                  <div style={{ fontSize: '0.75rem', opacity: 0.7 }}>THỜI GIAN</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 700 }}>{exam.time_limit_sec ? `${Math.floor(exam.time_limit_sec / 60)}p` : '∞'}</div>
                </div>
              </div>

              <button 
                className="btn btn-primary" 
                style={{ width: '100%', justifyContent: 'center', padding: '1rem' }}
                onClick={() => handleStartExam(exam)}
              >
                📝 Bắt đầu làm bài
              </button>
            </div>
          ))}
        </div>
      )}
    </Layout>
  )
}
