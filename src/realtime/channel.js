import { RealtimeClient } from '@supabase/realtime-js'
import { countReceived, countSent, setRtt } from './stats.js'

// Realtime channels between the laptop and the phones.
//
// With VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY set, this is Supabase Realtime: Broadcast for messages
// and Presence for "who is here". Without them (or with ?local in the address) it falls back to a
// BroadcastChannel between tabs of the same browser, so the pages can be tried locally without keys:
// open the laptop page in one tab and the controller link in another. Add ?lag=80 to fake network delay.
//
// Both kinds offer the same small interface:
//   const ch = openChannel('room:K7QM2X', { key, onStatus })   status: connecting | live | reconnecting | closed
//   ch.on('event', (payload) => …)        returns an "off" function
//   ch.onPresence((list) => …)            list = [{ key, ...meta }], one entry per presence key (including us)
//   ch.track({ role: 'screen' })          announce ourselves (kept across reconnects)
//   ch.send('event', payload)             false when not connected (the message is dropped, never queued)
//   ch.close()

const URL_ = import.meta.env.VITE_SUPABASE_URL
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY
const params = new URLSearchParams(window.location.search)

/** 'supabase' or 'local' (same-browser test mode). */
export const REALTIME_KIND = URL_ && KEY && !params.has('local') ? 'supabase' : 'local'

export function openChannel(topic, opts = {}) {
  return REALTIME_KIND === 'supabase' ? supabaseChannel(topic, opts) : localChannel(topic, opts)
}

// ---------------------------------------------------------------------------------------------- Supabase
let client = null
function getClient() {
  if (!client) {
    const url = new URL('realtime/v1', URL_.endsWith('/') ? URL_ : `${URL_}/`)
    url.protocol = url.protocol.replace('http', 'ws')
    client = new RealtimeClient(url.href, {
      params: { apikey: KEY },
      accessToken: async () => KEY, // no logins: every visitor uses the public anon key (what supabase-js does too)
      heartbeatIntervalMs: 15000, // notice a dead connection sooner than the default 25 s
      reconnectAfterMs: (tries) => [200, 500, 1000, 2000][tries - 1] ?? 3000, // retry fast: a match is waiting
      heartbeatCallback: (status, latency) => status === 'ok' && latency != null && setRtt('server', latency),
    })
  }
  return client
}

function supabaseChannel(topic, { key = '', onStatus } = {}) {
  const ch = getClient().channel(topic, { config: { broadcast: { self: false, ack: false }, presence: { key } } })
  const handlers = new Map()
  const presenceFns = new Set()
  let status = 'connecting'
  let meta = null
  let closing = false
  const setStatus = (s) => {
    if (s === status) return
    status = s
    onStatus?.(s)
  }

  ch.on('broadcast', { event: '*' }, ({ event, payload }) => {
    countReceived()
    handlers.get(event)?.forEach((fn) => fn(payload ?? {}))
  })
  // registering a presence listener before subscribe() is what turns presence on for the channel
  ch.on('presence', { event: 'sync' }, () => {
    const list = Object.entries(ch.presenceState()).map(([k, metas]) => ({ ...metas[0], key: k }))
    presenceFns.forEach((fn) => fn(list))
  })
  ch.subscribe((s) => {
    if (closing) return setStatus('closed')
    if (s === 'SUBSCRIBED') {
      setStatus('live')
      if (meta) ch.track(meta) // presence is per connection: announce again after every (re)join
    } else setStatus('reconnecting') // CHANNEL_ERROR / TIMED_OUT / CLOSED: the client rejoins by itself
  })

  return {
    get status() {
      return status
    },
    on(event, fn) {
      if (!handlers.has(event)) handlers.set(event, new Set())
      handlers.get(event).add(fn)
      return () => handlers.get(event)?.delete(fn)
    },
    onPresence(fn) {
      presenceFns.add(fn)
      return () => presenceFns.delete(fn)
    },
    track(m) {
      meta = m
      if (status === 'live') ch.track(m)
    },
    send(event, payload) {
      if (status !== 'live') return false
      ch.send({ type: 'broadcast', event, payload })
      countSent()
      return true
    },
    close() {
      if (closing) return
      closing = true
      handlers.clear()
      presenceFns.clear()
      getClient().removeChannel(ch)
      setStatus('closed')
    },
  }
}

