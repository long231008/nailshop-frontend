import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'

export default function BranchesPage() {
  const [branches, setBranches] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    api.listBranches().then(setBranches).catch((err) => setError(err.message))
  }, [])

  return (
    <>
      <section className="hero">
        <span className="hero-eyebrow">Nails · Care · Head Spa</span>
        <h1>
          A little time, <em>beautifully</em> spent
        </h1>
        <p>
          Manicures, BIAB, acrylics and hydro head massages across our salons. Pick a branch,
          choose your treatment and book a time that suits you.
        </p>
        <hr className="hero-rule" />
      </section>

      <div className="container">
        {error && <p className="error-text">Failed to load branches: {error}</p>}
        {!branches && !error && <p className="muted">Loading branches...</p>}

        {branches && (
          <>
            <h2 style={{ textAlign: 'center' }}>Our salons</h2>
            <div className="branch-grid">
              {branches.map((branch) => (
                <Link key={branch.id} to={`/branches/${branch.id}`} className="card branch-card">
                  <h2>{branch.name}</h2>
                  {branch.address && <p className="muted">{branch.address}</p>}
                  {branch.phone_number && <p className="muted">{branch.phone_number}</p>}
                  <span className="muted">{branch.services.length} treatments</span>
                  <span className="branch-card-cta">View services →</span>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
    </>
  )
}
