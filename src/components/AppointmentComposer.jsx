import { useEffect, useState } from 'react'
import { api } from '../api/client'

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

  useEffect(() => {
    if (!branchId) return
    api.getBranch(branchId).then((b) => setServices(b.services || [])).catch(() => setServices([]))
    api.listStaff(branchId, token).then(setStaff).catch(() => setStaff([]))
  }, [branchId, token])

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
