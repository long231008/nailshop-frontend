const FACEBOOK_PAGE_URL = import.meta.env.VITE_FACEBOOK_PAGE_URL

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-brand">Nailzinc Limited</div>
      <p className="muted">Nails, care and head spa — book your moment of calm.</p>
      {FACEBOOK_PAGE_URL && (
        <p className="muted">
          Questions?{' '}
          <a href={FACEBOOK_PAGE_URL} target="_blank" rel="noreferrer">
            Message us on Facebook
          </a>
        </p>
      )}
      <p className="muted footer-legal">© {new Date().getFullYear()} Nailzinc Limited</p>
    </footer>
  )
}
