import { openChannel } from '../../realtime/channel.js'
import { newRoomCode } from '../../realtime/roomCode.js'
import { setRtt } from '../../realtime/stats.js'
import { STICKS } from '../config.js'
import { ACTIONS, ctlTopic, PHONE_TIMEOUT_MS, RECLAIM_MS, roomTopic } from './tourProtocol.js'

const LEAVE_GRACE_MS = 1500
const clamp1 = (v) => (typeof v === 'number' && Number.isFinite(v) ? Math.max(-1, Math.min(1, v)) : 0)
const newToken = () => Math.random().toString(36).slice(2, 8)
const pair = (v) => (Array.isArray(v) ? [clamp1(v[0]), clamp1(v[1])] : [0, 0])

/**
 * The laptop side of the tour room (see tourProtocol.js): room code, channels, who holds the controls,
 * and the stick values. The phone sends sticks ~10×/s at most; this feeds them to the tour
 * STICKS.refreshHz times a second, easing the look stick between messages, so the view stays smooth.
 *
 *   const host = new TourHost({ onChange, onStick, onZoom, onAction })
 *   host.setState({ mode, placeId, placeName }) · host.feedback('stepped') · host.destroy()
 *
 * onChange gets { code, status, phone, rtt }: status connecting | live | reconnecting,
 * phone = a controlling phone is connected. onStick({ stick, x, y }), onZoom({ dir, pressed }), onAction(a).
 */
export class TourHost {
  constructor({ onChange, onStick, onZoom, onAction } = {}) {
    this.cb = { onChange, onStick, onZoom, onAction }
    this.code = newRoomCode()
    this.status = 'connecting'
    this.seat = null // { id, k, connected, seen, seq }
    this.reclaimTimer = null
    this.present = new Set()
    this.tourState = { mode: 'map', placeId: null, placeName: null }
    this.rtt = null
    this.lastGone = 0
    // sticks: target = last value from the phone, value = what the tour gets (eased towards target)
    this.sticks = { move: { target: [0, 0], value: [0, 0] }, look: { target: [0, 0], value: [0, 0] } }
    this.lastInput = 0
    this.zoom = 0

    const code = this.code
    const onStatus = () => this.channels && this.updateStatus()
    const room = openChannel(roomTopic(code), { key: 'screen', onStatus })
    const ctl = openChannel(ctlTopic(code), { key: 'screen', onStatus })
    this.channels = { room, ctl }

    room.track({ role: 'screen' })
    room.on('hello', (m) => this.onHello(m))
    room.onPresence((list) => this.onPresence(list))
    ctl.on('in', (m) => this.fromPhone(m) && this.onInput(m))
    ctl.on('act', (m) => this.fromPhone(m) && ACTIONS.includes(m.a) && this.cb.onAction?.(m.a))
    ctl.on('ping', (m) => {
      if (!this.fromPhone(m)) return
      ctl.send('pong', { t: m.t })
      if (typeof m.r === 'number') {
        this.rtt = Math.round(m.r)
        setRtt('phone', m.r)
        this.changed()
      }
    })

    this.loop = setInterval(() => this.refreshSticks(), 1000 / STICKS.refreshHz)
    this.timer = setInterval(() => this.checkPhone(), 1000)
    // the laptop page is reloaded or closed: tell the phones this code is over
    this.onPageHide = () => this.close()
    window.addEventListener('pagehide', this.onPageHide)
    this.changed()
  }

  // ------------------------------------------------------------------------------------- connection
  updateStatus() {
    const all = [this.channels.room.status, this.channels.ctl.status]
    const status = all.every((s) => s === 'live') ? 'live' : all.includes('reconnecting') ? 'reconnecting' : 'connecting'
    if (status === this.status) return
    const back = status === 'live' && this.status === 'reconnecting'
    this.status = status
    if (status !== 'live') this.stopAll() // we can't hear the phone: don't keep walking or spinning
    if (back) {
      if (this.seat) this.seat.seen = performance.now() // we were the ones offline: a fresh timeout
      this.sendSeat()
      this.channels.room.send('state', this.tourState)
    }
    this.changed()
  }

  // ------------------------------------------------------------------------------------- the seat
  onHello({ id } = {}) {
    if (typeof id !== 'string' || !id || id.length > 64) return
    const s = this.seat
    // free, or the same phone coming back → it gets the controls (a new token)
    if (!s || s.id === id) this.take(id)
    this.sendSeat()
    this.channels.room.send('state', this.tourState)
  }

  take(id) {
    clearTimeout(this.reclaimTimer)
    this.reclaimTimer = null
    this.stopAll()
    this.seat = { id, k: newToken(), connected: true, seen: performance.now(), seq: -1 }
    this.changed()
  }

  sendSeat() {
    this.channels?.room.send('seat', { id: this.seat?.id ?? null, k: this.seat?.k ?? null })
  }

