import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { SocketProvider } from './context/SocketContext'
import PrivateRoute from './components/PrivateRoute'

import Login       from './pages/Login'
import Register    from './pages/Register'
import Dashboard   from './pages/Dashboard'
import Courses     from './pages/Courses'
import CourseDetail from './pages/CourseDetail'
import Groups      from './pages/Groups'
import GroupDetail from './pages/GroupDetail'
import Forum       from './pages/Forum'
import ForumNew    from './pages/ForumNew'
import ForumPost   from './pages/ForumPost'
import Assignments from './pages/Assignments'
import AssignmentDetail from './pages/AssignmentDetail'
import Calendar    from './pages/Calendar'
import Notifications from './pages/Notifications'
import Profile       from './pages/Profile'
import Admin       from './pages/Admin'
import QuizLobby   from './pages/QuizLobbyNew'
import QuizHost    from './pages/QuizHost'
import QuizPlay    from './pages/QuizPlay'
import QuizResult  from './pages/QuizResult'
import QuizDashboard from './pages/QuizDashboard'
import Exams         from './pages/Exams'
import QuizSinglePlay from './pages/QuizSinglePlay'


import { ThemeProvider } from './context/ThemeContext'

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <SocketProvider>
          <BrowserRouter>
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
            <Route path="/quiz/:id"          element={<PrivateRoute><QuizSinglePlay /></PrivateRoute>} />
            <Route path="/quiz/dashboard"    element={<PrivateRoute><QuizDashboard /></PrivateRoute>} />



            {/* 404 → redirect */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </SocketProvider>
    </AuthProvider>
  </ThemeProvider>
  )
}
