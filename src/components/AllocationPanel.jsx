import { useCallback, useEffect, useState } from 'react'
import { api } from '../api/client'

function tomorrowIso() {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  return d.toISOString().slice(0, 10)
}

// The nightly close: bookings for a day freeze at 21:00 the evening before,
// then every any-tech booking gets its technician. This panel shows how the
// run went and lets an admin re-run it (e.g. after a sick call).
export default function AllocationPanel({ branchId, token }) {
  const [date, setDate] = useState(tomorrowIso())
  const [status, setStatus] = useState(null)
  const [error, setError] = useState(null)
  const [running, setRunning] = useState(false)

  const load = useCallback(() => {
    setError(null)
    api
      .allocationStatus(date, branchId || null, token)
      .then(setStatus)
      .catch((err) => setError(err.message))
  }, [date, branchId, token])

  useEffect(() => {
    setStatus(null)
    load()
  }, [load])

  const handleRun = async () => {
    setRunning(true)
    setError(null)
    try {
      await api.runAllocation(
        { target_date: date, branch_id: branchId || null },
        token
      )
      load()
    } catch (err) {
      setError(err.message)
    } finally {
      setRunning(false)
    }
  }

  const latestRun = status?.runs?.[0] || null

  return (
    <section>
      <h2 className="dash-heading">Nightly technician allocation (21:00 close)</h2>
      <div className="card">
        <div className="allocation-controls">
          <label>
            Day
            <input
              className="input"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </label>
          <button type="button" className="btn" disabled={running} onClick={handleRun}>
            {running ? 'Assigning...' : 'Assign technicians now'}
          </button>
        </div>

        {error && <p className="error-text">{error}</p>}
        {!status && !error && <p className="muted">Loading...</p>}

        {status && (
          <>
            {latestRun ? (
              <div className="stat-row" style={{ marginTop: '0.75rem' }}>
                <div className="stat-tile">
                  <span className="muted">Assigned</span>
                  <strong>{latestRun.assigned_count}</strong>
                </div>
                <div className="stat-tile">
                  <span className="muted">Unassigned</span>
                  <strong>{latestRun.unassigned_count}</strong>
                </div>
                <div className="stat-tile">
                  <span className="muted">Last run</span>
                  <strong>{new Date(latestRun.created_at).toLocaleTimeString()}</strong>
                </div>
              </div>
            ) : (
              <p className="muted" style={{ marginTop: '0.75rem' }}>
                Not allocated yet — the automatic run happens at 21:00 the evening before, or
                press the button above.
              </p>
            )}

            {status.unassigned.length > 0 && (
              <>
                <p className="error-text" style={{ marginTop: '0.75rem' }}>
                  {status.unassigned.length} booking leg(s) still have no technician — add
                  capability, adjust days off, or call the customer:
                </p>
                <ul>
                  {status.unassigned.map((leg, i) => (
                    <li key={i} className="muted">
                      {leg.service_name} ·{' '}
                      {new Date(leg.start_time).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}{' '}
                      · booking {leg.booking_id.slice(0, 8)}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </>
        )}
      </div>
    </section>
  )
}
