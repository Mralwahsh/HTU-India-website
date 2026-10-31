import { openChannel } from '../../realtime/channel.js'
import { setRtt } from '../../realtime/stats.js'
import { STICKS } from '../config.js'
import { ctlTopic, PING_EVERY_MS, roomTopic, SCREEN_TIMEOUT_MS } from './tourProtocol.js'

const HELLO_EVERY_MS = 1500
/** No screen in the room after this long → the code is probably old (the laptop shows a new one). */
const NO_SCREEN_MS = 6000
const round2 = (v) => Math.round(v * 100) / 100

/**
 * The phone side of the tour room (see tourProtocol.js).
 *
 *   const c = new TourClient({ code, clientId, onChange, onFeedback })
 *   c.setStick('look', x, y) · c.setZoom(1) · c.action('next') · c.destroy()
 *
 * onChange gets { status, controlling, tour, rtt }. status: connecting · connected · reconnecting
 * · no-screen (nobody answers this code) · closed (the laptop finished this code).
 * controlling = this phone holds the controls (otherwise someone else does: wait).
 */
export class TourClient {
  constructor({ code, clientId, onChange, onFeedback }) {
    this.code = code
    this.id = clientId
    this.cb = { onChange, onFeedback }
    this.status = 'connecting'
    this.controlling = false
    this.token = null
    this.tour = { mode: 'map', placeName: null }
    this.rtt = null
    this.sticks = { move: [0, 0], look: [0, 0] }
    this.zoom = 0
    this.seq = 0
    this.lastSent = '' // what the last 'in' message said, to send only changes
    this.lastInputAt = 0
    this.inputTimer = null
    this.ctlCh = null
    this.screenHere = false
    this.screenGoneAt = 0
    this.liveSince = 0
    this.lastPing = 0
    this.lastPong = 0
    this.lastHello = 0

    this.roomCh = openChannel(roomTopic(code), { key: clientId, onStatus: (s) => this.onRoomStatus(s) })
    this.roomCh.track({ role: 'phone' })
    this.roomCh.on('seat', (m) => this.onSeat(m))
    this.roomCh.on('state', ({ mode, placeName }) => this.set({ tour: { mode: mode === 'tour' ? 'tour' : 'map', placeName: placeName ?? null } }))
    this.roomCh.on('closed', () => this.finish('closed'))
    this.roomCh.onPresence((list) => {
      const here = list.some((p) => p.key === 'screen')
      if (!here && this.screenHere) this.screenGoneAt = performance.now()
      this.screenHere = here
      if (here && this.status === 'no-screen') this.set({ status: this.controlling ? 'reconnecting' : 'connecting' })
    })
    this.timer = setInterval(() => this.tick(), 500)
  }

  // ------------------------------------------------------------------------------------- joining
  onRoomStatus(s) {
    if (this.done) return
    if (s === 'live') {
      this.liveSince = performance.now()
      this.hello() // also after a reconnect: the laptop gives the controls back to the same id
    } else if (this.status === 'connected') this.set({ status: 'reconnecting' })
  }

  hello() {
    this.lastHello = performance.now()
    this.roomCh.send('hello', { id: this.id })
  }

  onSeat({ id, k }) {
    if (id === this.id) {
      if (!this.ctlCh) {
        this.ctlCh = openChannel(ctlTopic(this.code), { key: this.id, onStatus: (s) => s === 'live' && (this.ping(), this.sendInput(true)) })
        this.ctlCh.on('pong', ({ t }) => {
          this.lastPong = performance.now()
          this.rtt = Math.round(this.lastPong - t)
          setRtt('screen', this.rtt)
          if (this.status === 'reconnecting') this.status = 'connected'
          this.changed()
        })
        this.ctlCh.on('fb', ({ t }) => this.cb.onFeedback?.(t))
        this.ctlCh.on('gone', ({ k: old }) => {
          if (old !== this.token) return
          this.leaveSeat()
          this.hello()
        })
      }
      this.token = k
      this.lastPong = performance.now()
      this.set({ status: 'connected', controlling: true })
      this.ping()
    } else {
      // someone else has the controls (or nobody: then ask for them)
      if (this.controlling) this.leaveSeat()
      this.set({ status: this.status === 'connecting' || this.status === 'no-screen' ? 'connected' : this.status, controlling: false })
      if (!id) this.hello()
    }
  }

