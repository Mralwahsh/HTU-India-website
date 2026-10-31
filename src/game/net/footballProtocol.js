import { BUTTONS } from '../../../shared/protocol.js'

// Big Head Football over Supabase Realtime. The laptop page is the authority (it owns the room: slots,
// characters, phase, score); phones only send button presses. There is no server of our own.
//
// Channels for a room code (see src/realtime/roomCode.js):
//   room:<code>         laptop + every phone that scanned the code
//     phone → laptop    hello   { id }                         "give me a slot" (id = the phone's saved id)
//     laptop → all      welcome { id, slot, k }                k = a short token the phone puts on every message
//     laptop → all      full    { id }
//     laptop → all      state   { phase, score, slots }        whenever something changes
//     laptop → all      closed  {}                             this code is finished (new code on the screen)
//   room:<code>:p1/p2   laptop + the phone playing that slot (so phones never receive each other's input)
//     phone → laptop    in      { k, s, b, p, h }              button b pressed (p=1) / released (p=0),
//                                                              s = sequence number, h = every held button (bitmask)
//     phone → laptop    ping    { k, t, r, h }                 every 2 s: t = phone clock, r = last round trip (ms)
//     phone → laptop    pick    { k, c }                       character choice (lobby / result)
//     laptop → phone    pong    { t }
//     laptop → phone    buzz    { pattern }                    vibrate (goal)
//     laptop → phone    gone    { k }                          token k is no longer valid: say hello again
//
// Budget: Supabase's free plan allows ~100 messages/s per project (a send and each delivery both count).
// A phone only sends on press/release (~5-10 per second while playing) plus one ping every 2 s, and each
// of those is delivered once (to the laptop), so a full match stays around 30-45 messages/s.

export const roomTopic = (code) => `room:${code}`
export const slotTopic = (code, slot) => `room:${code}:${slot}`

export const PING_EVERY_MS = 2000
/** No message from a phone for this long during a match → it counts as disconnected (match pauses). */
export const PHONE_TIMEOUT_MS = 6000
/** The phone shows "reconnecting…" after this long without an answer from the laptop. */
export const SCREEN_TIMEOUT_MS = 6000

/** A match needs two players: both slots held by a connected phone (room = FootballRoom.publicState()). */
export const bothPlayersReady = (room) => ['p1', 'p2'].every((s) => room?.slots?.[s]?.type === 'human' && room.slots[s].connected)

/** { left: true, kick: true } ↔ bitmask (left = 1, right = 2, jump = 4, kick = 8). */
export const toMask = (held) => BUTTONS.reduce((m, b, i) => (held[b] ? m | (1 << i) : m), 0)
export const maskHas = (mask, button) => ((mask >> BUTTONS.indexOf(button)) & 1) === 1
