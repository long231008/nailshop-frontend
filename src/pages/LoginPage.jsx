import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { api, ApiError } from '../api/client'
import { useAuth } from '../context/AuthContext'

export default function LoginPage() {
  const { login: setAuthSession } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const next = searchParams.get('next') || '/'

  const [step, setStep] = useState('phone')
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [pendingId, setPendingId] = useState(null)
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  const [resendIn, setResendIn] = useState(0)

  useEffect(() => {
    if (resendIn <= 0) return
    const timer = setTimeout(() => setResendIn((s) => s - 1), 1000)
    return () => clearTimeout(timer)
  }, [resendIn])

  const requestCode = async () => {
    setError(null)
    setBusy(true)
    try {
      const result = await api.requestOtp({ phone_number: phone })
      setPendingId(result.pending_id)
      setStep('otp')
      setOtp('')
      setResendIn(60)
    } catch (err) {
      if (err instanceof ApiError && err.status === 429) {
        setError('A code was sent recently. Please wait a moment before trying again.')
      } else {
        setError(err.message)
      }
    } finally {
      setBusy(false)
    }
  }

  const handleSendCode = async (e) => {
    e.preventDefault()
    await requestCode()
  }

  const handleVerify = async (e) => {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      const result = await api.verifyOtp({ pending_id: pendingId, otp_code: otp })
      setAuthSession(result)
      navigate(next)
    } catch (err) {
      if (err instanceof ApiError && err.status === 429) {
        setError('Too many incorrect attempts. Please request a new code.')
      } else {
        setError(err.message)
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="container container-narrow">
      <h1>Welcome back</h1>
      <p className="muted">
        Enter your phone number and we&apos;ll text you a one-time code — no password needed.
      </p>

      {step === 'phone' && (
        <form onSubmit={handleSendCode} className="card form-stack">
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
          <p className="muted">
            Enter the 6-digit code we sent to <strong>{phone}</strong>.
          </p>
          <label>
            Verification code
            <input
              className="input"
              type="text"
              inputMode="numeric"
              pattern="\d{6}"
              required
              autoFocus
              placeholder="123456"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
            />
          </label>
          {error && <p className="error-text">{error}</p>}
          <button className="btn" type="submit" disabled={busy}>
            {busy ? 'Verifying...' : 'Verify & log in'}
          </button>
          <button
            className="btn btn-outline"
            type="button"
            disabled={busy || resendIn > 0}
            onClick={requestCode}
          >
            {resendIn > 0 ? `Resend code in ${resendIn}s` : 'Resend code'}
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
