import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from './AuthContext'
import { tr } from './i18n'
import LanguageSwitcher from './LanguageSwitcher'
import logo from './images/logo-esgea.png'

export default function Mode({ lang, setLang }) {
  const { user, role, loading, login, logout, resetPassword, sendVerificationEmail, signupClient } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [pendingAction, setPendingAction] = useState(null)
  const [showPassword, setShowPassword] = useState(false)
  const [showSignupFields, setShowSignupFields] = useState(false)
  const [signupComplete, setSignupComplete] = useState(false)
  const [verificationEmailSent, setVerificationEmailSent] = useState(false)
  const navigate = useNavigate()
  const t = key => tr(lang, key)

  useEffect(() => {
    if (loading || !user || !role) return undefined
    if (submitting) return undefined
    if (!user.emailVerified) return undefined

    if (signupComplete && role === 'client') {
      return undefined
    }

    if (!signupComplete) {
      if (role === 'client') navigate('/client', { replace: true })
      if (role === 'moderator') navigate('/mod', { replace: true })
    }

    return undefined
  }, [user, role, loading, navigate, signupComplete, submitting])

  async function onSubmit(e) {
    e.preventDefault()
    await signIn()
  }

  async function signIn() {
    setError('')
    setNotice('')
    setSignupComplete(false)
    setVerificationEmailSent(false)
    setSubmitting(true)
    setPendingAction('login')
    try {
      const credential = await login(email, password)
      if (!credential.user.emailVerified) {
        try {
          await sendVerificationEmail(credential.user)
          setError(t('emailNotVerifiedResent'))
        } catch {
          setError(t('emailNotVerified'))
        }
        await logout()
      }
    } catch {
      setError(t('invalidCredentials'))
    } finally {
      setSubmitting(false)
      setPendingAction(null)
    }
  }

  async function onSignUp() {
    setError('')
    setNotice('')
    setShowSignupFields(true)
    if (!showSignupFields) return

    if (password !== confirmPassword) {
      setError(t('passwordMismatch'))
      return
    }

    setSubmitting(true)
    setPendingAction('signup')
    try {
      const result = await signupClient(email, password)
      setVerificationEmailSent(result.verificationEmailSent)
      await logout()
      setSignupComplete(true)
    } catch (e) {
      setError(signupErrorMessage(e))
    } finally {
      setSubmitting(false)
      setPendingAction(null)
    }
  }

  function signupErrorMessage(error) {
    if (error?.code === 'auth/invalid-email') return t('signupInvalidEmail')
    if (error?.code === 'auth/email-already-in-use') return t('signupUserExists')
    if (error?.code === 'auth/weak-password') return t('signupPasswordTooShort')
    return t('signupFailed')
  }

  async function onForgotPassword() {
    setError('')
    setNotice('')

    if (!email.trim()) {
      setError(t('enterEmailForReset'))
      return
    }

    setSubmitting(true)
    setPendingAction('reset')
    try {
      await resetPassword(email.trim())
      setNotice(t('passwordResetSent'))
    } catch {
      setError(t('passwordResetFailed'))
    } finally {
      setSubmitting(false)
      setPendingAction(null)
    }
  }

  const passwordInputType = showPassword ? 'text' : 'password'
  const passwordToggleLabel = showPassword ? t('hidePassword') : t('showPassword')
  const passwordFieldStyle = {
    width:'100%',
    boxSizing:'border-box',
    padding:'10px 104px 10px 10px',
    borderRadius:12,
    border:'1px solid #cbd5e1'
  }
  const passwordToggleStyle = {
    position:'absolute',
    right:6,
    top:'50%',
    transform:'translateY(-50%)',
    height:30,
    padding:'0 10px',
    minWidth:82,
    borderRadius:8,
    border:'1px solid #cbd5e1',
    background:'#f8fafc',
    color:'#334155',
    fontSize:12,
    cursor:'pointer'
  }
  const actionButtonStyle = {
    flex:1,
    background:'#2563eb',
    color:'#fff',
    padding:'10px 16px',
    borderRadius:12,
    border:'none',
    cursor:'pointer',
    minWidth:0
  }
  const pendingMessage = pendingAction === 'login'
    ? t('loginPending')
    : pendingAction === 'signup'
      ? t('signupPending')
      : pendingAction === 'reset'
        ? t('passwordResetPending')
        : ''

  if (signupComplete) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <img src={logo} style={{ width: '65%', height: 'auto' }} alt="eSgEA" />
          <h2 style={{margin:'18px 0 8px',fontSize:20,color:'#0f172a'}}>
            {t('signupSuccessTitle')}
          </h2>
          <div style={{color:'#475569',fontSize:14}}>
            {verificationEmailSent ? t('signupSuccessMessage') : t('signupSuccessNoVerificationMessage')}
          </div>
          <button
            type="button"
            onClick={() => {
              setSignupComplete(false)
              setShowSignupFields(false)
              setShowPassword(false)
              setError('')
              setNotice('')
              setPassword('')
              setConfirmPassword('')
            }}
            style={{background:'#2563eb',color:'#fff',padding:'10px 16px',borderRadius:12,border:'none',cursor:'pointer',marginTop:18}}
          >
            {t('backToSignIn')}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
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

          <div style={{position:'relative'}}>
            <input
              type={passwordInputType}
              value={password}
              onChange={e=>setPassword(e.target.value)}
              placeholder={t('password')}
              style={passwordFieldStyle}
            />
            <button
              type="button"
              onClick={() => setShowPassword(current => !current)}
              style={passwordToggleStyle}
              aria-label={passwordToggleLabel}
            >
              {passwordToggleLabel}
            </button>
          </div>

          {showSignupFields && (
            <div style={{position:'relative'}}>
              <input
                type={passwordInputType}
                value={confirmPassword}
                onChange={e=>setConfirmPassword(e.target.value)}
                placeholder={t('confirmPassword')}
                style={passwordFieldStyle}
              />
              <button
                type="button"
                onClick={() => setShowPassword(current => !current)}
                style={passwordToggleStyle}
                aria-label={passwordToggleLabel}
              >
                {passwordToggleLabel}
              </button>
            </div>
          )}

          {error && <div style={{color:'#b91c1c',fontSize:12}}>{error}</div>}
          {notice && <div style={{color:'#047857',fontSize:12}}>{notice}</div>}
          {pendingMessage && <div style={{color:'#475569',fontSize:12}}>{pendingMessage}</div>}

          <div className="auth-actions">
            <button
              type="submit"
              style={actionButtonStyle}
              disabled={loading || submitting}
            >
              {t('logIn')}
            </button>

            <button
              type="button"
              onClick={onSignUp}
              style={actionButtonStyle}
              disabled={loading || submitting}
            >
              {t('signUpClient')}
            </button>
          </div>

          <button
            type="button"
            onClick={onForgotPassword}
            style={{background:'transparent',color:'#2563eb',padding:0,border:'none',height:'auto',fontSize:13,cursor:'pointer'}}
            disabled={loading || submitting}
          >
            {t('forgotPassword')}
          </button>
        </form>
      </div>
    </div>
  )
}
