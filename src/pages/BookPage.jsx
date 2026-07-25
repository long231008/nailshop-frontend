import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'

function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

export default function BookPage() {
  const [searchParams] = useSearchParams()
  const branchId = searchParams.get('branchId')
  const serviceId = searchParams.get('serviceId')
  const { auth } = useAuth()

  const [branch, setBranch] = useState(null)
  const [service, setService] = useState(null)
  const [date, setDate] = useState(todayIso())
  const [slots, setSlots] = useState(null)
  const [selectedTime, setSelectedTime] = useState(null)
  const [loadError, setLoadError] = useState(null)
  const [bookError, setBookError] = useState(null)
  const [booking, setBooking] = useState(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    api
      .getBranch(branchId)
      .then((foundBranch) => {
        const foundService = foundBranch.services.find((s) => s.id === serviceId)
        if (!foundService) throw new Error('Service not found')
        setBranch(foundBranch)
        setService(foundService)
      })
      .catch((err) => setLoadError(err.message))
  }, [branchId, serviceId])

  useEffect(() => {
    if (!auth || !date) return
    setSlots(null)
    setSelectedTime(null)
    api
      .getAvailability({ branch_id: branchId, service_id: serviceId, date }, auth.token)
      .then(setSlots)
      .catch((err) => setLoadError(err.message))
  }, [auth, branchId, serviceId, date])

  // Multiple staff can share the same free start_time; the customer just picks
  // a time and we book the first staff member available for it.
  const slotsByTime = useMemo(() => {
    if (!slots) return null
    const map = new Map()
    for (const slot of slots) {
      if (!map.has(slot.start_time)) map.set(slot.start_time, slot)
    }
    return [...map.values()].sort((a, b) => a.start_time.localeCompare(b.start_time))
  }, [slots])

  const handleConfirm = async () => {
    setBookError(null)
    setBusy(true)
    try {
      const result = await api.createBooking(
        {
          branch_id: branchId,
          items: [
            {
              service_id: serviceId,
              staff_id: selectedTime.staff_id,
              start_time: selectedTime.start_time,
            },
          ],
        },
        auth.token
      )
      setBooking(result)
    } catch (err) {
      setBookError(err.message)
    } finally {
      setBusy(false)
    }
  }

  if (loadError) return <div className="container error-text">{loadError}</div>
  if (!branch || !service) return <div className="container muted">Loading...</div>

  if (booking) {
    return (
      <div className="container container-narrow">
        <h1>Booking requested</h1>
        <div className="card">
          <p>
            Your booking for <strong>{service.name}</strong> at <strong>{branch.name}</strong> on{' '}
            {new Date(selectedTime.start_time).toLocaleString()} has been submitted.
          </p>
          <p className="muted">
            Status: <span className="badge badge-pending">{booking.status}</span> — the salon will
            confirm it and send you a deposit link. You can pay the deposit from your account page.
          </p>
          {booking.gift_message && <p>{booking.gift_message}</p>}
          <Link to="/me" className="btn">
            View my bookings
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="container container-narrow">
      <Link to={`/branches/${branchId}`} className="back-link">
        ← Back to {branch.name}
      </Link>
      <h1>{service.name}</h1>
      <p className="muted">
        {branch.name} · £{service.base_price} · {service.duration_min} min
      </p>

      {!auth && (
        <div className="card">
          <p>Please log in to book an appointment.</p>
          <Link
            to={`/login?next=/book?branchId=${branchId}%26serviceId=${serviceId}`}
            className="btn"
          >
            Log in
          </Link>
        </div>
      )}

      {auth && (
        <div className="card form-stack">
          <label>
            Date
            <input
              className="input"
              type="date"
              min={todayIso()}
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </label>

          {slots === null && <p className="muted">Loading available times...</p>}
          {slots !== null && slotsByTime.length === 0 && (
            <p className="muted">No available times on this date. Try another day.</p>
          )}

          {slotsByTime && slotsByTime.length > 0 && (
            <div className="slot-grid">
              {slotsByTime.map((slot) => (
                <button
                  key={slot.start_time}
                  type="button"
                  className={
                    'btn btn-outline slot-btn' +
                    (selectedTime?.start_time === slot.start_time ? ' slot-btn-active' : '')
                  }
                  onClick={() => setSelectedTime(slot)}
                >
                  {new Date(slot.start_time).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </button>
              ))}
            </div>
          )}

          {bookError && <p className="error-text">{bookError}</p>}

          <button className="btn btn-gold" disabled={!selectedTime || busy} onClick={handleConfirm}>
            {busy ? 'Booking...' : 'Confirm booking'}
          </button>
        </div>
      )}
    </div>
  )
}
