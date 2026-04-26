import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from './AuthContext'
import { tr } from './i18n'
import LanguageSwitcher from './LanguageSwitcher'
import logo from './images/logo-esgea.png'

export default function Mode({ lang, setLang }) {
  const { user, role, loading, login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const t = key => tr(lang, key)

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
      setError(t('invalidCredentials'))
    }
  }

  return (
    <div style={{display:'grid',placeItems:'center',height:'100vh',background:'#f7fafc'}}>
      <div style={{background:'#fff',border:'1px solid #cbd5e1',borderRadius:16,padding:24,minWidth:320,textAlign:'center',boxShadow:'0 6px 24px rgba(15,23,42,.08)'}}>
        <LanguageSwitcher lang={lang} setLang={setLang} />

        <img src={logo} style={{ width: '65%', height: 'auto' }} alt="eSgEA" />

        <div style={{color:'#475569',fontSize:14,marginBottom:16}}>
          {t('signIn')}
        </div>

        <form onSubmit={onSubmit} style={{display:'flex',flexDirection:'column',gap:12}}>
          <input
            type="email"
            value={email}
            onChange={e=>setEmail(e.target.value)}
            placeholder={t('email')}
            style={{padding:'10px',borderRadius:12,border:'1px solid #cbd5e1'}}
          />

          <input
            type="password"
            value={password}
            onChange={e=>setPassword(e.target.value)}
            placeholder={t('password')}
            style={{padding:'10px',borderRadius:12,border:'1px solid #cbd5e1'}}
          />

          {error && <div style={{color:'#b91c1c',fontSize:12}}>{error}</div>}

          <button
            type="submit"
            style={{background:'#2563eb',color:'#fff',padding:'10px 16px',borderRadius:12,border:'none',cursor:'pointer'}}
            disabled={loading}
          >
            {t('logIn')}
          </button>
        </form>
      </div>
    </div>
  )
}