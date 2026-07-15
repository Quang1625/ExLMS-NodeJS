import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Layout from '../components/Layout'
import api from '../api/axios'
import { useAuth } from '../context/AuthContext'

// Simple bar chart component
function BarChart({ data, labels, color = '#6c63ff', height = 120 }) {
  const max = Math.max(...data, 1)
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height, padding: '0.5rem 0' }}>
      {data.map((val, i) => (
        <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
          <div style={{ fontSize: '0.65rem', color: 'var(--text-3)', fontWeight: 600 }}>{val > 0 ? val : ''}</div>
          <div style={{
            width: '100%', borderRadius: '6px 6px 0 0',
            background: `linear-gradient(180deg, ${color}, ${color}88)`,
            height: `${Math.max((val / max) * (height - 30), val > 0 ? 6 : 0)}px`,
            transition: 'height 0.5s ease', minHeight: val > 0 ? 6 : 0
          }} />
          {labels && <div style={{ fontSize: '0.6rem', color: 'var(--text-3)', textAlign: 'center', whiteSpace: 'nowrap' }}>{labels[i]}</div>}
        </div>
      ))}
    </div>
  )
}

// Donut chart
function DonutChart({ value, total, color = '#38ef7d', size = 100 }) {
  const pct = total > 0 ? (value / total) * 100 : 0
  const r = 38
  const circ = 2 * Math.PI * r
  const offset = circ - (pct / 100) * circ
  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx="50" cy="50" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="10" />
        <circle cx="50" cy="50" r={r} fill="none" stroke={color} strokeWidth="10"
          strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.8s ease' }} />
      </svg>
      <div style={{
        position: 'absolute', inset: 0, display: 'flex',
        flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
      }}>
        <span style={{ fontSize: '1.1rem', fontWeight: 900, color }}>{Math.round(pct)}%</span>
      </div>
    </div>
  )
}

