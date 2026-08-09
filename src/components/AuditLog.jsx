import { useCallback, useEffect, useState } from 'react'
import { api } from '../api/client'

// The salon's own paper trail: every sensitive action (money, bookings,
// staffing, accounts) as recorded in this database - no third-party service
// involved. Newest first, filterable by area.
const PAGE = 50
const AREAS = [
  { value: '', label: 'Everything' },
  { value: 'booking.', label: 'Bookings' },
  { value: 'payment.', label: 'Payments' },
  { value: 'staff', label: 'Staffing' },
  { value: 'schedule.', label: 'Schedule edits' },
  { value: 'slot_lock.', label: 'Time locks' },
  { value: 'allocation.', label: 'Reassignments' },
  { value: 'user.', label: 'Accounts' },
]

function fmtWhen(iso) {
  const date = new Date(iso)
  return `${date.toLocaleDateString([], { day: '2-digit', month: 'short' })} ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
}

function fmtDetails(details) {
  if (!details) return ''
  return Object.entries(details)
    .map(([key, value]) =>
      typeof value === 'object' && value !== null
        ? `${key}: ${value.from ?? ''}→${value.to ?? ''}`
        : `${key}: ${value}`
    )
    .join(' · ')
}

export default function AuditLog({ token }) {
  const [entries, setEntries] = useState(null)
  const [area, setArea] = useState('')
  const [error, setError] = useState(null)
  const [exhausted, setExhausted] = useState(false)
  const [busy, setBusy] = useState(false)

  const load = useCallback(
    (offset) => {
      const params = { limit: PAGE, offset }
      if (area) params.action = area
      return api.auditLog(params, token)
    },
    [area, token]
  )

  useEffect(() => {
    setEntries(null)
    setExhausted(false)
    setError(null)
    load(0)
      .then((rows) => {
        setEntries(rows)
        setExhausted(rows.length < PAGE)
      })
      .catch((err) => setError(err.message))
  }, [load])

  const loadMore = async () => {
    setBusy(true)
    try {
      const rows = await load(entries.length)
      setEntries((prev) => [...prev, ...rows])
      if (rows.length < PAGE) setExhausted(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="matrix-section">
      <h2 className="dash-heading">Audit log</h2>
      <p className="muted">
        Every sensitive action — money, bookings, staffing, account changes — recorded in the
        salon&apos;s own database. Nothing here leaves your server.
      </p>
      <div className="card matrix-card">
        <label className="branch-filter">
          Area
          <select className="input" value={area} onChange={(e) => setArea(e.target.value)}>
            {AREAS.map((a) => (
              <option key={a.value} value={a.value}>
                {a.label}
              </option>
            ))}
          </select>
        </label>

        {error && <p className="error-text">{error}</p>}
        {entries === null && !error && <p className="muted">Loading audit log...</p>}
        {entries?.length === 0 && <p className="muted">No entries in this area yet.</p>}

        {entries?.length > 0 && (
          <div className="matrix-scroll">
            <table className="matrix-table">
              <thead>
                <tr>
                  <th>When</th>
                  <th>Action</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr key={entry.id}>
                    <td className="muted" style={{ whiteSpace: 'nowrap' }}>
                      {fmtWhen(entry.created_at)}
                    </td>
                    <td>
                      <strong>{entry.action}</strong>
                    </td>
                    <td className="muted">{fmtDetails(entry.details)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {entries?.length > 0 && !exhausted && (
          <div className="matrix-actions">
            <button type="button" className="btn btn-outline" disabled={busy} onClick={loadMore}>
              {busy ? 'Loading...' : 'Load older entries'}
            </button>
          </div>
        )}
      </div>
    </section>
  )
}
