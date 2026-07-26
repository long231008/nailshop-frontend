import { useCallback, useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { api } from '../api/client'
import ImageLightbox from '../components/ImageLightbox'
import SlotLockManager from '../components/SlotLockManager'
import { useAuth } from '../context/AuthContext'

const OPEN_HOUR = 9
const CLOSE_HOUR = 18
const STEP_MIN = 15

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
  const [expanded, setExpanded] = useState(null)
  const [viewing, setViewing] = useState(null)
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
    setExpanded(null)
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

  // One row per 15-minute frame. A guest appears only in the frame they booked
  // (their start time), never spread across the following ones.
  let quarterRows = []
  if (schedule) {
    for (let h = OPEN_HOUR; h < CLOSE_HOUR; h += 1) {
      for (let m = 0; m < 60; m += STEP_MIN) {
        const label = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
        const start = new Date(`${date}T${label}:00`)
        const end = new Date(start.getTime() + STEP_MIN * 60000)
        const items = schedule.appointments.filter((a) => {
          const startsAt = new Date(a.start_time)
          return startsAt >= start && startsAt < end
        })
        quarterRows.push({ label, start, end, items })
      }
    }
  }

  const currentLabel =
    isToday &&
    `${String(now.getHours()).padStart(2, '0')}:${String(
      Math.floor(now.getMinutes() / STEP_MIN) * STEP_MIN
    ).padStart(2, '0')}`

  return (
    <div className="container">
      <h1>Daily schedule</h1>
      <p className="muted">
        Each 15-minute frame shows the guests who booked that exact time. Tap a frame to see
        who.
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

          <div className="occupancy">
            {quarterRows.map((q) => {
              const busy = q.items.length > 0
              const isCurrent = currentLabel === q.label
              return (
                <div key={q.label}>
                  <button
                    type="button"
                    className={
                      'occupancy-row' +
                      (q.label.endsWith(':00') ? ' occupancy-row-hour' : '') +
                      (busy ? ' occupancy-row-busy' : '') +
                      (isCurrent ? ' occupancy-row-now' : '')
                    }
                    onClick={() => busy && setExpanded(expanded === q.label ? null : q.label)}
                  >
                    <span className="occupancy-time">{q.label}</span>
                    <span className="occupancy-bar">
                      {q.items.map((_, i) => (
                        <span key={i} className="occupancy-dot" />
                      ))}
                      {q.items.some((a) => a.design_image_url || a.design_description) && (
                        <span className="chip chip-branch">nail art</span>
                      )}
                    </span>
                    <span className={'occupancy-count' + (busy ? '' : ' muted')}>
                      {busy
                        ? `${q.items.length} ${q.items.length === 1 ? 'guest' : 'guests'}`
                        : '—'}
                    </span>
                  </button>

                  {expanded === q.label && (
                    <div className="occupancy-detail">
                      {q.items.map((a, i) => (
                        <div key={`${a.booking_id}-${i}`} className="occupancy-detail-row">
                          {a.design_image_url && (
                            <img
                              src={a.design_image_url}
                              alt="Nail design"
                              className="design-thumb design-thumb-small design-thumb-clickable"
                              title="Click to enlarge"
                              onClick={() => setViewing(a.design_image_url)}
                            />
                          )}
                          <div className="service-row-info">
                            <strong>
                              {fmtTime(a.start_time)}–{fmtTime(a.end_time)} · {a.service_name}
                            </strong>
                            <p className="muted">
                              {a.customer_name || 'Customer'}
                              {a.customer_phone ? ` · ${a.customer_phone}` : ''}
                              {!branchId && branchName(a.branch_id)
                                ? ` · ${branchName(a.branch_id)}`
                                : ''}
                            </p>
                            {a.design_description && (
                              <p className="muted">Design: {a.design_description}</p>
                            )}
                          </div>
                          <span className={`badge badge-${a.status}`}>
                            {a.status.replace('_', ' ')}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {viewing && (
            <ImageLightbox src={viewing} alt="Nail design" onClose={() => setViewing(null)} />
          )}

          {branchId ? (
            <SlotLockManager branchId={branchId} token={auth.token} initialDate={date} />
          ) : (
            <p className="muted" style={{ textAlign: 'left', marginTop: '1.5rem' }}>
              Pick a specific branch above to lock time slots.
            </p>
          )}
        </>
      )}
    </div>
  )
}
