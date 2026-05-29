import { createContext, useContext, useEffect, useState } from 'react'
import { createUserWithEmailAndPassword, onAuthStateChanged, sendEmailVerification, sendPasswordResetEmail, signInWithEmailAndPassword, signOut } from 'firebase/auth'
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore'
import { auth, db } from './firebase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [role, setRole] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async fbUser => {
      if (!fbUser) {
        setUser(null)
        setRole(null)
        setLoading(false)
        return
      }
      setUser(fbUser)
      try {
        const snap = await getDoc(doc(db, 'users', fbUser.uid))
        const data = snap.exists() ? snap.data() : {}
        setRole(data.role || null)
      } catch {
        setRole(null)
      }
      setLoading(false)
    })
    return () => unsub()
  }, [])

  const login = (email, password) => signInWithEmailAndPassword(auth, email, password)
  const resetPassword = email => sendPasswordResetEmail(auth, email)
  const sendVerificationEmail = userToVerify => sendEmailVerification(userToVerify)
  const signupClient = async (email, password) => {
    const credential = await createUserWithEmailAndPassword(auth, email, password)
    let verificationEmailSent = false
    try {
      await sendVerificationEmail(credential.user)
      verificationEmailSent = true
    } catch {
      verificationEmailSent = false
    }
    await setDoc(doc(db, 'users', credential.user.uid), {
      email: credential.user.email,
      role: 'client',
      emailVerified: credential.user.emailVerified,
      verificationEmailSent,
      verificationEmailSentAt: verificationEmailSent ? serverTimestamp() : null,
      createdAt: serverTimestamp()
    })
    setUser(credential.user)
    setRole('client')
    return { credential, verificationEmailSent }
  }
  const logout = () => signOut(auth)

  return (
    <AuthContext.Provider value={{ user, role, loading, login, resetPassword, sendVerificationEmail, signupClient, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
