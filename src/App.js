import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Mode from './Mode'
import Client from './Client'
import Moderator from './Moderator'
import './App.css'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Mode />} />
        <Route path="/client" element={<Client />} />
        <Route path="/mod" element={<Moderator />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}