  /** The controlling phone left: stop moving, keep its seat for RECLAIM_MS, then free it for the others. */
  dropPhone() {
    const s = this.seat
    if (!s?.connected) return
    s.connected = false
    this.stopAll()
    this.rtt = null
    setRtt('phone', null)
    clearTimeout(this.reclaimTimer)
    this.reclaimTimer = setTimeout(() => {
      this.reclaimTimer = null
      if (this.seat && !this.seat.connected) this.seat = null
      this.sendSeat() // waiting phones see the seat is free and say hello
      this.changed()
    }, RECLAIM_MS)
    this.changed()
  }

  /** A presence key that was here and is gone (after a short grace, a reconnect can blink) → that phone left. */
  onPresence(list) {
    const keys = new Set(list.map((p) => p.key))
    for (const key of this.present) {
      if (keys.has(key) || this.seat?.id !== key) continue
      setTimeout(() => {
        if (this.channels && !this.present.has(key) && this.seat?.id === key) this.dropPhone()
      }, LEAVE_GRACE_MS)
    }
    this.present = keys
  }

  /** Is this control-channel message from the phone with the seat? Also keeps that phone "alive". */
  fromPhone(m) {
    const s = this.seat
    const valid = s && m && m.k === s.k
    // a dropped phone that also left the room must say hello again; one that only went quiet comes back by talking
    if (!valid || (!s.connected && !this.present.has(s.id))) {
      const now = performance.now()
      if (typeof m?.k === 'string' && now - this.lastGone > 1000) {
        this.lastGone = now
        this.channels.ctl.send('gone', { k: m.k })
      }
      return false
    }
    s.seen = performance.now()
    if (!s.connected) {
      s.connected = true
      clearTimeout(this.reclaimTimer)
      this.reclaimTimer = null
      this.changed()
    }
    return true
  }

  checkPhone() {
    if (this.status !== 'live' || !this.seat?.connected) return
    if (performance.now() - this.seat.seen > PHONE_TIMEOUT_MS) this.dropPhone()
  }

  // ------------------------------------------------------------------------------------- sticks
  onInput({ s, m, l, z }) {
    if (typeof s === 'number') {
      if (s <= this.seat.seq) return // late or repeated
      this.seat.seq = s
    }
    this.lastInput = performance.now()
    this.sticks.move.target = pair(m)
    this.sticks.look.target = pair(l)
    // walking reacts at once (the tour interprets pushes as steps), the look stick is eased in refreshSticks
    this.sticks.move.value = this.sticks.move.target
    this.cb.onStick?.({ stick: 'move', x: this.sticks.move.value[0], y: this.sticks.move.value[1] })
    const zoom = z === 1 || z === -1 ? z : 0
    if (zoom !== this.zoom) {
      this.zoom = zoom
      this.cb.onZoom?.({ dir: zoom < 0 ? 'out' : 'in', pressed: zoom !== 0 })
    }
  }

  /** STICKS.refreshHz times a second: keep the tour fed with the latest stick values. */
  refreshSticks() {
    // the phone repeats a held stick every second; silence means a lost release or a vanished phone
    if (performance.now() - this.lastInput > STICKS.lostMs) this.stopAll()
    for (const [name, st] of Object.entries(this.sticks)) {
      const [tx, ty] = st.target
      let [x, y] = st.value
      if (name === 'look') {
        // messages come ~10×/s: glide towards the newest value instead of jumping
        x += (tx - x) * 0.45
        y += (ty - y) * 0.45
        if (Math.abs(tx - x) < 0.01) x = tx
        if (Math.abs(ty - y) < 0.01) y = ty
        st.value = [x, y]
      }
      if (x !== 0 || y !== 0 || st.active) {
        this.cb.onStick?.({ stick: name, x, y })
        st.active = x !== 0 || y !== 0 // one last {0, 0} goes out after the stick comes back
      }
    }
  }

  stopAll() {
    for (const st of Object.values(this.sticks)) st.target = [0, 0]
    this.sticks.move.value = [0, 0]
    if (this.zoom !== 0) {
      this.zoom = 0
      this.cb.onZoom?.({ dir: 'in', pressed: false })
    }
  }

  // ------------------------------------------------------------------------------------- page → phones
  setState({ mode, placeId, placeName }) {
    this.tourState = { mode: mode === 'tour' ? 'tour' : 'map', placeId: placeId ?? null, placeName: placeName ?? null }
    this.channels?.room.send('state', this.tourState)
  }

  /** Vibrate the controlling phone after a step ('stepped') or a wall ('no-path'). */
  feedback(type) {
    if (this.seat?.connected && (type === 'stepped' || type === 'no-path')) this.channels?.ctl.send('fb', { t: type })
  }

  changed() {
    this.cb.onChange?.({ code: this.code, status: this.status, phone: !!this.seat?.connected, rtt: this.rtt })
  }

  close() {
    if (!this.channels) return
    const { room, ctl } = this.channels
    this.channels = null
    room.send('closed', {})
    room.close()
    ctl.close()
  }

  destroy() {
    clearInterval(this.loop)
    clearInterval(this.timer)
    clearTimeout(this.reclaimTimer)
    window.removeEventListener('pagehide', this.onPageHide)
    this.stopAll()
    this.close()
    this.cb = {}
  }
}
