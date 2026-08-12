import { currentSeason } from '../season'

// The hero's seasonal dressing: recognisable little objects in motion -
// whole cherry blossoms and loose petals in spring, fluttering butterflies
// and sparkles in summer, tumbling maple leaves in autumn, spinning
// snowflakes in winter - plus one signature motif in the corner. Pure inline
// SVG and CSS, no images to load, and it sits behind the text, never in the
// way. Motion is disabled automatically for visitors who prefer less of it.

// Fixed scatter so every render looks composed, not random. Negative delays
// mean the sky is already mid-fall when the page opens.
const DROPS = [
  { left: 2, delay: -2, dur: 13, scale: 0.75 },
  { left: 6, delay: -7, dur: 15, scale: 0.55 },
  { left: 10, delay: -9, dur: 16, scale: 1.0 },
  { left: 14, delay: -4, dur: 12, scale: 0.7 },
  { left: 18, delay: -13, dur: 17, scale: 0.85 },
  { left: 22, delay: -5, dur: 12, scale: 0.6 },
  { left: 27, delay: -10, dur: 14, scale: 0.95 },
  { left: 31, delay: -12, dur: 17, scale: 0.9 },
  { left: 35, delay: -1, dur: 13, scale: 0.6 },
  { left: 39, delay: -3, dur: 14, scale: 0.7 },
  { left: 43, delay: -8, dur: 16, scale: 1.05 },
  { left: 47, delay: -10, dur: 15, scale: 0.8 },
  { left: 51, delay: -6, dur: 12, scale: 0.6 },
  { left: 55, delay: -14, dur: 18, scale: 0.9 },
  { left: 59, delay: -2, dur: 13, scale: 0.7 },
  { left: 63, delay: -11, dur: 16, scale: 0.85 },
  { left: 67, delay: -5, dur: 14, scale: 1.0 },
  { left: 71, delay: -1, dur: 13, scale: 0.65 },
  { left: 75, delay: -9, dur: 15, scale: 0.9 },
  { left: 80, delay: -8, dur: 16, scale: 0.7 },
  { left: 84, delay: -3, dur: 12, scale: 0.6 },
  { left: 88, delay: -4, dur: 14, scale: 0.95 },
  { left: 93, delay: -12, dur: 17, scale: 0.75 },
  { left: 97, delay: -11, dur: 15, scale: 0.85 },
]

// A few shades per season so the fall has depth instead of a flat colour.
const PALETTES = {
  spring: ['#e39cb3', '#d47f9c', '#f0bfce'],
  summer: ['#d9b45a', '#e6c97e', '#caa14e'],
  autumn: ['#c65f2e', '#b8763c', '#d99a2b', '#96602f'],
  winter: ['#8fb4d6', '#6f96bd', '#b3cde6'],
}

function Blossom({ size }) {
  // A full five-petal cherry blossom with stamens and a golden heart.
  return (
    <svg viewBox="0 0 40 40" width={size} height={size} className="season-spin" aria-hidden="true">
      <g transform="translate(20 20)">
        {[0, 72, 144, 216, 288].map((deg) => (
          <path
            key={deg}
            transform={`rotate(${deg})`}
            d="M0 -2.5 C-6.5 -7 -7.5 -14.5 -3.2 -17.8 L0 -15 L3.2 -17.8 C7.5 -14.5 6.5 -7 0 -2.5 Z"
            fill="currentColor"
          />
        ))}
        {[0, 60, 120, 180, 240, 300].map((deg) => (
          <circle key={deg} r="1.1" transform={`rotate(${deg}) translate(0 -4.6)`} fill="#f5e3a8" />
        ))}
        <circle r="2.2" fill="#eecf7c" />
      </g>
    </svg>
  )
}

function Petal({ size }) {
  return (
    <svg viewBox="0 0 20 20" width={size} height={size} aria-hidden="true">
      <path d="M10 1 C15.5 5 16.5 12 10 19 C3.5 12 4.5 5 10 1 Z" fill="currentColor" />
    </svg>
  )
}

