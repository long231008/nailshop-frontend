import { useCallback, useEffect, useState } from 'react'
import { api } from '../api/client'

const OPEN_HOUR = 9
const CLOSE_HOUR = 18
const STEP_MIN = 15

const QUARTERS = []
for (let h = OPEN_HOUR; h < CLOSE_HOUR; h += 1) {
  for (let m = 0; m < 60; m += STEP_MIN) {
    QUARTERS.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`)
  }
}

function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

function quarterDate(dateStr, label) {
  return new Date(`${dateStr}T${label}:00`)
}

// Lock/unlock the salon book in the same 15-minute steps customers see.
// Admins manage every branch; staff need the delegated permission.
export default function SlotLockManager({ branchId, token, initialDate, showPermissions = false }) {
  const [lockDate, setLockDate] = useState(initialDate || todayIso())
  const [staff, setStaff] = useState([])
  const [staffId, setStaffId] = useState('')
  const [locks, setLocks] = useState([])
  const [selected, setSelected] = useState(new Set())
  const [reason, setReason] = useState('')
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  const [allowed, setAllowed] = useState(true)

  useEffect(() => {
    if (initialDate) setLockDate(initialDate)
  }, [initialDate])

  useEffect(() => {
    setStaffId('')
    setSelected(new Set())
    // Staff listing is admin-only; staff members simply lock branch-wide or
    // leave the selector on "whole branch".
    api.listStaff(branchId, token).then(setStaff).catch(() => setStaff([]))
  }, [branchId, token])

  const reload = useCallback(() => {
    api
      .listSlotLocks(branchId, token)
      .then((data) => {
        setLocks(data)
        setAllowed(true)
      })
      .catch((err) => {
        if (err.status === 403) setAllowed(false)
        else setError(err.message)
      })
  }, [branchId, token])

  useEffect(() => {
    setError(null)
    reload()
  }, [reload])

  if (!allowed) return null

  const staffName = (id) => staff.find((s) => s.id === id)?.display_name || 'one staff member'

  // A quarter is blocked when an existing lock overlaps it and applies to the
  // current scope (whole branch, or the chosen staff member).
  const lockCovering = (label) => {
    const start = quarterDate(lockDate, label)
    const end = new Date(start.getTime() + STEP_MIN * 60000)
    return locks.find((lock) => {
      const lockStart = new Date(lock.start_time)
      const lockEnd = new Date(lock.end_time)
      if (!(lockStart < end && lockEnd > start)) return false
      if (staffId === '') return true
      return lock.staff_id === null || lock.staff_id === staffId
    })
  }

  const toggle = (label) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(label)) next.delete(label)
      else next.add(label)
      return next
    })
  }

  const handlePermission = async (member) => {
    setError(null)
    try {
      await api.setSlotLockPermission(member.id, !member.can_lock_slots, token)
      api.listStaff(branchId, token).then(setStaff).catch(() => {})
    } catch (err) {
      setError(err.message)
    }
  }

  const handleUnlock = async (lock) => {
    const scope = lock.staff_id ? staffName(lock.staff_id) : 'the whole branch'
    const confirmed = window.confirm(
      `Unlock ${new Date(lock.start_time).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      })}–${new Date(lock.end_time).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      })} for ${scope}?`
    )
    if (!confirmed) return
    setError(null)
    try {
      await api.deleteSlotLock(lock.id, token)
      reload()
    } catch (err) {
      setError(err.message)
    }
  }

  const handleLock = async () => {
    // Merge chosen quarters into contiguous ranges: 09:00+09:15+09:30 -> one lock.
    const chosen = QUARTERS.filter((q) => selected.has(q))
    if (chosen.length === 0) return
    const ranges = []
    let runStart = chosen[0]
    let prevIndex = QUARTERS.indexOf(chosen[0])
    for (const label of chosen.slice(1)) {
      const index = QUARTERS.indexOf(label)
      if (index !== prevIndex + 1) {
        ranges.push([runStart, QUARTERS[prevIndex]])
        runStart = label
      }
      prevIndex = index
    }
    ranges.push([runStart, QUARTERS[prevIndex]])

    setBusy(true)
    setError(null)
    try {
      for (const [startLabel, endLabel] of ranges) {
        await api.createSlotLock(
          {
            branch_id: branchId,
            staff_id: staffId || null,
            start_time: quarterDate(lockDate, startLabel).toISOString(),
            end_time: new Date(
              quarterDate(lockDate, endLabel).getTime() + STEP_MIN * 60000
            ).toISOString(),
            reason: reason || null,
          },
          token
        )
      }
      setSelected(new Set())
      setReason('')
      reload()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="lock-section">
      <h2 className="dash-heading">Lock time slots</h2>
      <p className="muted">
        Tap the 15-minute slots to select, then lock them — e.g. when walk-ins have already
        filled that time. Tap a locked (red) slot to unlock it.
      </p>

      <div className="lock-controls">
        <label>
          Date
          <input
            className="input"
            type="date"
            min={todayIso()}
            value={lockDate}
            onChange={(e) => {
              setLockDate(e.target.value)
              setSelected(new Set())
            }}
          />
        </label>
        <label>
          Applies to
          <select
            className="input"
            value={staffId}
            onChange={(e) => {
              setStaffId(e.target.value)
              setSelected(new Set())
            }}
          >
            <option value="">Whole branch</option>
            {staff.map((s) => (
              <option key={s.id} value={s.id}>
                {s.display_name}
              </option>
            ))}
          </select>
        </label>
        <label className="lock-reason">
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
      </div>

      {error && <p className="error-text">{error}</p>}

      <div className="lockgrid">
        {QUARTERS.map((label) => {
          const lock = lockCovering(label)
          if (lock) {
            return (
              <button
                key={label}
                type="button"
                className="lockgrid-slot lockgrid-slot-locked"
                title={lock.reason || 'Locked'}
                onClick={() => handleUnlock(lock)}
              >
                {label}
              </button>
            )
          }
          return (
            <button
              key={label}
              type="button"
              className={
                'lockgrid-slot' + (selected.has(label) ? ' lockgrid-slot-selected' : '')
              }
              onClick={() => toggle(label)}
            >
              {label}
            </button>
          )
        })}
      </div>

      <div className="lock-actions">
        <button className="btn" disabled={busy || selected.size === 0} onClick={handleLock}>
          {busy
            ? 'Locking...'
            : `Lock ${selected.size || ''} ${selected.size === 1 ? 'slot' : 'slots'}`}
        </button>
        {selected.size > 0 && (
          <button className="btn btn-outline" onClick={() => setSelected(new Set())}>
            Clear selection
          </button>
        )}
      </div>

      {showPermissions && staff.length > 0 && (
        <>
          <h3 className="dash-heading-sub">Staff lock permission</h3>
          <p className="muted">
            Staff with this permission can lock and unlock time slots at their own branch from
            their account.
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
      )}
    </section>
  )
}
