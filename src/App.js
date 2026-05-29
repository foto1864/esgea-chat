import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useState } from 'react'
import Mode from './Mode'
import Client from './Client'
import Moderator from './Moderator'
import './App.css'
import { useAuth } from './AuthContext'
import { getInitialLang } from './i18n'

function ClientRoute({ lang, setLang }) {
  const { user, role, loading } = useAuth()
  if (loading) return null
  if (!user) return <Navigate to="/" replace />
  if (!user.emailVerified) return <Navigate to="/" replace />
  if (role !== 'client') return <Navigate to="/" replace />
  return <Client lang={lang} setLang={setLang} />
}

function ModeratorRoute({ lang, setLang }) {
  const { user, role, loading } = useAuth()
  if (loading) return null
  if (!user) return <Navigate to="/" replace />
  if (!user.emailVerified) return <Navigate to="/" replace />
  if (role !== 'moderator') return <Navigate to="/" replace />
  return <Moderator lang={lang} setLang={setLang} />
}

export default function App() {
  const [lang, setLang] = useState(getInitialLang)

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Mode lang={lang} setLang={setLang} />} />
        <Route path="/client" element={<ClientRoute lang={lang} setLang={setLang} />} />
        <Route path="/mod" element={<ModeratorRoute lang={lang} setLang={setLang} />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
