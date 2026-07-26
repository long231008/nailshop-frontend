import { useCallback, useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'

const STAFF_ROLES = new Set(['admin', 'staff'])

function fmtWhen(isoTime) {
  const date = new Date(isoTime)
  return `${date.toLocaleDateString([], {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })} · ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
}

// Every upcoming booking request across all dates: approve here, then the
// booking joins the day grid by itself once its deposit arrives.
export default function RequestsPage() {
  const { auth } = useAuth()
  const [branches, setBranches] = useState([])
  const [branchId, setBranchId] = useState('')
  const [requests, setRequests] = useState(null)
  const [error, setError] = useState(null)
  const [approvingId, setApprovingId] = useState(null)

  useEffect(() => {
    if (!auth || !STAFF_ROLES.has(auth.role)) return
    api.listBranches().then(setBranches).catch(() => {})
  }, [auth])

  const reload = useCallback(() => {
    if (!auth || !STAFF_ROLES.has(auth.role)) return
    setError(null)
    api
      .pendingBookings(branchId || null, auth.token)
      .then(setRequests)
      .catch((err) => setError(err.message))
  }, [auth, branchId])

  useEffect(() => {
    setRequests(null)
    reload()
  }, [reload])

  if (!auth) return <Navigate to="/login" replace />
  if (!STAFF_ROLES.has(auth.role)) return <Navigate to="/" replace />

  const branchName = (id) => branches.find((b) => b.id === id)?.name || ''

  const handleApprove = async (bookingId) => {
    setApprovingId(bookingId)
    setError(null)
    try {
      await api.approveBooking(bookingId, auth.token)
      reload()
    } catch (err) {
      setError(err.message)
    } finally {
      setApprovingId(null)
    }
  }

  const awaitingApproval = requests?.filter((r) => r.stage === 'awaiting_approval') ?? []
  const awaitingDeposit = requests?.filter((r) => r.stage === 'awaiting_deposit') ?? []

  const renderRow = (p, showApprove) => (
    <div key={p.booking_id + p.start_time} className="card service-row">
      <div className="service-row-info">
        <strong>
          {fmtWhen(p.start_time)} · {p.service_name}
        </strong>
        <p className="muted">
          {p.customer_name || 'Customer'}
          {p.customer_phone ? ` · ${p.customer_phone}` : ''}
          {p.staff_name ? ` · with ${p.staff_name}` : ''}
          {!branchId && branchName(p.branch_id) ? ` · ${branchName(p.branch_id)}` : ''}
        </p>
      </div>
      <div className="service-row-action">
        <span className="service-price">£{p.price}</span>
        {showApprove ? (
          <button
            className="btn btn-gold"
            disabled={approvingId === p.booking_id}
            onClick={() => handleApprove(p.booking_id)}
          >
            {approvingId === p.booking_id ? 'Approving...' : 'Approve'}
          </button>
        ) : (
          <span className="badge badge-pending">awaiting deposit</span>
        )}
      </div>
    </div>
  )

  return (
    <div className="container">
      <h1>Booking requests</h1>
      <p className="muted">
        Every upcoming request across all dates. Once approved and the deposit is paid, a
        booking moves to the schedule by itself.
      </p>

      <label className="branch-filter">
        Branch
        <select className="input" value={branchId} onChange={(e) => setBranchId(e.target.value)}>
          <option value="">All branches</option>
          {branches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
      </label>

      {error && <p className="error-text">{error}</p>}
      {requests === null && !error && <p className="muted">Loading requests...</p>}

      {requests !== null && (
        <>
          <section className="pending-section">
            <h2 className="dash-heading">Awaiting approval ({awaitingApproval.length})</h2>
            <p className="muted">
              New requests wait here indefinitely until someone approves them. Approving sends
              the customer their deposit link on the channel they signed up with.
            </p>
            {awaitingApproval.length === 0 ? (
              <div className="card schedule-empty">
                <p className="muted">No requests waiting for approval.</p>
              </div>
            ) : (
              <div className="service-list">{awaitingApproval.map((p) => renderRow(p, true))}</div>
            )}
          </section>

          <section className="pending-section">
            <h2 className="dash-heading">Awaiting deposit ({awaitingDeposit.length})</h2>
            <p className="muted">
              Approved bookings holding their slot while the deposit arrives (15-minute window).
              Once paid, they move to the schedule automatically.
            </p>
            {awaitingDeposit.length === 0 ? (
              <div className="card schedule-empty">
                <p className="muted">No bookings waiting for a deposit.</p>
              </div>
            ) : (
              <div className="service-list">{awaitingDeposit.map((p) => renderRow(p, false))}</div>
            )}
          </section>
        </>
      )}
    </div>
  )
}
