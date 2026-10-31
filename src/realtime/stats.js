// Message counters for the dev overlay (Shift+D or ?debug). Supabase's free plan allows about
// 100 Realtime messages per second for the whole project, counting every send AND every delivery,
// so it is worth watching during a match.
export const stats = {
  sent: 0,
  received: 0,
  /** round-trip times in ms, by label (e.g. { p1: 84, p2: 120, server: 40 }) */
  rtt: {},
}

export const countSent = () => void stats.sent++
export const countReceived = () => void stats.received++
export const setRtt = (label, ms) => void (stats.rtt[label] = ms == null ? null : Math.round(ms))
