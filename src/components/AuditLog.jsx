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
  const [pruneDays, setPruneDays] = useState(730)
  const [pruneResult, setPruneResult] = useState(null)

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

  // One row, one click, gone for good. Money records come back with a clear
  // refusal from the server.
  const deleteEntry = async (entryId) => {
    setError(null)
    try {
      await api.deleteAuditEntry(entryId, token)
      setEntries((prev) => prev.filter((e) => e.id !== entryId))
    } catch (err) {
      setError(err.message)
    }
  }

  const prune = async () => {
    const days = Math.max(30, Number(pruneDays) || 730)
    if (
      !window.confirm(
        `Delete audit entries older than ${days} days? Money records (payments, cancellations with deposits) are kept - remove those one by one with ✕ if you really mean to.`
      )
    )
      return
    setError(null)
    setBusy(true)
    try {
      const result = await api.pruneAuditLog(days, token)
      setPruneResult(result.deleted)
      const rows = await load(0)
      setEntries(rows)
      setExhausted(rows.length < PAGE)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

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
                  <th></th>
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
                    <td>
                      <button
                        type="button"
                        className="btn btn-danger-outline matrix-remove"
                        title="Delete this entry for good"
                        onClick={() => deleteEntry(entry.id)}
                      >
                        ✕
                      </button>
                    </td>
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

        <div className="matrix-actions" style={{ alignItems: 'center', gap: '0.6rem' }}>
          <label className="muted" style={{ fontSize: '0.85rem' }}>
            Delete entries older than{' '}
            <input
              className="input matrix-input matrix-num"
              type="number"
              min="30"
              max="3650"
              value={pruneDays}
              onChange={(e) => setPruneDays(e.target.value)}
              style={{ width: '5.5rem', display: 'inline-block' }}
            />{' '}
            days
          </label>
          <button type="button" className="btn btn-danger-outline" disabled={busy} onClick={prune}>
            Delete old entries
          </button>
          {pruneResult !== null && (
            <span className="muted">Deleted {pruneResult} entr{pruneResult === 1 ? 'y' : 'ies'}.</span>
          )}
        </div>
        <p className="muted" style={{ fontSize: '0.8rem' }}>
          The ✕ on a row deletes that one entry — any entry, money records included. The
          delete-by-age button and the automatic nightly clean-up are bulk sweeps, so they
          always keep money records (payments, cancellations carrying deposit facts). Deleted
          entries are gone for good.
        </p>
      </div>
    </section>
  )
}
