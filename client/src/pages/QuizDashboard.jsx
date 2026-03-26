import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import api from '../api/axios'
import { useAuth } from '../context/AuthContext'

export default function QuizDashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [history, setHistory] = useState([])
  const [attempts, setAttempts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [historyRes, attemptsRes] = await Promise.all([
          api.get('/quiz-rooms/my-history'),
          api.get('/quizzes/my-attempts')
        ])
        setHistory(historyRes.data)
        setAttempts(attemptsRes.data)
      } catch (err) {
        console.error('Error fetching quiz data:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const stats = {
    totalSessions: history.length + attempts.length,
    avgScore: Math.round(
      ([...history.flatMap(h => h.players.filter(p => p.user_id === user._id)), ...attempts]
        .reduce((acc, curr) => acc + (curr.score || 0), 0) / 
        (history.filter(h => h.players.some(p => p.user_id === user._id)).length + attempts.length || 1))
    ) || 0,
    hostedCount: history.filter(h => h.host_id._id === user._id).length
  }

  const handleExport = async (quizId) => {
    if (!quizId) {
      alert('Quiz này đã bị xóa, không thể xuất bảng điểm.')
      return
    }
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

  if (loading) {
    return (
      <Layout>
        <div className="spinner-wrap"><div className="spinner" /></div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="page-header">
        <h1>Bảng điều khiển Quiz ⚡</h1>
        <p>Theo dõi tiến độ và lịch sử tham gia Quiz của bạn</p>
      </div>

      <div className="stat-grid" style={{ marginBottom: '2rem' }}>
        <div className="stat-card">
          <div className="stat-card__icon" style={{ background: 'rgba(108,99,255,0.1)', color: '#6c63ff' }}>📊</div>
          <div>
            <div className="stat-card__value">{stats.totalSessions}</div>
            <div className="stat-card__label">Tổng lượt tham gia</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card__icon" style={{ background: 'rgba(56,239,125,0.1)', color: '#38ef7d' }}>🎯</div>
          <div>
            <div className="stat-card__value">{stats.avgScore}%</div>
            <div className="stat-card__label">Điểm trung bình</div>
          </div>
        </div>
        {user.role !== 'STUDENT' && (
          <div className="stat-card">
            <div className="stat-card__icon" style={{ background: 'rgba(255,107,107,0.1)', color: '#ff6b67' }}>👨‍🏫</div>
            <div>
              <div className="stat-card__value">{stats.hostedCount}</div>
              <div className="stat-card__label">Trận đã tổ chức</div>
            </div>
          </div>
        )}
      </div>

      <div className="grid-2">
        {/* Real-time Sessions */}
        <div className="card">
          <h2 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span>🕒</span> Lịch sử Quiz Real-time
          </h2>
          <div className="list-container">
            {history.length === 0 ? (
              <p style={{ opacity: 0.5, textAlign: 'center', padding: '2rem' }}>Chưa có lịch sử tham gia Quiz trực tiếp nào.</p>
            ) : history.map(room => {
              const myResult = room.players.find(p => p.user_id === user._id)
              const isHost = room.host_id._id === user._id

              return (
                <div key={room._id} className="list-item" style={{ padding: '1rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 600 }}>{room.quiz_id?.title || 'Quiz không xác định'}</div>
                    <div style={{ fontSize: '0.8rem', opacity: 0.7 }}>
                      Mã: {room.room_code} • {new Date(room.created_at).toLocaleDateString('vi-VN')}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    {isHost ? (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
                        <span className="tag tag--primary" style={{ fontSize: '0.7rem' }}>CHỦ PHÒNG</span>
                        {room.quiz_id?._id && (
                          <button 
                            className="btn btn-sm btn-secondary" 
                            onClick={() => handleExport(room.quiz_id._id)}
                            style={{ fontSize: '0.7rem', padding: '0.3rem 0.6rem' }}
                          >
                            📊 Xuất bảng điểm (Excel)
                          </button>
                        )}
                      </div>
                    ) : (
                      <div style={{ fontWeight: 800, color: 'var(--primary)' }}>{myResult?.score || 0} pts</div>
                    )}
                    <div style={{ fontSize: '0.7rem', opacity: 0.6, cursor: 'pointer', color: 'var(--primary)' }} onClick={() => navigate(`/quiz/result/${room.room_code}`, { state: { players: room.players } })}>
                      Xem chi tiết ➡️
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Quiz Attempts */}
        <div className="card">
          <h2 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span>📝</span> Kết quả bài tập Quiz
          </h2>
          <div className="list-container">
            {attempts.length === 0 ? (
              <p style={{ opacity: 0.5, textAlign: 'center', padding: '2rem' }}>Chưa có lượt làm bài tập Quiz nào.</p>
            ) : attempts.map(attempt => (
              <div key={attempt._id} className="list-item" style={{ padding: '1rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 600 }}>{attempt.quiz_id?.title || 'Quiz không xác định'}</div>
                  <div style={{ fontSize: '0.8rem', opacity: 0.7 }}>
                    Lần thử: {attempt.attempt_number} • {new Date(attempt.submitted_at).toLocaleDateString('vi-VN')}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 800, color: attempt.is_passed ? '#38ef7d' : '#ff6b67' }}>
                    {attempt.score}%
                  </div>
                  <span className={`tag ${attempt.is_passed ? 'tag--success' : 'tag--danger'}`} style={{ fontSize: '0.6rem' }}>
                    {attempt.is_passed ? 'ĐẠT' : 'CHƯA ĐẠT'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  )
}
