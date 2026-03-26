import { useLocation, useNavigate, useParams } from 'react-router-dom'

export default function QuizResult() {
  const { code } = useParams()
  const { state } = useLocation()
  const navigate = useNavigate()
  const players = state?.players || []

  const sortedPlayers = [...players].sort((a, b) => b.score - a.score)
  const winners = sortedPlayers.slice(0, 3)

  return (
    <div className="quiz-page-bg">
      <div className="quiz-play-container glass-card" style={{ textAlign: 'center', margin: '2rem auto' }}>
        <h1 style={{ fontSize: '4rem', fontWeight: 900, marginBottom: '3rem', background: 'linear-gradient(to right, #ffd700, #fff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            BẢNG VÀNG VINH DANH 🏆
        </h1>

        <div className="podium" style={{ marginBottom: '4rem', display: 'flex', justifyContent: 'center', alignItems: 'flex-end', gap: '2rem' }}>
          {winners[1] && (
            <div className="podium-place second" style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🥈</div>
              <div style={{ background: 'rgba(255,255,255,0.1)', padding: '1rem 2rem', borderRadius: '12px 12px 0 0', fontWeight: 700, minWidth: '120px' }}>{winners[1].name}</div>
              <p style={{ fontWeight: 900, marginTop: '0.5rem' }}>{winners[1].score} pts</p>
            </div>
          )}
          {winners[0] && (
            <div className="podium-place first" style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>👑</div>
              <div style={{ background: 'rgba(255,215,0,0.2)', padding: '2rem 2.5rem', borderRadius: '12px 12px 0 0', fontWeight: 900, minWidth: '150px', border: '2px solid #ffd700', borderBottom: 'none' }}>{winners[0].name}</div>
              <p style={{ fontWeight: 900, marginTop: '0.5rem', fontSize: '1.5rem', color: '#ffd700' }}>{winners[0].score} pts</p>
            </div>
          )}
          {winners[2] && (
            <div className="podium-place third" style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>🥉</div>
              <div style={{ background: 'rgba(255,255,255,0.05)', padding: '0.75rem 1.5rem', borderRadius: '12px 12px 0 0', fontWeight: 700, minWidth: '100px' }}>{winners[2].name}</div>
              <p style={{ fontWeight: 900, marginTop: '0.5rem' }}>{winners[2].score} pts</p>
            </div>
          )}
        </div>

        <div className="leaderboard-full" style={{ background: 'rgba(0,0,0,0.2)', padding: '2rem', borderRadius: '32px', textAlign: 'left' }}>
          <h3 style={{ marginBottom: '1.5rem', color: 'rgba(255,255,255,0.7)', textAlign: 'center' }}>BẢNG XẾP HẠNG CHI TIẾT</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '1.2rem' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)' }}>
                <th style={{ padding: '1rem' }}>HẠNG</th>
                <th style={{ padding: '1rem', textAlign: 'left' }}>NGƯỜI CHƠI</th>
                <th style={{ padding: '1rem', textAlign: 'right' }}>ĐIỂM SỐ</th>
              </tr>
            </thead>
            <tbody>
              {sortedPlayers.map((p, i) => (
                <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', background: i === 0 ? 'rgba(255,215,0,0.05)' : 'transparent' }}>
                  <td style={{ padding: '1.25rem', fontWeight: 800, textAlign: 'center' }}>{i + 1}</td>
                  <td style={{ padding: '1.25rem', textAlign: 'left' }}>{p.name}</td>
                  <td style={{ padding: '1.25rem', textAlign: 'right', fontWeight: 900, color: '#6c63ff' }}>{p.score.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ marginTop: '3rem', display: 'flex', justifyContent: 'center', gap: '1rem' }}>
          <button 
            onClick={() => navigate('/courses')} 
            className="btn btn-secondary" 
            style={{ padding: '1.25rem 3rem', fontSize: '1.2rem', borderRadius: '100px', cursor: 'pointer' }}
          >
            Quay lại khóa học 📚
          </button>
          <button 
            onClick={() => navigate('/quiz/dashboard')} 
            className="btn btn-primary" 
            style={{ padding: '1.25rem 3rem', fontSize: '1.2rem', borderRadius: '100px', cursor: 'pointer', background: 'var(--primary)', border: 'none', color: 'white' }}
          >
            Về bảng điều khiển 📊
          </button>
        </div>
      </div>
    </div>
  )
}