function Butterfly({ size }) {
  return (
    <svg viewBox="0 0 44 34" width={size} height={size * 0.78} aria-hidden="true">
      <g className="bf-wing bf-wing-left">
        <path d="M20 15 C14 4 4 1 2.6 8 C1.6 13 8 16 20 16 Z" fill="currentColor" />
        <path d="M20 18 C12 18 4.5 21 6.5 27 C8 31.5 16 27 20 20 Z" fill="currentColor" opacity="0.75" />
      </g>
      <g className="bf-wing bf-wing-right">
        <path d="M24 15 C30 4 40 1 41.4 8 C42.4 13 36 16 24 16 Z" fill="currentColor" />
        <path d="M24 18 C32 18 39.5 21 37.5 27 C36 31.5 28 27 24 20 Z" fill="currentColor" opacity="0.75" />
      </g>
      <ellipse cx="22" cy="17" rx="2" ry="7.5" fill="var(--green-soft, #4a6b57)" />
      <path
        d="M20.8 10 C19 7 17.5 5.5 15.8 4.6 M23.2 10 C25 7 26.5 5.5 28.2 4.6"
        stroke="var(--green-soft, #4a6b57)" strokeWidth="1.1" fill="none" strokeLinecap="round"
      />
    </svg>
  )
}

function Sparkle({ size }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
      <path d="M12 1 L14.2 9.8 L23 12 L14.2 14.2 L12 23 L9.8 14.2 L1 12 L9.8 9.8 Z" fill="currentColor" />
    </svg>
  )
}

function Maple({ size }) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} className="season-spin" aria-hidden="true">
      <g transform="translate(32 29)">
        <path
          d="M0 -24 L5.5 -11 L15.5 -15.5 L10 -4.5 L22 0 L10 4.5 L15.5 15.5 L5.5 11 L0 24 L-5.5 11 L-15.5 15.5 L-10 4.5 L-22 0 L-10 -4.5 L-15.5 -15.5 L-5.5 -11 Z"
          fill="currentColor"
        />
        <line x1="0" y1="4" x2="0" y2="30" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
      </g>
    </svg>
  )
}

function Leaf({ size }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className="season-spin" aria-hidden="true">
      <path
        d="M21 3 C13 3 5.5 6.5 3.5 14.5 C3.2 15.7 3 17 3 18 C3 18 4.5 17.8 6 17.5 C14 16 20 10 21 3 Z"
        fill="currentColor"
      />
      <path d="M4 20 C8 14 13 9 19 5" stroke="currentColor" strokeWidth="1" fill="none" opacity="0.5" />
    </svg>
  )
}

function Snowflake({ size }) {
  return (
    <svg viewBox="0 0 40 40" width={size} height={size} className="season-spin" aria-hidden="true">
      <g transform="translate(20 20)" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" fill="none">
        {[0, 60, 120].map((deg) => (
          <g key={deg} transform={`rotate(${deg})`}>
            <line y1="-15" y2="15" />
            <path d="M-4.5 -8.5 L0 -12.5 L4.5 -8.5" />
            <path d="M-4.5 8.5 L0 12.5 L4.5 8.5" />
          </g>
        ))}
      </g>
    </svg>
  )
}

// Which object each slot gets: alternate a "hero" object with a lighter one
// so the fall reads varied instead of stamped from one mould.
const OBJECTS = {
  spring: (i, size) => (i % 2 === 0 ? <Blossom size={size * 1.5} /> : <Petal size={size} />),
  summer: (i, size) => (i % 2 === 0 ? <Butterfly size={size * 2.4} /> : <Sparkle size={size * 0.8} />),
  autumn: (i, size) => (i % 2 === 0 ? <Maple size={size * 1.6} /> : <Leaf size={size * 1.2} />),
  winter: (i, size) => <Snowflake size={size * (i % 3 === 0 ? 1.5 : 1.1)} />,
}

