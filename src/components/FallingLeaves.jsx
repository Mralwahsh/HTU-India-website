// Leaves drifting down through the home page's forest, painted like the ones in the forest picture.
// Two layers for depth: "back" (small, faint, slow; behind the text) and "front" (a few bigger ones, in front
// of the boy). Pure CSS animations (see .leaf-fall in index.css), so they cost nothing to React; hidden with
// "reduce motion".

// olive, fresh green, yellow-green and a dry amber one: [lower half, upper half]
const COLOURS = [
  ['#7f8f3b', '#a3b257'],
  ['#6d8a2e', '#93ad4c'],
  ['#a99c3f', '#c9bd62'],
  ['#7f8f3b', '#a3b257'],
  ['#b06d2a', '#d39046'],
]

// a fixed pseudo-random sequence: the same leaves on every visit, and no Math.random during render
function rng(seed) {
  let a = seed
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function makeLeaves(count, seed, o) {
  const r = rng(seed)
  const between = (lo, hi) => lo + r() * (hi - lo)
  return Array.from({ length: count }, (_, i) => {
    const fall = between(...o.fall)
    return {
      left: ((i + between(0.1, 0.9)) / count) * 100, // spread across the width, never in clumps
      size: between(...o.size),
      fall,
      delay: -between(0, fall), // already on their way when the page opens
      drift: between(-5, 12), // cqw: the breeze pushes them a little, mostly towards the middle
      sway: between(...o.sway),
      swayTime: between(2.4, 4.6),
      tumble: between(3.5, 8) * (r() < 0.5 ? -1 : 1),
      ax: between(-0.6, 1).toFixed(2),
      colour: COLOURS[Math.floor(r() * COLOURS.length)],
      opacity: between(...o.opacity),
    }
  })
}

const LAYERS = {
  back: makeLeaves(9, 7, { size: [11, 18], fall: [17, 25], sway: [2, 4], opacity: [0.5, 0.75] }),
  front: makeLeaves(5, 21, { size: [22, 32], fall: [11, 16], sway: [3, 6], opacity: [0.9, 1] }),
}

export default function FallingLeaves({ layer = 'back' }) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden [container-type:size] motion-reduce:hidden" aria-hidden="true">
      {LAYERS[layer].map((l, i) => (
        <span
          key={i}
          className="leaf-fall absolute top-0"
          style={{ left: `${l.left}%`, animationDuration: `${l.fall}s`, animationDelay: `${l.delay}s`, '--drift': `${l.drift}cqw` }}
        >
          <span className="leaf-sway block" style={{ animationDuration: `${l.swayTime}s`, animationDelay: `${l.delay}s`, '--sway': `${l.sway}cqw` }}>
            <Leaf
              className={`leaf-tumble block ${layer === 'back' ? 'blur-[0.6px]' : ''}`}
              style={{
                width: l.size,
                opacity: l.opacity,
                animationDuration: `${Math.abs(l.tumble)}s`,
                animationDirection: l.tumble < 0 ? 'reverse' : 'normal',
                '--ax': l.ax,
              }}
              colour={l.colour}
            />
          </span>
        </span>
      ))}
    </div>
  )
}

/** One leaf: almond-shaped, two-tone, with a dark outline, midrib and stem (like the painting's). */
function Leaf({ colour: [lower, upper], className, style }) {
  return (
    <svg viewBox="0 0 40 20" className={className} style={style}>
      <path d="M3 10C9 2.5 24 .5 38 9.5 25 19 9 17.5 3 10Z" fill={lower} stroke="#2f3a14" strokeWidth="1.1" strokeLinejoin="round" />
      <path d="M3.6 9.8C9.5 3.4 24 1.6 36.6 9.3 26 9 14 9.3 3.6 9.8Z" fill={upper} />
      <path d="M4 10C15 9.4 27 9.2 37 9.6" fill="none" stroke="#2f3a14" strokeWidth=".9" strokeOpacity=".7" />
      <path d="M.5 10.8 4 10" fill="none" stroke="#2f3a14" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  )
}
