import { createContext, useContext, useEffect, useState } from 'react'

const AuthContext = createContext(null)
const STORAGE_KEY = 'nailshop_auth'

function loadStoredAuth() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState(loadStoredAuth)

  useEffect(() => {
    if (auth) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(auth))
    } else {
      localStorage.removeItem(STORAGE_KEY)
    }
  }, [auth])

  // Fired by the API client on a 401: the token has expired or been revoked.
  useEffect(() => {
    const onExpired = () => setAuth(null)
    window.addEventListener('nailshop:session-expired', onExpired)
    return () => window.removeEventListener('nailshop:session-expired', onExpired)
  }, [])

  const login = ({ access_token, user_id, role }) => {
    setAuth({ token: access_token, userId: user_id, role })
  }

  const logout = () => setAuth(null)

  return (
    <AuthContext.Provider value={{ auth, login, logout }}>{children}</AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
