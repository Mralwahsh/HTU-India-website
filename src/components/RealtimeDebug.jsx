import { useEffect, useRef, useState } from 'react'
import { REALTIME_KIND } from '../realtime/channel.js'
import { stats } from '../realtime/stats.js'

const SHOW_AT_START = new URLSearchParams(window.location.search).has('debug')

/**
 * Small developer overlay: Realtime messages per second and round-trip times.
 * Toggle with Shift+D (laptop), by tapping the element that calls `toggleRef` three times (phone),
 * or open the page with ?debug.
 *
 * "≈ project" estimates what Supabase counts for this room: every message is counted when sent and
 * again when delivered, so it is about twice what this device sends and receives (free plan: ~100/s).
 */
export default function RealtimeDebug({ toggleRef, estimateProject = false }) {
  const [on, setOn] = useState(SHOW_AT_START)
  const [view, setView] = useState({ sent: 0, received: 0, rtt: {} })
  const taps = useRef([])

  useEffect(() => {
    const onKey = (e) => e.shiftKey && e.code === 'KeyD' && setOn((v) => !v)
    window.addEventListener('keydown', onKey)
    if (toggleRef) {
      toggleRef.current = () => {
        const now = Date.now()
        taps.current = [...taps.current.filter((t) => now - t < 1200), now]
        if (taps.current.length >= 3) {
          taps.current = []
          setOn((v) => !v)
        }
      }
    }
    return () => window.removeEventListener('keydown', onKey)
  }, [toggleRef])

  useEffect(() => {
    if (!on) return
    let last = { sent: stats.sent, received: stats.received }
    const t = setInterval(() => {
      setView({ sent: stats.sent - last.sent, received: stats.received - last.received, rtt: { ...stats.rtt } })
      last = { sent: stats.sent, received: stats.received }
    }, 1000)
    return () => clearInterval(t)
  }, [on])

  if (!on) return null
  const rtts = Object.entries(view.rtt).filter(([, ms]) => ms != null)
  return (
    <div className="pointer-events-none fixed top-2 left-2 z-[100] rounded-lg bg-black/80 px-3 py-2 font-mono text-xs leading-relaxed text-white" dir="ltr">
      <div>
        realtime: <b>{REALTIME_KIND}</b>
        {REALTIME_KIND === 'local' && ' (same-browser test mode)'}
      </div>
      <div>
        this device: ↑ {view.sent}/s · ↓ {view.received}/s
        {estimateProject && <> · ≈ project {2 * (view.sent + view.received)} msg/s</>}
      </div>
      <div>rtt: {rtts.length ? rtts.map(([k, ms]) => `${k} ${ms} ms`).join(' · ') : '–'}</div>
    </div>
  )
}
