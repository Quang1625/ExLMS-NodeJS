import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import api from '../api/axios'
import { useAuth } from '../context/AuthContext'

export default function Exams() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [exams, setExams] = useState([])
  const [attempts, setAttempts] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchExams = async () => {
      try {
        const [examRes, attemptRes] = await Promise.all([
          api.get('/quizzes?quiz_type=EXAM'),
          api.get('/quizzes/my-attempts')
        ]);
        
        setExams(examRes.data);
        
        // Map best attempts to quiz_id
        const attemptMap = {};
        attemptRes.data.forEach(a => {
          const qId = a.quiz_id?._id || a.quiz_id;
          if (!attemptMap[qId] || a.score > attemptMap[qId].score) {
            attemptMap[qId] = a;
          }
        });
        setAttempts(attemptMap);
      } catch (err) {
        console.error('Error fetching exams:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchExams()
  }, [])

  const handleStartExam = (exam) => {
    const myAttempt = attempts[exam._id];
    const reachLimit = exam.max_attempts > 0 && (myAttempt ? 1 : 0) >= exam.max_attempts; // Basic check, better handled by backend but for UI:
    
    if (reachLimit) {
      alert('Bạn đã hết lượt làm bài cho kỳ thi này!');
      return;
    }

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
        <div className="empty-state fade-in">
          <div className="empty-state__icon">📋</div>
          <h3>Không có bài kiểm tra nào</h3>
          <p>Hiện tại không có bài kiểm tra nào được chỉ định cho bạn.</p>
        </div>
      ) : (
        <div className="grid-auto fade-in" style={{ gap: '2rem' }}>
          {exams.map(exam => {
            const myAttempt = attempts[exam._id];
            const hasStarted = !!myAttempt;
            const reachLimit = exam.max_attempts > 0 && (myAttempt ? 1 : 0) >= exam.max_attempts;

            return (
              <div key={exam._id} className="glass-card-hover" style={{ padding: '0', display: 'flex', flexDirection: 'column', opacity: reachLimit ? 0.85 : 1 }}>
                <div style={{ padding: '2rem', flex: 1, position: 'relative' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1.5rem' }}>
                    <div style={{ width: '48px', height: '48px', background: 'rgba(239, 68, 68, 0.15)', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>
                      📝
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      {hasStarted && (
                        <span className={`status-badge ${myAttempt.is_passed ? 'status-badge--success' : 'status-badge--danger'}`}>
                          {myAttempt.is_passed ? 'ĐẠT' : 'CHƯA ĐẠT'}
                        </span>
                      )}
                      <span className="status-badge status-badge--danger">EXAM</span>
                    </div>
                  </div>

                  <h3 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.5rem', color: '#fff', lineHeight: 1.3 }}>{exam.title}</h3>
                  <p style={{ color: 'var(--text-3)', fontWeight: 600, fontSize: '0.9rem', marginBottom: '1.5rem' }}>{exam.course_id?.title}</p>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                    <div style={{ background: 'var(--bg-3)', padding: '12px 16px', borderRadius: '16px', border: '1px solid var(--border)' }}>
                      <div style={{ fontSize: '0.65rem', color: 'var(--text-3)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '4px' }}>KẾT QUẢ</div>
                      <div style={{ fontSize: '1.1rem', fontWeight: 800, color: hasStarted ? 'var(--primary-2)' : '#fff' }}>
                        {hasStarted ? `${myAttempt.score}%` : '—'}
                      </div>
                    </div>
                    <div style={{ background: 'var(--bg-3)', padding: '12px 16px', borderRadius: '16px', border: '1px solid var(--border)' }}>
                      <div style={{ fontSize: '0.65rem', color: 'var(--text-3)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '4px' }}>LƯỢT LÀM</div>
                      <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fff' }}>
                        {hasStarted ? '1' : '0'}/{exam.max_attempts || '∞'}
                      </div>
                    </div>
                  </div>
                </div>

                <div style={{ padding: '1.5rem', borderTop: '1px solid var(--border)', background: reachLimit ? 'transparent' : 'rgba(255,255,255,0.02)' }}>
                  <button 
                    className={`btn ${reachLimit ? 'btn-secondary' : 'btn-primary'}`}
                    style={{ width: '100%', justifyContent: 'center', padding: reachLimit ? '0.75rem' : '1rem', borderRadius: '14px', fontWeight: 700, fontSize: reachLimit ? '0.9rem' : '1rem' }}
                    onClick={() => handleStartExam(exam)}
                    disabled={reachLimit}
                  >
                    {reachLimit ? 'Đã hoàn thành bài thi' : 'Bắt đầu làm bài'}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </Layout>
  )
}