  leaveSeat() {
    this.ctlCh?.close()
    this.ctlCh = null
    this.token = null
    this.controlling = false
  }

  /** Every 500 ms: ask for the controls until the laptop answers, notice a silent laptop, ping, keep-alive. */
  tick() {
    if (this.done || this.roomCh.status !== 'live') return
    const now = performance.now()
    if (this.status === 'connecting' || this.status === 'no-screen') {
      if (now - this.lastHello > (this.status === 'no-screen' ? 3000 : HELLO_EVERY_MS)) this.hello()
      if (this.status === 'connecting' && !this.screenHere && now - this.liveSince > NO_SCREEN_MS) this.set({ status: 'no-screen' })
    }
    if (this.controlling) {
      if (now - this.lastPing >= PING_EVERY_MS) this.ping()
      if (this.status === 'connected' && now - this.lastPong > SCREEN_TIMEOUT_MS) this.set({ status: 'reconnecting' })
      // a stick held still: repeat it, so the laptop knows it's still held
      if (this.isActive() && now - this.lastInputAt >= STICKS.keepAliveMs) this.sendInput(true)
    }
    // online, but the laptop has left this room for a while: its page was reloaded or closed
    if (!this.screenHere && this.screenGoneAt && now - this.screenGoneAt > NO_SCREEN_MS + 4000 && this.status !== 'closed') {
      this.set({ status: 'no-screen' })
    }
  }

  ping() {
    this.lastPing = performance.now()
    if (this.token) this.ctlCh?.send('ping', { k: this.token, t: this.lastPing, r: this.rtt })
  }

  // ------------------------------------------------------------------------------------- input
  setStick(stick, x, y) {
    this.sticks[stick] = [round2(x), round2(y)]
    this.queueInput()
  }

  /** Hold-to-zoom: 1 in, -1 out, 0 stop. */
  setZoom(dir) {
    this.zoom = Math.sign(dir)
    this.queueInput()
  }

  action(a) {
    if (this.token) this.ctlCh?.send('act', { k: this.token, a })
  }

  isActive() {
    return this.zoom !== 0 || [...this.sticks.move, ...this.sticks.look].some((v) => v !== 0)
  }

  /** Send now if the last message is old enough, otherwise once the 1/sendHz gap has passed (latest values). */
  queueInput() {
    const gap = 1000 / STICKS.sendHz
    const wait = this.lastInputAt + gap - performance.now()
    if (wait <= 0) this.sendInput()
    else if (!this.inputTimer) {
      this.inputTimer = setTimeout(() => {
        this.inputTimer = null
        this.sendInput()
      }, wait)
    }
  }

  sendInput(force = false) {
    if (!this.token || !this.ctlCh) return
    const body = { m: this.sticks.move, l: this.sticks.look, z: this.zoom }
    const key = JSON.stringify(body)
    if (!force && key === this.lastSent) return // nothing changed
    if (this.ctlCh.send('in', { k: this.token, s: ++this.seq, ...body })) {
      this.lastSent = key
      this.lastInputAt = performance.now()
    }
  }

  /** App in the background / screen locked: let go of everything. */
  releaseAll() {
    this.sticks = { move: [0, 0], look: [0, 0] }
    this.zoom = 0
    this.sendInput()
  }

  // ------------------------------------------------------------------------------------- state
  set(patch) {
    Object.assign(this, patch)
    this.changed()
  }

  changed() {
    this.cb.onChange?.({ status: this.status, controlling: this.controlling, tour: this.tour, rtt: this.rtt })
  }

  /** The laptop finished this code: stop everything (the visitor scans the new one). */
  finish(status) {
    this.leaveSeat()
    this.set({ status })
    this.done = true
    clearInterval(this.timer)
    clearTimeout(this.inputTimer)
    this.roomCh.close()
  }

  destroy() {
    this.done = true
    clearInterval(this.timer)
    clearTimeout(this.inputTimer)
    this.leaveSeat()
    this.roomCh.close()
    this.cb = {}
  }
}
