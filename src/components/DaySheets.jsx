import { useCallback, useEffect, useState } from 'react'
import { api } from '../api/client'

// What the 21:00 run produces, read the way a technician reads it: one sheet
// each, the shop to turn up at and their own customers in order. Admins get
// everybody's; staff get their own. The backend decides which from the token,
// so there is nothing to hide here.

const hhmm = (iso) =>
  new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })

const hours = (minutes) => {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (!h) return `${m}m`
  return m ? `${h}h ${m}m` : `${h}h`
}

// Midday, so a day's worth of daylight saving cannot push it onto the wrong date.
const tomorrow = () => {
  const at = new Date()
  at.setHours(12, 0, 0, 0)
  at.setDate(at.getDate() + 1)
  return `${at.getFullYear()}-${String(at.getMonth() + 1).padStart(2, '0')}-${String(
    at.getDate()
  ).padStart(2, '0')}`
}

export default function DaySheets({ branchId, token, isAdmin }) {
  const [date, setDate] = useState(tomorrow())
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)

  const load = useCallback(() => {
    setError(null)
    const params = { date }
    if (branchId) params.branch_id = branchId
    api
      .daySheets(params, token)
      .then(setData)
      .catch((err) => {
        setData(null)
        setError(err.message)
      })
  }, [date, branchId, token])

  useEffect(load, [load])

  const sheets = data?.sheets || []

  return (
    <div className="card matrix-card day-sheets">
      <h2>{isAdmin ? "Everyone's day" : 'My day'}</h2>
      <p className="muted" style={{ textAlign: 'left' }}>
        {isAdmin
          ? 'One sheet per technician once the 21:00 run has closed the day — where they are, and who they have.'
          : 'Your customers once the 21:00 run has closed the day.'}
      </p>

      <div className="lock-controls no-print">
        <label>
          Date
          <input
            className="input"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </label>
        <button className="btn btn-outline" onClick={() => setDate(tomorrow())}>
          Tomorrow
        </button>
        <button className="btn btn-outline" onClick={() => window.print()}>
          Print
        </button>
      </div>

      {error && <p className="error-text">{error}</p>}
      {!data && !error && <p className="muted">Loading…</p>}

      {data && !data.allocated && (
        <p className="muted" style={{ textAlign: 'left' }}>
          The 21:00 run has not closed {date} yet, so nobody has been named to a booking. Sheets
          appear once it has.
        </p>
      )}

      {data && data.allocated && sheets.length === 0 && (
        <p className="muted" style={{ textAlign: 'left' }}>
          Nobody is down to work on {date}.
        </p>
      )}

      {sheets.map((sheet) => (
        <div key={sheet.staff_id} className="sheet">
          <div className="sheet-head">
            <div>
              <strong>{sheet.staff_name}</strong>
              {sheet.branch_name && <span className="muted"> — {sheet.branch_name}</span>}
            </div>
            <span className="muted">
              {sheet.appointment_count === 0
                ? 'No bookings'
                : `${sheet.appointment_count} ${
                    sheet.appointment_count === 1 ? 'booking' : 'bookings'
                  } · ${hhmm(sheet.first_start)}–${hhmm(sheet.last_end)} · ${hours(
                    sheet.working_minutes
                  )} of work`}
            </span>
          </div>

          {sheet.appointments.length === 0 ? (
            <p className="muted sheet-empty">
              In, but with an empty book — walk-ins go here.
            </p>
          ) : (
            <ul className="sheet-list">
              {sheet.appointments.map((a) => (
                <li key={`${a.booking_id}-${a.start_time}`}>
                  <span className="sheet-time">
                    {hhmm(a.start_time)}–{hhmm(a.end_time)}
                  </span>
                  <span className="sheet-service">{a.service_name}</span>
                  <span className="sheet-guest">
                    {a.customer_name || 'Guest'}
                    {a.customer_phone && <span className="muted"> · {a.customer_phone}</span>}
                  </span>
                  {a.design_description && (
                    <span className="muted sheet-note">{a.design_description}</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </div>
  )
}
