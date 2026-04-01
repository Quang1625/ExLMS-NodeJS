import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import api from '../api/axios';
import QuizNavbar from '../components/QuizNavbar';

export default function QuizLobby() {
  const { t } = useTranslation();
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
      setError(t('quiz.invalid_code'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!socket) return;
    const handlePlayerJoined = (updatedPlayers) => setPlayers(updatedPlayers);
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
        <div className="quiz-container glass-card" style={{ position: 'relative', overflow: 'hidden' }}>
          {/* Decorative orbs */}
          <div style={{
            position: 'absolute', top: '-60px', right: '-60px',
            width: '180px', height: '180px', borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(108,99,255,0.15), transparent)',
            pointerEvents: 'none'
          }} />
          <div style={{
            position: 'absolute', bottom: '-40px', left: '-40px',
            width: '140px', height: '140px', borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(0,212,255,0.1), transparent)',
            pointerEvents: 'none'
          }} />

          <div style={{ fontSize: '3.5rem', marginBottom: '0.5rem' }}>⚡</div>
          <h1 className="gradient-text" style={{ fontSize: '2.5rem', fontWeight: 900, marginBottom: '0.5rem' }}>
            {t('quiz.join_title')}
          </h1>
          <p style={{ color: 'var(--text-2)', marginBottom: '2rem', fontSize: '1.05rem' }}>
            {t('quiz.join_subtitle')}
          </p>

          <input
            type="text"
            placeholder={t('quiz.room_code_placeholder')}
            className="room-input"
            value={roomCode}
            onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
            maxLength={6}
          />

          {error && (
            <p style={{ color: 'var(--danger)', marginBottom: '1.5rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center' }}>
              ⚠️ {error}
            </p>
          )}

          <button
            className="btn btn-primary btn-lg"
            style={{
              width: '100%', padding: '1.1rem', fontSize: '1.3rem',
              borderRadius: '16px', justifyContent: 'center'
            }}
            onClick={joinRoom}
            disabled={loading}
          >
            {loading ? t('quiz.joining') : t('quiz.join_btn')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="quiz-page-bg" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <QuizNavbar />
      <div className="quiz-container glass-card" style={{ position: 'relative', overflow: 'hidden' }}>
        {/* Decorative */}
        <div style={{
          position: 'absolute', top: '-50px', right: '-50px',
          width: '150px', height: '150px', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(108,99,255,0.12), transparent)',
          pointerEvents: 'none'
        }} />

        <h1 style={{ fontSize: '2.2rem', fontWeight: 900, marginBottom: '0.5rem' }}>
          {t('quiz.lobby_label')}
        </h1>
        <div style={{
          display: 'inline-block', padding: '0.5rem 1.5rem',
          background: 'rgba(108,99,255,0.12)', borderRadius: '12px',
          fontSize: '1.5rem', fontWeight: 900, color: 'var(--primary-2)',
          letterSpacing: '0.15em', marginBottom: '2rem',
          border: '1px solid rgba(108,99,255,0.2)'
        }}>
          {roomCode}
        </div>

        <div style={{
          textAlign: 'left',
          background: 'var(--glass)',
          border: '1px solid var(--border)',
          padding: '1.5rem',
          borderRadius: '20px',
          marginBottom: '1.5rem'
        }}>
          <h3 style={{ color: 'var(--text-2)', marginBottom: '1.25rem', display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', fontWeight: 700 }}>
            <span>{t('quiz.players_joined')}</span>
            <span style={{ color: 'var(--primary-2)' }}>{players.length} 👤</span>
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '0.75rem' }}>
            {players.map((p, i) => (
              <div key={i} style={{
                background: p.user_id === user?._id ? 'rgba(108,99,255,0.12)' : 'var(--bg-3)',
                border: p.user_id === user?._id ? '1px solid rgba(108,99,255,0.3)' : '1px solid var(--border)',
                padding: '0.65rem 1rem',
                borderRadius: '12px',
                textAlign: 'center',
                fontWeight: 600,
                fontSize: '0.85rem',
                transition: 'all 0.2s ease'
              }}>
                {p.name} {p.user_id === user?._id && <span style={{ color: 'var(--primary-2)', fontSize: '0.75rem' }}>{t('quiz.you')}</span>}
              </div>
            ))}
          </div>
        </div>

        <div style={{
          fontSize: '1rem', color: 'var(--primary-2)', fontWeight: 700,
          animation: 'pulse 2s ease infinite',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem'
        }}>
          {t('quiz.waiting_for_host')}
        </div>
      </div>
    </div>
  );
}
