import { useCallback, useEffect, useState } from 'react'
import { api } from '../api/client'

function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

// Admin tool: close a time range for the whole branch (or one staff member),
// e.g. when a slot is already full with walk-ins.
export default function SlotLockManager({ branchId, token }) {
  const [staff, setStaff] = useState([])
  const [locks, setLocks] = useState([])
  const [error, setError] = useState(null)

  const [lockDate, setLockDate] = useState(todayIso())
  const [fromTime, setFromTime] = useState('09:00')
  const [toTime, setToTime] = useState('10:00')
  const [staffId, setStaffId] = useState('')
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)

  const reload = useCallback(() => {
    api.listStaff(branchId, token).then(setStaff).catch(() => setStaff([]))
    api.listSlotLocks(branchId, token).then(setLocks).catch(() => setLocks([]))
  }, [branchId, token])

  useEffect(() => {
    setError(null)
    reload()
  }, [reload])

  const staffName = (id) => staff.find((s) => s.id === id)?.display_name || 'Unknown staff'

  const handleCreate = async (e) => {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      await api.createSlotLock(
        {
          branch_id: branchId,
          staff_id: staffId || null,
          start_time: new Date(`${lockDate}T${fromTime}`).toISOString(),
          end_time: new Date(`${lockDate}T${toTime}`).toISOString(),
          reason: reason || null,
        },
        token
      )
      setReason('')
      reload()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const handleDelete = async (lockId) => {
    setError(null)
    try {
      await api.deleteSlotLock(lockId, token)
      reload()
    } catch (err) {
      setError(err.message)
    }
  }

  const handlePermission = async (member) => {
    setError(null)
    try {
      await api.setSlotLockPermission(member.id, !member.can_lock_slots, token)
      reload()
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <>
      <h2 className="dash-heading">Time slot locks</h2>
      {error && <p className="error-text">{error}</p>}

      <div className="revenue-grid">
        <form onSubmit={handleCreate} className="card form-stack" style={{ marginTop: 0 }}>
          <h3 style={{ margin: 0 }}>Lock a time range</h3>
          <label>
            Date
            <input
              className="input"
              type="date"
              min={todayIso()}
              value={lockDate}
              onChange={(e) => setLockDate(e.target.value)}
            />
          </label>
          <div className="lock-time-row">
            <label>
              From
              <input
                className="input"
                type="time"
                step="900"
                value={fromTime}
                onChange={(e) => setFromTime(e.target.value)}
              />
            </label>
            <label>
              To
              <input
                className="input"
                type="time"
                step="900"
                value={toTime}
                onChange={(e) => setToTime(e.target.value)}
              />
            </label>
          </div>
          <label>
            Staff
            <select
              className="input"
              value={staffId}
              onChange={(e) => setStaffId(e.target.value)}
            >
              <option value="">Whole branch</option>
              {staff.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.display_name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Reason (optional)
            <input
              className="input"
              type="text"
              maxLength={255}
              placeholder="Fully booked with walk-ins"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </label>
          <button className="btn" type="submit" disabled={busy}>
            {busy ? 'Locking...' : 'Lock slot'}
          </button>
        </form>

        <div className="card">
          <h3 style={{ marginTop: 0 }}>Active locks</h3>
          {locks.length === 0 && <p className="muted">No locks for this branch.</p>}
          <div className="service-list">
            {locks.map((lock) => (
              <div key={lock.id} className="cart-row">
                <div className="service-row-info">
                  <strong>
                    {new Date(lock.start_time).toLocaleString([], {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })}
                    {' → '}
                    {new Date(lock.end_time).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </strong>
                  <p className="muted">
                    {lock.staff_id ? staffName(lock.staff_id) : 'Whole branch'}
                    {lock.reason ? ` · ${lock.reason}` : ''}
                  </p>
                </div>
                <button className="btn btn-danger-outline" onClick={() => handleDelete(lock.id)}>
                  Unlock
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      <h2 className="dash-heading">Staff lock permission</h2>
      <p className="muted">
        Staff with this permission can lock and unlock time slots at their own branch from their
        account.
      </p>
      <div className="stat-row">
        {staff.map((member) => (
          <div key={member.id} className="stat-tile">
            <span className="muted">{member.display_name}</span>
            <button
              className={member.can_lock_slots ? 'btn' : 'btn btn-outline'}
              style={{ padding: '0.35rem 0.9rem', fontSize: '0.8rem' }}
              onClick={() => handlePermission(member)}
            >
              {member.can_lock_slots ? 'Can lock ✓' : 'Grant'}
            </button>
          </div>
        ))}
      </div>
    </>
  )
}
