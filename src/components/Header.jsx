import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'
import Logo from './Logo'

export default function Header() {
  const { auth, logout } = useAuth()
  const { totals } = useCart()
  const location = useLocation()
  const [requestCount, setRequestCount] = useState(0)
  const [quotedCount, setQuotedCount] = useState(0)

  const isStaff = auth && (auth.role === 'admin' || auth.role === 'staff')
  const isCustomer = auth && auth.role === 'customer'

  // Refresh the badges on navigation so changes elsewhere show up.
  useEffect(() => {
    if (!isStaff) {
      setRequestCount(0)
      return
    }
    api
      .pendingBookings(null, auth.token)
      .then((requests) => setRequestCount(requests.length))
      .catch(() => {})
  }, [isStaff, auth, location])

  // A quoted design waiting for the customer's yes/no shows as a badge - the
  // on-site signal that their nail art request has an answer.
  useEffect(() => {
    if (!isCustomer) {
      setQuotedCount(0)
      return
    }
    api
      .myCustomDesigns(auth.token)
      .then((designs) => setQuotedCount(designs.filter((d) => d.status === 'priced').length))
      .catch(() => {})
  }, [isCustomer, auth, location])

  return (
    <header className="header">
      <Link to="/" className="header-brand">
        <Logo />
        <span>
          Nailzinc <em>Limited</em>
        </span>
      </Link>
      <nav className="header-nav">
        <Link to="/cart" className="cart-link">
          Cart
          {totals.count > 0 && <span className="cart-count">{totals.count}</span>}
        </Link>
        {auth ? (
          <>
            {isCustomer && (
              <Link to="/designs" className="cart-link">
                Designs
                {quotedCount > 0 && <span className="cart-count">{quotedCount}</span>}
              </Link>
            )}
            {isStaff && <Link to="/schedule">Schedule</Link>}
            {isStaff && (
              <Link to="/requests" className="cart-link">
                Requests
                {requestCount > 0 && <span className="cart-count">{requestCount}</span>}
              </Link>
            )}
            {auth.role === 'admin' && <Link to="/dashboard">Dashboard</Link>}
            <Link to="/me">My account</Link>
            <button className="btn btn-outline header-logout" onClick={logout}>
              Log out
            </button>
          </>
        ) : (
          <Link to="/login">Log in</Link>
        )}
      </nav>
    </header>
  )
}
