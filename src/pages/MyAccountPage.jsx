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
  const [saveMsg, setSaveMsg] = useState(null)
  const [saving, setSaving] = useState(false)
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
      const updated = await api.updateMyProfile({ email }, auth.token)
      setProfile(updated)
      setSaveMsg('Saved.')
    } catch (err) {
      setSaveMsg(err.message)
    } finally {
      setSaving(false)
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
            <label>
              Email
              <input
                className="input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </label>
            {saveMsg && <p className="muted">{saveMsg}</p>}
            <button className="btn" type="submit" disabled={saving}>
              {saving ? 'Saving...' : 'Save'}
            </button>
          </form>
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
