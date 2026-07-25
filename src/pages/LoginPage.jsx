import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { api, ApiError } from '../api/client'
import { useAuth } from '../context/AuthContext'

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const next = searchParams.get('next') || '/'

  const [step, setStep] = useState('phone')
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [pendingId, setPendingId] = useState(null)
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  const handleRegister = async (e) => {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      const result = await api.register({ phone_number: phone })
      setPendingId(result.pending_id)
      setStep('otp')
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setError(
          'This phone number is already registered. Please use "Continue with Google" instead.'
        )
      } else {
        setError(err.message)
      }
    } finally {
      setBusy(false)
    }
  }

  const handleVerify = async (e) => {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      const result = await api.verifyOtp({ pending_id: pendingId, otp_code: otp })
      login(result)
      navigate(next)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="container container-narrow">
      <h1>Log in</h1>

      {step === 'phone' && (
        <form onSubmit={handleRegister} className="card form-stack">
          <label>
            Phone number
            <input
              className="input"
              type="tel"
              required
              placeholder="0901234567"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </label>
          {error && <p className="error-text">{error}</p>}
          <button className="btn" type="submit" disabled={busy}>
            {busy ? 'Sending code...' : 'Send verification code'}
          </button>
        </form>
      )}

      {step === 'otp' && (
        <form onSubmit={handleVerify} className="card form-stack">
          <p className="muted">Enter the 6-digit code we sent you.</p>
          <label>
            Verification code
            <input
              className="input"
              type="text"
              inputMode="numeric"
              pattern="\d{6}"
              required
              placeholder="123456"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
            />
          </label>
          {error && <p className="error-text">{error}</p>}
          <button className="btn" type="submit" disabled={busy}>
            {busy ? 'Verifying...' : 'Verify & log in'}
          </button>
        </form>
      )}

      <div className="divider">or</div>

      <a href={api.googleLoginUrl()} className="btn btn-outline google-btn">
        Continue with Google
      </a>
    </div>
  )
}
