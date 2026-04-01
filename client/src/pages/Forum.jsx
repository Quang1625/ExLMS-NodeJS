import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Layout from '../components/Layout'
import api from '../api/axios'
import { useAuth } from '../context/AuthContext'
import LikeButton from '../components/LikeButton'

export default function Forum() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [posts, setPosts] = useState([])
  const [tags, setTags] = useState([])
  const [userVotes, setUserVotes] = useState([])
  const [activeTag, setActiveTag] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const promises = [
      api.get('/forum/posts'),
      api.get('/forum/tags')
    ]
    if (user) {
      promises.push(api.get(`/forum/votes/user/${user._id}`).catch(() => ({ data: [] })))
    }

    Promise.all(promises).then(([p, t, v]) => {
      setPosts(p?.data || [])
      setTags(t?.data || [])
      if (v) setUserVotes(v.data || [])
    }).catch(console.error)
      .finally(() => setLoading(false))
  }, [user])

  const filtered = activeTag ? posts.filter(p => p.tag_ids?.some(t => t._id === activeTag)) : posts

  const handleDelete = async (postId) => {
    if (!window.confirm(t('forum.delete_confirm'))) return
    try {
      await api.delete(`/forum/posts/${postId}`)
      setPosts(prev => prev.filter(p => p._id !== postId))
    } catch (err) {
      console.error(err)
      alert(err.response?.data?.error || t('forum.delete_fail'))
    }
  }

  return (
    <Layout>
      <div className="page-header fade-in" style={{
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        paddingBottom: '1.5rem',
        borderBottom: '1px solid var(--border)',
        marginBottom: '2rem'
      }}>
        <div>
          <h1 style={{ fontSize: '2.25rem', marginBottom: '0.5rem', color: 'var(--text)' }}>{t('forum.title')} 💬</h1>
          <p style={{ fontSize: '1rem', color: 'var(--text-3)' }}>{t('forum.subtitle', { count: posts.length })}</p>
        </div>
        <button className="btn btn-primary" style={{ padding: '0.75rem 1.5rem', borderRadius: '14px' }} onClick={() => navigate('/forum/new')}>
          <span style={{ fontSize: '1.25rem' }}>+</span> {t('forum.new_post')}
        </button>
      </div>

      <div className="grid-2" style={{ alignItems: 'start', gap: '2rem' }}>
        {/* Posts */}
        <div style={{ gridColumn: 'span 2' }}>
          {/* Tag filter */}
          {tags.length > 0 && (
            <div className="fade-in" style={{
              display: 'flex',
              gap: '0.75rem',
              flexWrap: 'wrap',
              marginBottom: '2.5rem',
              padding: '0.5rem',
              background: 'var(--bg-2)',
              borderRadius: '16px',
              border: '1px solid var(--border)',
              width: 'fit-content'
            }}>
              <button 
                className={`tag ${!activeTag ? 'tag--primary' : ''}`}
                style={{
                  cursor: 'pointer',
                  padding: '6px 16px',
                  borderRadius: '100px',
                  backgroundColor: !activeTag ? 'var(--primary)' : 'var(--glass)',
                  color: !activeTag ? '#fff' : 'var(--text-2)',
                  border: 'none',
                  transition: 'all 0.2s ease'
                }}
                onClick={() => setActiveTag(null)}>{t('common.all')}</button>
              {tags.map(t => (
                <button key={t._id}
                  className="tag"
                  style={{
                    cursor: 'pointer',
                    padding: '6px 16px',
                    fontSize: '0.85rem',
                    background: activeTag === t._id ? t.color : t.color + '15',
                    color: activeTag === t._id ? '#fff' : t.color,
                    border: `1px solid ${activeTag === t._id ? t.color : t.color + '30'}`,
                    transition: 'all 0.2s ease'
                  }}
                  onClick={() => setActiveTag(activeTag === t._id ? null : t._id)}>
                  {t.name}
                </button>
              ))}
            </div>
          )}

          {loading ? <div className="spinner-wrap"><div className="spinner" /></div>
            : filtered.length === 0 ? (
              <div className="empty-state fade-in">
                <div className="empty-state__icon">💬</div>
                <h3>{t('forum.no_posts')}</h3>
                <p>{t('forum.be_first')}</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: '1.5rem' }}>
                {filtered.map((p, idx) => {
                  const cover = p.attachments?.find(a => a.mime_type?.startsWith('image/'))
                  const canDelete = user && (user.role === 'ADMIN' || p.author_id?._id === user._id)
                  const userVote = userVotes.find(v => v.target_id === p._id)
                  const initialVoteType = userVote ? (userVote.vote_type === 'UPVOTE' ? 'LIKE' : userVote.vote_type) : null

                  return (
                    <div className="post-card fade-in" key={p._id} style={{
                      padding: '1.5rem',
                      borderRadius: '24px',
                      border: '1px solid var(--border)',
                      background: 'var(--bg-2)',
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      width: 'calc(50% - 0.75rem)',
                      minWidth: '340px',
                      display: 'flex',
                      flexDirection: 'column',
                      animationDelay: `${idx * 0.05}s`,
                      cursor: 'pointer',
                      position: 'relative',
                      overflow: 'hidden'
                    }}
                      onClick={(e) => {
                        if (e.target.closest('.btn') || e.target.closest('.tag') || e.target.closest('.like-button')) return;
                        navigate(`/forum/${p._id}`);
                      }}
                    >
                      {p.is_pinned && (
                        <div style={{ position: 'absolute', top: 0, right: 0, padding: '4px 12px', background: 'var(--warning)', color: '#000', fontSize: '0.7rem', fontWeight: 800, borderBottomLeftRadius: '12px' }}>
                          {t('forum.pinned')}
                        </div>
                      )}

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: '0.75rem', marginBottom: '1rem' }}>
                        <h3 className="post-card__title" style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, lineHeight: 1.4, color: 'var(--text)' }}>
                          <Link to={`/forum/${p._id}`} style={{ color: 'inherit', textDecoration: 'none' }}>{p.title}</Link>
                        </h3>
                        {canDelete && (
                          <button className="btn btn-danger btn-sm" style={{ padding: '4px 8px', borderRadius: '8px' }} onClick={(e) => { e.stopPropagation(); handleDelete(p._id); }}>
                            <span style={{ opacity: 0.8 }}>🗑️</span>
                          </button>
                        )}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', marginBottom: '1.25rem', color: 'var(--text-3)', fontSize: '0.85rem' }}>
                        <div className="avatar" style={{ width: 32, height: 32, fontSize: '0.8rem', background: 'linear-gradient(135deg, var(--primary), var(--accent))' }}>
                          {p.author_id?.full_name?.charAt(0) || '?'}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontWeight: 600, color: 'var(--text-2)' }}>{p.author_id?.full_name}</span>
                          <span style={{ fontSize: '0.75rem' }}>{new Date(p.created_at).toLocaleDateString(i18n.language === 'en' ? 'en-US' : 'vi-VN')}</span>
                        </div>
                      </div>

                      {cover && (
                        <div style={{ width: '100%', marginBottom: '1.25rem', overflow: 'hidden', borderRadius: '16px', height: '180px' }}>
                          <img
                            src={cover.object_key}
                            alt={cover.filename}
                            style={{
                              width: '100%',
                              height: '100%',
                              objectFit: 'cover',
                              transition: 'transform 0.5s ease'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                            onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                          />
                        </div>
                      )}

                      <div className="post-card__tags" style={{ marginBottom: 'auto', display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                        {p.tag_ids?.map(t => (
                          <span key={t._id} className="tag" style={{ background: t.color + '15', color: t.color, fontWeight: 600, fontSize: '0.7rem' }}>{t.name}</span>
                        ))}
                      </div>

                      {/* Action Bar */}
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginTop: '1.5rem',
                        paddingTop: '1rem',
                        borderTop: '1px solid var(--border)'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <LikeButton post={p} user={user} initialVoteType={initialVoteType} />
                          <button className="vote-btn" style={{ background: 'var(--glass)', padding: '6px 12px' }} onClick={(e) => { e.stopPropagation(); navigate(`/forum/${p._id}`); }}>
                            <span style={{ fontSize: '0.9rem' }}>💬</span>
                            <span>{t('forum.comments_count')}</span>
                          </button>
                        </div>

                      </div>
                    </div>
                  )
                })}
              </div>
            )}
        </div>
      </div>
    </Layout>

  )
}
