// Six-character room codes (e.g. "K7QM2X"): shown on the laptop and inside the QR link, so a phone joins
// the right screen. Letters and digits that look alike (0/O, 1/I/L) are left out so the code is easy to type.
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
export const CODE_LENGTH = 6

export function newRoomCode() {
  const bytes = crypto.getRandomValues(new Uint8Array(CODE_LENGTH))
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join('')
}

/** Cleans what a visitor typed ("k7q m2x" → "K7QM2X"); null when it can't be a code. */
export function normalizeRoomCode(text) {
  const code = String(text ?? '')
    .toUpperCase()
    .replace(/[\s-]/g, '')
  return code.length === CODE_LENGTH && [...code].every((c) => ALPHABET.includes(c)) ? code : null
}

/** The room code in the page address (?room=K7QM2X), or null. */
export const roomCodeFromUrl = () => normalizeRoomCode(new URLSearchParams(window.location.search).get('room'))

/** Display form: "K7Q M2X". */
export const prettyRoomCode = (code) => (code ? `${code.slice(0, 3)} ${code.slice(3)}` : '')
