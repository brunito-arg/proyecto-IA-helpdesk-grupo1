import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import CreateIncident from './pages/CreateIncident'
import IncidentDetail from './pages/IncidentDetail'
import AdminPanel from './pages/AdminPanel'
import Profile from './pages/Profile'
import Asistente from './pages/Asistente'

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/dashboard" element={
            <ProtectedRoute><Dashboard /></ProtectedRoute>
          } />
          <Route path="/create" element={
            <ProtectedRoute><CreateIncident /></ProtectedRoute>
          } />
          <Route path="/incidents/:id" element={
            <ProtectedRoute><IncidentDetail /></ProtectedRoute>
          } />
          <Route path="/asistente" element={
            <ProtectedRoute><Asistente /></ProtectedRoute>
          } />
          <Route path="/admin" element={
            <ProtectedRoute roles={['ADMIN']}><AdminPanel /></ProtectedRoute>
          } />
          <Route path="/profile" element={
            <ProtectedRoute><Profile /></ProtectedRoute>
          } />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Route>
      </Routes>
    </AuthProvider>
  )
}
