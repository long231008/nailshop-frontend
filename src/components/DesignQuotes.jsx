import { useCallback, useEffect, useState } from 'react'
import { api } from '../api/client'
import ImageLightbox from './ImageLightbox'

// Admin tool: quote prices for customer-submitted nail designs. The quote is
// delivered to the customer on the channel they signed up with.
export default function DesignQuotes({ token }) {
  const [designs, setDesigns] = useState(null)
  const [prices, setPrices] = useState({})
  const [busyId, setBusyId] = useState(null)
  const [error, setError] = useState(null)
  const [viewing, setViewing] = useState(null)

  const reload = useCallback(() => {
    api
      .listUnpricedDesigns(token)
      .then(setDesigns)
      .catch((err) => setError(err.message))
  }, [token])

  useEffect(() => {
    reload()
  }, [reload])

  const sendQuote = async (designId) => {
    const price = parseFloat(prices[designId])
    if (!price || price <= 0) return
    setError(null)
    setBusyId(designId)
    try {
      await api.priceCustomDesign(designId, price, token)
      reload()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusyId(null)
    }
  }

  return (
    <>
      <h2 className="dash-heading">Design quotes</h2>
      <p className="muted">
        Customers&apos; nail design photos waiting for a price. Sending a quote notifies them
        on the channel they signed up with.
      </p>
      {error && <p className="error-text">{error}</p>}
      {designs === null && <p className="muted">Loading designs...</p>}
      {designs?.length === 0 && <p className="muted">No designs waiting for a quote.</p>}

      {designs?.map((design) => (
        <div key={design.id} className="card design-card">
          <div className="design-card-main">
            {design.image_url ? (
              <img
                src={design.image_url}
                alt="Customer design"
                className="design-thumb design-thumb-clickable"
                title="Click to enlarge"
                onClick={() => setViewing(design.image_url)}
              />
            ) : (
              <div className="design-thumb design-thumb-placeholder" title="No photo — description only">
                ✎
              </div>
            )}
            <div className="service-row-info">
              {design.description && <strong>{design.description}</strong>}
              <p className="muted">Awaiting quote</p>
            </div>
            <div className="quote-form">
              <input
                className="input"
                type="number"
                min="1"
                step="0.5"
                placeholder="£"
                value={prices[design.id] || ''}
                onChange={(e) =>
                  setPrices((prev) => ({ ...prev, [design.id]: e.target.value }))
                }
              />
              <button
                className="btn btn-gold"
                disabled={busyId === design.id || !prices[design.id]}
                onClick={() => sendQuote(design.id)}
              >
                {busyId === design.id ? 'Sending...' : 'Send quote'}
              </button>
            </div>
          </div>
        </div>
      ))}

      {viewing && (
        <ImageLightbox src={viewing} alt="Customer design" onClose={() => setViewing(null)} />
      )}
    </>
  )
}
