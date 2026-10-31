import { BUTTONS } from '../../../shared/protocol.js'
import { openChannel } from '../../realtime/channel.js'
import { setRtt } from '../../realtime/stats.js'
import { PING_EVERY_MS, roomTopic, SCREEN_TIMEOUT_MS, slotTopic, toMask } from './footballProtocol.js'

const HELLO_EVERY_MS = 1500
/** No screen in the room after this long → the code is probably old (the laptop shows a new one). */
const NO_SCREEN_MS = 6000

/**
 * The phone side of the football room (see footballProtocol.js).
 *
 *   const c = new FootballClient({ code, clientId, onChange, onBuzz })
 *   c.press('kick', true) · c.pick('tara') · c.rejoin() · c.destroy()
 *
 * onChange gets { status, slot, room, rtt }. status:
 *   connecting · connected · reconnecting · full (both slots taken) · no-screen (nobody answers this code)
 *   · closed (the laptop finished this code) · replaced (another phone took this slot)
 */
export class FootballClient {
  constructor({ code, clientId, onChange, onBuzz }) {
    this.code = code
    this.id = clientId
    this.cb = { onChange, onBuzz }
    this.status = 'connecting'
    this.slot = null
    this.token = null
    this.room = null
    this.rtt = null
    this.held = Object.fromEntries(BUTTONS.map((b) => [b, false]))
    this.seq = 0
    this.slotCh = null
    this.screenHere = false
    this.screenGoneAt = 0
    this.liveSince = 0
    this.lastPing = 0
    this.lastPong = 0
    this.lastHello = 0

    this.roomCh = openChannel(roomTopic(code), { key: clientId, onStatus: (s) => this.onRoomStatus(s) })
    this.roomCh.track({ role: 'phone' })
    this.roomCh.on('welcome', (m) => this.onWelcome(m))
    this.roomCh.on('full', ({ id }) => id === this.id && !this.slot && this.set({ status: 'full' }))
    this.roomCh.on('state', (room) => {
      this.room = room
      // waiting for a free slot: try again as soon as one opens up
      if (this.status === 'full' && (room.phase === 'lobby' || room.phase === 'result') && Object.values(room.slots).some((s) => s.type !== 'human' || !s.connected)) this.hello()
      this.changed()
    })
    this.roomCh.on('closed', () => this.finish('closed'))
    this.roomCh.onPresence((list) => {
      const here = list.some((p) => p.key === 'screen')
      if (!here && this.screenHere) this.screenGoneAt = performance.now()
      this.screenHere = here
      if (here && this.status === 'no-screen') this.set({ status: this.slot ? 'reconnecting' : 'connecting' })
    })
    this.timer = setInterval(() => this.tick(), 500)
  }

  // ------------------------------------------------------------------------------------- joining
  onRoomStatus(s) {
    if (this.done) return
    if (s === 'live') {
      this.liveSince = performance.now()
      this.hello() // also after a reconnect: the laptop gives back the same slot (same id)
    } else if (this.status === 'connected') this.set({ status: 'reconnecting' })
  }

  hello() {
    this.lastHello = performance.now()
    this.roomCh.send('hello', { id: this.id })
  }

  /** "Play again" after another phone took our slot. */
  rejoin() {
    if (this.done) return
    this.set({ status: 'connecting' })
    this.hello()
  }

  onWelcome({ id, slot, k }) {
    if (id !== this.id) {
      // someone else got our slot (we had dropped out and they scanned the code)
      if (slot === this.slot) {
        this.closeSlot()
        this.set({ status: 'replaced' })
      }
      return
    }
    if (slot !== this.slot) {
      this.closeSlot()
      this.slot = slot
      this.slotCh = openChannel(slotTopic(this.code, slot), { key: this.id, onStatus: (s) => s === 'live' && this.ping() })
      this.slotCh.on('pong', ({ t }) => {
        this.lastPong = performance.now()
        this.rtt = Math.round(this.lastPong - t)
        setRtt('screen', this.rtt)
        if (this.status === 'reconnecting') this.status = 'connected'
        this.changed()
      })
      this.slotCh.on('buzz', ({ pattern }) => this.cb.onBuzz?.(pattern))
      this.slotCh.on('gone', ({ k: old }) => {
        if (old !== this.token) return
        this.closeSlot()
        this.set({ status: 'connecting' })
        this.hello()
      })
    }
    this.token = k
    this.lastPong = performance.now()
    this.set({ status: 'connected' })
    this.ping()
  }

  closeSlot() {
    this.slotCh?.close()
    this.slotCh = null
    this.slot = null
    this.token = null
  }

  /** Every 500 ms: keep asking for a slot, notice a silent laptop, ping. */
  tick() {
    if (this.done || this.roomCh.status !== 'live') return
    const now = performance.now()
    if (!this.slot && (this.status === 'connecting' || this.status === 'no-screen')) {
      if (now - this.lastHello > (this.status === 'no-screen' ? 3000 : HELLO_EVERY_MS)) this.hello()
      if (this.status === 'connecting' && !this.screenHere && now - this.liveSince > NO_SCREEN_MS) this.set({ status: 'no-screen' })
    }
    if (this.slot) {
      if (now - this.lastPing >= PING_EVERY_MS) this.ping()
      if (this.status === 'connected' && now - this.lastPong > SCREEN_TIMEOUT_MS) this.set({ status: 'reconnecting' })
      // we are online but the laptop has left this room for a while: its page was reloaded or closed
      if (this.status === 'reconnecting' && !this.screenHere && now - this.screenGoneAt > NO_SCREEN_MS + 4000) this.set({ status: 'no-screen' })
    }
  }

  ping() {
    this.lastPing = performance.now()
    if (this.token) this.slotCh?.send('ping', { k: this.token, t: this.lastPing, r: this.rtt, h: toMask(this.held) })
  }

  // ------------------------------------------------------------------------------------- input
  /** A button went down / up. Only changes are sent (with every held button, to repair a lost message). */
  press(button, pressed) {
    if (this.held[button] === pressed) return
    this.held[button] = pressed
    if (this.token) this.slotCh?.send('in', { k: this.token, s: ++this.seq, b: button, p: pressed ? 1 : 0, h: toMask(this.held) })
  }

  pick(characterId) {
    if (this.token) this.slotCh?.send('pick', { k: this.token, c: characterId })
  }

  // ------------------------------------------------------------------------------------- state
  set(patch) {
    Object.assign(this, patch)
    this.changed()
  }

  changed() {
    this.cb.onChange?.({ status: this.status, slot: this.slot, room: this.room, rtt: this.rtt })
  }

  /** The laptop finished this code: stop everything (the visitor scans the new one). */
  finish(status) {
    this.closeSlot()
    this.set({ status })
    this.done = true
    clearInterval(this.timer)
    this.roomCh.close()
  }

  destroy() {
    this.done = true
    clearInterval(this.timer)
    this.closeSlot()
    this.roomCh.close()
    this.cb = {}
  }
}
