import { useEffect, useState } from 'react'
import { api } from '../api/client'

// Local HH:MM, which is exactly what <input type="time"> holds - so a suggested
// time can be dropped straight into the field. toLocaleTimeString would give
// "10:00 AM" in some locales and the two would never match.
const hhmm = (iso) => {
  const at = new Date(iso)
  return `${String(at.getHours()).padStart(2, '0')}:${String(at.getMinutes()).padStart(2, '0')}`
}

// Desk-side "add a walk-in / phone booking" for staff and admins. Lands the
// booking straight on the day grid, optionally with the technician named.
export default function AppointmentComposer({ branchId, date, token, onAdded }) {
  const [open, setOpen] = useState(false)
  const [services, setServices] = useState([])
  const [staff, setStaff] = useState([])
  const [chosen, setChosen] = useState([])
  const [staffId, setStaffId] = useState('')
  const [time, setTime] = useState('10:00')
  const [phone, setPhone] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  const [slots, setSlots] = useState([])
  const [loadingSlots, setLoadingSlots] = useState(false)

  useEffect(() => {
    if (!branchId) return
    api.getBranch(branchId).then((b) => setServices(b.services || [])).catch(() => setServices([]))
    api.listStaff(branchId, token).then(setStaff).catch(() => setStaff([]))
  }, [branchId, token])

  // Which times the salon can still take, for the services picked so far. The
  // starred ones cost the shop nothing - same hint the customer gets - but
  // every listed time is bookable, so this stays a suggestion.
  useEffect(() => {
    if (!open || !branchId || chosen.length === 0) {
      setSlots([])
      return
    }
    let live = true
    setLoadingSlots(true)
    api
      .deskSlots({ branch_id: branchId, date, service_ids: chosen.join(',') }, token)
      .then((data) => live && setSlots(data.slots || []))
      .catch(() => live && setSlots([]))
      .finally(() => live && setLoadingSlots(false))
    return () => {
      live = false
    }
  }, [open, branchId, date, chosen, token])

  if (!branchId) {
    return (
      <p className="muted" style={{ textAlign: 'left' }}>
        Pick a specific branch above to add an appointment.
      </p>
    )
  }

  const toggle = (id) =>
    setChosen((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))

  const handleAdd = async () => {
    if (chosen.length === 0) {
      setError('Pick at least one service')
      return
    }
    if (!phone.trim()) {
      setError('Customer phone is required')
      return
    }
    setBusy(true)
    setError(null)
    try {
      await api.addAppointment(
        {
          branch_id: branchId,
          service_ids: chosen,
          start_time: new Date(`${date}T${time}:00`).toISOString(),
          staff_id: staffId || null,
          customer_phone: phone.trim(),
          customer_name: name.trim() || null,
        },
        token
      )
      setChosen([])
      setPhone('')
      setName('')
      setStaffId('')
      setOpen(false)
      onAdded()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  if (!open) {
    return (
      <div className="matrix-actions">
        <button className="btn btn-gold" onClick={() => setOpen(true)}>
          + Add appointment
        </button>
      </div>
    )
  }

  return (
    <div className="card matrix-card">
      <h3>Add appointment on {date}</h3>
      <div className="lock-controls">
        <label>
          Time
          <input
            className="input"
            type="time"
            step="900"
            value={time}
            onChange={(e) => setTime(e.target.value)}
          />
        </label>
        <label>
          Technician (optional)
          <select className="input" value={staffId} onChange={(e) => setStaffId(e.target.value)}>
            <option value="">Assign at 21:00</option>
            {staff.map((s) => (
              <option key={s.id} value={s.id}>
                {s.display_name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Customer phone
          <input
            className="input"
            type="tel"
            placeholder="07…"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </label>
        <label>
          Customer name (optional)
          <input
            className="input"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
      </div>

      <p className="muted" style={{ textAlign: 'left', marginTop: '0.5rem' }}>
        Services
      </p>
      <div className="slot-grid">
        {services.map((s) => (
          <button
            key={s.id}
            type="button"
            className={'btn btn-outline slot-btn' + (chosen.includes(s.id) ? ' slot-btn-active' : '')}
            onClick={() => toggle(s.id)}
          >
            {s.name}
          </button>
        ))}
      </div>

      {chosen.length > 0 && (
        <>
          <p className="muted slot-legend" style={{ textAlign: 'left', marginTop: '0.75rem' }}>
            {loadingSlots ? (
              'Checking what we can take…'
            ) : slots.length === 0 ? (
              `Nothing left on ${date} for this combination.`
            ) : (
              <>
                <span className="slot-star">★</span> fits our day neatly — any time here can be
                booked.
              </>
            )}
          </p>
          <div className="slot-grid">
            {slots.map((slot) => {
              const label = hhmm(slot.start_time)
              return (
                <button
                  key={slot.start_time}
                  type="button"
                  className={
                    'btn btn-outline slot-btn' +
                    (time === label ? ' slot-btn-active' : '') +
                    (slot.recommended ? ' slot-btn-recommended' : '')
                  }
                  title={slot.recommended ? 'Fits our day neatly' : undefined}
                  onClick={() => setTime(label)}
                >
                  {label}
                  {slot.recommended && <span className="slot-star">★</span>}
                </button>
              )
            })}
          </div>
        </>
      )}

      {error && <p className="error-text">{error}</p>}

      <div className="matrix-actions">
        <button className="btn btn-gold" disabled={busy} onClick={handleAdd}>
          {busy ? 'Adding…' : 'Add to the book'}
        </button>
        <button className="btn btn-outline" onClick={() => setOpen(false)}>
          Cancel
        </button>
      </div>
    </div>
  )
}
