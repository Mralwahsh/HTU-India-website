import { BUTTONS, SLOTS } from '../../../shared/protocol.js'
import { openChannel } from '../../realtime/channel.js'
import { newRoomCode } from '../../realtime/roomCode.js'
import { setRtt } from '../../realtime/stats.js'
import { FootballRoom } from './FootballRoom.js'
import { maskHas, PHONE_TIMEOUT_MS, roomTopic, slotTopic } from './footballProtocol.js'

const LEAVE_GRACE_MS = 1500

/**
 * The laptop side of the football room (see footballProtocol.js). Owns the room code, the Realtime
 * channels and the FootballRoom, and hands phone input to the game through onInput().
 *
 *   const host = new FootballHost({ onChange, onPlayerConnected, onPlayerDisconnected })
 *   host.onInput(({ slot, button, pressed }) => …)
 *   host.setPhase('playing', score) · host.buzz('p1', [80]) · host.pickFor('p2', 'tara') · host.newRoom()
 *
 * onChange gets { code, status, room, pings } (status: connecting | live | reconnecting).
 */
export class FootballHost {
  constructor({ onChange, onPlayerConnected, onPlayerDisconnected } = {}) {
    this.cb = { onChange, onPlayerConnected, onPlayerDisconnected }
    this.inputFns = new Set()
    this.channels = null
    this.timer = setInterval(() => this.checkPhones(), 1000)
    // the laptop page is reloaded or closed: tell the phones this code is over (React cleanup doesn't run then)
    this.onPageHide = () => this.closeChannels(true)
    window.addEventListener('pagehide', this.onPageHide)
    this.newRoom()
  }

  // ------------------------------------------------------------------------------------- room / channels
  /** Retire the current code (phones on it are told to scan again) and open a fresh room. */
  newRoom() {
    const keepPicks = this.room?.picks
    this.closeChannels(true)
    this.code = newRoomCode()
    this.room = new FootballRoom()
    if (keepPicks) this.room.picks = { ...keepPicks } // keyboard players keep their characters
    this.status = 'connecting'
    this.seen = { p1: 0, p2: 0 }
    this.seq = { p1: -1, p2: -1 }
    this.held = { p1: 0, p2: 0 }
    this.pings = { p1: null, p2: null }
    this.lastGone = { p1: 0, p2: 0 }
    this.present = new Set()
    this.lastState = ''

    const code = this.code
    const onStatus = () => this.channels?.code === code && this.updateStatus()
    const room = openChannel(roomTopic(code), { key: 'screen', onStatus })
    const slots = Object.fromEntries(SLOTS.map((s) => [s, openChannel(slotTopic(code, s), { key: 'screen', onStatus })]))
    this.channels = { code, room, slots }

    room.track({ role: 'screen' })
    room.on('hello', (m) => this.onHello(m))
    room.onPresence((list) => this.onPresence(list))
    for (const s of SLOTS) {
      const ch = slots[s]
      ch.on('in', (m) => this.fromPhone(s, m) && this.onButtons(s, m))
      ch.on('ping', (m) => {
        if (!this.fromPhone(s, m)) return
        ch.send('pong', { t: m.t })
        if (typeof m.r === 'number') {
          this.pings[s] = Math.round(m.r)
          setRtt(s, m.r)
        }
        this.syncHeld(s, m.h)
        this.changed()
      })
      ch.on('pick', (m) => {
        if (!this.fromPhone(s, m) || (this.room.phase !== 'lobby' && this.room.phase !== 'result')) return
        this.room.pick(s, m.c)
        this.sendState(true) // also when refused, so the phone snaps back to the real pick
      })
    }
    this.changed()
  }

  closeChannels(announce) {
    if (!this.channels) return
    const { room, slots } = this.channels
    this.channels = null
    if (announce) room.send('closed', {})
    for (const s of SLOTS) this.releaseHeld(s)
    room.close()
    Object.values(slots).forEach((ch) => ch.close())
  }

  updateStatus() {
    const { room, slots } = this.channels
    const all = [room, ...Object.values(slots)].map((c) => c.status)
    const status = all.every((s) => s === 'live') ? 'live' : all.includes('reconnecting') ? 'reconnecting' : 'connecting'
    if (status === this.status) return
    const back = status === 'live' && this.status === 'reconnecting'
    this.status = status
    if (status !== 'live') for (const s of SLOTS) this.releaseHeld(s) // no stuck buttons while we can't hear the phones
    if (back) {
      // we were the ones offline: give the phones a fresh timeout and re-send the room
      const now = performance.now()
      for (const s of SLOTS) this.seen[s] = now
      this.sendState(true)
    }
    this.changed()
  }

  // ------------------------------------------------------------------------------------- phones
  onHello({ id } = {}) {
    if (typeof id !== 'string' || !id || id.length > 64) return
    const { room } = this.channels
    const slot = this.room.claim(id)
    if (!slot) return room.send('full', { id })
    this.seen[slot] = performance.now()
    this.seq[slot] = -1
    this.releaseHeld(slot)
    room.send('welcome', { id, slot, k: this.room.slots[slot].token })
    this.sendState(true)
    this.cb.onPlayerConnected?.(slot)
  }

