import { useState } from 'react'
import { normalizeRoomCode, prettyRoomCode } from '../realtime/roomCode.js'

/**
 * Full-screen message on a phone controller (joining, old code, someone else playing…), with the room code
 * and optional buttons. `onTop` puts it above the "turn your phone" hint.
 */
export function RoomStatusScreen({ title, text, code, actions = [], onTop = false, icon }) {
  return (
    <div className={`absolute inset-0 grid place-items-center bg-[#0b0f3a]/95 p-6 text-center ${onTop ? 'z-10' : ''}`} dir="rtl">
      <div className="max-w-xl">
        {icon && <p className="text-6xl">{icon}</p>}
        <p className="text-3xl font-extrabold">{title}</p>
        {text && <p className="mt-2 text-lg text-white/75">{text}</p>}
        {code && (
          <p className="mt-3 text-base text-white/50">
            رمز الغرفة:{' '}
            <bdi className="font-mono font-bold text-white/80" dir="ltr">
              {prettyRoomCode(code)}
            </bdi>
          </p>
        )}
        {actions.length > 0 && (
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            {actions.map((a) => (
              <button
                key={a.label}
                type="button"
                onClick={a.onClick}
                className={a.primary ? 'rounded-full bg-[#ff9933] px-6 py-2 text-xl font-extrabold text-[#0b0f3a]' : 'rounded-full bg-white/15 px-6 py-2 text-xl font-bold'}
              >
                {a.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

/** No room code in the address: type the one shown on the laptop (or scan its QR again). */
export function RoomCodeEntry({ title, emoji, onCode }) {
  const [text, setText] = useState('')
  const code = normalizeRoomCode(text)
  const submit = (e) => {
    e.preventDefault()
    if (code) onCode(code)
  }
  return (
    <div className="fixed inset-0 grid place-items-center overflow-auto bg-[#0b0f3a] p-6 text-center text-white" dir="rtl">
      <form onSubmit={submit} className="w-full max-w-md">
        <p className="text-6xl">{emoji}</p>
        <h1 className="mt-3 text-3xl font-extrabold">{title}</h1>
        <p className="mt-2 text-lg text-white/75">امسح الرمز الظاهر على الشاشة بكاميرا هاتفك، أو اكتب رمز الغرفة (6 أحرف):</p>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          dir="ltr"
          inputMode="text"
          autoCapitalize="characters"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          maxLength={9}
          placeholder="K7Q M2X"
          aria-label="رمز الغرفة"
          className="mt-5 w-full rounded-2xl bg-white px-4 py-3 text-center font-mono text-4xl font-extrabold tracking-[0.25em] text-[#0b0f3a] uppercase select-text placeholder:text-[#0b0f3a]/25"
        />
        <button type="submit" disabled={!code} className="mt-4 w-full rounded-2xl bg-[#ff9933] py-3 text-2xl font-extrabold text-[#0b0f3a] disabled:opacity-40">
          دخول
        </button>
      </form>
    </div>
  )
}
