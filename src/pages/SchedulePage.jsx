import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'

function toIso(date) {
  return date.toISOString().slice(0, 10)
}

function labelFor(dateStr) {
  const date = new Date(`${dateStr}T00:00`)
  return date.toLocaleDateString([], {
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

const STAFF_ROLES = new Set(['admin', 'staff'])

export default function SchedulePage() {
  const { auth } = useAuth()
  const [date, setDate] = useState(toIso(new Date()))
  const [branches, setBranches] = useState([])
  const [branchId, setBranchId] = useState('')
  const [schedule, setSchedule] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!auth || !STAFF_ROLES.has(auth.role)) return
    api.listBranches().then(setBranches).catch(() => {})
  }, [auth])

  useEffect(() => {
    if (!auth || !STAFF_ROLES.has(auth.role)) return
    setSchedule(null)
    setError(null)
    const params = { date }
    if (branchId) params.branch_id = branchId
    api
      .dailySchedule(params, auth.token)
      .then(setSchedule)
      .catch((err) => setError(err.message))
  }, [auth, date, branchId])

  if (!auth) return <Navigate to="/login" replace />
  if (!STAFF_ROLES.has(auth.role)) return <Navigate to="/" replace />

  const branchName = (id) => branches.find((b) => b.id === id)?.name || ''
  const isToday = date === toIso(new Date())

  return (
    <div className="container">
      <h1>Daily schedule</h1>
      <p className="muted">Every confirmed appointment, at a glance.</p>

      <div className="schedule-toolbar">
        <div className="schedule-nav">
          <button className="btn btn-outline schedule-nav-btn" onClick={() => setDate(shiftDate(date, -1))}>
            ←
          </button>
          <input
            className="input schedule-date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
          <button className="btn btn-outline schedule-nav-btn" onClick={() => setDate(shiftDate(date, 1))}>
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
              <span className="muted">Appointments</span>
              <strong>{schedule.appointment_count}</strong>
            </div>
            <div className="stat-tile">
              <span className="muted">Expected value</span>
              <strong>£{schedule.expected_value.toFixed(2)}</strong>
            </div>
          </div>

          {schedule.appointments.length === 0 && (
            <div className="card schedule-empty">
              <p className="muted">No confirmed appointments on this day.</p>
            </div>
          )}

          {schedule.appointments.length > 0 && (
            <div className="timeline">
              {schedule.appointments.map((a, index) => (
                <div key={`${a.booking_id}-${index}`} className="timeline-row">
                  <div className="timeline-time">
                    <span className="timeline-start">
                      {new Date(a.start_time).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                    <span className="timeline-end muted">
                      {new Date(a.end_time).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <div className="timeline-dot" />
                  <div className="card timeline-card">
                    <div className="timeline-card-main">
                      <strong>{a.service_name}</strong>
                      <p className="muted">
                        {a.customer_name || 'Customer'}
                        {a.customer_phone ? ` · ${a.customer_phone}` : ''}
                      </p>
                      <div className="timeline-chips">
                        {a.staff_name && <span className="chip">{a.staff_name}</span>}
                        {!branchId && branchName(a.branch_id) && (
                          <span className="chip chip-branch">{branchName(a.branch_id)}</span>
                        )}
                      </div>
                    </div>
                    <div className="timeline-card-side">
                      <span className="service-price">£{a.price}</span>
                      <span className={`badge badge-${a.status}`}>
                        {a.status.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
