import { currentSeason } from '../season'

// The hero's seasonal dressing: a drifting fall of petals / sparkles /
// leaves / snow, and one signature motif in the corner. Pure inline SVG and
// CSS - no images to load - and it sits behind the text, never in the way.
// Motion is disabled automatically for visitors who prefer reduced motion.

// Fixed scatter so every render looks composed, not random. Negative delays
// mean the sky is already mid-fall when the page opens.
const DROPS = [
  { left: 4, delay: -2, dur: 13, scale: 0.75 },
  { left: 12, delay: -9, dur: 16, scale: 1.0 },
  { left: 21, delay: -5, dur: 12, scale: 0.6 },
  { left: 30, delay: -12, dur: 17, scale: 0.9 },
  { left: 38, delay: -3, dur: 14, scale: 0.7 },
  { left: 47, delay: -10, dur: 15, scale: 1.05 },
  { left: 55, delay: -6, dur: 12, scale: 0.65 },
  { left: 63, delay: -14, dur: 18, scale: 0.85 },
  { left: 71, delay: -1, dur: 13, scale: 1.0 },
  { left: 79, delay: -8, dur: 16, scale: 0.7 },
  { left: 87, delay: -4, dur: 14, scale: 0.9 },
  { left: 94, delay: -11, dur: 15, scale: 0.8 },
]

function Petal() {
  return (
    <svg viewBox="0 0 20 20" width="14" height="14" aria-hidden="true">
      <path d="M10 1 C15.5 5 16.5 12 10 19 C3.5 12 4.5 5 10 1 Z" fill="currentColor" />
    </svg>
  )
}

function Leaf() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
      <path
        d="M21 3 C13 3 5.5 6.5 3.5 14.5 C3.2 15.7 3 17 3 18 C3 18 4.5 17.8 6 17.5 C14 16 20 10 21 3 Z"
        fill="currentColor"
      />
      <path d="M4 20 C8 14 13 9 19 5" stroke="currentColor" strokeWidth="1" fill="none" opacity="0.5" />
    </svg>
  )
}

const GLYPHS = {
  summer: ['✦', '✧', '✦'],
  winter: ['❄', '❅', '❆'],
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
  const glyphs = GLYPHS[season]

  return (
    <div className={`season-decor season-decor-${season}`} aria-hidden="true">
      <Motif />
      {DROPS.map((drop, index) => (
        <span
          key={index}
          className="season-particle"
          style={{
            left: `${drop.left}%`,
            animationDelay: `${drop.delay}s`,
            animationDuration: `${drop.dur}s`,
            fontSize: `${drop.scale}rem`,
            transform: `scale(${drop.scale})`,
          }}
        >
          {season === 'spring' && <Petal />}
          {season === 'autumn' && <Leaf />}
          {glyphs && glyphs[index % glyphs.length]}
        </span>
      ))}
    </div>
  )
}