export default function AdminQuizManager() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [tab, setTab] = useState('overview')
  const [analytics, setAnalytics] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedQuiz, setSelectedQuiz] = useState(null)
  const [quizAnalytics, setQuizAnalytics] = useState(null)
  const [quizAnalyticsLoading, setQuizAnalyticsLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [importText, setImportText] = useState('')
  const [importPreview, setImportPreview] = useState([])
  const [importError, setImportError] = useState('')
  const fileInputRef = useRef()

  // State cho Modal nhật ký gian lận
  const [activeViolationAttempt, setActiveViolationAttempt] = useState(null)

  useEffect(() => {
    const fetch = async () => {
      try {
        const { data } = await api.get('/quizzes/analytics/overview')
        setAnalytics(Array.isArray(data) ? data : [])
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetch()
  }, [])

  const handleSelectQuiz = async (quiz) => {
    setSelectedQuiz(quiz)
    setTab('detail')
    setQuizAnalyticsLoading(true)
    try {
      const { data } = await api.get(`/quizzes/${quiz.quiz_id}/analytics`)
      setQuizAnalytics(data)
    } catch (err) {
      console.error(err)
    } finally {
      setQuizAnalyticsLoading(false)
    }
  }

  const handleExport = async (quizId, title) => {
    try {
      const res = await api.get(`/quizzes/${quizId}/export-excel`, { responseType: 'blob' })
      const blob = new Blob([res.data], { type: 'text/csv; charset=utf-8' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `Bang_diem_${(title || 'Quiz').replace(/[^a-zA-Z0-9]/g, '_')}.csv`)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (err) {
      alert('Xuất file thất bại: ' + err.message)
    }
  }

  const handleDeleteQuiz = async (quizId) => {
    if (!window.confirm('Bạn có chắc muốn xóa bài kiểm tra này? Tất cả kết quả sẽ bị xóa.')) return
    try {
      await api.delete(`/quizzes/${quizId}`)
      setAnalytics(prev => prev.filter(q => q.quiz_id !== quizId))
      if (selectedQuiz?.quiz_id === quizId) {
        setSelectedQuiz(null)
        setTab('overview')
      }
    } catch (err) {
      alert('Xóa thất bại: ' + (err.response?.data?.error || err.message))
    }
  }

  // CSV Import
  const parseCSV = (text) => {
    const lines = text.trim().split('\n').filter(l => l.trim())
    if (lines.length < 2) { setImportError('File CSV phải có ít nhất 1 dòng dữ liệu sau header.'); return }
    const header = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''))
    const required = ['content', 'question_type', 'points']
    const missing = required.filter(r => !header.includes(r))
    if (missing.length > 0) { setImportError(`Thiếu cột bắt buộc: ${missing.join(', ')}`); return }

    const preview = lines.slice(1, 6).map(line => {
      const vals = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''))
      const obj = {}
      header.forEach((h, i) => { obj[h] = vals[i] || '' })
      return obj
    })
    setImportPreview(preview)
    setImportError('')
  }

  const filtered = analytics.filter(q =>
    !search || q.title?.toLowerCase().includes(search.toLowerCase())
  )

  const overallStats = {
    total: analytics.length,
    totalAttempts: analytics.reduce((s, q) => s + (q.total_attempts || 0), 0),
    avgPassRate: analytics.length > 0
      ? Math.round(analytics.reduce((s, q) => s + (q.pass_rate || 0), 0) / analytics.length)
      : 0,
    avgScore: analytics.length > 0
      ? Math.round(analytics.reduce((s, q) => s + (q.avg_score || 0), 0) / analytics.length)
      : 0
  }

  if (loading) return (
    <Layout>
      <div className="spinner-wrap"><div className="spinner" /></div>
    </Layout>
  )

  const TABS = [
    { id: 'overview', label: '📊 Tổng quan' },
    { id: 'quizzes', label: '📋 Danh sách Quiz' },
    { id: 'import', label: '📥 Import câu hỏi' },
    ...(selectedQuiz ? [{ id: 'detail', label: `🔍 ${selectedQuiz.title?.substring(0, 20)}...` }] : [])
  ]

  return (
    <Layout>
      <div className="page fade-in" style={{ maxWidth: 1200, margin: '0 auto' }}>
        {/* Page Header */}
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '2rem', fontWeight: 900, marginBottom: '0.25rem' }}>
            🛠️ Quản lý Bài kiểm tra
          </h1>
          <p style={{ color: 'var(--text-3)' }}>Quản lý ngân hàng câu hỏi, phân tích kết quả và báo cáo chi tiết</p>
        </div>

        {/* Stats Row */}
        <div className="stat-grid" style={{ marginBottom: '2rem' }}>
          {[
            { icon: '📋', label: 'Tổng bài kiểm tra', value: overallStats.total, color: '#6c63ff', bg: 'rgba(108,99,255,0.1)' },
            { icon: '✍️', label: 'Tổng lượt làm bài', value: overallStats.totalAttempts, color: '#00d4ff', bg: 'rgba(0,212,255,0.1)' },
            { icon: '🎯', label: 'Tỷ lệ đạt TB', value: `${overallStats.avgPassRate}%`, color: '#38ef7d', bg: 'rgba(56,239,125,0.1)' },
            { icon: '📈', label: 'Điểm trung bình', value: `${overallStats.avgScore}%`, color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' }
          ].map((s, i) => (
            <div key={i} className="stat-card glass-card-hover">
              <div className="stat-card__icon" style={{ background: s.bg, color: s.color, fontSize: '1.6rem' }}>{s.icon}</div>
              <div>
                <div className="stat-card__value" style={{ color: s.color }}>{s.value}</div>
                <div className="stat-card__label">{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          {TABS.map(tabItem => (
            <button
              key={tabItem.id}
              onClick={() => setTab(tabItem.id)}
              style={{
                padding: '0.6rem 1.25rem', borderRadius: 12, border: 'none', cursor: 'pointer',
                fontWeight: 700, fontSize: '0.85rem', transition: 'all 0.2s',
                background: tab === tabItem.id ? 'var(--primary)' : 'var(--bg-3)',
                color: tab === tabItem.id ? 'white' : 'var(--text-2)',
                boxShadow: tab === tabItem.id ? '0 4px 12px rgba(108,99,255,0.3)' : 'none'
              }}
            >
              {tabItem.label}
            </button>
          ))}
        </div>

        {/* === OVERVIEW TAB === */}
        {tab === 'overview' && (
          <div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '1.25rem' }}>
              Hiệu suất từng bài kiểm tra
            </h2>
            {analytics.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', padding: '4rem' }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📭</div>
                <h3>Chưa có dữ liệu</h3>
                <p style={{ color: 'var(--text-3)' }}>Chưa có bài kiểm tra nào có lượt làm bài.</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.25rem' }}>
                {analytics.map((quiz) => (
                  <div
                    key={quiz.quiz_id}
                    className="card glass-card-hover"
                    style={{ cursor: 'pointer', padding: '1.5rem' }}
                    onClick={() => handleSelectQuiz(quiz)}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <h3 style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '0.25rem', 
                          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {quiz.title}
                        </h3>
                        <span style={{
                          fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase',
                          padding: '2px 10px', borderRadius: 100,
                          background: quiz.quiz_type === 'EXAM' ? 'rgba(239,68,68,0.15)' : 'rgba(56,239,125,0.15)',
                          color: quiz.quiz_type === 'EXAM' ? '#ef4444' : '#38ef7d'
                        }}>
                          {quiz.quiz_type === 'EXAM' ? 'BÀI THI' : 'LUYỆN TẬP'}
                        </span>
                      </div>
                      <DonutChart value={quiz.pass_rate} total={100} color={quiz.pass_rate >= 50 ? '#38ef7d' : '#ff6b67'} size={70} />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
                      {[
                        { label: 'Câu hỏi', value: quiz.question_count, icon: '🧩' },
                        { label: 'Lượt làm', value: quiz.total_attempts, icon: '✍️' },
                        { label: 'Điểm TB', value: `${quiz.avg_score}%`, icon: '📊' },
                        { label: 'Tỷ lệ đạt', value: `${quiz.pass_rate}%`, icon: '🎯' }
                      ].map((stat, i) => (
                        <div key={i} style={{ background: 'var(--bg-3)', borderRadius: 10, padding: '0.6rem 0.75rem' }}>
                          <div style={{ fontSize: '0.68rem', color: 'var(--text-3)', marginBottom: 2 }}>{stat.icon} {stat.label}</div>
                          <div style={{ fontWeight: 800, fontSize: '1rem' }}>{stat.value}</div>
                        </div>
                      ))}
                    </div>

                    {/* Score distribution mini chart */}
                    {quiz.total_attempts > 0 && (
                      <div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-3)', marginBottom: 4 }}>Phân phối điểm số</div>
                        <BarChart
                          data={quiz.score_distribution || [0, 0, 0, 0, 0]}
                          labels={['0-20', '21-40', '41-60', '61-80', '81-100']}
                          color="#6c63ff"
                          height={80}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* === QUIZZES LIST TAB === */}
        {tab === 'quizzes' && (
          <div>
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ position: 'relative', flex: 1, minWidth: 280 }}>
                <span style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.4 }}>🔍</span>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Tìm kiếm bài kiểm tra..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  style={{ paddingLeft: '2.5rem' }}
                />
              </div>
            </div>

            <div className="table-wrap" style={{ background: 'var(--bg-3)', borderRadius: 20, border: '1px solid var(--border)', overflow: 'hidden' }}>
              <table className="table" style={{ minWidth: 700 }}>
                <thead>
                  <tr>
                    <th style={{ padding: '1rem 1.5rem' }}>Bài kiểm tra</th>
                    <th>Loại</th>
                    <th>Câu hỏi</th>
                    <th>Lượt làm</th>
                    <th>Điểm TB</th>
                    <th>Tỷ lệ đạt</th>
                    <th style={{ textAlign: 'right', paddingRight: '1.5rem' }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan="7" style={{ textAlign: 'center', padding: '4rem', opacity: 0.5 }}>
                        Không tìm thấy bài kiểm tra nào
                      </td>
                    </tr>
                  ) : filtered.map(quiz => (
                    <tr key={quiz.quiz_id} className="table-row-hover">
                      <td style={{ padding: '1rem 1.5rem', maxWidth: 220 }}>
                        <div style={{ fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{quiz.title}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-3)', marginTop: 2 }}>
                          {new Date(quiz.created_at).toLocaleDateString('vi-VN')}
                        </div>
                      </td>
                      <td>
                        <span style={{
                          fontSize: '0.7rem', fontWeight: 700, padding: '3px 10px', borderRadius: 100,
                          background: quiz.quiz_type === 'EXAM' ? 'rgba(239,68,68,0.15)' : 'rgba(56,239,125,0.15)',
                          color: quiz.quiz_type === 'EXAM' ? '#ef4444' : '#38ef7d'
                        }}>
                          {quiz.quiz_type === 'EXAM' ? 'BÀI THI' : 'LUYỆN TẬP'}
                        </span>
                      </td>
                      <td style={{ fontWeight: 700 }}>{quiz.question_count}</td>
                      <td style={{ fontWeight: 700 }}>{quiz.total_attempts}</td>
                      <td>
                        <span style={{ fontWeight: 800, color: quiz.avg_score >= 70 ? '#38ef7d' : quiz.avg_score >= 50 ? '#f59e0b' : '#ff6b67' }}>
                          {quiz.avg_score}%
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <div style={{ flex: 1, height: 6, background: 'var(--border)', borderRadius: 99, overflow: 'hidden', minWidth: 60 }}>
                            <div style={{
                              height: '100%', borderRadius: 99,
                              background: quiz.pass_rate >= 70 ? '#38ef7d' : quiz.pass_rate >= 50 ? '#f59e0b' : '#ff6b67',
                              width: `${quiz.pass_rate}%`
                            }} />
                          </div>
                          <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>{quiz.pass_rate}%</span>
                        </div>
                      </td>
                      <td style={{ textAlign: 'right', paddingRight: '1.5rem' }}>
                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                          <button
                            className="btn btn-sm btn-secondary"
                            onClick={() => handleSelectQuiz(quiz)}
                            title="Xem phân tích"
                          >
                            📊
                          </button>
                          <button
                            className="btn btn-sm btn-secondary"
                            onClick={() => handleExport(quiz.quiz_id, quiz.title)}
                            title="Xuất Excel"
                          >
                            📥
                          </button>
                          <button
                            className="btn btn-sm btn-danger"
                            onClick={() => handleDeleteQuiz(quiz.quiz_id)}
                            title="Xóa"
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* === DETAIL TAB === */}
        {tab === 'detail' && selectedQuiz && (
          <div>
            {quizAnalyticsLoading ? (
              <div className="spinner-wrap"><div className="spinner" /></div>
            ) : quizAnalytics ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {/* Quiz Header */}
                <div className="card" style={{ padding: '1.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                    <div>
                      <h2 style={{ fontWeight: 800, fontSize: '1.3rem', marginBottom: '0.25rem' }}>{quizAnalytics.quiz.title}</h2>
                      <p style={{ color: 'var(--text-3)', fontSize: '0.85rem' }}>
                        Điểm đạt: {quizAnalytics.quiz.passing_score}% • {quizAnalytics.quiz.quiz_type}
                      </p>
                    </div>
                    <button
                      className="btn btn-secondary"
                      onClick={() => handleExport(selectedQuiz.quiz_id, selectedQuiz.title)}
                    >
                      📥 Xuất bảng điểm CSV
                    </button>
                  </div>
                </div>

                {/* Stats cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
                  {[
                    { icon: '✍️', label: 'Tổng lượt làm', value: quizAnalytics.total_attempts, color: '#6c63ff' },
                    { icon: '🎯', label: 'Tỷ lệ đạt', value: `${quizAnalytics.pass_rate}%`, color: '#38ef7d' },
                    { icon: '📊', label: 'Điểm trung bình', value: `${quizAnalytics.avg_score}%`, color: '#00d4ff' }
                  ].map((s, i) => (
                    <div key={i} className="card" style={{ padding: '1.25rem', textAlign: 'center' }}>
                      <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>{s.icon}</div>
                      <div style={{ fontSize: '1.8rem', fontWeight: 900, color: s.color }}>{s.value}</div>
                      <div style={{ color: 'var(--text-3)', fontSize: '0.8rem', marginTop: 4 }}>{s.label}</div>
                    </div>
                  ))}
                </div>

                {/* Score distribution chart */}
                <div className="card" style={{ padding: '1.5rem' }}>
                  <h3 style={{ fontWeight: 700, marginBottom: '1rem' }}>📈 Phân phối điểm số</h3>
                  <BarChart
                    data={quizAnalytics.score_distribution || Array(10).fill(0)}
                    labels={Array.from({ length: 10 }, (_, i) => `${i * 10}-${i * 10 + 9}`)}
                    color="#6c63ff"
                    height={160}
                  />
                </div>

                {/* Question difficulty */}
                <div className="card" style={{ padding: '1.5rem' }}>
                  <h3 style={{ fontWeight: 700, marginBottom: '1rem' }}>🧩 Phân tích từng câu hỏi</h3>
                  {quizAnalytics.question_stats?.length === 0 ? (
                    <p style={{ opacity: 0.5 }}>Chưa có đủ dữ liệu.</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      {quizAnalytics.question_stats?.map((q, i) => (
                        <div key={q.question_id} style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                          <div style={{
                            width: 28, height: 28, borderRadius: '50%', background: 'var(--bg-3)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontWeight: 800, fontSize: '0.8rem', flexShrink: 0
                          }}>
                            {i + 1}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: 4,
                              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {q.content}
                            </div>
                            <div style={{ height: 8, background: 'var(--border)', borderRadius: 99, overflow: 'hidden' }}>
                              <div style={{
                                height: '100%', borderRadius: 99,
                                background: q.correct_rate >= 70 ? '#38ef7d' : q.correct_rate >= 40 ? '#f59e0b' : '#ff6b67',
                                width: `${q.correct_rate}%`, transition: 'width 0.5s ease'
                              }} />
                            </div>
                          </div>
                          <div style={{ flexShrink: 0, textAlign: 'right' }}>
                            <div style={{
                              fontWeight: 800, fontSize: '0.9rem',
                              color: q.correct_rate >= 70 ? '#38ef7d' : q.correct_rate >= 40 ? '#f59e0b' : '#ff6b67'
                            }}>
                              {q.correct_rate}%
                            </div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-3)' }}>{q.correct_count}/{q.total_count}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Recent attempts */}
                 {/* Recent attempts */}
                <div className="card" style={{ padding: '1.5rem' }}>
                  <h3 style={{ fontWeight: 700, marginBottom: '1rem' }}>🕐 Lượt làm gần đây</h3>
                  {quizAnalytics.recent_attempts?.length === 0 ? (
                    <p style={{ opacity: 0.5 }}>Chưa có lượt làm nào.</p>
                  ) : (
                    <div className="table-wrap" style={{ overflowX: 'auto' }}>
                      <table className="table">
                        <thead>
                          <tr>
                            <th>Sinh viên</th>
                            <th>Lượt</th>
                            <th>Điểm</th>
                            <th>Thời gian làm</th>
                            <th>Nộp lúc</th>
                            <th>KQ</th>
                            <th>Chống gian lận</th>
                          </tr>
                        </thead>
                        <tbody>
                          {quizAnalytics.recent_attempts.map((a, i) => (
                            <tr key={a._id} className="table-row-hover">
                              <td style={{ padding: '0.75rem 1rem' }}>
                                <div style={{ fontWeight: 600 }}>{a.user?.full_name || 'N/A'}</div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>{a.user?.email}</div>
                              </td>
                              <td style={{ fontWeight: 700 }}>#{a.attempt_number}</td>
                              <td>
                                <span style={{ fontWeight: 800, color: a.is_passed ? '#38ef7d' : '#ff6b67' }}>
                                  {a.score}%
                                </span>
                              </td>
                              <td style={{ color: 'var(--text-3)', fontSize: '0.85rem' }}>
                                {a.time_spent_sec ? `${Math.floor(a.time_spent_sec / 60)}p${a.time_spent_sec % 60}s` : '--'}
                              </td>
                              <td style={{ color: 'var(--text-3)', fontSize: '0.85rem' }}>
                                {new Date(a.submitted_at).toLocaleString('vi-VN')}
                              </td>
                              <td>
                                <span className={`tag ${a.is_passed ? 'tag--success' : 'tag--danger'}`} style={{ fontSize: '0.65rem' }}>
                                  {a.is_passed ? 'ĐẠT' : 'TRƯỢT'}
                                </span>
                              </td>
                              <td>
                                {a.cheat_detected ? (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span style={{
                                      fontSize: '0.7rem', fontWeight: 800, background: 'rgba(239,68,68,0.15)',
                                      color: '#ef4444', padding: '2px 8px', borderRadius: 6
                                    }}>
                                      ⚠️ GIAN LẬN ({a.violations?.length || 0} lần)
                                    </span>
                                    <button
                                      className="btn btn-sm btn-secondary"
                                      onClick={() => setActiveViolationAttempt(a)}
                                      style={{ fontSize: '0.7rem', padding: '2px 6px' }}
                                    >
                                      Chi tiết log
                                    </button>
                                  </div>
                                ) : (
                                  <span style={{
                                    fontSize: '0.7rem', fontWeight: 800, background: 'rgba(56,239,125,0.15)',
                                    color: '#38ef7d', padding: '2px 8px', borderRadius: 6
                                  }}>
                                    🛡️ HỢP LỆ
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Modal hiển thị chi tiết log vi phạm gian lận */}
                {activeViolationAttempt && (
                  <div style={{
                    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
                    backdropFilter: 'blur(8px)', zIndex: 9999,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
                  }}>
                    <div style={{
                      background: 'var(--bg-2)', border: '1px solid var(--border)',
                      borderRadius: 24, padding: '2rem', maxWidth: 520, width: '100%',
                      boxShadow: '0 30px 60px rgba(0,0,0,0.5)'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                        <h3 style={{ fontWeight: 800, margin: 0, color: '#ef4444' }}>
                          ⚠️ Nhật ký vi phạm gian lận
                        </h3>
                        <button
                          onClick={() => setActiveViolationAttempt(null)}
                          style={{ background: 'none', border: 'none', color: 'var(--text-2)', fontSize: '1.2rem', cursor: 'pointer' }}
                        >
                          ✕
                        </button>
                      </div>
                      <div style={{ marginBottom: '1.5rem', fontSize: '0.9rem' }}>
                        <div style={{ marginBottom: '0.5rem' }}>
                          <strong>Sinh viên:</strong> {activeViolationAttempt.user?.full_name} ({activeViolationAttempt.user?.email})
                        </div>
                        <div>
                          <strong>Bài thi:</strong> {selectedQuiz.title} (Lượt #{activeViolationAttempt.attempt_number})
                        </div>
                      </div>

                      <div style={{
                        maxHeight: '280px', overflowY: 'auto', background: 'var(--bg-3)',
                        borderRadius: 12, border: '1px solid var(--border)', padding: '1rem'
                      }}>
                        {(!activeViolationAttempt.violations || activeViolationAttempt.violations.length === 0) ? (
                          <div style={{ textAlign: 'center', opacity: 0.5, padding: '1rem' }}>
                            Không có thông tin chi tiết vi phạm.
                          </div>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            {activeViolationAttempt.violations.map((v, idx) => (
                              <div
                                key={idx}
                                style={{
                                  borderLeft: '3px solid #ef4444', paddingLeft: '0.75rem',
                                  fontSize: '0.8rem', lineHeight: 1.4
                                }}
                              >
                                <div style={{ color: '#ef4444', fontWeight: 700 }}>
                                  {v.type === 'TAB_SWITCH' && '🔄 Chuyển tab / Mở ứng dụng khác'}
                                  {v.type === 'WINDOW_BLUR' && '⚠️ Rời tiêu điểm cửa sổ bài thi'}
                                  {v.type === 'FULLSCREEN_EXIT' && '🖥️ Thoát chế độ toàn màn hình'}
                                </div>
                                <div style={{ color: 'var(--text-2)', marginTop: '2px' }}>{v.detail}</div>
                                <div style={{ color: 'var(--text-3)', fontSize: '0.7rem', marginTop: '2px' }}>
                                  Mốc thời gian: {new Date(v.timestamp).toLocaleString('vi-VN')}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
                        <button
                          onClick={() => setActiveViolationAttempt(null)}
                          className="btn btn-secondary"
                        >
                          Đóng
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        )}

        {/* === IMPORT TAB === */}
        {tab === 'import' && (
          <div style={{ maxWidth: 800, margin: '0 auto' }}>
            <div className="card" style={{ padding: '2rem', marginBottom: '1.5rem' }}>
              <h2 style={{ fontWeight: 800, fontSize: '1.2rem', marginBottom: '0.5rem' }}>📥 Import câu hỏi từ CSV</h2>
              <p style={{ color: 'var(--text-3)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
                Tải lên file CSV để import hàng loạt câu hỏi vào ngân hàng
              </p>

              {/* Format Guide */}
              <div style={{ background: 'var(--bg-3)', borderRadius: 14, padding: '1.25rem', marginBottom: '1.5rem', border: '1px solid var(--border)' }}>
                <div style={{ fontWeight: 700, marginBottom: '0.75rem', fontSize: '0.9rem' }}>📋 Định dạng CSV bắt buộc</div>
                <div style={{ fontFamily: 'monospace', fontSize: '0.78rem', color: 'var(--text-3)', lineHeight: 2, overflowX: 'auto' }}>
                  <div style={{ background: 'var(--bg-2)', padding: '0.75rem 1rem', borderRadius: 8, whiteSpace: 'nowrap' }}>
                    content,question_type,points,answer_1,correct_1,answer_2,correct_2,explanation
                  </div>
                  <div style={{ marginTop: '0.5rem', padding: '0 0.25rem' }}>
                    <strong>question_type:</strong> SINGLE_CHOICE | MULTIPLE_CHOICE | TRUE_FALSE | FILL_BLANK | SHORT_ANSWER | ORDERING<br />
                    <strong>correct_N:</strong> TRUE hoặc FALSE<br />
                    <strong>explanation:</strong> Giải thích đáp án (tuỳ chọn)
                  </div>
                </div>
                <button
                  className="btn btn-sm btn-secondary"
                  style={{ marginTop: '1rem' }}
                  onClick={() => {
                    const template = 'content,question_type,points,answer_1,correct_1,answer_2,correct_2,answer_3,correct_3,explanation\n'
                      + '"Thủ đô của Việt Nam là gì?",SINGLE_CHOICE,10,"Hà Nội",TRUE,"TP.HCM",FALSE,"Đà Nẵng",FALSE,"Hà Nội là thủ đô từ năm 1945"\n'
                      + '"2 + 2 = ?",FILL_BLANK,5,"4",TRUE,,,,,"Phép cộng cơ bản"\n'
                    const blob = new Blob(['\uFEFF' + template], { type: 'text/csv;charset=utf-8' })
                    const url = URL.createObjectURL(blob)
                    const a = document.createElement('a')
                    a.href = url; a.download = 'template_import_cau_hoi.csv'
                    a.click(); URL.revokeObjectURL(url)
                  }}
                >
                  ⬇️ Tải template mẫu
                </button>
              </div>

              {/* Upload area */}
              <div
                onClick={() => fileInputRef.current?.click()}
                style={{
                  border: '2px dashed var(--border)', borderRadius: 16,
                  padding: '2.5rem', textAlign: 'center', cursor: 'pointer',
                  background: 'var(--bg-3)', transition: 'border-color 0.2s',
                  marginBottom: '1rem'
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--primary)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
              >
                <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>📂</div>
                <div style={{ fontWeight: 700, marginBottom: '0.25rem' }}>Kéo thả file CSV vào đây</div>
                <div style={{ color: 'var(--text-3)', fontSize: '0.85rem' }}>hoặc click để chọn file</div>
                <input
                  ref={fileInputRef}
                  type="file" accept=".csv,.txt" style={{ display: 'none' }}
                  onChange={e => {
                    const file = e.target.files[0]
                    if (!file) return
                    const reader = new FileReader()
                    reader.onload = evt => {
                      setImportText(evt.target.result)
                      parseCSV(evt.target.result)
                    }
                    reader.readAsText(file, 'utf-8')
                  }}
                />
              </div>

              {/* Or paste CSV */}
              <textarea
                className="form-input"
                placeholder="Hoặc dán nội dung CSV trực tiếp vào đây..."
                value={importText}
                rows={6}
                style={{ fontFamily: 'monospace', fontSize: '0.8rem', marginBottom: '1rem' }}
                onChange={e => { setImportText(e.target.value); parseCSV(e.target.value) }}
              />

              {importError && (
                <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid var(--danger)', color: 'var(--danger)', padding: '0.875rem 1rem', borderRadius: 12, marginBottom: '1rem', fontWeight: 600 }}>
                  ⚠️ {importError}
                </div>
              )}

              {/* Preview */}
              {importPreview.length > 0 && (
                <div>
                  <div style={{ fontWeight: 700, marginBottom: '0.75rem', color: '#38ef7d', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    ✅ Xem trước dữ liệu ({importPreview.length} dòng đầu)
                  </div>
                  <div style={{ overflowX: 'auto', background: 'var(--bg-3)', borderRadius: 12, border: '1px solid var(--border)' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--border)' }}>
                          {Object.keys(importPreview[0]).map(k => (
                            <th key={k} style={{ padding: '0.75rem', textAlign: 'left', color: 'var(--text-3)', fontWeight: 700, whiteSpace: 'nowrap' }}>{k}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {importPreview.map((row, i) => (
                          <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                            {Object.values(row).map((val, j) => (
                              <td key={j} style={{ padding: '0.625rem 0.75rem', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {val}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div style={{ marginTop: '1rem', padding: '0.875rem', background: 'rgba(251,191,36,0.1)', borderRadius: 12, border: '1px solid rgba(251,191,36,0.2)', color: '#f59e0b', fontSize: '0.85rem', fontWeight: 600 }}>
                    ℹ️ Tính năng import hàng loạt sẽ được tích hợp khi chọn bài kiểm tra đích. Hiện tại, hãy dùng tính năng chỉnh sửa câu hỏi trong từng bài kiểm tra.
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}
