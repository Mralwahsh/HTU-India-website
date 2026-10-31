// Virtual tours over Supabase Realtime. Like the football room, the laptop page is the authority: it
// decides which phone holds the controls ("the seat"); only one phone controls the tour at a time and
// the others wait. Phones send stick values; the laptop smooths them and drives the 360° view.
//
// Channels for a room code (src/realtime/roomCode.js):
//   room:<code>         laptop + every phone that scanned the code
//     phone → laptop    hello  { id }                      "I'd like the controls" (id = the phone's saved id)
//     laptop → all      seat   { id, k }                   who controls now (id null = free); k = token for that phone
//     laptop → all      state  { mode, placeId, placeName } map or tour, and where
//     laptop → all      closed {}                          this code is finished (new visitor: new code on the screen)
//   room:<code>:ctl     laptop + the controlling phone only (waiting phones never receive the stick traffic)
//     phone → laptop    in     { k, s, m, l, z }           m / l = [x, y] of the move / look stick (-1..1),
//                                                          z = zoom -1 / 0 / 1, s = sequence number
//     phone → laptop    act    { k, a }                    a = 'info' | 'next' | 'exit'
//     phone → laptop    ping   { k, t, r }                 every 2 s: t = phone clock, r = last round trip (ms)
//     laptop → phone    pong   { t }
//     laptop → phone    fb     { t }                       'stepped' | 'no-path' (the phone vibrates)
//     laptop → phone    gone   { k }                       token k is no longer valid: say hello again
//
// Budget: both sticks travel in ONE message, sent only when a value changes and at most STICKS.sendHz
// (10) times a second, plus a keep-alive every second while a stick is held still. The laptop refreshes
// the tour ~30×/s from the last values, smoothing between them. Worst case ≈ 20-25 Supabase messages/s.

export const roomTopic = (code) => `room:${code}`
export const ctlTopic = (code) => `room:${code}:ctl`

export const ACTIONS = ['info', 'next', 'exit']

export const PING_EVERY_MS = 2000
/** No message from the controlling phone for this long → it counts as disconnected. */
export const PHONE_TIMEOUT_MS = 6000
/** The phone shows "reconnecting…" after this long without an answer from the laptop. */
export const SCREEN_TIMEOUT_MS = 6000
/** A phone that dropped keeps the controls this long, so it can come back before another phone takes over. */
export const RECLAIM_MS = 15000
