import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Sidebar from './Sidebar'
import Topbar from './Topbar'

function Toast({ message, link, onClose }) {
  const navigate = useNavigate()
  return (
    <div className="toast fade-in" onClick={() => { if (link) navigate(link); onClose(); }}>
      <div className="toast-icon">📝</div>
      <div className="toast-content">
        <h4>Bài tập mới!</h4>
        <p>{message}</p>
      </div>
      <button className="toast-close" onClick={(e) => { e.stopPropagation(); onClose(); }}>×</button>
    </div>
  )
}

export default function Layout({ children }) {
  const [toast, setToast] = useState(null)

  useEffect(() => {
    const handleNewNotif = (e) => {
      setToast({
        id: Date.now(),
        message: e.detail.title + ' - ' + e.detail.group_name,
        link: `/assignments/${e.detail.assignment_id}`
      })
      setTimeout(() => setToast(null), 7000)
    }
    window.addEventListener('new_notification', handleNewNotif)
    return () => window.removeEventListener('new_notification', handleNewNotif)
  }, [])

  return (
    <div className="layout">
      <Sidebar />
      <div className="layout__content">
        <Topbar />
        <main className="page fade-in">
          {children}
        </main>
      </div>
      {toast && <Toast message={toast.message} link={toast.link} onClose={() => setToast(null)} />}
    </div>
  )
}
