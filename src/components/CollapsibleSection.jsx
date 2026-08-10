import { useState } from 'react'

// Every dashboard panel folds behind its title bar, so the page reads like a
// table of contents instead of one endless scroll. Each panel remembers its
// own open/closed choice across visits.
export default function CollapsibleSection({ id, title, defaultOpen = false, children }) {
  const [open, setOpen] = useState(() => {
    try {
      const saved = localStorage.getItem(`dash-panel:${id}`)
      return saved === null ? defaultOpen : saved === '1'
    } catch {
      return defaultOpen
    }
  })

  const toggle = () => {
    const next = !open
    setOpen(next)
    try {
      localStorage.setItem(`dash-panel:${id}`, next ? '1' : '0')
    } catch {
      // Private browsing may refuse storage; the toggle still works.
    }
  }

  return (
    <section className={'collapse-section' + (open ? ' collapse-open' : '')}>
      <button type="button" className="collapse-head" onClick={toggle} aria-expanded={open}>
        <span className="collapse-chevron">{open ? '▾' : '▸'}</span>
        {title}
      </button>
      {open && <div className="collapse-body">{children}</div>}
    </section>
  )
}