// ---------------------------------------------------------------------------------------------- local test mode
const LAG_MS = Math.max(0, Number(params.get('lag')) || 0)

function localChannel(topic, { key = '', onStatus } = {}) {
  const bc = new BroadcastChannel(`india-speaks:${topic}`)
  const me = Math.random().toString(36).slice(2)
  const handlers = new Map()
  const presenceFns = new Set()
  const peers = new Map() // tab id → { key, meta, seen }
  let status = 'connecting'
  let meta = null
  const setStatus = (s) => {
    if (s === status) return
    status = s
    onStatus?.(s)
  }
  const emitPresence = () => {
    const byKey = new Map()
    if (meta) byKey.set(key, { ...meta, key })
    for (const p of peers.values()) if (!byKey.has(p.key)) byKey.set(p.key, { ...p.meta, key: p.key })
    const list = [...byKey.values()]
    presenceFns.forEach((fn) => fn(list))
  }
  let closed = false
  const postNow = (msg) => {
    try {
      bc.postMessage(msg)
    } catch {
      /* channel already closed */
    }
  }
  const post = (msg) => (LAG_MS ? setTimeout(() => postNow(msg), LAG_MS / 2) : postNow(msg))
  const announce = (hello = false) => meta && !closed && post({ t: 'presence', id: me, key, meta, hello })

  bc.onmessage = ({ data }) => {
    if (data.t === 'msg') {
      countReceived()
      handlers.get(data.event)?.forEach((fn) => fn(data.payload ?? {}))
    } else if (data.t === 'presence') {
      const isNew = !peers.has(data.id)
      peers.set(data.id, { key: data.key, meta: data.meta, seen: Date.now() })
      if (data.hello) announce() // a newcomer: tell it we are here
      if (isNew) emitPresence()
    } else if (data.t === 'leave' && peers.delete(data.id)) emitPresence()
    else if (data.t === 'who') announce()
  }
  // heartbeat: tabs that stop answering (closed, crashed) drop out of presence like a lost phone would
  const beat = setInterval(() => {
    announce()
    const now = Date.now()
    let changed = false
    for (const [id, p] of peers) if (now - p.seen > 3500) changed = peers.delete(id) || changed
    if (changed) emitPresence()
  }, 1000)
  const onUnload = () => post({ t: 'leave', id: me })
  window.addEventListener('pagehide', onUnload)
  setTimeout(() => {
    if (closed) return
    setStatus('live')
    post({ t: 'who' })
  }, 30)

  return {
    get status() {
      return status
    },
    on(event, fn) {
      if (!handlers.has(event)) handlers.set(event, new Set())
      handlers.get(event).add(fn)
      return () => handlers.get(event)?.delete(fn)
    },
    onPresence(fn) {
      presenceFns.add(fn)
      return () => presenceFns.delete(fn)
    },
    track(m) {
      meta = m
      announce(true)
      emitPresence()
    },
    send(event, payload) {
      if (status !== 'live') return false
      post({ t: 'msg', event, payload })
      countSent()
      return true
    },
    close() {
      if (closed) return
      clearInterval(beat)
      window.removeEventListener('pagehide', onUnload)
      post({ t: 'leave', id: me })
      closed = true
      // let a lagged message (and the leave) go out before closing
      setTimeout(() => bc.close(), LAG_MS + 10)
      handlers.clear()
      presenceFns.clear()
      setStatus('closed')
    },
  }
}
