import { useCallback, useEffect, useState } from 'react'
import { api } from '../api/client'

// Length options for the services that have them - a longer set takes more
// minutes and costs more. Only add them to the services that really vary
// (full sets in BIAB or acrylic); everything else is sold one way.
export default function ServiceLengths({ token }) {
  const [services, setServices] = useState([])
  const [serviceId, setServiceId] = useState('')
  const [lengths, setLengths] = useState([])
  const [name, setName] = useState('')
  const [extraMinutes, setExtraMinutes] = useState(15)
  const [extraPrice, setExtraPrice] = useState(0)
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    // The capability matrix is the admin's canonical service list.
    api
      .capabilityMatrix(token)
      .then((data) => setServices(data.services || []))
      .catch(() => setServices([]))
  }, [token])

  const reload = useCallback(() => {
    if (!serviceId) {
      setLengths([])
      return
    }
    api
      .listServiceLengths(serviceId)
      .then(setLengths)
      .catch((err) => setError(err.message))
  }, [serviceId])

  useEffect(() => {
    setError(null)
    reload()
  }, [reload])

  const handleAdd = async () => {
    if (!serviceId) {
      setError('Pick a service first')
      return
    }
    if (!name.trim()) {
      setError('Give the length a name, e.g. Long')
      return
    }
    setBusy(true)
    setError(null)
    try {
      await api.createServiceLength(
        serviceId,
        {
          name: name.trim(),
          extra_duration_min: Math.max(0, Number(extraMinutes) || 0),
          extra_price: Math.max(0, Number(extraPrice) || 0),
        },
        token
      )
      setName('')
      reload()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const handleDelete = async (length) => {
    if (!window.confirm(`Remove the "${length.name}" length?`)) return
    setError(null)
    try {
      await api.deleteServiceLength(length.id, token)
      reload()
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <section className="matrix-section">
      <h2 className="dash-heading">Length options</h2>
      <p className="muted">
        Add these only to services whose length really changes the work — a full set in BIAB or
        acrylic. The extra minutes are added on top of whichever technician does it, and the
        booking page shows the choice with its extra price.
      </p>

      <div className="card matrix-card">
        <div className="lock-controls">
          <label>
            Service
            <select
              className="input"
              value={serviceId}
              onChange={(e) => setServiceId(e.target.value)}
            >
              <option value="">Select…</option>
              {services.map((service) => (
                <option key={service.id} value={service.id}>
                  {service.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Name
            <input
              className="input"
              type="text"
              maxLength={100}
              placeholder="Long"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <label>
            Extra minutes
            <input
              className="input matrix-num"
              type="number"
              min="0"
              value={extraMinutes}
              onChange={(e) => setExtraMinutes(e.target.value)}
            />
          </label>
          <label>
            Extra price (£)
            <input
              className="input matrix-num"
              type="number"
              min="0"
              step="0.5"
              value={extraPrice}
              onChange={(e) => setExtraPrice(e.target.value)}
            />
          </label>
        </div>

        {error && <p className="error-text">{error}</p>}

        <div className="matrix-actions">
          <button className="btn" disabled={busy || !serviceId} onClick={handleAdd}>
            {busy ? 'Adding…' : 'Add length'}
          </button>
        </div>

        {serviceId && (
          <>
            <h3 style={{ marginTop: '1rem' }}>Current lengths</h3>
            {lengths.length === 0 ? (
              <p className="muted">
                This service is sold at one length. Customers see no length choice for it.
              </p>
            ) : (
              <div className="roster-list">
                {lengths.map((length) => (
                  <div key={length.id} className="roster-row">
                    <strong>{length.name}</strong>
                    <span className="muted">
                      {' '}
                      · +{length.extra_duration_min} min · +£{length.extra_price.toFixed(2)}{' '}
                    </span>
                    <button className="btn btn-outline" onClick={() => handleDelete(length)}>
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
            <p className="muted">
              A length that bookings have already used cannot be removed — the salon needs it to
              work out how long those appointments really are.
            </p>
          </>
        )}
      </div>
    </section>
  )
}
