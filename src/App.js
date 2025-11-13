import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Mode from './Mode'
import Client from './Client'
import Moderator from './Moderator'
import './App.css'
import { useAuth } from './AuthContext'

function ClientRoute() {
  const { user, role, loading } = useAuth()
  if (loading) return null
  if (!user) return <Navigate to="/" replace />
  if (role !== 'client') return <Navigate to="/" replace />
  return <Client />
}

function ModeratorRoute() {
  const { user, role, loading } = useAuth()
  if (loading) return null
  if (!user) return <Navigate to="/" replace />
  if (role !== 'moderator') return <Navigate to="/" replace />
  return <Moderator />
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Mode />} />
        <Route path="/client" element={<ClientRoute />} />
        <Route path="/mod" element={<ModeratorRoute />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
