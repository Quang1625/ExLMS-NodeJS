import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Layout from '../components/Layout'
import api from '../api/axios'

import { useAuth } from '../context/AuthContext'
import GroupMeeting from '../components/GroupMeeting'

export default function GroupDetail() {
  const { t, i18n } = useTranslation()
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

  const fetchGroupData = async () => {
    setLoading(true)
    try {
      // 1. Fetch Basic Info first (available to everyone)
      const gRes = await api.get(`/study-groups/${id}`)
      const g = gRes.data.data ?? gRes.data
      setGroup(g)

      // 2. Check membership/permission
      const isMember = canManage || g.members?.some(m => (m.user_id === user?._id || m.user_id?._id === user?._id) && m.status === 'ACTIVE')
      
      // If Private and not a member, redirect out immediately to prevent viewing metadata
      if (g.visibility === 'PRIVATE' && !isMember) {
        navigate('/groups')
        return
      }

      if (isMember) {
        // 3. Parallel fetch restricted content only if member
        const [f, c, a, r] = await Promise.all([
          api.get(`/study-groups/${id}/feed`).catch(() => ({ data: { data: [] } })),
          api.get(`/courses?group_id=${id}`).catch(() => ({ data: { data: [] } })),
          api.get(`/assignments?group_id=${id}`).catch(() => ({ data: { data: [] } })),
          canManage ? api.get(`/study-groups/${id}/join-requests`).catch(() => ({ data: { data: [] } })) : Promise.resolve({ data: { data: [] } })
        ])
        setFeed(f.data.data ?? f.data)
        setCourses(c.data.data ?? c.data)
        setAssignments(a.data.data ?? a.data)
        setRequests(r.data.data ?? r.data)
      } else {
        // Not a member - reset protected states
        setFeed([]); setCourses([]); setAssignments([]); setRequests([])
      }
    } catch (err) {
      console.error(err)
      // Only navigate away if even basic group info is not accessible
      navigate('/groups')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchGroupData()
  }, [id, canManage])

  const handleRequest = async (reqId, status) => {
    const confirmMsg = status === 'APPROVED' ? t('groups.detail.requests.confirm_approve') : t('groups.detail.requests.confirm_reject')
    if (!window.confirm(confirmMsg)) return
    try {
      await api.put(`/study-groups/${id}/join-requests/${reqId}`, { status })
      fetchGroupData()
    } catch (err) {
      alert(err?.response?.data?.error || t('common.error_fail'))
    }
  }

  const handleJoin = async () => {
    const msg = group.visibility === 'PRIVATE' ? prompt(t('groups.join_modal.message_placeholder')) : ''
    if (group.visibility === 'PRIVATE' && msg === null) return

    try {
      await api.post(`/study-groups/${id}/join-requests`, { message: msg })
      alert(t('groups.join_modal.success'))
      fetchGroupData()
    } catch (err) {
      alert(err?.response?.data?.error || t('common.error_fail'))
    }
  }

  if (loading) return <Layout><div className="spinner-wrap"><div className="spinner" /></div></Layout>
  if (!group) return null

  const userId = user?._id?.toString()
  const isMember = canManage || group.members?.some(m => {
    const mid = (typeof m.user_id === 'object' ? m.user_id._id : m.user_id)?.toString()
    return mid === userId && m.status === 'ACTIVE'
  })
  const hasPending = group.join_requests?.some(r => {
    const rid = (typeof r.user_id === 'object' ? r.user_id._id : r.user_id)?.toString()
    return rid === userId && r.status === 'PENDING'
  })

  const locale = i18n.language === 'en' ? 'en-US' : 'vi-VN'

  return (
    <Layout>
      <button className="btn btn-secondary btn-sm" style={{ marginBottom:'1.5rem' }} onClick={() => navigate('/groups')}>
        ← {t('groups.detail.back')}
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
              <span className="tag">{t('groups.members_count', { count: group.member_count })}</span>
              <span className="tag tag--primary">{group.visibility === 'PUBLIC' ? `🌐 ${t('groups.visibility.PUBLIC')}` : `🔒 ${t('groups.visibility.PRIVATE')}`}</span>
              <span className="tag tag--success">{t(`status.${group.status}`) || group.status}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs - Only show all tabs if member */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0', overflowX: 'auto' }}>
        {[
          ['feed', `📰 ${t('groups.detail.tabs.feed')}`],
          ...(isMember ? [
            ['courses', `📚 ${t('groups.detail.tabs.courses')}`],
            ['assignments', `📝 ${t('groups.detail.tabs.assignments')}`],
            ['members', `👥 ${t('groups.detail.tabs.members')}`],
            ['meeting', `📹 ${t('groups.detail.tabs.meeting')}`],
          ] : []),
          ...(canManage ? [['requests', `⏳ ${t('groups.detail.tabs.requests')} (${requests.length})`]] : [])
        ].map(([key, label]) => (
          <button key={key}
            onClick={() => setTab(key)}
            style={{
              padding: '0.625rem 1rem', fontSize: '0.875rem', fontWeight: 600, color: tab === key ? 'var(--primary-2)' : 'var(--text-3)',
              borderBottom: tab === key ? '2px solid var(--primary)' : '2px solid transparent', background: 'none', transition: 'all 0.2s', whiteSpace: 'nowrap'
            }}>
            {label}
          </button>
        ))}
      </div>

      {/* Non-member call to action */}
      {!isMember && !canManage && (
        <div style={{
          textAlign: 'center', padding: '4rem 2rem', background: 'var(--bg-2)',
          border: '1px solid var(--border)', borderRadius: '24px', marginBottom: '2rem'
        }}>
          <div style={{ fontSize: '4rem', marginBottom: '1.5rem' }}>🔒</div>
          <h3 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>{t('groups.join_modal.title') || 'Tham gia nhóm'}</h3>
          <p style={{ color: 'var(--text-3)', marginBottom: '2rem', maxWidth: '400px', margin: '0 auto 1.5rem' }}>
            {t('groups.detail.not_member_hint') || 'Bạn cần tham gia nhóm để xem các khóa học, bài tập và thảo luận.'}
          </p>
          
          {hasPending ? (
            <button className="btn btn-secondary btn-lg" disabled style={{ padding: '0.8rem 2.5rem', borderRadius: '16px' }}>
              ⏳ {t('groups.pending')}
            </button>
          ) : (
            <button className="btn btn-primary btn-lg" onClick={handleJoin} style={{ padding: '0.8rem 2.5rem', borderRadius: '16px' }}>
              🚀 {t('groups.join')}
            </button>
          )}
        </div>
      )}

      {tab === 'feed' && (
        <div style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>
          {feed.length === 0 ? (
            <div className="empty-state"><div className="empty-state__icon">📭</div><h3>{t('groups.detail.feed.empty')}</h3></div>
          ) : feed.map(post => (
            <div className="post-card" key={post._id}>
              <div style={{ display:'flex', alignItems:'center', gap:'0.75rem', marginBottom:'0.75rem' }}>
                <div className="avatar" style={{ width:32, height:32, fontSize:'0.75rem' }}>
                  {post.author_id?.full_name?.charAt(0) || '?'}
                </div>
                <div>
                  <div style={{ fontSize:'0.875rem', fontWeight:600 }}>{post.author_id?.full_name}</div>
                  <div style={{ fontSize:'0.75rem', color:'var(--text-3)' }}>{new Date(post.created_at).toLocaleDateString(locale)}</div>
                </div>
                {post.is_pinned && <span className="tag tag--primary" style={{ marginLeft:'auto' }}>📌 {t('groups.detail.feed.pinned')}</span>}
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
             <div className="empty-state" style={{ gridColumn: '1 / -1' }}><div className="empty-state__icon">📚</div><h3>{t('groups.detail.courses.empty')}</h3></div>
          ) : courses.map(course => (
            <div key={course._id} className="course-card" onClick={() => navigate(`/courses/${course._id}`)}>
              <div className="course-card__thumb">
                📖
                <span className={`course-card__status tag ${course.status === 'PUBLISHED' ? 'tag--success' : 'tag--warning'}`}>
                  {t(`status.${course.status}`) || course.status}
                </span>
              </div>
              <div className="course-card__body">
                <h3 className="course-card__title">{course.title}</h3>
                <div className="course-card__meta">
                  <span>👤 {course.created_by?.full_name}</span>
                  <span>📅 {new Date(course.created_at).toLocaleDateString(locale)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'assignments' && (
        <div style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>
          {assignments.length === 0 ? (
            <div className="empty-state"><div className="empty-state__icon">📝</div><h3>{t('groups.detail.assignments.empty')}</h3></div>
          ) : assignments.map(a => (
            <div key={a._id} className="card" style={{ display:'flex', alignItems:'center', gap:'1.5rem', cursor:'pointer' }} onClick={() => navigate(`/assignments/${a._id}`)}>
               <div style={{ width:48, height:48, borderRadius:12, background:'rgba(108,99,255,0.1)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.5rem', flexShrink:0 }}>
                📄
              </div>
              <div style={{ flex:1 }}>
                <h3 style={{ fontSize:'1rem', fontWeight:600 }}>{a.title}</h3>
                <div style={{ display:'flex', gap:'1rem', marginTop:'0.25rem', fontSize:'0.8rem', color:'var(--text-3)' }}>
                  <span>{t('groups.detail.assignments.due', { date: new Date(a.due_at).toLocaleString(locale) })}</span>
                  <span>{t('groups.detail.assignments.max_score', { score: a.max_score })}</span>
                </div>
              </div>
              <span className={`tag ${new Date() > new Date(a.due_at) ? 'tag--danger' : 'tag--primary'}`}>
                {new Date() > new Date(a.due_at) ? t('status.OVERDUE') : t('common.open') || 'Đang mở'}
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
            <div className="empty-state"><div className="empty-state__icon">✅</div><h3>{t('groups.detail.requests.empty')}</h3></div>
          ) : requests.map(r => (
            <div key={r._id} style={{ display:'flex', alignItems:'center', gap:'1rem', padding:'1rem', background:'var(--bg-2)', border:'1px solid var(--border)', borderRadius:'var(--radius-sm)' }}>
              <div className="avatar">{r.user_id?.full_name?.charAt(0) || '?'}</div>
              <div style={{ flex:1 }}>
                <div style={{ fontWeight:600, fontSize:'0.875rem' }}>{r.user_id?.full_name}</div>
                <div style={{ fontSize:'0.75rem', color:'var(--text-3)' }}>{r.user_id?.email}</div>
                <div style={{ fontSize:'0.85rem', marginTop: 4, padding: 8, background: 'var(--bg-3)', borderRadius: 6 }}>
                  "{r.message || t('groups.detail.requests.no_message')}"
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <button className="btn btn-primary btn-sm" onClick={() => handleRequest(r._id, 'APPROVED')}>{t('groups.detail.requests.approve')}</button>
                <button className="btn btn-danger btn-sm" onClick={() => handleRequest(r._id, 'REJECTED')}>{t('groups.detail.requests.reject')}</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </Layout>
  )
}
