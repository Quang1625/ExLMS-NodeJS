import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import api from '../api/axios';
import QuizNavbar from '../components/QuizNavbar';

export default function QuizLobby() {
  const { user } = useAuth();
  const { socket } = useSocket();
  const navigate = useNavigate();

  const [roomCode, setRoomCode] = useState('');
  const [error, setError] = useState('');
  const [joined, setJoined] = useState(false);
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(false);

  const joinRoom = async () => {
    if (!roomCode) return;
    setLoading(true);
    setError('');
    try {
      const { data: room } = await api.get(`/quiz-rooms/${roomCode}`);
      if (room) {
        if (socket) {
          socket.emit('quiz:join_room', {
            roomCode: roomCode.toUpperCase(),
            userId: user?._id,
            name: user?.full_name || 'Anonymous',
          });
        }
        setJoined(true);
      }
    } catch (err) {
      setError('Mã phòng không hợp lệ hoặc phòng đã đóng.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!socket) return;

    const handlePlayerJoined = (updatedPlayers) => {
      setPlayers(updatedPlayers);
    };

    const handleQuizStarted = ({ questionIndex, timeLimit }) => {
      navigate(`/quiz/play/${roomCode}`, { state: { questionIndex, timeLimit } });
    };

    socket.on('quiz:player_joined', handlePlayerJoined);
    socket.on('quiz:started', handleQuizStarted);

    return () => {
      socket.off('quiz:player_joined', handlePlayerJoined);
      socket.off('quiz:started', handleQuizStarted);
    };
  }, [roomCode, navigate, socket]);

  if (!joined) {
    return (
      <div className="quiz-page-bg" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <QuizNavbar />
        <div className="quiz-container glass-card">
          <h1 style={{ fontSize: '3.5rem', fontWeight: 900, marginBottom: '0.5rem', background: 'linear-gradient(to right, #fff, #888)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            THAM GIA QUYẾT ĐẤU
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.6)', marginBottom: '2rem', fontSize: '1.2rem' }}>Nhập mã phòng từ giảng viên để bắt đầu</p>

          <input
            type="text"
            placeholder="MÃ PHÒNG"
            className="room-input"
            value={roomCode}
            onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
            maxLength={6}
          />

          {error && <p style={{ color: '#ff4b2b', marginBottom: '1.5rem', fontWeight: 600 }}>{error}</p>}

          <button
            className="btn btn-primary"
            style={{ width: '100%', padding: '1.25rem', fontSize: '1.5rem', borderRadius: '20px', backgroundColor: '#6c63ff', border: 'none', boxShadow: '0 10px 20px rgba(108,99,255,0.3)', cursor: 'pointer' }}
            onClick={joinRoom}
            disabled={loading}
          >
            {loading ? 'Đang vào...' : 'VÀO PHÒNG NGAY 🚀'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="quiz-page-bg" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <QuizNavbar />
      <div className="quiz-container glass-card">
        <h1 style={{ fontSize: '3rem', fontWeight: 900, marginBottom: '2rem', color: 'white' }}>
          PHÒNG CHỜ: <span style={{ color: 'var(--primary)', textShadow: '0 0 20px rgba(108,99,255,0.5)' }}>{roomCode}</span>
        </h1>
        <div className="players-list" style={{ textAlign: 'left', background: 'rgba(0,0,0,0.2)', padding: '2rem', borderRadius: '24px', marginBottom: '2rem' }}>
          <h3 style={{ color: 'rgba(255,255,255,0.8)', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between' }}>
            <span>Người chơi đã tham gia</span>
            <span>{players.length} 👤</span>
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '1rem' }}>
            {players.map((p, i) => (
              <div key={i} style={{ background: 'rgba(255,255,255,0.1)', padding: '0.75rem 1rem', borderRadius: '100px', textAlign: 'center', fontWeight: 600 }}>
                {p.name} {p.user_id === user?._id && '(Bạn)'}
              </div>
            ))}
          </div>
        </div>
        <div className="pulse" style={{ fontSize: '1.2rem', color: 'var(--primary)', fontWeight: 700 }}>
          🔥 Đang chờ giảng viên bắt đầu trận đấu...
        </div>
      </div>
    </div>
  );
}
