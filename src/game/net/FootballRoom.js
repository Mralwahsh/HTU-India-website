import { CHARACTER_IDS, DEFAULT_PICKS, SLOTS } from '../../../shared/protocol.js'

const emptySlot = () => ({ type: 'empty', clientId: null, token: null, connected: false })
const newToken = () => Math.random().toString(36).slice(2, 8)

/**
 * The game room: two player slots, kept by the laptop page (it used to live on the booth server).
 * A slot is 'empty' (P2 empty = keyboard / CPU) or 'human' (a phone). A human slot whose phone dropped
 * stays reserved (connected: false) during a match so the same phone can come back to it.
 */
export class FootballRoom {
  constructor() {
    this.phase = 'lobby'
    this.score = { p1: 0, p2: 0 }
    this.slots = { p1: emptySlot(), p2: emptySlot() }
    this.picks = { ...DEFAULT_PICKS }
  }

  slotOf(clientId) {
    return SLOTS.find((s) => this.slots[s].clientId === clientId) ?? null
  }

  /**
   * Give a phone a slot. Priority: its own previous slot (same id) → P1 → P2 (only in the lobby, so a
   * match in progress against the keyboard isn't hijacked) → a slot whose phone disconnected (takeover,
   * so "scan again" always works). Every claim gets a fresh token.
   * @returns slot name or null when full
   */
  claim(clientId) {
    const own = this.slotOf(clientId)
    const empty = SLOTS.find((s) => this.slots[s].type === 'empty' && (s === 'p1' || this.phase === 'lobby' || this.phase === 'result'))
    const orphan = SLOTS.find((s) => this.slots[s].type === 'human' && !this.slots[s].connected)
    const slot = own ?? empty ?? orphan
    if (!slot) return null
    this.slots[slot] = { type: 'human', clientId, token: newToken(), connected: true }
    return slot
  }

  /** A phone went away. Outside a match the slot is freed; during a match it stays reserved. */
  disconnect(slot) {
    const s = this.slots[slot]
    if (s?.type !== 'human' || !s.connected) return false
    if (this.phase === 'lobby' || this.phase === 'result') this.slots[slot] = emptySlot()
    else this.slots[slot] = { ...s, connected: false }
    return true
  }

  /** A reserved phone is talking again (with its valid token). */
  reconnect(slot) {
    const s = this.slots[slot]
    if (s?.type !== 'human' || s.connected) return false
    s.connected = true
    return true
  }

  /** Character choice; two players can't have the same character. */
  pick(slot, characterId) {
    if (!SLOTS.includes(slot) || !CHARACTER_IDS.includes(characterId)) return false
    const other = slot === 'p1' ? 'p2' : 'p1'
    if (this.picks[other] === characterId) {
      // a CPU (empty slot) politely moves to another character; a human keeps theirs
      if (this.slots[other].type === 'human') return false
      this.picks[other] = CHARACTER_IDS.find((c) => c !== characterId && c !== this.picks[other]) ?? this.picks[slot]
    }
    this.picks[slot] = characterId
    return true
  }

  setPhase(phase, score) {
    this.phase = phase
    if (score) this.score = { p1: score.p1 | 0, p2: score.p2 | 0 }
    if (phase === 'lobby') {
      this.score = { p1: 0, p2: 0 }
      // back in the lobby: drop reservations of phones that never came back
      for (const s of SLOTS) if (this.slots[s].type === 'human' && !this.slots[s].connected) this.slots[s] = emptySlot()
    }
  }

  publicState() {
    const slots = {}
    for (const s of SLOTS) {
      const { type, connected } = this.slots[s]
      slots[s] = { type, connected, character: this.picks[s] }
    }
    return { phase: this.phase, score: { ...this.score }, slots }
  }
}
