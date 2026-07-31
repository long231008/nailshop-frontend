import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'

const DAILY_LIMIT_MINUTES = 120
// Bookings for a day close at 21:00 the evening before (the salon then assigns
// technicians), so online booking starts from tomorrow and spans 14 days.
const BOOKING_HORIZON_DAYS = 14
const FACEBOOK_PAGE_URL = import.meta.env.VITE_FACEBOOK_PAGE_URL

function tomorrowIso() {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  return d.toISOString().slice(0, 10)
}

function horizonIso() {
  const limit = new Date()
  limit.setDate(limit.getDate() + BOOKING_HORIZON_DAYS)
  return limit.toISOString().slice(0, 10)
}

function isSunday(dateStr) {
  return new Date(`${dateStr}T00:00`).getDay() === 0
}

function fmtTime(isoTime) {
  return new Date(isoTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

// One branch's slice of the cart: its own date, slot pick and booking, because
// a booking always belongs to a single salon.
function BranchCartSection({ branchId, branchItems, branchAddress, onBooked }) {
  const { removeItem } = useCart()
  const { auth } = useAuth()
  const navigate = useNavigate()

  const [date, setDate] = useState(tomorrowIso())
  const [slots, setSlots] = useState(null)
  const [bookingWindow, setBookingWindow] = useState('open')
  const [lockedRanges, setLockedRanges] = useState([])
  const [selectedSlot, setSelectedSlot] = useState(null)
  const [giftMessage, setGiftMessage] = useState(null)
  const [bookError, setBookError] = useState(null)
  const [busy, setBusy] = useState(false)

  const branchName = branchItems[0].branchName
  const totalPrice = branchItems.reduce((sum, item) => sum + item.price, 0)
  const totalDuration = branchItems.reduce((sum, item) => sum + item.durationMin, 0)
  const overDailyLimit = totalDuration > DAILY_LIMIT_MINUTES

  useEffect(() => {
    api
      .giftPreview(branchId, totalPrice)
      .then((data) => setGiftMessage(data.gift_message))
      .catch(() => setGiftMessage(null))
  }, [branchId, totalPrice])

  const serviceIds = branchItems.map((item) => item.serviceId).join(',')

  useEffect(() => {
    if (!date || overDailyLimit) return
    setSlots(null)
    setSelectedSlot(null)
    setBookingWindow('open')
    setLockedRanges([])
    if (isSunday(date)) return
    api
      .getAvailability({
        branch_id: branchId,
        service_ids: serviceIds,
        date,
      })
      .then((data) => {
        setBookingWindow(data.window)
        setSlots(data.slots)
      })
      .catch(() => setSlots([]))
    api
      .publicLockedRanges(branchId, date)
      .then(setLockedRanges)
      .catch(() => setLockedRanges([]))
  }, [branchId, date, serviceIds, overDailyLimit])

  // Free slots plus locked quarter-hours, merged into one chronological strip so
  // locked times show crossed out instead of silently vanishing.
  const slotEntries = useMemo(() => {
    if (!slots) return null
    const seen = new Map()
    for (const slot of slots) {
      const key = new Date(slot.start_time).getTime()
      if (!seen.has(key)) seen.set(key, { time: key, iso: slot.start_time, slot, locked: false })
    }
    for (const range of lockedRanges) {
      const start = new Date(range.start_time)
      const end = new Date(range.end_time)
      for (let t = new Date(start); t < end; t = new Date(t.getTime() + 15 * 60000)) {
        const key = t.getTime()
        seen.set(key, { time: key, iso: t.toISOString(), slot: null, locked: true })
      }
    }
    return [...seen.values()].sort((a, b) => a.time - b.time)
  }, [slots, lockedRanges])

  const handleConfirm = async () => {
    if (!auth) {
      navigate('/login?next=/cart')
      return
    }
    setBookError(null)
    setBusy(true)
    try {
      // The server lays the visit out back-to-back from the slot's start and
      // assigns technicians at the nightly close - no staff is picked here.
      const items = branchItems.map((item) => ({
        service_id: item.serviceId,
        start_time: selectedSlot.start_time,
        custom_design_id: item.designId || null,
      }))
      const result = await api.createBooking({ branch_id: branchId, items }, auth.token)
      onBooked(branchId, result)
    } catch (err) {
      setBookError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="card branch-cart">
      <div className="branch-cart-head">
        <div>
          <h2>{branchName}</h2>
          {branchAddress && <p className="muted">{branchAddress}</p>}
        </div>
        <span className="muted">
          {branchItems.length} {branchItems.length === 1 ? 'treatment' : 'treatments'} ·{' '}
          {totalDuration} min
        </span>
      </div>

      <div className="service-list">
        {branchItems.map((item) => (
          <div key={item.cartIndex} className="cart-row">
            <div className="service-row-info">
              <strong>{item.name}</strong>
              <p className="muted">
                {item.durationMin} min · {branchName}
                {branchAddress ? ` — ${branchAddress}` : ''}
              </p>
            </div>
            <div className="service-row-action">
              <span className="service-price">£{item.price}</span>
              <button
                className="btn btn-danger-outline"
                onClick={() => removeItem(item.cartIndex)}
                aria-label={`Remove ${item.name}`}
              >
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="cart-total">
        <span>Total at {branchName}</span>
        <span className="service-price">£{totalPrice.toFixed(2)}</span>
      </div>
      {giftMessage && <p className="gift-banner">🎁 {giftMessage}</p>}

      {overDailyLimit && (
        <p className="error-text" style={{ marginTop: '1rem' }}>
          Bookings are limited to {DAILY_LIMIT_MINUTES / 60} hours per day. Please remove a
          treatment or split your visit across two days.
        </p>
      )}

      {!overDailyLimit && (
        <div className="form-stack">
          <label>
            Date
            <input
              className="input"
              type="date"
              min={tomorrowIso()}
              max={horizonIso()}
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </label>

          {isSunday(date) && (
            <div className="gift-banner">
              We&apos;re closed on Sundays. For a Sunday appointment, please message us on our
              Facebook page
              {FACEBOOK_PAGE_URL ? (
                <>
                  {': '}
                  <a href={FACEBOOK_PAGE_URL} target="_blank" rel="noreferrer">
                    send us a message
                  </a>
                </>
              ) : (
                '.'
              )}
            </div>
          )}

          {!isSunday(date) && bookingWindow === 'closed' && (
            <div className="gift-banner">
              Bookings for this day closed at 21:00 the evening before — the salon is assigning
              its technicians. Please walk in, or pick a later day.
            </div>
          )}
          {!isSunday(date) && bookingWindow === 'too_far' && (
            <div className="gift-banner">
              We take bookings up to {BOOKING_HORIZON_DAYS} days ahead. Please pick an earlier
              day.
            </div>
          )}

          {!isSunday(date) && bookingWindow === 'open' && slotEntries === null && (
            <p className="muted">Loading available times...</p>
          )}
          {!isSunday(date) &&
            bookingWindow === 'open' &&
            slotEntries !== null &&
            slotEntries.length === 0 && (
              <p className="muted">
                No time can fit all {branchItems.length}{' '}
                {branchItems.length === 1 ? 'treatment' : 'treatments'} on this date. Try another
                day.
              </p>
            )}

          {slotEntries && slotEntries.length > 0 && !isSunday(date) && bookingWindow === 'open' && (
            <div className="slot-grid">
              {slotEntries.map((entry) =>
                entry.locked ? (
                  <button
                    key={entry.time}
                    type="button"
                    className="btn btn-outline slot-btn slot-btn-locked"
                    disabled
                    title="This time has been locked by the salon"
                  >
                    {fmtTime(entry.iso)}
                  </button>
                ) : (
                  <button
                    key={entry.time}
                    type="button"
                    className={
                      'btn btn-outline slot-btn' +
                      (selectedSlot?.start_time === entry.slot.start_time
                        ? ' slot-btn-active'
                        : '')
                    }
                    onClick={() => setSelectedSlot(entry.slot)}
                  >
                    {fmtTime(entry.iso)}
                  </button>
                )
              )}
            </div>
          )}

          {selectedSlot && (
            <p className="muted">
              The salon will assign you a suitable technician the evening before your visit.
            </p>
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
                ? `Book at ${branchName}`
                : 'Log in to book'}
          </button>
        </div>
      )}
    </div>
  )
}

export default function CartPage() {
  const { items, totals, removeBranchItems } = useCart()
  const [branches, setBranches] = useState([])
  const [confirmations, setConfirmations] = useState([])

  useEffect(() => {
    api.listBranches().then(setBranches).catch(() => {})
  }, [])

  const groups = useMemo(() => {
    const map = new Map()
    items.forEach((item, index) => {
      if (!map.has(item.branchId)) map.set(item.branchId, [])
      map.get(item.branchId).push({ ...item, cartIndex: index })
    })
    return [...map.entries()]
  }, [items])

  const branchAddress = (id) => branches.find((b) => b.id === id)?.address || null

  const handleBooked = (branchId, booking) => {
    const group = groups.find(([id]) => id === branchId)
    setConfirmations((prev) => [
      ...prev,
      {
        branchName: group ? group[1][0].branchName : 'the salon',
        count: booking.details.length,
        total: booking.total_price,
        giftMessage: booking.gift_message,
      },
    ])
    removeBranchItems(branchId)
  }

  return (
    <div className="container container-narrow">
      <h1>Your cart</h1>
      {totals.count > 0 && (
        <p className="muted">
          {totals.count} {totals.count === 1 ? 'treatment' : 'treatments'} across{' '}
          {groups.length} {groups.length === 1 ? 'salon' : 'salons'} · £
          {totals.price.toFixed(2)}
        </p>
      )}

      {confirmations.map((c, i) => (
        <div key={i} className="card booking-confirmation">
          <p>
            ✅ Booking of <strong>{c.count}</strong> {c.count === 1 ? 'treatment' : 'treatments'}{' '}
            (£{c.total}) at <strong>{c.branchName}</strong> submitted. The salon will confirm it
            and send you a deposit link.
          </p>
          {c.giftMessage && <p className="gift-banner">🎁 {c.giftMessage}</p>}
        </div>
      ))}

      {items.length === 0 && confirmations.length === 0 && (
        <div className="card">
          <p className="muted">Your cart is empty.</p>
          <Link to="/" className="btn">
            Browse our salons
          </Link>
        </div>
      )}

      {items.length === 0 && confirmations.length > 0 && (
        <Link to="/me" className="btn" style={{ marginTop: '0.5rem' }}>
          View my bookings
        </Link>
      )}

      {groups.map(([branchId, branchItems]) => (
        <BranchCartSection
          key={branchId}
          branchId={branchId}
          branchItems={branchItems}
          branchAddress={branchAddress(branchId)}
          onBooked={handleBooked}
        />
      ))}
    </div>
  )
}