function SpringMotif() {
  // A blossom branch reaching in from the corner.
  return (
    <svg viewBox="0 0 160 120" className="season-motif" aria-hidden="true">
      <path
        d="M160 8 C120 18 84 34 58 66 C48 78 40 92 36 108"
        stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round"
      />
      <path d="M104 38 C96 30 84 30 78 38" stroke="currentColor" strokeWidth="2.4" fill="none" strokeLinecap="round" />
      {[[120, 24], [92, 46], [66, 62], [50, 84], [76, 34], [58, 74]].map(([x, y], i) => (
        <g key={i} transform={`translate(${x} ${y})`}>
          {[0, 72, 144, 216, 288].map((deg) => (
            <ellipse key={deg} rx="4.6" ry="7" transform={`rotate(${deg}) translate(0 -6.5)`} fill="currentColor" />
          ))}
          <circle r="2.6" fill="var(--cream, #fff)" />
        </g>
      ))}
    </svg>
  )
}

function SummerMotif() {
  return (
    <svg viewBox="0 0 160 120" className="season-motif" aria-hidden="true">
      <circle cx="118" cy="42" r="24" fill="currentColor" />
      {Array.from({ length: 12 }, (_, i) => i * 30).map((deg) => (
        <line
          key={deg}
          x1="118" y1="42" x2="118" y2="-4"
          transform={`rotate(${deg} 118 42)`}
          stroke="currentColor" strokeWidth="3.4" strokeLinecap="round"
          strokeDasharray="0 34 12 100"
        />
      ))}
    </svg>
  )
}

function AutumnMotif() {
  // A pair of falling maple-ish leaves.
  const leaf = (
    <>
      <path
        d="M0 -30 L7 -14 L20 -20 L13 -6 L28 0 L13 6 L20 20 L7 14 L0 30 L-7 14 L-20 20 L-13 6 L-28 0 L-13 -6 L-20 -20 L-7 -14 Z"
        fill="currentColor"
      />
      <line x1="0" y1="0" x2="0" y2="34" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </>
  )
  return (
    <svg viewBox="0 0 160 120" className="season-motif" aria-hidden="true">
      <g transform="translate(112 46) rotate(24)">{leaf}</g>
      <g transform="translate(52 82) rotate(-18) scale(0.6)" opacity="0.7">{leaf}</g>
    </svg>
  )
}

function WinterMotif() {
  return (
    <svg viewBox="0 0 160 120" className="season-motif" aria-hidden="true">
      <g transform="translate(112 52)">
        {[0, 60, 120].map((deg) => (
          <g key={deg} transform={`rotate(${deg})`}>
            <line x1="0" y1="-42" x2="0" y2="42" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" />
            {[-26, 26].map((y) => (
              <g key={y}>
                <line x1="0" y1={y} x2="-10" y2={y + (y < 0 ? -10 : 10)} stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
                <line x1="0" y1={y} x2="10" y2={y + (y < 0 ? -10 : 10)} stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
              </g>
            ))}
          </g>
        ))}
        <circle r="5" fill="currentColor" />
      </g>
      <g transform="translate(48 88) scale(0.45)" opacity="0.7">
        {[0, 60, 120].map((deg) => (
          <line key={deg} x1="0" y1="-42" x2="0" y2="42" transform={`rotate(${deg})`} stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
        ))}
      </g>
    </svg>
  )
}

const MOTIFS = {
  spring: SpringMotif,
  summer: SummerMotif,
  autumn: AutumnMotif,
  winter: WinterMotif,
}

export default function SeasonalDecor() {
  const season = currentSeason()
  const Motif = MOTIFS[season]
  const palette = PALETTES[season]
  const pick = OBJECTS[season]

  return (
    <div className={`season-decor season-decor-${season}`} aria-hidden="true">
      <Motif />
      {DROPS.map((drop, index) => {
        const size = 16 * drop.scale
        const isButterfly = season === 'summer' && index % 2 === 0
        return (
          <span
            key={index}
            className={`season-particle${isButterfly ? ' season-particle-butterfly' : ''}`}
            style={{
              left: `${drop.left}%`,
              color: palette[index % palette.length],
              animationDelay: `${drop.delay}s`,
              animationDuration: `${isButterfly ? drop.dur * 0.8 : drop.dur}s`,
            }}
          >
            <span
              className="season-inner"
              style={{
                animationDuration: `${2.1 + (index % 5) * 0.4}s`,
                animationDelay: `${drop.delay * 0.5}s`,
              }}
            >
              {pick(index, size)}
            </span>
          </span>
        )
      })}
    </div>
  )
}
