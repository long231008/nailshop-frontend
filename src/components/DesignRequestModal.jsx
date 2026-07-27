import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'

// Nail art is priced per design, so "adding it to the cart" starts a quote
// request: a photo of the design, or - if there is no photo - a description of
// what the customer wants.
const FACEBOOK_PAGE_URL = import.meta.env.VITE_FACEBOOK_PAGE_URL

export default function DesignRequestModal({ service, branch, onClose }) {
  const { auth } = useAuth()
  const navigate = useNavigate()

  const [file, setFile] = useState(null)
  const [description, setDescription] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [sent, setSent] = useState(false)

  const canSubmit = file !== null || description.trim().length > 0

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!auth) {
      navigate(`/login?next=/branches/${branch.id}`)
      return
    }
    setError(null)
    setBusy(true)
    try {
      await api.uploadCustomDesign(file, description.trim() || null, auth.token)
      setSent(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="lightbox" onClick={onClose}>
      <div className="modal-card card" onClick={(e) => e.stopPropagation()}>
        {sent ? (
          <>
            <h2>Request sent 🎉</h2>
            <p className="muted">
              Our team will look at your design and send you a price on the contact you signed
              up with. You can follow it in{' '}
              <Link to="/designs" onClick={onClose}>
                My designs
              </Link>{' '}
              — once priced, accept the quote there and it goes straight into your cart.
            </p>
            <button className="btn" onClick={onClose}>
              Done
            </button>
          </>
        ) : (
          <>
            <h2>{service.name}</h2>
            <p className="muted">
              {service.description || 'Priced per design.'} Send a photo of what you want — or
              describe it below — and we&apos;ll quote a price before you book.
            </p>

            <form onSubmit={handleSubmit} className="form-stack">
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
                  placeholder="e.g. Chrome french tips with gems on both ring fingers"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </label>
              {error && <p className="error-text">{error}</p>}
              <div className="lock-actions">
                <button className="btn btn-gold" type="submit" disabled={busy || !canSubmit}>
                  {busy ? 'Sending...' : auth ? 'Send for a quote' : 'Log in to send'}
                </button>
                <button className="btn btn-outline" type="button" onClick={onClose}>
                  Cancel
                </button>
              </div>
            </form>

            {FACEBOOK_PAGE_URL && (
              <>
                <div className="divider">or</div>
                <a
                  href={FACEBOOK_PAGE_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-outline google-btn"
                >
                  Chat with us on Messenger
                </a>
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}
