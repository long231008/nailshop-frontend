import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'

export default function Header() {
  const { auth, logout } = useAuth()
  const { totals } = useCart()

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
