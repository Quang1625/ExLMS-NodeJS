import React, { useState, useEffect } from 'react';
import { LiveKitRoom, VideoConference, RoomAudioRenderer } from '@livekit/components-react';
import '@livekit/components-styles';
import axios from '../api/axios';

export default function GroupMeeting({ group, user }) {
  const [token, setToken] = useState('');
  const [serverUrl, setServerUrl] = useState('');
  const [error, setError] = useState('');
  
  const [activeMeeting, setActiveMeeting] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const canManage = user?.role === 'ADMIN' || user?.role === 'INSTRUCTOR';

  // Join form state
  const [roomCode, setRoomCode] = useState('');
  const [isJoining, setIsJoining] = useState(false);

  // Create form state
  const [title, setTitle] = useState(`Phòng họp: ${group?.name}`);
  const [duration, setDuration] = useState(60);
  const [createRoomCode, setCreateRoomCode] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [createdRoomCode, setCreatedRoomCode] = useState(null);

  const fetchActiveMeeting = async () => {
    try {
      const res = await axios.get(`/meetings?group_id=${group._id}&status=SCHEDULED`);
      if (res.data && res.data.length > 0) {
        // Assume the first one is the active one
        setActiveMeeting(res.data[0]);
      } else {
        setActiveMeeting(null);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActiveMeeting();
  }, [group]);

  useEffect(() => {
    // Auto-join for Admin/Instructor if there is an active meeting
    if (activeMeeting && canManage && !token) {
      handleJoin();
    }
  }, [activeMeeting, canManage]);

  const handleCreateMeeting = async (e) => {
    e.preventDefault();
    setIsCreating(true);
    try {
      const res = await axios.post('/meetings', {
        group_id: group._id,
        title,
        meeting_type: 'VIDEO_CONFERENCE',
        start_at: new Date(),
        duration_minutes: duration,
        room_code: createRoomCode
      });
      setCreatedRoomCode(res.data.room_code);
      setActiveMeeting(res.data);
    } catch (err) {
      alert('Lỗi tạo phòng: ' + (err.response?.data?.error || err.message));
    } finally {
      setIsCreating(false);
    }
  };

  const handleJoin = async (e) => {
    if (e) e.preventDefault();
    setError('');
    setIsJoining(true);
    try {
      const res = await axios.post(`/meetings/${activeMeeting._id}/join`, {
        room_code: roomCode,
        roomName: activeMeeting._id,
        participantName: user?.full_name || 'Thành viên'
      });
      setToken(res.data.token);
      setServerUrl(res.data.serverUrl || import.meta.env.VITE_LIVEKIT_URL);
    } catch (err) {
      setError(err.response?.data?.error || 'Lỗi kết nối phòng họp.');
    } finally {
      setIsJoining(false);
    }
  };

  if (loading) {
    return <div className="spinner-wrap"><div className="spinner"></div></div>;
  }

  // 1. LiveKit Room UI (If already joined)
  if (token && serverUrl) {
    return (
      <div style={{ position: 'relative', borderRadius: '24px', overflow: 'hidden', background: 'var(--bg)', height: '700px', border: '1px solid rgba(255,255,255,0.05)', boxShadow: 'var(--shadow-lg)' }}>
        <div style={{
          position: 'absolute', top: '16px', left: '24px', zIndex: 10,
          display: 'flex', alignItems: 'center', gap: '12px',
          background: 'rgba(15, 17, 23, 0.6)', backdropFilter: 'blur(12px)',
          padding: '8px 16px', borderRadius: '99px', border: '1px solid rgba(255,255,255,0.08)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--danger)', boxShadow: '0 0 10px var(--danger)', animation: 'pulse 2s infinite' }}></div>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-2)' }}>Live</span>
          </div>
          <div style={{ width: '1px', height: '14px', background: 'var(--border)' }}></div>
          <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#fff' }}>{activeMeeting?.title || group?.name}</span>
        </div>

        <LiveKitRoom
          video={true}
          audio={true}
          token={token}
          serverUrl={serverUrl}
          data-lk-theme="default"
          style={{ height: '100%' }}
        >
          <VideoConference />
          <RoomAudioRenderer />
        </LiveKitRoom>
      </div>
    );
  }

  // 2. Admin successfully created meeting, show generated code before they join
  if (createdRoomCode && !token) {
    return (
      <div className="card" style={{ padding: '2rem', maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
        <h2 style={{ marginBottom: '1rem', color: 'var(--success)' }}>Phòng họp đã được tạo!</h2>
        <p style={{ marginBottom: '1rem', color: 'var(--text-2)' }}>Hãy gửi Mã Phòng này cho sinh viên để họ tham gia:</p>
        
        <div style={{ marginBottom: '1.5rem', background: 'var(--bg-3)', borderRadius: '12px', padding: '1.5rem' }}>
          <span style={{ fontSize: '2rem', fontFamily: 'monospace', color: 'var(--primary-2)', fontWeight: 700, letterSpacing: '0.1em' }}>
            {createdRoomCode}
          </span>
        </div>

        <button className="btn btn-primary w-100" onClick={handleJoin} disabled={isJoining} style={{ width: '100%', padding: '1rem', fontSize: '1.1rem' }}>
          {isJoining ? 'Đang vào phòng...' : 'Vào phòng ngay'}
        </button>
      </div>
    );
  }

  // 3. No active meeting -> Create Form for Admin, Empty State for Student
  if (!activeMeeting) {
    if (!canManage) {
      return (
        <div className="empty-state">
          <div className="empty-state__icon">📴</div>
          <h3>Không có phòng họp nào đang diễn ra</h3>
          <p>Giảng viên chưa bắt đầu phòng họp cho nhóm này.</p>
        </div>
      );
    }

    // Create Meeting Form
    return (
      <div className="card" style={{ maxWidth: '600px', margin: '0 auto', padding: '2rem' }}>
        <h2 style={{ marginBottom: '1.5rem' }}>Tạo Phòng Họp Mới</h2>
        <form onSubmit={handleCreateMeeting}>
          <div className="form-group">
            <label className="form-label">Tên phòng</label>
            <input className="form-input" required value={title} onChange={e => setTitle(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Thời lượng (phút)</label>
            <input className="form-input" type="number" required min="1" value={duration} onChange={e => setDuration(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Mã Phòng (Room Code)</label>
            <input 
              className="form-input" 
              required 
              placeholder="Ví dụ: MATH101"
              value={createRoomCode}
              onChange={e => setCreateRoomCode(e.target.value)}
              style={{ textTransform: 'uppercase', fontFamily: 'monospace', fontSize: '1.2rem', letterSpacing: '0.1em' }}
            />
            <p className="form-hint">Sinh viên sẽ cần nhập đúng Mã Phòng này để vào học.</p>
          </div>
          <button type="submit" className="btn btn-primary" disabled={isCreating} style={{ width: '100%' }}>
            {isCreating ? 'Đang tạo...' : 'Tạo phòng họp'}
          </button>
        </form>
      </div>
    );
  }

  // 4. Active meeting exists, Student needs to join
  return (
    <div className="auth-card" style={{ margin: '2rem auto' }}>
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔐</div>
        <h2>Tham Gia Phòng Họp</h2>
        <p style={{ color: 'var(--text-2)' }}>{activeMeeting.title}</p>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <form onSubmit={handleJoin}>
        <div className="form-group">
          <label className="form-label">Mã Phòng (Room Code)</label>
          <input 
            className="form-input" 
            required 
            placeholder="Nhập mã phòng do Giảng viên cung cấp..." 
            value={roomCode} 
            onChange={e => setRoomCode(e.target.value)} 
            style={{ textTransform: 'uppercase', fontFamily: 'monospace', fontSize: '1.2rem', letterSpacing: '0.1em' }}
          />
        </div>
        <button type="submit" className="btn btn-primary" disabled={isJoining} style={{ width: '100%', padding: '1rem', fontSize: '1.1rem' }}>
          {isJoining ? 'Đang xác thực...' : 'Vào Phòng'}
        </button>
      </form>
    </div>
  );
}
