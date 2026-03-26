import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'

import { useAuth } from '../context/AuthContext'
import { useSocket } from '../context/SocketContext'
import api from '../api/axios'
import QuizNavbar from '../components/QuizNavbar'

export default function QuizHost() {
  const { code } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { socket } = useSocket()

  const [room, setRoom] = useState(null)
  const [players, setPlayers] = useState([])
  const [status, setStatus] = useState('LOBBY')

  useEffect(() => {
    const fetchRoom = async () => {
      try {
        const { data } = await api.get(`/quiz-rooms/${code}`)
        setRoom(data)
        setPlayers(data.players)
        setStatus(data.status)

        if (socket) {
          socket.emit('quiz:join_room', { roomCode: code, userId: user?._id, name: user?.full_name })
        }
      } catch (err) {
        console.error(err)
      }
    }
    fetchRoom()

    if (!socket) return

    socket.on('quiz:player_joined', (updatedPlayers) => {
      setPlayers(updatedPlayers)
    })

    socket.on('quiz:update_leaderboard', (updatedPlayers) => {
      setPlayers(updatedPlayers)
    })

    return () => {
      socket.off('quiz:player_joined')
      socket.off('quiz:update_leaderboard')
    }
  }, [code, user, socket])

  const startQuiz = () => {
    if (socket) {
      socket.emit('quiz:host_start', { roomCode: code })
      setStatus('IN_PROGRESS')
    }
  }

  const nextQuestion = () => {
    if (socket) {
      socket.emit('quiz:host_next_question', { roomCode: code })
    }
  }

  if (!room) return <div className="quiz-page-bg" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}><h1>Đang tải đấu trường...</h1></div>

  return (
    <div className="quiz-page-bg">
      <QuizNavbar />
      <div className="quiz-play-container">
        <header className="quiz-header" style={{ marginBottom: '2rem' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.5rem', opacity: 0.8 }}>Quản lý Quiz:</h1>
            <h2 style={{ margin: 0, fontSize: '2.5rem', fontWeight: 900 }}>{room.quiz_id.title}</h2>
          </div>
          <div className="glass-card" style={{ padding: '1rem 2rem', borderRadius: '20px', textAlign: 'center', border: '2px solid var(--primary)' }}>
            <div style={{ fontSize: '0.8rem', opacity: 0.7, textTransform: 'uppercase' }}>Mã phòng</div>
            <div style={{ fontSize: '2.5rem', fontWeight: 900, letterSpacing: '0.1em', color: 'var(--primary)' }}>{code}</div>
          </div>
        </header>

        {status === 'LOBBY' && (
          <div className="glass-card" style={{ textAlign: 'center' }}>
            <h2 style={{ fontSize: '2rem', marginBottom: '2rem' }}>🔥 Người chơi đang chờ ({players.length})</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '1rem', marginBottom: '3rem' }}>
              {players.map((p, i) => (
                <div key={i} style={{ background: 'rgba(255,255,255,0.1)', padding: '1rem', borderRadius: '100px', fontWeight: 600 }}>
                  {p.name}
                </div>
              ))}
              {players.length === 0 && <p style={{ gridColumn: '1/-1', opacity: 0.5 }}>Đang chờ các chiến binh gia nhập...</p>}
            </div>
            <button
              onClick={startQuiz}
              className="btn btn-primary"
              style={{ padding: '1.5rem 4rem', fontSize: '1.5rem', borderRadius: '100px', background: 'linear-gradient(to right, #6c63ff, #38ef7d)', border: 'none', cursor: 'pointer', boxShadow: '0 10px 30px rgba(108,99,255,0.4)' }}
              disabled={players.length === 0}
            >
              BẮT ĐẦU TRẬN ĐẤU 🚀
            </button>
          </div>
        )}

        {status === 'IN_PROGRESS' && (
          <div className="glass-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
              <h2 style={{ margin: 0 }}>📊 Theo dõi trực tiếp</h2>
              <button
                onClick={nextQuestion}
                className="btn btn-primary"
                style={{ padding: '1rem 2rem', borderRadius: '100px', background: '#ff4b2b', border: 'none', fontWeight: 700, cursor: 'pointer' }}
              >
                CÂU HỎI TIẾP THEO / KẾT THÚC ➡️
              </button>
            </div>

            <div style={{ background: 'rgba(0,0,0,0.2)', padding: '2rem', borderRadius: '24px' }}>
              <h3 style={{ marginBottom: '1.5rem', opacity: 0.7 }}>BẢNG XẾP HẠNG THỜI GIAN THỰC</h3>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)' }}>
                    <th style={{ padding: '1rem', textAlign: 'left' }}>HẠNG</th>
                    <th style={{ padding: '1rem', textAlign: 'left' }}>CHIẾN BINH</th>
                    <th style={{ padding: '1rem', textAlign: 'right' }}>ĐIỂM SỐ</th>
                  </tr>
                </thead>
                <tbody>
                  {[...players].sort((a, b) => b.score - a.score).map((p, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <td style={{ padding: '1rem', fontWeight: 800 }}>{i + 1}</td>
                      <td style={{ padding: '1rem' }}>{p.name}</td>
                      <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 900, color: 'var(--primary)' }}>{p.score}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {status === 'FINISHED' && (
          <div className="glass-card" style={{ textAlign: 'center' }}>
            <h2 style={{ fontSize: '3rem', marginBottom: '2rem' }}>🏁 TRẬN ĐẤU KẾT THÚC</h2>
            <p style={{ fontSize: '1.5rem', marginBottom: '3rem', opacity: 0.7 }}>Kết quả đã được gửi tới tất cả người chơi.</p>
            <button
              onClick={() => navigate('/courses')}
              className="btn btn-secondary"
              style={{ padding: '1rem 3rem', borderRadius: '100px', cursor: 'pointer' }}
            >
              Quay lại danh sách khóa học
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
