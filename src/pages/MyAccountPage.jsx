import { useCallback, useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'

const CANCELLABLE_STATUSES = new Set(['pending', 'approved'])

export default function MyAccountPage() {
  const { auth } = useAuth()
  const [profile, setProfile] = useState(null)
  const [bookings, setBookings] = useState(null)
  const [branchNames, setBranchNames] = useState({})
  const [error, setError] = useState(null)

  const [email, setEmail] = useState('')
  const [firstName, setFirstName] = useState('')
  const [surname, setSurname] = useState('')
  const [saveMsg, setSaveMsg] = useState(null)
  const [saving, setSaving] = useState(false)

  // Changing an email is a two-step, verified action of its own.
  const [emailStep, setEmailStep] = useState('idle')
  const [emailCode, setEmailCode] = useState('')
  const [emailMsg, setEmailMsg] = useState(null)
  const [emailBusy, setEmailBusy] = useState(false)
  const [cancellingId, setCancellingId] = useState(null)
  const [cancelError, setCancelError] = useState(null)

  const loadBookings = useCallback(() => {
    if (!auth) return
    api.myBookings(auth.token).then(setBookings).catch((err) => setError(err.message))
  }, [auth])

  useEffect(() => {
    if (!auth) return
    api
      .myProfile(auth.token)
      .then((data) => {
        setProfile(data)
        setEmail(data.email || '')
        setFirstName(data.first_name || '')
        setSurname(data.surname || '')
      })
      .catch((err) => setError(err.message))
    loadBookings()
    api
      .listBranches()
      .then((branches) => {
        const map = {}
        for (const b of branches) map[b.id] = b.name
        setBranchNames(map)
      })
      .catch(() => {})
  }, [auth, loadBookings])

  if (!auth) return <Navigate to="/login" replace />

  const handleSave = async (e) => {
    e.preventDefault()
    setSaveMsg(null)
    setSaving(true)
    try {
      const payload = {}
      if (firstName.trim()) payload.first_name = firstName.trim()
      if (surname.trim()) payload.surname = surname.trim()
      const updated = await api.updateMyProfile(payload, auth.token)
      setProfile(updated)
      setSaveMsg('Saved.')
    } catch (err) {
      setSaveMsg(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleEmailRequest = async (e) => {
    e.preventDefault()
    setEmailMsg(null)
    setEmailBusy(true)
    try {
      await api.requestEmailChange(email.trim(), auth.token)
      setEmailStep('code')
      setEmailMsg(`We sent a confirmation code to ${email.trim()}.`)
    } catch (err) {
      setEmailMsg(err.message)
    } finally {
      setEmailBusy(false)
    }
  }

  const handleEmailConfirm = async (e) => {
    e.preventDefault()
    setEmailMsg(null)
    setEmailBusy(true)
    try {
      const updated = await api.confirmEmailChange(emailCode.trim(), auth.token)
      setProfile(updated)
      setEmail(updated.email || '')
      setEmailCode('')
      setEmailStep('idle')
      setEmailMsg('Email confirmed.')
    } catch (err) {
      setEmailMsg(err.message)
    } finally {
      setEmailBusy(false)
    }
  }

  const handleCancel = async (bookingId) => {
    setCancelError(null)
    setCancellingId(bookingId)
    try {
      await api.cancelBooking(bookingId, auth.token)
      loadBookings()
    } catch (err) {
      setCancelError(err.message)
    } finally {
      setCancellingId(null)
    }
  }

  return (
    <div className="container">
      <h1>My account</h1>
      {error && <p className="error-text">{error}</p>}

      {profile && (
        <div className="card">
          <h2>Profile</h2>
          <p className="muted">Phone: {profile.phone_number || '-'}</p>
          <form onSubmit={handleSave} className="form-stack">
            <div className="lock-time-row">
              <label>
                First name
                <input
                  className="input"
                  type="text"
                  maxLength={100}
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Lan"
                />
              </label>
              <label>
                Surname
                <input
                  className="input"
                  type="text"
                  maxLength={100}
                  value={surname}
                  onChange={(e) => setSurname(e.target.value)}
                  placeholder="Nguyen"
                />
              </label>
            </div>
            {saveMsg && <p className="muted">{saveMsg}</p>}
            <button className="btn" type="submit" disabled={saving}>
              {saving ? 'Saving...' : 'Save'}
            </button>
          </form>
        </div>
      )}

      {profile && (
        <div className="card" style={{ marginTop: '1rem' }}>
          <h2>Email address</h2>
          <p className="muted">
            {profile.email
              ? `Current: ${profile.email}`
              : 'No email yet — add one to sign in with Google or Facebook.'}
          </p>

          {emailStep === 'idle' ? (
            <form onSubmit={handleEmailRequest} className="form-stack">
              <label>
                New email
                <input
                  className="input"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                />
              </label>
              {emailMsg && <p className="muted">{emailMsg}</p>}
              <button
                className="btn"
                type="submit"
                disabled={emailBusy || !email.trim() || email.trim() === profile.email}
              >
                {emailBusy ? 'Sending...' : 'Send confirmation code'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleEmailConfirm} className="form-stack">
              <label>
                Confirmation code
                <input
                  className="input"
                  type="text"
                  inputMode="numeric"
                  pattern="\d{6}"
                  required
                  autoFocus
                  placeholder="123456"
                  value={emailCode}
                  onChange={(e) => setEmailCode(e.target.value)}
                />
              </label>
              {emailMsg && <p className="muted">{emailMsg}</p>}
              <div className="lock-actions">
                <button className="btn" type="submit" disabled={emailBusy}>
                  {emailBusy ? 'Confirming...' : 'Confirm email'}
                </button>
                <button
                  className="btn btn-outline"
                  type="button"
                  onClick={() => {
                    setEmailStep('idle')
                    setEmailMsg(null)
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      <h2 className="bookings-heading">My bookings</h2>
      {cancelError && <p className="error-text">{cancelError}</p>}
      {bookings === null && <p className="muted">Loading bookings...</p>}
      {bookings?.length === 0 && <p className="muted">No bookings yet.</p>}
      {bookings?.length > 0 && (
        <div className="service-list">
          {bookings.map((b) => (
            <div key={b.id} className="card service-row">
              <div>
                <strong>{branchNames[b.branch_id] || 'Branch'}</strong>
                <p className="muted">{b.booking_date}</p>
              </div>
              <div className="service-row-action">
                {b.total_price != null && <span className="service-price">£{b.total_price}</span>}
                <span className={`badge badge-${b.status}`}>{b.status.replace('_', ' ')}</span>
              </div>

              {(b.deposit_link || CANCELLABLE_STATUSES.has(b.status)) && (
                <div className="booking-row-extra">
                  {b.deposit_link ? (
                    <a
                      className="btn btn-gold"
                      href={b.deposit_link}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Pay £{b.deposit_amount?.toFixed(2)} deposit
                    </a>
                  ) : (
                    <span className="muted">
                      {b.status === 'pending' ? 'Waiting for the salon to confirm.' : ''}
                    </span>
                  )}
                  {CANCELLABLE_STATUSES.has(b.status) && (
                    <button
                      className="btn btn-danger-outline"
                      disabled={cancellingId === b.id}
                      onClick={() => handleCancel(b.id)}
                    >
                      {cancellingId === b.id ? 'Cancelling...' : 'Cancel booking'}
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
