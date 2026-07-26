import { useCallback, useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { api } from '../api/client'
import ImageLightbox from '../components/ImageLightbox'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'

const STAGE_HELP = {
  pending: 'Waiting for the salon to quote a price.',
  priced: 'Priced — add it to your cart to book.',
  accepted: 'In a booking.',
  rejected: 'You declined this quote.',
}

// Accepting a quote drops the design into the cart; the booking itself happens
// through the normal checkout (pick a time, wait for approval, pay the deposit).
function AddDesignToCart({ design, onAdded }) {
  const { addItem } = useCart()
  const [branches, setBranches] = useState([])
  const [branchId, setBranchId] = useState('')

  useEffect(() => {
    api.listBranches().then((data) => {
      setBranches(data)
      if (data.length > 0) setBranchId(data[0].id)
    })
  }, [])

  // Custom designs ride on the branch's Nail Art service for scheduling.
  const branch = branches.find((b) => b.id === branchId)
  const artService = branch?.services.find((s) => s.category === 'addon') || null

  const handleAdd = () => {
    addItem(branch, artService, {
      designId: design.id,
      name: `Custom design${design.description ? ` — ${design.description}` : ''}`,
      price: design.estimated_price,
    })
    onAdded()
  }

  return (
    <div className="form-stack" style={{ marginTop: '0.75rem' }}>
      <label>
        Salon
        <select className="input" value={branchId} onChange={(e) => setBranchId(e.target.value)}>
          {branches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
      </label>
      {branch && !artService && (
        <p className="muted">This salon does not take nail art bookings.</p>
      )}
      <button
        className="btn btn-gold"
        disabled={!branch || !artService}
        onClick={handleAdd}
      >
        Accept £{design.estimated_price} — add to cart
      </button>
    </div>
  )
}

export default function CustomDesignsPage() {
  const { auth } = useAuth()
  const [designs, setDesigns] = useState(null)
  const [file, setFile] = useState(null)
  const [description, setDescription] = useState('')
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState(null)
  const [acceptingId, setAcceptingId] = useState(null)
  const [viewing, setViewing] = useState(null)
  const [addedId, setAddedId] = useState(null)

  const reload = useCallback(() => {
    if (!auth) return
    api
      .myCustomDesigns(auth.token)
      .then(setDesigns)
      .catch((err) => setError(err.message))
  }, [auth])

  useEffect(() => {
    reload()
  }, [reload])

  if (!auth) return <Navigate to="/login?next=/designs" replace />

  const handleUpload = async (e) => {
    e.preventDefault()
    if (!file && !description.trim()) return
    setError(null)
    setUploading(true)
    try {
      await api.uploadCustomDesign(file, description.trim() || null, auth.token)
      setFile(null)
      setDescription('')
      e.target.reset()
      reload()
    } catch (err) {
      setError(err.message)
    } finally {
      setUploading(false)
    }
  }

  const handleReject = async (designId) => {
    setError(null)
    try {
      await api.rejectCustomDesign(designId, auth.token)
      reload()
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="container container-narrow">
      <h1>My nail designs</h1>
      <p className="muted">
        Send us a photo of the design you want — our team will quote a price, and you can
        accept it to book your appointment.
      </p>

      <form onSubmit={handleUpload} className="card form-stack">
        <label>
          Design photo {file ? '' : '(optional)'}
          <input
            className="input"
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif,image/heic"
            onChange={(e) => setFile(e.target.files[0] || null)}
          />
        </label>
        <label>
          Describe what you want {file ? '(optional)' : '— required without a photo'}
          <textarea
            className="input"
            rows={3}
            maxLength={500}
            placeholder="e.g. Chrome french tips with gems on ring fingers"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </label>
        {error && <p className="error-text">{error}</p>}
        <button
          className="btn btn-gold"
          type="submit"
          disabled={uploading || (!file && !description.trim())}
        >
          {uploading ? 'Sending...' : 'Send for a quote'}
        </button>
      </form>

      <h2 className="bookings-heading">Your designs</h2>
      {designs === null && <p className="muted">Loading...</p>}
      {designs?.length === 0 && <p className="muted">Nothing sent yet.</p>}

      {designs?.map((design) => (
        <div key={design.id} className="card design-card">
          <div className="design-card-main">
            {design.image_url ? (
              <img
                src={design.image_url}
                alt="Nail design"
                className="design-thumb design-thumb-clickable"
                title="Click to enlarge"
                onClick={() => setViewing(design.image_url)}
              />
            ) : (
              <div className="design-thumb design-thumb-placeholder">✎</div>
            )}
            <div className="service-row-info">
              {design.description && <strong>{design.description}</strong>}
              <p className="muted">{STAGE_HELP[design.status] || design.status}</p>
              {design.estimated_price != null && (
                <span className="service-price">£{design.estimated_price}</span>
              )}
            </div>
            <span className={`badge badge-${design.status}`}>{design.status}</span>
          </div>

          {design.status === 'priced' && addedId !== design.id && (
            <>
              <div className="lock-actions">
                <button
                  className="btn btn-outline"
                  onClick={() =>
                    setAcceptingId(acceptingId === design.id ? null : design.id)
                  }
                >
                  {acceptingId === design.id ? 'Hide' : 'Accept quote'}
                </button>
                <button
                  className="btn btn-danger-outline"
                  onClick={() => handleReject(design.id)}
                >
                  Decline
                </button>
              </div>
              {acceptingId === design.id && (
                <AddDesignToCart
                  design={design}
                  onAdded={() => {
                    setAcceptingId(null)
                    setAddedId(design.id)
                  }}
                />
              )}
            </>
          )}

          {addedId === design.id && (
            <p className="gift-banner">
              Added to your cart — <Link to="/cart">pick a time and book</Link>. The design is
              reserved once the salon approves and your deposit is paid.
            </p>
          )}
        </div>
      ))}

      {viewing && (
        <ImageLightbox src={viewing} alt="Nail design" onClose={() => setViewing(null)} />
      )}
    </div>
  )
}
