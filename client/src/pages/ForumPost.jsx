import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Layout from '../components/Layout'
import api from '../api/axios'
import { useAuth } from '../context/AuthContext'
import LikeButton from '../components/LikeButton'
import MediaRenderer from '../components/MediaRenderer'

export default function ForumPost() {
  const { t, i18n } = useTranslation()
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  // All hooks at the VERY top
  const [data, setData] = useState(null)
  const [comment, setComment] = useState('')
  const [loading, setLoading] = useState(true)
  const [replyTo, setReplyTo] = useState(null)
  const [replyContent, setReplyContent] = useState('')
  const [userVotes, setUserVotes] = useState([])

  useEffect(() => {
    let isMounted = true;
    const promises = [api.get(`/forum/posts/${id}`)]
    if (user) {
      promises.push(api.get(`/forum/votes/user/${user._id}`).catch(() => ({ data: [] })))
    }

    Promise.all(promises)
      .then(([r, v]) => {
        if (isMounted) {
          setData(r.data);
          if (v) setUserVotes(v.data || []);
        }
      })
      .catch((err) => {
        console.error(err);
        if (isMounted) navigate('/forum');
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      })
    return () => { isMounted = false; };
  }, [id, navigate, user])

  const handleAddComment = async (parentId = null) => {
    const actualParentId = (parentId && typeof parentId === 'string') ? parentId : null
    const text = actualParentId ? replyContent : comment

    if (!text.trim()) return
    try {
      await api.post(`/forum/posts/${id}/comments`, {
        content: text,
        author_id: user?._id,
        parent_id: actualParentId
      })
      const res = await api.get(`/forum/posts/${id}`)
      setData(res.data)
      setComment('')
      setReplyContent('')
      setReplyTo(null)
    } catch (err) {
      alert(err.response?.data?.error || t('forum.post_view.error_comment'))
    }
  }

  const handleDelete = async () => {
    if (!window.confirm(t('forum.delete_confirm'))) return
    try {
      await api.delete(`/forum/posts/${id}`)
      navigate('/forum')
    } catch (err) {
      console.error(err)
      alert(err.response?.data?.error || t('forum.delete_fail'))
    }
  }

  // Recursive comment renderer as a sub-function to keep main return clean
  const renderComment = (c, depth = 0) => {
    if (!c) return null;
    const isReplying = replyTo === c._id
    const children = (data?.comments || []).filter(child => child.parent_id === c._id)

    return (
      <div key={c._id} style={{ marginLeft: depth * 24, marginTop: '1rem' }}>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <div className="avatar" style={{ width: 36, height: 36, fontSize: '0.8rem', flexShrink: 0, background: 'var(--bg-3)', border: '1px solid var(--border)' }}>
            {c.author_id?.full_name?.charAt(0) || '?'}
          </div>
          <div style={{ flex: 1, background: depth === 0 ? 'var(--bg-3)' : 'var(--glass)', borderRadius: '20px', padding: '1.25rem', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text)' }}>{c.author_id?.full_name}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>{new Date(c.created_at || Date.now()).toLocaleDateString(i18n.language === 'en' ? 'en-US' : 'vi-VN')}</div>
            </div>
            <p style={{ fontSize: '1rem', color: 'var(--text-2)', lineHeight: 1.6 }}>{c.content}</p>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
              <LikeButton
                post={c}
                user={user}
                targetType="FORUM_COMMENT"
                initialVoteType={userVotes.find(v => v.target_id === c._id)?.vote_type === 'UPVOTE' ? 'LIKE' : userVotes.find(v => v.target_id === c._id)?.vote_type}
              />
              {c.is_accepted && <span className="tag tag--success" style={{ borderRadius: '8px', fontWeight: 600 }}>✅ {t('forum.post_view.solution')}</span>}
              <button className="vote-btn" style={{ fontSize: '0.85rem' }} onClick={() => setReplyTo(isReplying ? null : c._id)}>
                {isReplying ? t('forum.post_view.cancel_reply') : t('forum.post_view.reply')}
              </button>
            </div>

            {isReplying && (
              <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
                <textarea
                  className="form-input"
                  rows={2}
                  placeholder={t('forum.post_view.reply_placeholder')}
                  style={{ background: 'var(--bg-2)', fontSize: '0.9rem' }}
                  value={replyContent}
                  onChange={e => setReplyContent(e.target.value)}
                />
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                  <button className="btn btn-primary btn-sm" onClick={() => handleAddComment(c._id)}>{t('forum.post_view.send_reply')}</button>
                </div>
              </div>
            )}
          </div>
        </div>
        {children.map(child => renderComment(child, depth + 1))}
      </div>
    )
  }

  // Final check for data
  const post = data?.post
  const comments = data?.comments || []
  const canDelete = user && post && (user.role === 'ADMIN' || post.author_id?._id === user._id)

  return (
    <Layout>
      {loading ? (
        <div className="spinner-wrap"><div className="spinner" /></div>
      ) : !post ? (
        <div className="empty-state">
          <h3>{t('forum.post_view.not_found')}</h3>
          <button className="btn btn-primary" onClick={() => navigate('/forum')}>{t('forum.post_view.back')}</button>
        </div>
      ) : (
        <div className="fade-in">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
            <button className="btn btn-secondary btn-sm" style={{ borderRadius: '12px', padding: '6px 16px' }} onClick={() => navigate('/forum')}>
              ← {t('forum.post_view.back')}
            </button>
            {canDelete && <button className="btn btn-danger btn-sm" style={{ borderRadius: '12px', padding: '6px 16px' }} onClick={handleDelete}>{t('forum.post_view.delete_post')}</button>}
          </div>

          <div className="card" style={{
            marginBottom: '2rem',
            padding: '2.5rem',
            borderRadius: '32px',
            background: 'var(--bg-2)',
            border: '1px solid var(--border)',
            boxShadow: 'var(--shadow-lg)'
          }}>
            <div className="post-card__tags" style={{ marginBottom: '1.25rem' }}>
              {post.tag_ids?.map(t => (
                <span key={t._id} className="tag" style={{ background: t.color + '15', color: t.color, fontWeight: 700, padding: '4px 12px', fontSize: '0.8rem' }}>{t.name}</span>
              ))}
            </div>

            <h1 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '1.5rem', lineHeight: 1.2, color: '#fff' }}>{post.title}</h1>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '1.5rem',
              marginBottom: '2.5rem',
              padding: '1rem',
              background: 'var(--glass)',
              borderRadius: '20px',
              border: '1px solid var(--border)'
            }}>
              <div className="avatar" style={{ width: 44, height: 44, fontSize: '1rem', background: 'linear-gradient(135deg, var(--primary), var(--accent))' }}>
                {post.author_id?.full_name?.charAt(0) || '?'}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <span style={{ fontWeight: 700, color: 'var(--text)', fontSize: '1rem' }}>{post.author_id?.full_name}</span>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-3)' }}>
                  {t('forum.post_view.posted_on', { date: new Date(post.created_at).toLocaleDateString(i18n.language === 'en' ? 'en-US' : 'vi-VN', { day: 'numeric', month: 'long', year: 'numeric' }) })}
                </span>
              </div>

            </div>

            <div style={{
              lineHeight: 1.8,
              color: 'var(--text-2)',
              whiteSpace: 'pre-wrap',
              fontSize: '1.1rem',
              marginBottom: '2.5rem'
            }}>
              {post.content}
            </div>

            {post.attachments?.length > 0 && (
              <div style={{ marginTop: '2rem', paddingTop: '2rem', borderTop: '1px solid var(--border)' }}>
                <h4 style={{ marginBottom: '1rem', fontSize: '0.9rem', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('forum.post_view.attachments')}</h4>
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                  {post.attachments.map(a => {
                    const isMedia = a.mime_type?.startsWith('image/') || a.mime_type?.startsWith('video/');
                    if (isMedia) {
                      return (
                        <div key={a.object_key} style={{ borderRadius: '20px', overflow: 'hidden', border: '1px solid var(--border)', background: 'var(--bg-3)', maxWidth: '100%' }}>
                          <MediaRenderer
                            url={a.object_key}
                            type={a.mime_type?.startsWith('video/') ? 'VIDEO' : 'IMAGE'}
                            style={{ maxWidth: '100%', maxHeight: 600 }}
                          />
                        </div>
                      );
                    }
                    return (
                      <a key={a.object_key} href={a.object_key} target="_blank" rel="noreferrer" className="tag"
                        style={{ background: 'var(--bg-3)', color: 'var(--primary-2)', padding: '10px 20px', borderRadius: '14px', border: '1px solid var(--border)', fontSize: '0.9rem' }}>
                        📄 {a.filename}
                      </a>
                    );
                  })}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: '1rem', marginTop: '2.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border)' }}>
              <LikeButton
                post={post}
                user={user}
                targetType="FORUM_POST"
                initialVoteType={userVotes.find(v => v.target_id === post._id)?.vote_type === 'UPVOTE' ? 'LIKE' : userVotes.find(v => v.target_id === post._id)?.vote_type}
              />
              <button className="btn btn-secondary" style={{ borderRadius: '14px' }}>🔖 {t('forum.post_view.save_post')}</button>
            </div>
          </div>

          <div className="card" style={{
            padding: '2.5rem',
            borderRadius: '32px',
            background: 'var(--bg-2)',
            border: '1px solid var(--border)'
          }}>
            <h3 style={{ marginBottom: '2rem', fontSize: '1.5rem', fontWeight: 700 }}>💬 {t('forum.post_view.comments_title', { count: comments.length })}</h3>

            <div style={{
              display: 'flex',
              gap: '1rem',
              marginBottom: '3rem',
              padding: '1.5rem',
              background: 'var(--bg-3)',
              borderRadius: '24px',
              border: '1px solid var(--border)'
            }}>
              <div className="avatar" style={{ width: 40, height: 40, flexShrink: 0, fontSize: '0.9rem', background: 'var(--primary)' }}>
                {user?.full_name?.charAt(0) || 'U'}
              </div>
              <div style={{ flex: 1 }}>
                <textarea className="form-input" rows={3}
                  style={{ background: 'transparent', border: 'none', padding: 0, fontSize: '1rem', resize: 'none' }}
                  placeholder={t('forum.post_view.comment_placeholder')}
                  value={comment} onChange={e => setComment(e.target.value)} />
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
                  <button className="btn btn-primary btn-sm" style={{ borderRadius: '10px', padding: '8px 20px' }} onClick={() => handleAddComment()}>{t('forum.post_view.send_comment')}</button>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {comments.filter(c => !c.parent_id).map(c => renderComment(c, 0))}
            </div>

            {comments.length === 0 && (
              <div className="empty-state" style={{ padding: '3rem' }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🥱</div>
                <div style={{ color: 'var(--text-3)' }}>{t('forum.post_view.no_comments')}</div>
              </div>
            )}
          </div>
        </div>
      )}
    </Layout>
  )
}
