import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function AuthCallbackPage() {
  const { login } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.slice(1))
    const token = params.get('token')
    const userId = params.get('user_id')
    const role = params.get('role')

    if (token && userId && role) {
      login({ access_token: token, user_id: userId, role })
      navigate('/', { replace: true })
    } else {
      navigate('/login', { replace: true })
    }
  }, [login, navigate])

  return <div className="container muted">Signing you in...</div>
}
