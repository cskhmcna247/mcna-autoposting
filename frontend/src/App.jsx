import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import Layout from './components/Layout'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import PostsPage from './pages/PostsPage'
import PostFormPage from './pages/PostFormPage'
import WorkflowPage from './pages/WorkflowPage'
import SettingsPage from './pages/SettingsPage'
import UsersPage from './pages/UsersPage'
import CalendarPage from './pages/CalendarPage'

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="flex items-center justify-center h-screen text-gray-400">Đang tải...</div>
  if (!user) return <Navigate to="/login" replace />
  return children
}

function AdminRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="flex items-center justify-center h-screen text-gray-400">Đang tải...</div>
  if (!user) return <Navigate to="/login" replace />
  if (user.role !== 'admin') return <Navigate to="/" replace />
  return children
}

function AppRoutes() {
  const { user, loading } = useAuth()
  if (loading) return <div className="flex items-center justify-center h-screen text-gray-400">Đang tải...</div>

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/posts" element={<PostsPage />} />
        <Route path="/posts/new" element={<PostFormPage />} />
        <Route path="/posts/:id/edit" element={<PostFormPage />} />
        <Route path="/calendar" element={<AdminRoute><CalendarPage /></AdminRoute>} />
        <Route path="/workflow" element={<AdminRoute><WorkflowPage /></AdminRoute>} />
        <Route path="/users" element={<AdminRoute><UsersPage /></AdminRoute>} />
        <Route path="/settings" element={<AdminRoute><SettingsPage /></AdminRoute>} />
      </Route>
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}
