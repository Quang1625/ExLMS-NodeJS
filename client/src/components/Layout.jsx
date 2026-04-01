import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Sidebar from './Sidebar'
import Topbar from './Topbar'

function Toast({ message, link, onClose }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  return (
    <div className="toast fade-in" onClick={() => { if (link) navigate(link); onClose(); }}>
      <div className="toast-icon">📝</div>
      <div className="toast-content">
        <h4>{t('notifications.new_notification') || 'Thông báo mới!'}</h4>
        <p>{message}</p>
      </div>
      <button className="toast-close" onClick={(e) => { e.stopPropagation(); onClose(); }}>×</button>
    </div>
  )
}

export default function Layout({ children }) {
  const [toast, setToast] = useState(null)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [pageKey, setPageKey] = useState(0)
  const location = useLocation()

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen)
  const closeSidebar = () => setIsSidebarOpen(false)

  // Trigger page transition on route change
  useEffect(() => {
    setPageKey(prev => prev + 1)
  }, [location.pathname])

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
    <div className={`layout ${isSidebarOpen ? 'sidebar-open' : ''}`}>
      {isSidebarOpen && <div className="sidebar-backdrop" onClick={closeSidebar}></div>}
      
      <Sidebar isOpen={isSidebarOpen} onClose={closeSidebar} />
      
      <div className="layout__content">
        <Topbar onMenuClick={toggleSidebar} />
        <main key={pageKey} className="page fade-in">
          {children}
        </main>
      </div>
      {toast && <Toast message={toast.message} link={toast.link} onClose={() => setToast(null)} />}
    </div>
  )
}
