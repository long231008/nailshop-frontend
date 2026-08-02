import { useCallback, useEffect, useState } from 'react'
import { api } from '../api/client'

function tomorrowIso() {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  return d.toISOString().slice(0, 10)
}

// The nightly close: bookings for a day freeze at 21:00 the evening before,
// then the allocator assigns technicians freely (fairness first - customer
// wishes are deliberately NOT an input). This panel shows how the run went,
// lists the wishes, and lets a manager grant one by hand when the finished
// schedule has room - or re-run the day after a sick call.
export default function AllocationPanel({ branchId, token }) {
  const [date, setDate] = useState(tomorrowIso())
  const [status, setStatus] = useState(null)
  const [error, setError] = useState(null)
  const [running, setRunning] = useState(false)
  const [releaseStaffId, setReleaseStaffId] = useState('')
  const [grantingId, setGrantingId] = useState(null)

  const load = useCallback(() => {
    setError(null)
    api
      .allocationStatus(date, branchId || null, token)
      .then(setStatus)
      .catch((err) => setError(err.message))
  }, [date, branchId, token])

  useEffect(() => {
    setStatus(null)
    setReleaseStaffId('')
    load()
  }, [load])

  const handleRun = async () => {
    setRunning(true)
    setError(null)
    try {
      await api.runAllocation(
        {
          target_date: date,
          branch_id: branchId || null,
          release_staff_id: releaseStaffId || null,
        },
        token
      )
      setReleaseStaffId('')
      load()
    } catch (err) {
      setError(err.message)
    } finally {
      setRunning(false)
    }
  }

  // Granting a wish = moving that leg onto the wished technician. The server
  // re-checks conflicts, hours and skills, so this can never double-book.
  const handleGrant = async (pref) => {
    setGrantingId(pref.booking_detail_id)
    setError(null)
    try {
      await api.reassignLeg(pref.booking_detail_id, pref.preferred_staff_id, token)
      load()
    } catch (err) {
      setError(err.message)
    } finally {
      setGrantingId(null)
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
          {status?.roster?.length > 0 && (
            <label>
              Sick / release technician
              <select
                className="input"
                value={releaseStaffId}
                onChange={(e) => setReleaseStaffId(e.target.value)}
              >
                <option value="">Nobody — just re-run</option>
                {status.roster.map((entry) => (
                  <option key={entry.staff_id} value={entry.staff_id}>
                    {entry.staff_name}
                  </option>
                ))}
              </select>
            </label>
          )}
          <button type="button" className="btn" disabled={running} onClick={handleRun}>
            {running
              ? 'Assigning...'
              : releaseStaffId
                ? 'Release & reassign their bookings'
                : 'Assign technicians now'}
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

            {status.roster.length > 0 && (
              <>
                <h3 style={{ marginTop: '1rem' }}>Who works where</h3>
                <div className="roster-list">
                  {status.roster.map((entry) => (
                    <div key={entry.staff_id} className="roster-row">
                      <strong>{entry.staff_name}</strong>
                      <span className="muted"> → {entry.branch_name} </span>
                      <span className="roster-badge" title="Placed by the nightly allocation">
                        auto
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}

            {status.preferences.length > 0 && (
              <>
                <h3 style={{ marginTop: '1rem' }}>Customer wishes</h3>
                <p className="muted">
                  The allocator ignores wishes on purpose (fairness first). Granted ✓ means the
                  wish came true by itself; for the rest, the button moves that leg onto the
                  wished technician — it only works when their schedule has room.
                </p>
                <div className="roster-list">
                  {status.preferences.map((pref) => (
                    <div key={pref.booking_detail_id} className="roster-row">
                      <strong>
                        {new Date(pref.start_time).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}{' '}
                        · {pref.service_name}
                      </strong>
                      <span className="muted">
                        {' '}
                        wants {pref.preferred_staff_name} · now:{' '}
                        {pref.assigned_staff_name || 'unassigned'}{' '}
                      </span>
                      {pref.honoured ? (
                        <span className="roster-badge" title="The wish came true">
                          ✓ granted
                        </span>
                      ) : (
                        <button
                          type="button"
                          className="btn btn-outline"
                          disabled={grantingId === pref.booking_detail_id}
                          onClick={() => handleGrant(pref)}
                        >
                          {grantingId === pref.booking_detail_id
                            ? 'Moving...'
                            : `Give to ${pref.preferred_staff_name}`}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </>
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
