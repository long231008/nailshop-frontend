import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Header() {
  const { auth, logout } = useAuth()

  return (
    <header className="header">
      <Link to="/" className="header-brand">
        nailshop
      </Link>
      <nav className="header-nav">
        {auth ? (
          <>
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
