// Virtual tours: every feel / tuning value in one place.
// Angles in degrees, times in milliseconds, stick values from -1 to 1.

export const TOUR = {
  /**
   * 'offline' → local 360° photos (works without internet, booth default)
   * 'google'  → Google Street View (needs internet + VITE_GOOGLE_MAPS_API_KEY in .env.local)
   * 'auto'    → Google when a key is set and the laptop is online, otherwise offline
   */
  provider: 'offline',
  googleApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? '',
  googleLoadTimeoutMs: 7000,
  googleKeyCheckMs: 2500, // wait this long after the first panorama for Google to reject a bad key
}

/** Phone sticks (also used by the laptop to interpret them). */
export const STICKS = {
  deadZone: 0.18, // centre area where small touches do nothing
  sendHz: 10, // phone: at most this many stick messages per second, and only when a value changes
  keepAliveMs: 1000, // phone: while a stick is held still, repeat its value this often
  lostMs: 1600, // laptop: no stick message for this long while a stick is held → treat as released
  refreshHz: 30, // laptop: how often the last stick values are fed to the tour (smoothed in between)
  staleMs: 450, // tour view: no stick value for this long while the stick isn't centred → treat as released
}

/** Right stick: camera look. */
export const LOOK = {
  maxYawSpeed: 120, // degrees per second at full stick (left/right)
  maxPitchSpeed: 70, // degrees per second at full stick (up/down)
  curve: 1.7, // response curve: > 1 = fine control near the centre, fast at the edge
  smoothing: 0.16, // 0..1 per frame: how quickly the view follows the stick (lower = smoother/slower)
  minPitch: -40,
  maxPitch: 45,
  invertY: false, // true = push up to look down (flight-sim style)
}

/** Left stick: walking. */
export const MOVE = {
  pushThreshold: 0.6, // how far the stick must be pushed to count as a step
  walkIntervalMs: 800, // keep walking forward this often while the stick is held up
  sideRepeatMs: 1100, // left/right steps repeat this often while held
  forwardTolerance: 65, // a link must be within this angle of the view to walk "forward"
  sideTolerance: 60, // …and within this angle of 90° left/right for side steps
  turnAroundMs: 700, // smooth 180° turn
  stepTimeoutMs: 8000, // give up on a step whose photo never finishes loading
}

/** Zoom buttons (hold to keep zooming). PSV zoom level 0–100. */
export const ZOOM = {
  speedPerSecond: 70,
  min: 0,
  max: 100,
  start: 35,
}

/** Laptop keyboard fallback (KeyboardEvent.code). */
export const KEYS = {
  move: { KeyW: [0, -1], KeyS: [0, 1], KeyA: [-1, 0], KeyD: [1, 0] },
  look: { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] },
  zoomIn: ['Equal', 'NumpadAdd'],
  zoomOut: ['Minus', 'NumpadSubtract'],
  info: ['KeyI'],
  next: ['KeyN'],
  map: ['KeyM'], // back to the map of places (Esc = new visitor: new room code)
}
