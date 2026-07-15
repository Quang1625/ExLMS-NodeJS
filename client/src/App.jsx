import React, { Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { SocketProvider } from './context/SocketContext'
import PrivateRoute from './components/PrivateRoute'
import { ThemeProvider } from './context/ThemeContext'

// Lazy Loading Pages for Performance (Code-splitting)
const Login = React.lazy(() => import('./pages/Login'))
const Register = React.lazy(() => import('./pages/Register'))
const Dashboard = React.lazy(() => import('./pages/Dashboard'))
const Courses = React.lazy(() => import('./pages/Courses'))
const CourseDetail = React.lazy(() => import('./pages/CourseDetail'))
const Groups = React.lazy(() => import('./pages/Groups'))
const GroupDetail = React.lazy(() => import('./pages/GroupDetail'))
const Forum = React.lazy(() => import('./pages/Forum'))
const ForumNew = React.lazy(() => import('./pages/ForumNew'))
const ForumPost = React.lazy(() => import('./pages/ForumPost'))
const Assignments = React.lazy(() => import('./pages/Assignments'))
const AssignmentDetail = React.lazy(() => import('./pages/AssignmentDetail'))
const Calendar = React.lazy(() => import('./pages/Calendar'))
const Notifications = React.lazy(() => import('./pages/Notifications'))
const Profile = React.lazy(() => import('./pages/Profile'))
const Admin = React.lazy(() => import('./pages/Admin'))
const QuizLobby = React.lazy(() => import('./pages/QuizLobbyNew'))
const QuizHost = React.lazy(() => import('./pages/QuizHost'))
const QuizPlay = React.lazy(() => import('./pages/QuizPlay'))
const QuizResult = React.lazy(() => import('./pages/QuizResult'))
const QuizDashboard = React.lazy(() => import('./pages/QuizDashboard'))
const Exams = React.lazy(() => import('./pages/Exams'))
const QuizSinglePlay = React.lazy(() => import('./pages/QuizSinglePlay'))
const QuizResultDetail = React.lazy(() => import('./pages/QuizResultDetail'))
const AdminQuizManager = React.lazy(() => import('./pages/AdminQuizManager'))

const LoadingFallback = () => (
  <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
      <div className="spinner" style={{ width: '40px', height: '40px', border: '3px solid rgba(108,99,255,0.2)', borderTopColor: 'var(--primary)' }}></div>
      <p style={{ color: 'var(--text-3)', fontWeight: 600 }}>Đang tải...</p>
    </div>
  </div>
)




export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <SocketProvider>
            <BrowserRouter>
              <Suspense fallback={<LoadingFallback />}>
                <Routes>
              {/* Public */}
              <Route path="/login"    element={<Login />} />
              <Route path="/register" element={<Register />} />

              {/* Protected */}
              <Route path="/" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
              <Route path="/courses" element={<PrivateRoute><Courses /></PrivateRoute>} />
              <Route path="/courses/:id" element={<PrivateRoute><CourseDetail /></PrivateRoute>} />
              <Route path="/groups" element={<PrivateRoute><Groups /></PrivateRoute>} />
              <Route path="/groups/:id" element={<PrivateRoute><GroupDetail /></PrivateRoute>} />
              <Route path="/forum" element={<PrivateRoute><Forum /></PrivateRoute>} />
              <Route path="/forum/new" element={<PrivateRoute><ForumNew /></PrivateRoute>} />
              <Route path="/forum/:id" element={<PrivateRoute><ForumPost /></PrivateRoute>} />
              <Route path="/assignments" element={<PrivateRoute><Assignments /></PrivateRoute>} />
              <Route path="/assignments/:id" element={<PrivateRoute><AssignmentDetail /></PrivateRoute>} />
              <Route path="/exams"           element={<PrivateRoute><Exams /></PrivateRoute>} />
              <Route path="/calendar" element={<PrivateRoute><Calendar /></PrivateRoute>} />
              <Route path="/notifications" element={<PrivateRoute><Notifications /></PrivateRoute>} />
              <Route path="/profile"       element={<PrivateRoute><Profile /></PrivateRoute>} />
              <Route path="/admin"         element={<PrivateRoute><Admin /></PrivateRoute>} />

              {/* Quiz Realtime */}
              <Route path="/quiz/join"        element={<PrivateRoute><QuizLobby /></PrivateRoute>} />
              <Route path="/quiz/host/:code" element={<PrivateRoute><QuizHost /></PrivateRoute>} />
              <Route path="/quiz/play/:code" element={<PrivateRoute><QuizPlay /></PrivateRoute>} />
              <Route path="/quiz/result/:code" element={<PrivateRoute><QuizResult /></PrivateRoute>} />
              <Route path="/quiz/dashboard"    element={<PrivateRoute><QuizDashboard /></PrivateRoute>} />
              <Route path="/quiz/:id/result/:attemptId" element={<PrivateRoute><QuizResultDetail /></PrivateRoute>} />
              <Route path="/quiz/:id"          element={<PrivateRoute><QuizSinglePlay /></PrivateRoute>} />
              <Route path="/admin/quiz-manager" element={<PrivateRoute><AdminQuizManager /></PrivateRoute>} />

              {/* 404 → redirect */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
            </Suspense>
          </BrowserRouter>
      </SocketProvider>
    </AuthProvider>
  </ThemeProvider>
  )
}
