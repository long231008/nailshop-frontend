import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'

export default function BranchesPage() {
  const [branches, setBranches] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    api.listBranches().then(setBranches).catch((err) => setError(err.message))
  }, [])

  if (error) return <div className="container error-text">Failed to load branches: {error}</div>
  if (!branches) return <div className="container muted">Loading branches...</div>

  return (
    <div className="container">
      <h1>Our salons</h1>
      <p>Pick a branch to see their services and book an appointment.</p>
      <div className="branch-grid">
        {branches.map((branch) => (
          <Link key={branch.id} to={`/branches/${branch.id}`} className="card branch-card">
            <h2>{branch.name}</h2>
            {branch.address && <p className="muted">{branch.address}</p>}
            {branch.phone_number && <p className="muted">{branch.phone_number}</p>}
            <span className="badge">{branch.services.length} services</span>
          </Link>
        ))}
      </div>
    </div>
  )
}
