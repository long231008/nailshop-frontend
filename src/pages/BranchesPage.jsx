import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import { SEASON_LABELS, currentSeason } from '../season'

const CATEGORY_SHORT_LABELS = {
  polish: 'Polish',
  gel: 'Gel',
  full_set: 'Acrylics',
  infill: 'Infills',
  removal: 'Removal',
  biab: 'BIAB',
  addon: 'Nail Art',
  hydro_head_massage: 'Head Spa',
}

function serviceSummary(services) {
  const seen = []
  for (const service of services) {
    const label = CATEGORY_SHORT_LABELS[service.category] || service.category
    if (!seen.includes(label)) seen.push(label)
  }
  return seen.join(' · ')
}

export default function BranchesPage() {
  const [branches, setBranches] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    api.listBranches().then(setBranches).catch((err) => setError(err.message))
  }, [])

  return (
    <>
      <section className="hero">
        <span className="hero-eyebrow">
          {SEASON_LABELS[currentSeason()]} · Nails · Care · Head Spa
        </span>
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
                  {branch.services.length > 0 && (
                    <p className="branch-card-services">{serviceSummary(branch.services)}</p>
                  )}
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
