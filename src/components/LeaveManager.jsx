import { useCallback, useEffect, useState } from 'react'
import { api } from '../api/client'

function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

function fmtRange(startIso, endIso) {
  const opts = { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }
  return `${new Date(startIso).toLocaleString([], opts)} → ${new Date(endIso).toLocaleString([], opts)}`
}

// Admin books a technician off for a time range. The scheduler drops them from
// that window everywhere: capacity, the nightly allocation and reassignment.
export default function LeaveManager({ branchId, token }) {
  const [staff, setStaff] = useState([])
  const [leaves, setLeaves] = useState([])
  const [staffId, setStaffId] = useState('')
  const [date, setDate] = useState(todayIso())
  const [startTime, setStartTime] = useState('09:00')
  const [endTime, setEndTime] = useState('18:00')
  const [allDay, setAllDay] = useState(false)
  const [reason, setReason] = useState('')
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  const staffName = (id) => staff.find((s) => s.id === id)?.display_name || 'a technician'

  const reloadLeaves = useCallback(() => {
    api
      .listLeaves({ from: new Date().toISOString() }, token)
      .then(setLeaves)
      .catch((err) => setError(err.message))
  }, [token])

  useEffect(() => {
    if (branchId) {
      api.listStaff(branchId, token).then(setStaff).catch(() => setStaff([]))
    } else {
      setStaff([])
    }
  }, [branchId, token])

  useEffect(() => {
    setError(null)
    reloadLeaves()
  }, [reloadLeaves])

  const handleCreate = async () => {
    if (!staffId) {
      setError('Pick a technician first')
      return
    }
    const start = allDay
      ? new Date(`${date}T00:00:00`)
      : new Date(`${date}T${startTime}:00`)
    const end = allDay
      ? new Date(`${date}T23:59:59`)
      : new Date(`${date}T${endTime}:00`)
    if (end <= start) {
      setError('End must be after start')
      return
    }
    setBusy(true)
    setError(null)
    try {
      await api.createLeave(
        {
          staff_id: staffId,
          start_time: start.toISOString(),
          end_time: end.toISOString(),
          reason: reason || null,
        },
        token
      )
      setReason('')
      reloadLeaves()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const handleDelete = async (leave) => {
    if (!window.confirm(`Remove ${staffName(leave.staff_id)}'s leave?`)) return
    setError(null)
    try {
      await api.deleteLeave(leave.id, token)
      reloadLeaves()
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <section className="lock-section">
      <h2 className="dash-heading">Staff leave</h2>
      <p className="muted">
        Book a technician off for a range of time. The scheduler removes them from exactly that
        window — e.g. off 13:00–20:00 means no bookings land on them then, and the day is sold
        with one fewer technician for those hours.
      </p>

      {!branchId && (
        <p className="muted">Pick a specific branch above to choose a technician.</p>
      )}

      {branchId && (
        <div className="lock-controls">
          <label>
            Technician
            <select
              className="input"
              value={staffId}
              onChange={(e) => setStaffId(e.target.value)}
            >
              <option value="">Select…</option>
              {staff.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.display_name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Date
            <input
              className="input"
              type="date"
              min={todayIso()}
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </label>
          {!allDay && (
            <>
              <label>
                From
                <input
                  className="input"
                  type="time"
                  step="900"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                />
              </label>
              <label>
                To
                <input
                  className="input"
                  type="time"
                  step="900"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                />
              </label>
            </>
          )}
          <label>
            All day
            <input
              type="checkbox"
              checked={allDay}
              onChange={(e) => setAllDay(e.target.checked)}
            />
          </label>
          <label className="lock-reason">
            Reason (optional)
            <input
              className="input"
              type="text"
              maxLength={255}
              placeholder="Holiday"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </label>
        </div>
      )}

      {error && <p className="error-text">{error}</p>}

      {branchId && (
        <div className="matrix-actions">
          <button className="btn" disabled={busy} onClick={handleCreate}>
            {busy ? 'Booking…' : 'Book time off'}
          </button>
        </div>
      )}

      <h3 style={{ marginTop: '1rem' }}>Upcoming leave</h3>
      {leaves.length === 0 ? (
        <p className="muted">No upcoming leave booked.</p>
      ) : (
        <div className="roster-list">
          {leaves.map((leave) => (
            <div key={leave.id} className="roster-row">
              <strong>{leave.staff_name || staffName(leave.staff_id)}</strong>
              <span className="muted"> · {fmtRange(leave.start_time, leave.end_time)} </span>
              {leave.reason && <span className="muted">· {leave.reason} </span>}
              <button className="btn btn-outline" onClick={() => handleDelete(leave)}>
                Remove
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
