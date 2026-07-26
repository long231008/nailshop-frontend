import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'

export default function Header() {
  const { auth, logout } = useAuth()
  const { totals } = useCart()
  const location = useLocation()
  const [requestCount, setRequestCount] = useState(0)

  const isStaff = auth && (auth.role === 'admin' || auth.role === 'staff')

  // Refresh the badge on navigation so an approval elsewhere updates it.
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

  return (
    <header className="header">
      <Link to="/" className="header-brand">
        Nailzinc <em>Limited</em>
      </Link>
      <nav className="header-nav">
        <Link to="/cart" className="cart-link">
          Cart
          {totals.count > 0 && <span className="cart-count">{totals.count}</span>}
        </Link>
        {auth ? (
          <>
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
