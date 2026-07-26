import { useEffect } from 'react'

// Full-screen image viewer: click anywhere (or press Escape) to close.
export default function ImageLightbox({ src, alt, onClose }) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  if (!src) return null

  return (
    <div className="lightbox" onClick={onClose} role="dialog" aria-label={alt}>
      <img src={src} alt={alt} className="lightbox-image" />
      <button className="lightbox-close" aria-label="Close">
        ✕
      </button>
    </div>
  )
}
