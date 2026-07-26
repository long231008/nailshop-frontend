import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'

const DAILY_LIMIT_MINUTES = 120

function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

export default function CartPage() {
  const { cart, totals, removeItem, clear } = useCart()
  const { auth } = useAuth()
  const navigate = useNavigate()

  const [date, setDate] = useState(todayIso())
  const [slots, setSlots] = useState(null)
  const [selectedSlot, setSelectedSlot] = useState(null)
  const [giftMessage, setGiftMessage] = useState(null)
  const [bookError, setBookError] = useState(null)
  const [booking, setBooking] = useState(null)
  const [busy, setBusy] = useState(false)

  const overDailyLimit = totals.durationMin > DAILY_LIMIT_MINUTES

  useEffect(() => {
    if (!cart) return
    api
      .giftPreview(cart.branchId, totals.price)
      .then((data) => setGiftMessage(data.gift_message))
      .catch(() => setGiftMessage(null))
  }, [cart, totals.price])

  useEffect(() => {
    if (!cart || !date || overDailyLimit) return
    setSlots(null)
    setSelectedSlot(null)
    api
      .getAvailability({
        branch_id: cart.branchId,
        service_id: cart.items[0].serviceId,
        date,
        duration_min: totals.durationMin,
      })
      .then(setSlots)
      .catch(() => setSlots([]))
  }, [cart, date, totals.durationMin, overDailyLimit])

  const slotsByTime = useMemo(() => {
    if (!slots) return null
    const map = new Map()
    for (const slot of slots) {
      if (!map.has(slot.start_time)) map.set(slot.start_time, slot)
    }
    return [...map.values()].sort((a, b) => a.start_time.localeCompare(b.start_time))
  }, [slots])

  const handleConfirm = async () => {
    if (!auth) {
      navigate('/login?next=/cart')
      return
    }
    setBookError(null)
    setBusy(true)
    try {
      // Services run back-to-back with the staff member from the chosen slot.
      let offsetMin = 0
      const items = cart.items.map((item) => {
        const start = new Date(
          new Date(selectedSlot.start_time).getTime() + offsetMin * 60000
        ).toISOString()
        offsetMin += item.durationMin
        return {
          service_id: item.serviceId,
          staff_id: selectedSlot.staff_id,
          start_time: start,
        }
      })
      const result = await api.createBooking({ branch_id: cart.branchId, items }, auth.token)
      setBooking(result)
      clear()
    } catch (err) {
      setBookError(err.message)
    } finally {
      setBusy(false)
    }
  }

  if (booking) {
    return (
      <div className="container container-narrow">
        <h1>Booking requested</h1>
        <div className="card">
          <p>
            Your booking of <strong>{booking.details.length}</strong>{' '}
            {booking.details.length === 1 ? 'treatment' : 'treatments'} (£
            {booking.total_price}) has been submitted.
          </p>
          {booking.gift_message && <p className="gift-banner">🎁 {booking.gift_message}</p>}
          <p className="muted">
            The salon will confirm it and send you a deposit link. You can pay the deposit from
            your account page.
          </p>
          <Link to="/me" className="btn">
            View my bookings
          </Link>
        </div>
      </div>
    )
  }

  if (!cart) {
    return (
      <div className="container container-narrow">
        <h1>Your cart</h1>
        <div className="card">
          <p className="muted">Your cart is empty.</p>
          <Link to="/" className="btn">
            Browse our salons
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="container container-narrow">
      <Link to={`/branches/${cart.branchId}`} className="back-link">
        ← Add more at {cart.branchName}
      </Link>
      <h1>Your cart</h1>
      <p className="muted">
        {cart.branchName} · {totals.count} {totals.count === 1 ? 'treatment' : 'treatments'} ·{' '}
        {totals.durationMin} min
      </p>

      <div className="card">
        <div className="service-list">
          {cart.items.map((item, index) => (
            <div key={`${item.serviceId}-${index}`} className="cart-row">
              <div className="service-row-info">
                <strong>{item.name}</strong>
                <p className="muted">{item.durationMin} min</p>
              </div>
              <div className="service-row-action">
                <span className="service-price">£{item.price}</span>
                <button
                  className="btn btn-danger-outline"
                  onClick={() => removeItem(index)}
                  aria-label={`Remove ${item.name}`}
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
        <div className="cart-total">
          <span>Total</span>
          <span className="service-price">£{totals.price.toFixed(2)}</span>
        </div>
        {giftMessage && <p className="gift-banner">🎁 {giftMessage}</p>}
      </div>

      {overDailyLimit && (
        <p className="error-text" style={{ marginTop: '1rem' }}>
          Bookings are limited to {DAILY_LIMIT_MINUTES / 60} hours per day. Please remove a
          treatment or split your visit across two days.
        </p>
      )}

      {!overDailyLimit && (
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
            <p className="muted">
              No time can fit all {totals.count} treatments on this date. Try another day.
            </p>
          )}

          {slotsByTime && slotsByTime.length > 0 && (
            <div className="slot-grid">
              {slotsByTime.map((slot) => (
                <button
                  key={slot.start_time}
                  type="button"
                  className={
                    'btn btn-outline slot-btn' +
                    (selectedSlot?.start_time === slot.start_time ? ' slot-btn-active' : '')
                  }
                  onClick={() => setSelectedSlot(slot)}
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

          <button
            className="btn btn-gold"
            disabled={!selectedSlot || busy}
            onClick={handleConfirm}
          >
            {busy
              ? 'Booking...'
              : auth
                ? `Book ${totals.count} ${totals.count === 1 ? 'treatment' : 'treatments'}`
                : 'Log in to book'}
          </button>
        </div>
      )}
    </div>
  )
}
