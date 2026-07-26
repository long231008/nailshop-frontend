import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../api/client'
import { useCart } from '../context/CartContext'

const CATEGORY_LABELS = {
  polish: 'Polish',
  gel: 'Gel',
  full_set: 'Full Set',
  infill: 'Infills',
  removal: 'Removal',
  biab: 'Builder Gel (BIAB)',
  addon: 'Nail Art & Add-ons',
  hydro_head_massage: 'Hydro Head Massage',
}

function groupByCategory(services) {
  const groups = new Map()
  for (const service of services) {
    if (!groups.has(service.category)) groups.set(service.category, [])
    groups.get(service.category).push(service)
  }
  return groups
}

export default function BranchDetailPage() {
  const { branchId } = useParams()
  const { cart, totals, addItem } = useCart()
  const [branch, setBranch] = useState(null)
  const [error, setError] = useState(null)
  const [justAdded, setJustAdded] = useState(null)

  useEffect(() => {
    api
      .getBranch(branchId)
      .then(setBranch)
      .catch((err) => setError(err.message))
  }, [branchId])

  const handleAdd = (service) => {
    let result = addItem(branch, service)
    if (result === 'different-branch') {
      const confirmed = window.confirm(
        `Your cart contains treatments at ${cart.branchName}. ` +
          `Start a new cart at ${branch.name} instead?`
      )
      if (!confirmed) return
      result = addItem(branch, service, { replaceBranch: true })
    }
    if (result === 'added') {
      setJustAdded(service.id)
      setTimeout(() => setJustAdded(null), 1500)
    }
  }

  if (error) return <div className="container error-text">{error}</div>
  if (!branch) return <div className="container muted">Loading...</div>

  const groups = groupByCategory(branch.services)

  return (
    <div className="container">
      <Link to="/" className="back-link">
        ← All salons
      </Link>
      <h1>{branch.name}</h1>
      {branch.address && <p className="muted">{branch.address}</p>}
      {branch.phone_number && <p className="muted">{branch.phone_number}</p>}

      {cart && cart.branchId === branchId && totals.count > 0 && (
        <Link to="/cart" className="cart-bar">
          <span>
            {totals.count} {totals.count === 1 ? 'treatment' : 'treatments'} · £
            {totals.price.toFixed(2)}
          </span>
          <span className="cart-bar-cta">View cart →</span>
        </Link>
      )}

      {[...groups.entries()].map(([category, services]) => (
        <section key={category} className="service-section">
          <h2>{CATEGORY_LABELS[category] || category}</h2>
          <div className="service-list">
            {services.map((service) => (
              <div key={service.id} className="card service-row">
                <div className="service-row-info">
                  <strong>{service.name}</strong>
                  {service.description && <p className="muted">{service.description}</p>}
                  <span className="muted">{service.duration_min} min</span>
                </div>
                <div className="service-row-action">
                  <span className="service-price">£{service.base_price}</span>
                  <button
                    type="button"
                    className={'btn btn-gold' + (justAdded === service.id ? ' btn-added' : '')}
                    onClick={() => handleAdd(service)}
                  >
                    {justAdded === service.id ? 'Added ✓' : 'Add to cart'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
