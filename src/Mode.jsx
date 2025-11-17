import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from './AuthContext'

import logo from './images/logo-esgea.png';

export default function Mode() {
  const { user, role, loading, login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    if (!loading && user && role) {
      if (role === 'client') navigate('/client', { replace: true })
      else if (role === 'moderator') navigate('/mod', { replace: true })
    }
  }, [user, role, loading, navigate])

  async function onSubmit(e) {
    e.preventDefault()
    setError('')
    try {
      await login(email, password)
    } catch {
      setError('Invalid credentials')
    }
  }

  return (
    <div style={{display:'grid',placeItems:'center',height:'100vh',background:'#f7fafc'}}>
      <div style={{background:'#fff',border:'1px solid #cbd5e1',borderRadius:16,padding:24,minWidth:320,textAlign:'center',boxShadow:'0 6px 24px rgba(15,23,42,.08)'}}>
        {/* <h2 style={{margin:'0 0 4px'}}>eSgEA Chat</h2> */}
        <img src={logo} style={{ width: '65%', height: 'auto' }} />
        <div style={{color:'#475569',fontSize:14,marginBottom:16}}>Sign in</div>
        <form onSubmit={onSubmit} style={{display:'flex',flexDirection:'column',gap:12}}>
          <input
            type="email"
            value={email}
            onChange={e=>setEmail(e.target.value)}
            placeholder="Email"
            style={{padding:'10px',borderRadius:12,border:'1px solid #cbd5e1'}}
          />
          <input
            type="password"
            value={password}
            onChange={e=>setPassword(e.target.value)}
            placeholder="Password"
            style={{padding:'10px',borderRadius:12,border:'1px solid #cbd5e1'}}
          />
          {error && <div style={{color:'#b91c1c',fontSize:12}}>{error}</div>}
          <button
            type="submit"
            style={{background:'#2563eb',color:'#fff',padding:'10px 16px',borderRadius:12,border:'none',cursor:'pointer'}}
            disabled={loading}
          >
            Log in
          </button>
        </form>
      </div>
    </div>
  )
}
