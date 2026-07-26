import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { api, ApiError } from '../api/client'
import { useAuth } from '../context/AuthContext'

export default function LoginPage() {
  const { login: setAuthSession } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const next = searchParams.get('next') || '/'

  const [step, setStep] = useState('identifier')
  const [method, setMethod] = useState('phone')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [pendingId, setPendingId] = useState(null)
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  const [resendIn, setResendIn] = useState(0)
  const [session, setSession] = useState(null)
  const [firstName, setFirstName] = useState('')
  const [surname, setSurname] = useState('')

  const identifier = method === 'phone' ? phone : email

  useEffect(() => {
    if (resendIn <= 0) return
    const timer = setTimeout(() => setResendIn((s) => s - 1), 1000)
    return () => clearTimeout(timer)
  }, [resendIn])

  const requestCode = async () => {
    setError(null)
    setBusy(true)
    try {
      const payload = method === 'phone' ? { phone_number: phone } : { email }
      const result = await api.requestOtp(payload)
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
      // New accounts finish by telling us their name before entering the site.
      const profile = await api.myProfile(result.access_token)
      if (!profile.first_name) {
        setSession(result)
        setStep('name')
        return
      }
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

  const handleSaveName = async (e) => {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      await api.updateMyProfile(
        { first_name: firstName.trim(), surname: surname.trim() },
        session.access_token
      )
      setAuthSession(session)
      navigate(next)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="container container-narrow">
      <h1>Welcome back</h1>
      <p className="muted">
        Enter your phone number or email and we&apos;ll send you a one-time code — no password
        needed.
      </p>

      {step === 'identifier' && (
        <form onSubmit={handleSendCode} className="card form-stack">
          <div className="method-toggle">
            <button
              type="button"
              className={'btn btn-outline' + (method === 'phone' ? ' method-active' : '')}
              onClick={() => setMethod('phone')}
            >
              Phone
            </button>
            <button
              type="button"
              className={'btn btn-outline' + (method === 'email' ? ' method-active' : '')}
              onClick={() => setMethod('email')}
            >
              Email
            </button>
          </div>

          {method === 'phone' ? (
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
          ) : (
            <label>
              Email address
              <input
                className="input"
                type="email"
                required
                placeholder="you@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
          )}
          {error && <p className="error-text">{error}</p>}
          <button className="btn" type="submit" disabled={busy}>
            {busy ? 'Sending code...' : 'Send verification code'}
          </button>
        </form>
      )}

      {step === 'otp' && (
        <form onSubmit={handleVerify} className="card form-stack">
          <p className="muted">
            Enter the 6-digit code we sent to <strong>{identifier}</strong>.
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

      {step === 'name' && (
        <form onSubmit={handleSaveName} className="card form-stack">
          <p className="muted">Almost there — tell us your name so the salon knows who you are.</p>
          <label>
            First name
            <input
              className="input"
              type="text"
              required
              maxLength={100}
              autoFocus
              placeholder="Lan"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
            />
          </label>
          <label>
            Surname
            <input
              className="input"
              type="text"
              required
              maxLength={100}
              placeholder="Nguyen"
              value={surname}
              onChange={(e) => setSurname(e.target.value)}
            />
          </label>
          {error && <p className="error-text">{error}</p>}
          <button className="btn" type="submit" disabled={busy}>
            {busy ? 'Saving...' : 'Continue'}
          </button>
        </form>
      )}

      <div className="divider">or</div>

      <div className="social-stack">
        <a href={api.googleLoginUrl()} className="btn btn-outline google-btn">
          Continue with Google
        </a>
        <a href={api.facebookLoginUrl()} className="btn btn-outline google-btn">
          Continue with Facebook
        </a>
      </div>
    </div>
  )
}
