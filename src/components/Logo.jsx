// The brand mark: a polish bottle with a gold cap and a sparkle. Drawn with
// the theme's CSS variables so it recolours itself in dark mode.
export default function Logo({ size = 30 }) {
  return (
    <svg
      viewBox="0 0 32 32"
      width={size}
      height={size}
      aria-hidden="true"
      focusable="false"
      className="brand-logo"
    >
      {/* cap */}
      <rect x="12.6" y="1.6" width="6.8" height="7" rx="1.7" fill="var(--gold)" />
      {/* neck */}
      <rect x="14.4" y="8.4" width="3.2" height="2.8" fill="var(--gold-dark)" />
      {/* bottle */}
      <path
        d="M13 11.2 h6 c2.6 1 4.6 3.6 4.6 6.9 v6.4 a5.5 5.5 0 0 1 -5.5 5.5 h-4.2 a5.5 5.5 0 0 1 -5.5 -5.5 v-6.4 c0 -3.3 2 -5.9 4.6 -6.9 z"
        fill="var(--green)"
      />
      {/* gloss stripe */}
      <rect x="11.6" y="15.6" width="2.3" height="8.2" rx="1.15" fill="var(--gold-soft)" opacity="0.55" />
      {/* sparkle */}
      <path
        className="logo-sparkle"
        d="M26.4 3.2 l1 2.5 2.5 1 -2.5 1 -1 2.5 -1 -2.5 -2.5 -1 2.5 -1 z"
        fill="var(--gold)"
      />
    </svg>
  )
}
