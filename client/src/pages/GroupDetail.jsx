import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import api from '../api/axios'

import { useAuth } from '../context/AuthContext'
import GroupMeeting from '../components/GroupMeeting'

export default function GroupDetail() {
  const { user } = useAuth()
  const canManage = user?.role === 'ADMIN' || user?.role === 'INSTRUCTOR'
  const { id } = useParams()
  const navigate = useNavigate()
  const [group, setGroup] = useState(null)
  const [feed, setFeed] = useState([])
  const [courses, setCourses] = useState([])
  const [assignments, setAssignments] = useState([])
  const [tab, setTab] = useState('feed')
  const [loading, setLoading] = useState(true)
  const [requests, setRequests] = useState([])

  const fetchGroupData = () => {
    setLoading(true)
    Promise.all([
      api.get(`/study-groups/${id}`),
      api.get(`/study-groups/${id}/feed`),
      api.get(`/courses?group_id=${id}`),
      api.get(`/assignments?group_id=${id}`),
      canManage ? api.get(`/study-groups/${id}/join-requests`).catch(() => ({ data: { data: [] } })) : Promise.resolve({ data: { data: [] } })
    ]).then(([g, f, c, a, r]) => {
      setGroup(g.data.data ?? g.data)
      setFeed(f.data.data ?? f.data)
      setCourses(c.data.data ?? c.data)
      setAssignments(a.data.data ?? a.data)
      setRequests(r.data.data ?? r.data)
    }).catch(() => navigate('/groups'))
    .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchGroupData()
  }, [id, canManage])

  const handleRequest = async (reqId, status) => {
    if (!window.confirm(`Bạn có chắc muốn ${status === 'APPROVED' ? 'duyệt' : 'từ chối'} yêu cầu này?`)) return
    try {
      await api.put(`/study-groups/${id}/join-requests/${reqId}`, { status })
      fetchGroupData()
    } catch (err) {
      alert(err?.response?.data?.error || 'Lỗi khi xử lý yêu cầu')
    }
  }

  if (loading) return <Layout><div className="spinner-wrap"><div className="spinner" /></div></Layout>
  if (!group) return null

  return (
    <Layout>
      <button className="btn btn-secondary btn-sm" style={{ marginBottom:'1.5rem' }} onClick={() => navigate('/groups')}>
        ← Quay lại
      </button>

      {/* Group header */}
      <div className="card" style={{ marginBottom:'1.5rem', background:'linear-gradient(135deg, rgba(108,99,255,0.1), rgba(0,212,255,0.05))' }}>
        <div style={{ display:'flex', alignItems:'start', gap:'1rem' }}>
          <div style={{ width:56, height:56, borderRadius:14, background:'linear-gradient(135deg, #6c63ff, #00d4ff)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.75rem', flexShrink:0 }}>
            👥
          </div>
          <div style={{ flex:1 }}>
            <h2>{group.name}</h2>
            <p style={{ fontSize:'0.875rem', marginTop:'0.25rem' }}>{group.description}</p>
            <div style={{ display:'flex', gap:'0.75rem', marginTop:'0.75rem', flexWrap:'wrap' }}>
              <span className="tag">{group.member_count} thành viên</span>
              <span className="tag tag--primary">{group.visibility === 'PUBLIC' ? '🌐 Công khai' : '🔒 Riêng tư'}</span>
              <span className="tag tag--success">{group.status}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', gap:'0.5rem', marginBottom:'1.5rem', borderBottom:'1px solid var(--border)', paddingBottom:'0', overflowX: 'auto' }}>
        {[
          ['feed','📰 Bảng tin'],
          ['courses', '📚 Khóa học'],
          ['assignments', '📝 Bài tập'],
          ['members','👥 Thành viên'],
          ['meeting', '📹 Phòng họp'],
          ...(canManage ? [['requests', `⏳ Yêu cầu (${requests.length})`]] : [])
        ].map(([key, label]) => (
          <button key={key}
            onClick={() => setTab(key)}
            style={{ padding:'0.625rem 1rem', fontSize:'0.875rem', fontWeight:600, color: tab===key ? 'var(--primary-2)' : 'var(--text-3)',
              borderBottom: tab===key ? '2px solid var(--primary)' : '2px solid transparent', background:'none', transition:'all 0.2s', whiteSpace: 'nowrap' }}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'feed' && (
        <div style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>
          {feed.length === 0 ? (
            <div className="empty-state"><div className="empty-state__icon">📭</div><h3>Chưa có bài đăng nào</h3></div>
          ) : feed.map(post => (
            <div className="post-card" key={post._id}>
              <div style={{ display:'flex', alignItems:'center', gap:'0.75rem', marginBottom:'0.75rem' }}>
                <div className="avatar" style={{ width:32, height:32, fontSize:'0.75rem' }}>
                  {post.author_id?.full_name?.charAt(0) || '?'}
                </div>
                <div>
                  <div style={{ fontSize:'0.875rem', fontWeight:600 }}>{post.author_id?.full_name}</div>
                  <div style={{ fontSize:'0.75rem', color:'var(--text-3)' }}>{new Date(post.created_at).toLocaleDateString('vi-VN')}</div>
                </div>
                {post.is_pinned && <span className="tag tag--primary" style={{ marginLeft:'auto' }}>📌 Ghim</span>}
              </div>
              <p style={{ fontSize:'0.9rem', color:'var(--text)', whiteSpace:'pre-wrap' }}>{post.content}</p>
              <div style={{ display:'flex', gap:'1rem', marginTop:'0.75rem', paddingTop:'0.75rem', borderTop:'1px solid var(--border)' }}>
                <span className="vote-btn">👍 {post.reaction_count}</span>
                <span className="vote-btn">💬 {post.comment_count}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'courses' && (
        <div className="grid-auto">
          {courses.length === 0 ? (
             <div className="empty-state" style={{ gridColumn: '1 / -1' }}><div className="empty-state__icon">📚</div><h3>Chưa có khóa học nào</h3></div>
          ) : courses.map(course => (
            <div key={course._id} className="course-card" onClick={() => navigate(`/courses/${course._id}`)}>
              <div className="course-card__thumb">
                📖
                <span className={`course-card__status tag ${course.status === 'PUBLISHED' ? 'tag--success' : 'tag--warning'}`}>
                  {course.status}
                </span>
              </div>
              <div className="course-card__body">
                <h3 className="course-card__title">{course.title}</h3>
                <div className="course-card__meta">
                  <span>👤 {course.created_by?.full_name}</span>
                  <span>📅 {new Date(course.created_at).toLocaleDateString('vi-VN')}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'assignments' && (
        <div style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>
          {assignments.length === 0 ? (
            <div className="empty-state"><div className="empty-state__icon">📝</div><h3>Chưa có bài tập nào</h3></div>
          ) : assignments.map(a => (
            <div key={a._id} className="card" style={{ display:'flex', alignItems:'center', gap:'1.5rem', cursor:'pointer' }} onClick={() => navigate(`/assignments/${a._id}`)}>
               <div style={{ width:48, height:48, borderRadius:12, background:'rgba(108,99,255,0.1)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.5rem', flexShrink:0 }}>
                📄
              </div>
              <div style={{ flex:1 }}>
                <h3 style={{ fontSize:'1rem', fontWeight:600 }}>{a.title}</h3>
                <div style={{ display:'flex', gap:'1rem', marginTop:'0.25rem', fontSize:'0.8rem', color:'var(--text-3)' }}>
                  <span>Hạn nộp: {new Date(a.due_at).toLocaleString('vi-VN')}</span>
                  <span>Điểm tối đa: {a.max_score}</span>
                </div>
              </div>
              <span className={`tag ${new Date() > new Date(a.due_at) ? 'tag--danger' : 'tag--primary'}`}>
                {new Date() > new Date(a.due_at) ? 'Đã hết hạn' : 'Đang mở'}
              </span>
            </div>
          ))}
        </div>
      )}

      {tab === 'members' && (
        <div style={{ display:'flex', flexDirection:'column', gap:'0.5rem' }}>
          {group.members?.map(m => (
            <div key={m._id} style={{ display:'flex', alignItems:'center', gap:'1rem', padding:'0.875rem', background:'var(--bg-2)', border:'1px solid var(--border)', borderRadius:'var(--radius-sm)' }}>
              <div className="avatar">{m.user_id?.full_name?.charAt(0) || '?'}</div>
              <div style={{ flex:1 }}>
                <div style={{ fontWeight:600, fontSize:'0.875rem' }}>{m.user_id?.full_name}</div>
                <div style={{ fontSize:'0.75rem', color:'var(--text-3)' }}>{m.user_id?.email}</div>
              </div>
              <span className={`tag ${m.role === 'OWNER' ? 'tag--primary' : ''}`}>{m.role}</span>
            </div>
          ))}
        </div>
      )}

      {tab === 'meeting' && (
        <div style={{ animation: 'fadeIn 0.3s ease' }}>
          <GroupMeeting group={group} user={user} />
        </div>
      )}

      {tab === 'requests' && canManage && (
        <div style={{ display:'flex', flexDirection:'column', gap:'0.5rem' }}>
          {requests.length === 0 ? (
            <div className="empty-state"><div className="empty-state__icon">✅</div><h3>Không có yêu cầu nào</h3></div>
          ) : requests.map(r => (
            <div key={r._id} style={{ display:'flex', alignItems:'center', gap:'1rem', padding:'1rem', background:'var(--bg-2)', border:'1px solid var(--border)', borderRadius:'var(--radius-sm)' }}>
              <div className="avatar">{r.user_id?.full_name?.charAt(0) || '?'}</div>
              <div style={{ flex:1 }}>
                <div style={{ fontWeight:600, fontSize:'0.875rem' }}>{r.user_id?.full_name}</div>
                <div style={{ fontSize:'0.75rem', color:'var(--text-3)' }}>{r.user_id?.email}</div>
                <div style={{ fontSize:'0.85rem', marginTop: 4, padding: 8, background: 'var(--bg-3)', borderRadius: 6 }}>
                  "{r.message || 'Không có lời nhắn'}"
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <button className="btn btn-primary btn-sm" onClick={() => handleRequest(r._id, 'APPROVED')}>Duyệt</button>
                <button className="btn btn-danger btn-sm" onClick={() => handleRequest(r._id, 'REJECTED')}>Từ chối</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </Layout>
  )
}