  /**
   * A presence key that was here and is gone = that phone closed the page or lost its connection.
   * Acted on after a short grace, because a phone that reconnects can briefly vanish from presence
   * (old connection leaves, new one joins) and that shouldn't pause the match.
   */
  onPresence(list) {
    const keys = new Set(list.map((p) => p.key))
    const code = this.code
    for (const key of this.present) {
      if (keys.has(key) || !this.room.slotOf(key)) continue
      setTimeout(() => {
        const slot = this.code === code && !this.present.has(key) ? this.room.slotOf(key) : null
        if (slot) this.dropPhone(slot)
      }, LEAVE_GRACE_MS)
    }
    this.present = keys
  }

  /** Is this slot-channel message from the phone that holds the slot? Also keeps the phone "alive". */
  fromPhone(slot, m) {
    const s = this.room.slots[slot]
    const valid = s.type === 'human' && m && m.k === s.token
    // a dropped phone that also left the room (closed the page, lost the connection) must say hello
    // again; only a phone that merely went quiet comes back by simply talking
    if (!valid || (!s.connected && !this.present.has(s.clientId))) {
      // a phone with an old token (its slot was freed or taken over): ask it to say hello again
      const now = performance.now()
      if (typeof m?.k === 'string' && now - this.lastGone[slot] > 1000) {
        this.lastGone[slot] = now
        this.channels.slots[slot].send('gone', { k: m.k })
      }
      return false
    }
    this.seen[slot] = performance.now()
    if (this.room.reconnect(slot)) {
      this.sendState(true)
      this.cb.onPlayerConnected?.(slot)
    }
    return true
  }

  onButtons(slot, { s, b, p, h }) {
    if (typeof s === 'number') {
      if (s <= this.seq[slot]) return // late or repeated
      this.seq[slot] = s
    }
    if (BUTTONS.includes(b)) this.emit(slot, b, !!p)
    this.syncHeld(slot, h)
  }

  /** Make the buttons we report match the phone's "everything held" mask (repairs a lost release). */
  syncHeld(slot, mask) {
    if (typeof mask !== 'number') return
    for (const b of BUTTONS) if (maskHas(this.held[slot], b) !== maskHas(mask, b)) this.emit(slot, b, maskHas(mask, b))
  }

  emit(slot, button, pressed) {
    const bit = 1 << BUTTONS.indexOf(button)
    this.held[slot] = pressed ? this.held[slot] | bit : this.held[slot] & ~bit
    this.inputFns.forEach((fn) => fn({ slot, button, pressed }))
  }

  releaseHeld(slot) {
    for (const b of BUTTONS) if (maskHas(this.held[slot], b)) this.emit(slot, b, false)
  }

  dropPhone(slot) {
    this.releaseHeld(slot)
    if (!this.room.disconnect(slot)) return
    this.pings[slot] = null
    setRtt(slot, null)
    this.sendState(true)
    this.cb.onPlayerDisconnected?.(slot)
  }

  /** Once a second: phones that went quiet (screen locked, no signal) count as disconnected. */
  checkPhones() {
    if (!this.channels || this.status !== 'live') return
    const now = performance.now()
    for (const s of SLOTS) {
      const slot = this.room.slots[s]
      if (slot.type === 'human' && slot.connected && now - this.seen[s] > PHONE_TIMEOUT_MS) this.dropPhone(s)
    }
  }

  // ------------------------------------------------------------------------------------- page → room
  onInput(fn) {
    this.inputFns.add(fn)
    return () => this.inputFns.delete(fn)
  }

  setPhase(phase, score) {
    this.room.setPhase(phase, score)
    this.sendState()
  }

  /** Keyboard / CPU players have no phone: the laptop picks their character. */
  pickFor(slot, characterId) {
    if (this.room.slots[slot]?.type === 'human') return
    if (this.room.pick(slot, characterId)) this.sendState()
  }

  buzz(slot, pattern) {
    if (this.room.slots[slot]?.type === 'human') this.channels?.slots[slot].send('buzz', { pattern })
  }

  sendState(force = false) {
    const state = this.room.publicState()
    const json = JSON.stringify(state)
    // remembered only once it actually went out, so a state that changed while offline is sent later
    if ((force || json !== this.lastState) && this.channels?.room.send('state', state)) this.lastState = json
    this.changed()
  }

  changed() {
    this.cb.onChange?.({ code: this.code, status: this.status, room: this.room.publicState(), pings: { ...this.pings } })
  }

  destroy() {
    clearInterval(this.timer)
    window.removeEventListener('pagehide', this.onPageHide)
    this.closeChannels(true)
    this.inputFns.clear()
    this.cb = {}
  }
}
