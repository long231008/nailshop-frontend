import { useCallback, useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'

const OPEN_HOUR = 9
const CLOSE_HOUR = 18
const HOUR_PX = 72
const GRID_HEIGHT = (CLOSE_HOUR - OPEN_HOUR) * HOUR_PX

function toIso(date) {
  return date.toISOString().slice(0, 10)
}

function labelFor(dateStr) {
  return new Date(`${dateStr}T00:00`).toLocaleDateString([], {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function shiftDate(dateStr, days) {
  const date = new Date(`${dateStr}T00:00`)
  date.setDate(date.getDate() + days)
  return toIso(date)
}

function minutesFromOpen(isoTime) {
  const date = new Date(isoTime)
  return date.getHours() * 60 + date.getMinutes() - OPEN_HOUR * 60
}

function fmtTime(isoTime) {
  return new Date(isoTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

const STAFF_ROLES = new Set(['admin', 'staff'])

export default function SchedulePage() {
  const { auth } = useAuth()
  const [date, setDate] = useState(toIso(new Date()))
  const [branches, setBranches] = useState([])
  const [branchId, setBranchId] = useState('')
  const [schedule, setSchedule] = useState(null)
  const [requests, setRequests] = useState([])
  const [error, setError] = useState(null)
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    if (!auth || !STAFF_ROLES.has(auth.role)) return
    api.listBranches().then(setBranches).catch(() => {})
  }, [auth])

  const reload = useCallback(() => {
    if (!auth || !STAFF_ROLES.has(auth.role)) return
    setError(null)
    const params = { date }
    if (branchId) params.branch_id = branchId
    api
      .dailySchedule(params, auth.token)
      .then(setSchedule)
      .catch((err) => setError(err.message))
    api
      .pendingBookings(branchId || null, auth.token)
      .then(setRequests)
      .catch(() => {})
  }, [auth, date, branchId])

  useEffect(() => {
    setSchedule(null)
    reload()
  }, [reload])

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000)
    return () => clearInterval(timer)
  }, [])

  if (!auth) return <Navigate to="/login" replace />
  if (!STAFF_ROLES.has(auth.role)) return <Navigate to="/" replace />

  const branchName = (id) => branches.find((b) => b.id === id)?.name || ''
  const isToday = date === toIso(new Date())
  const nowMinutes = now.getHours() * 60 + now.getMinutes() - OPEN_HOUR * 60
  const showNowLine = isToday && nowMinutes >= 0 && nowMinutes <= (CLOSE_HOUR - OPEN_HOUR) * 60

  // One column per staff member appearing that day (unassigned work gets its own).
  const columns = []
  if (schedule) {
    const seen = new Map()
    for (const a of schedule.appointments) {
      const key = `${a.staff_name || 'Unassigned'}|${a.branch_id}`
      if (!seen.has(key)) {
        seen.set(key, {
          key,
          staffName: a.staff_name || 'Unassigned',
          branchId: a.branch_id,
          appointments: [],
        })
        columns.push(seen.get(key))
      }
      seen.get(key).appointments.push(a)
    }
  }

  const hours = []
  for (let h = OPEN_HOUR; h <= CLOSE_HOUR; h += 1) hours.push(h)

  return (
    <div className="container container-wide">
      <h1>Daily schedule</h1>
      <p className="muted">
        The day book, {OPEN_HOUR}:00 – {CLOSE_HOUR}:00. Deposit-secured appointments sit on the
        grid; everything else waits below for a grant or its deposit.
      </p>

      <div className="schedule-toolbar">
        <div className="schedule-nav">
          <button
            className="btn btn-outline schedule-nav-btn"
            onClick={() => setDate(shiftDate(date, -1))}
          >
            ←
          </button>
          <input
            className="input schedule-date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
          <button
            className="btn btn-outline schedule-nav-btn"
            onClick={() => setDate(shiftDate(date, 1))}
          >
            →
          </button>
          {!isToday && (
            <button className="btn btn-outline" onClick={() => setDate(toIso(new Date()))}>
              Today
            </button>
          )}
        </div>

        <select
          className="input schedule-branch"
          value={branchId}
          onChange={(e) => setBranchId(e.target.value)}
        >
          <option value="">All branches</option>
          {branches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
      </div>

      <h2 className="schedule-day">{labelFor(date)}</h2>
      {error && <p className="error-text">{error}</p>}
      {!schedule && !error && <p className="muted">Loading schedule...</p>}

      {schedule && (
        <>
          <div className="stat-row schedule-stats">
            <div className="stat-tile">
              <span className="muted">On the book</span>
              <strong>{schedule.appointment_count}</strong>
            </div>
            {schedule.expected_value != null && (
              <div className="stat-tile">
                <span className="muted">Expected value</span>
                <strong>£{schedule.expected_value.toFixed(2)}</strong>
              </div>
            )}
            <div className="stat-tile">
              <span className="muted">Open requests</span>
              <strong>{requests.length}</strong>
            </div>
          </div>

          {requests.length > 0 && (
            <p className="muted" style={{ textAlign: 'left' }}>
              {requests.length} open {requests.length === 1 ? 'request' : 'requests'} — see the{' '}
              <Link to="/requests">Requests</Link> page to approve them.
            </p>
          )}

          {columns.length === 0 && (
            <div className="card schedule-empty">
              <p className="muted">Nothing on the book for this day yet.</p>
            </div>
          )}

          {columns.length > 0 && (
            <div className="daygrid-scroll">
              <div className="daygrid" style={{ height: GRID_HEIGHT + 34 }}>
                <div className="daygrid-gutter">
                  <div className="daygrid-corner" />
                  {hours.map((h) => (
                    <div key={h} className="daygrid-hour-label" style={{ height: HOUR_PX }}>
                      {String(h).padStart(2, '0')}:00
                    </div>
                  ))}
                </div>

                {columns.map((col) => (
                  <div key={col.key} className="daygrid-col">
                    <div className="daygrid-col-head">
                      <span className="daygrid-staff">{col.staffName}</span>
                      {!branchId && branchName(col.branchId) && (
                        <span className="chip chip-branch">{branchName(col.branchId)}</span>
                      )}
                    </div>
                    <div className="daygrid-col-body" style={{ height: GRID_HEIGHT }}>
                      {showNowLine && (
                        <div
                          className="daygrid-now"
                          style={{ top: (nowMinutes / 60) * HOUR_PX }}
                        />
                      )}
                      {col.appointments.map((a, i) => {
                        const top = Math.max(0, (minutesFromOpen(a.start_time) / 60) * HOUR_PX)
                        const rawHeight =
                          ((minutesFromOpen(a.end_time) - minutesFromOpen(a.start_time)) / 60) *
                          HOUR_PX
                        const height = Math.max(30, rawHeight)
                        return (
                          <div
                            key={`${a.booking_id}-${i}`}
                            className={`daygrid-event daygrid-event-${a.status}`}
                            style={{ top, height }}
                            title={`${fmtTime(a.start_time)}–${fmtTime(a.end_time)} ${a.service_name}`}
                          >
                            <span className="daygrid-event-time">
                              {fmtTime(a.start_time)}–{fmtTime(a.end_time)}
                            </span>
                            <span className="daygrid-event-service">{a.service_name}</span>
                            <span className="daygrid-event-customer">
                              {a.customer_name || 'Customer'} · £{a.price}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
