import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { CHARACTER_IDS, DEFAULT_PICKS } from '../../shared/protocol.js'
import { FootballClient } from '../game/net/FootballClient.js'
import { CHARACTERS, SLOT_COLOR, SLOT_LABEL_AR } from '../game/football/characters/index.js'
import { headDataUrl } from '../game/football/characters/art.js'
import RealtimeDebug from '../components/RealtimeDebug.jsx'
import { RoomCodeEntry, RoomStatusScreen } from '../components/RoomScreens.jsx'
import { roomCodeFromUrl } from '../realtime/roomCode.js'

// A saved id so a phone that drops (screen lock, signal hiccup, reload) gets its slot back.
// Not crypto.randomUUID(): that only exists on HTTPS pages, and local testing over the LAN is plain HTTP.
function clientId() {
  const KEY = 'india-football:client-id'
  try {
    let id = localStorage.getItem(KEY)
    if (!id) {
      id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
      localStorage.setItem(KEY, id)
    }
    return id
  } catch {
    return `tmp-${Math.random().toString(36).slice(2, 10)}`
  }
}

const PHASE_TEXT = {
  lobby: 'اختر لاعبك ثم اضغط «ركل»',
  playing: 'العب!',
  paused: 'المباراة متوقفة',
  result: 'اضغط «ركل» للعب مجددًا',
}

/**
 * Phone controller: /controller?room=K7QM2X (the QR on the laptop). Landscape, multitouch, no
 * zoom/scroll/selection. Without a room code in the address the visitor can type the code shown on the laptop.
 */
export default function ControllerPage() {
  const [code, setCode] = useState(roomCodeFromUrl)
  // a new code (typed, or the laptop moved on) remounts the controller with fresh state
  return code ? <Controller key={code} code={code} onNewCode={setCode} /> : <RoomCodeEntry title="يد التحكم: كرة الرؤوس الكبيرة" emoji="⚽📱" onCode={setCode} />
}

function Controller({ code, onNewCode }) {
  const clientRef = useRef(null)
  const [net, setNet] = useState({ status: 'connecting', slot: null, room: null, rtt: null })
  const { status, slot, room, rtt: ping } = net
  const phase = room?.phase ?? 'lobby'
  const score = room?.score ?? { p1: 0, p2: 0 }
  const [flash, setFlash] = useState(0)
  const [held, setHeld] = useState({})
  const heldRef = useRef({})
  const debugTap = useRef(null)

  // ---------------------------------------------------------- button state → laptop
  const setButton = useCallback((button, pressed) => {
    if (!!heldRef.current[button] === pressed) return
    heldRef.current = { ...heldRef.current, [button]: pressed }
    setHeld(heldRef.current)
    clientRef.current?.press(button, pressed)
  }, [])

  const releaseAll = useCallback(() => {
    Object.keys(heldRef.current).forEach((b) => heldRef.current[b] && setButton(b, false))
  }, [setButton])

  // ---------------------------------------------------------- room (Supabase Realtime)
  useEffect(() => {
    const client = new FootballClient({
      code,
      clientId: clientId(),
      onChange: setNet,
      onBuzz: (pattern) => {
        setFlash((n) => n + 1)
        try {
          navigator.vibrate?.(pattern)
        } catch {
          /* not supported (iPhone) */
        }
      },
    })
    clientRef.current = client
    return () => {
      client.destroy()
      clientRef.current = null
    }
  }, [code])

  // keep the address in sync, so a reload rejoins the same room
  useEffect(() => {
    const url = new URL(window.location.href)
    if (url.searchParams.get('room') !== code) {
      url.searchParams.set('room', code)
      window.history.replaceState(null, '', url)
    }
  }, [code])

  // release everything if the app is backgrounded (otherwise a button could stay "stuck")
  useEffect(() => {
    const onHide = () => document.visibilityState === 'hidden' && releaseAll()
    document.addEventListener('visibilitychange', onHide)
    window.addEventListener('blur', releaseAll)
    return () => {
      document.removeEventListener('visibilitychange', onHide)
      window.removeEventListener('blur', releaseAll)
    }
  }, [releaseAll])

  // block pinch-zoom, double-tap zoom, scrolling and the long-press menu (iOS + Android)
  useEffect(() => {
    const stop = (e) => e.preventDefault()
    document.addEventListener('touchmove', stop, { passive: false })
    document.addEventListener('gesturestart', stop)
    document.addEventListener('dblclick', stop)
    document.addEventListener('contextmenu', stop)
    document.body.classList.add('controller-mode')
    return () => {
      document.removeEventListener('touchmove', stop)
      document.removeEventListener('gesturestart', stop)
      document.removeEventListener('dblclick', stop)
      document.removeEventListener('contextmenu', stop)
      document.body.classList.remove('controller-mode')
    }
  }, [])

  // ---------------------------------------------------------- character select (lobby / result)
  const myPick = room?.slots?.[slot]?.character ?? DEFAULT_PICKS[slot ?? 'p1']
  const otherSlot = slot === 'p2' ? 'p1' : 'p2'
  const otherPick = room?.slots?.[otherSlot]?.type === 'human' ? room.slots[otherSlot].character : null
  const canPick = phase === 'lobby' || phase === 'result'
  const cyclePick = useCallback(
    (dir) => {
      if (!canPick) return
      let i = CHARACTER_IDS.indexOf(myPick)
      do i = (i + dir + CHARACTER_IDS.length) % CHARACTER_IDS.length
      while (CHARACTER_IDS[i] === otherPick)
      clientRef.current?.pick(CHARACTER_IDS[i])
      // show it immediately; the laptop's next room state confirms it (or snaps back)
      setNet((n) => (n.room && slot ? { ...n, room: { ...n.room, slots: { ...n.room.slots, [slot]: { ...n.room.slots[slot], character: CHARACTER_IDS[i] } } } } : n))
    },
    [canPick, myPick, otherPick, slot],
  )

  // ◀ ▶ also change the character while in the lobby
  const onButton = useCallback(
    (button, pressed) => {
      setButton(button, pressed)
      if (pressed && (button === 'left' || button === 'right') && canPick) cyclePick(button === 'right' ? 1 : -1)
    },
    [setButton, canPick, cyclePick],
  )

  const color = SLOT_COLOR[slot] ?? '#ff9933'
  const character = CHARACTERS[myPick]

  return (
    <div
      dir="ltr"
      className="fixed inset-0 flex touch-none flex-col overflow-hidden bg-[#0b0f3a] text-white select-none"
      style={{ WebkitTouchCallout: 'none', WebkitUserSelect: 'none' }}
    >
      <div className="tricolor-band h-1.5 shrink-0" />

      {/* top bar */}
      <header
        className="flex shrink-0 items-center justify-between gap-3 py-1.5"
        dir="rtl"
        style={{ paddingLeft: 'max(1rem, env(safe-area-inset-left))', paddingRight: 'max(1rem, env(safe-area-inset-right))' }}
      >
        <div className="flex items-center gap-2">
          <span className="rounded-full px-3 py-0.5 text-base font-extrabold text-[#0b0f3a]" style={{ backgroundColor: color }}>
            {slot ? SLOT_LABEL_AR[slot] : '…'}
          </span>
          {character && <img src={headDataUrl(character)} alt="" className={`h-9 w-9 ${slot === 'p2' ? '-scale-x-100' : ''}`} />}
          {character && <span className="text-lg font-bold">{character.nameAr}</span>}
        </div>
        <span className="font-display text-2xl font-extrabold" dir="ltr">
          {score.p1} - {score.p2}
        </span>
        <div className="flex items-center gap-2 text-sm">
          {/* tap three times: developer overlay (messages per second, round trip) */}
          <button type="button" onClick={() => debugTap.current?.()} className="flex items-center gap-2">
            <span className={`h-3 w-3 rounded-full ${status === 'connected' ? 'bg-[#2ecc40]' : 'animate-pulse bg-[#ffb000]'}`} />
            <span className="text-white/70">{status === 'connected' ? `${ping ?? '–'} ms` : 'إعادة الاتصال…'}</span>
          </button>
          <FullscreenButton />
        </div>
      </header>

      {/* pad */}
      <main
        className="relative grid min-h-0 flex-1 grid-cols-[1fr_auto_1fr] items-center gap-3 pb-[3vh]"
        style={{ paddingLeft: 'max(3vw, env(safe-area-inset-left))', paddingRight: 'max(3vw, env(safe-area-inset-right))' }}
      >
        <div className="flex gap-[2.5vw]">
          <PadButton button="left" label="◀" color="#3b4bc4" pressed={!!held.left} onChange={onButton} />
          <PadButton button="right" label="▶" color="#3b4bc4" pressed={!!held.right} onChange={onButton} />
        </div>

        {/* centre: character select in the lobby, otherwise the phase text */}
        <div className="flex w-[30vw] flex-col items-center justify-center text-center" dir="rtl">
          {canPick && slot ? (
            <CharacterPicker character={character} onCycle={cyclePick} />
          ) : (
            <p className="text-[4vh] font-bold text-white/80">{PHASE_TEXT[phase]}</p>
          )}
          {canPick && <p className="mt-1 text-[3vh] font-bold text-white/70">{PHASE_TEXT[phase]}</p>}
        </div>

        <div className="flex items-end justify-end gap-[2.5vw]">
          <PadButton button="jump" label="قفز" icon="⤒" color="#138808" pressed={!!held.jump} onChange={onButton} />
          <PadButton button="kick" label="ركل" icon="⚽" color="#ff9933" big pressed={!!held.kick} onChange={onButton} />
        </div>
      </main>

      {/* goal flash */}
      {flash > 0 && <div key={flash} className="pointer-events-none absolute inset-0 animate-[hitflash_400ms_ease-out_forwards] bg-[#ffd23f]" />}

      {/* status screens */}
      {status !== 'connected' && status !== 'reconnecting' && (
        <StatusScreen
          status={status}
          code={code}
          onRejoin={() => clientRef.current?.rejoin()}
          onTypeCode={() => onNewCode(null)}
        />
      )}

      <RealtimeDebug toggleRef={debugTap} />

      {/* portrait → ask to rotate */}
      <div className="rotate-hint absolute inset-0 bg-[#0b0f3a] p-8 text-center" dir="rtl">
        <div>
          <p className="text-7xl">📱↻</p>
          <p className="mt-4 text-3xl font-extrabold">أدر هاتفك بالعرض</p>
          <p className="mt-2 text-lg text-white/70">Turn your phone sideways</p>
        </div>
      </div>
    </div>
  )
}

const STATUS_TEXT = {
  connecting: ['جارٍ الاتصال…', ''],
  full: ['اللعبة ممتلئة الآن', 'ستدخل تلقائيًا عندما يصبح هناك مكان (بعد انتهاء المباراة).'],
  'no-screen': ['لا تجد الشاشة هذه الغرفة', 'ربما تغيّر الرمز. امسح الرمز الظاهر على الشاشة الآن، أو اكتب رمز الغرفة.'],
  closed: ['انتهت هذه الجولة', 'الشاشة تعرض رمزًا جديدًا. امسحه لتلعب مرة أخرى.'],
  replaced: ['أخذ هاتف آخر مكانك', 'انقطع اتصالك فدخل لاعب آخر. يمكنك المحاولة مجددًا.'],
}

/** Full-screen messages (joining, full, old code, replaced). */
function StatusScreen({ status, code, onRejoin, onTypeCode }) {
  const [title, text] = STATUS_TEXT[status] ?? STATUS_TEXT.connecting
  const actions = []
  if (status === 'replaced') actions.push({ label: 'حاول مجددًا', onClick: onRejoin, primary: true })
  if (status === 'no-screen' || status === 'closed') actions.push({ label: 'اكتب رمز الغرفة', onClick: onTypeCode })
  // above the "turn your phone" hint, except while simply connecting
  return <RoomStatusScreen title={title} text={text} code={code} actions={actions} onTop={status !== 'connecting'} />
}

/** Character carousel: tap the arrows or swipe. */
function CharacterPicker({ character, onCycle }) {
  const start = useRef(null)
  return (
    <div
      className="flex touch-none items-center gap-2"
      onPointerDown={(e) => (start.current = e.clientX)}
      onPointerUp={(e) => {
        if (start.current == null) return
        const dx = e.clientX - start.current
        start.current = null
        if (Math.abs(dx) > 30) onCycle(dx < 0 ? 1 : -1)
      }}
    >
      <button type="button" onClick={() => onCycle(-1)} className="grid h-[9vh] w-[9vh] place-items-center rounded-full bg-white/10 text-[4vh]">
        ‹
      </button>
      <AnimatePresence mode="popLayout">
        <motion.div
          key={character.id}
          className="flex flex-col items-center"
          initial={{ opacity: 0, scale: 0.6, rotate: -15 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          exit={{ opacity: 0, scale: 0.6 }}
          transition={{ type: 'spring', stiffness: 320, damping: 18 }}
        >
          <img src={headDataUrl(character)} alt="" className="h-[30vh] w-[30vh]" draggable={false} />
          <span className="text-[4.2vh] leading-tight font-extrabold">{character.nameAr}</span>
          <span className="text-[2.8vh] text-white/70">{character.regionAr}</span>
        </motion.div>
      </AnimatePresence>
      <button type="button" onClick={() => onCycle(1)} className="grid h-[9vh] w-[9vh] place-items-center rounded-full bg-white/10 text-[4vh]">
        ›
      </button>
    </div>
  )
}

// Keep receiving a finger's events even if it slides off the button (ignore if the browser refuses)
function capture(e) {
  try {
    e.currentTarget.setPointerCapture(e.pointerId)
  } catch {
    /* pointer already gone */
  }
}

/** One big button; each finger is tracked separately (multitouch: hold ▶ + JUMP + KICK). */
function PadButton({ button, label, icon, color, big, pressed, onChange }) {
  const ids = useRef(new Set())
  const down = (e) => {
    capture(e)
    ids.current.add(e.pointerId)
    onChange(button, true)
  }
  const up = (e) => {
    ids.current.delete(e.pointerId)
    if (ids.current.size === 0) onChange(button, false)
  }
  const size = big ? 'h-[min(40vh,22vw)] w-[min(40vh,22vw)]' : 'h-[min(32vh,17vw)] w-[min(32vh,17vw)]'
  return (
    <button
      type="button"
      className={`${size} grid touch-none place-items-center rounded-full font-extrabold shadow-lg transition-transform duration-75 select-none`}
      style={{
        backgroundColor: color,
        transform: pressed ? 'scale(0.9)' : 'scale(1)',
        boxShadow: pressed ? `0 0 0 6px #ffffff` : `0 7px 0 rgba(0,0,0,0.35)`,
      }}
      onPointerDown={down}
      onPointerUp={up}
      onPointerCancel={up}
      onLostPointerCapture={up}
    >
      <span className="flex flex-col items-center leading-none">
        {icon && <span className="text-[6vh]">{icon}</span>}
        <span className={icon ? 'mt-1 text-[4.5vh]' : 'text-[9vh]'}>{label}</span>
      </span>
    </button>
  )
}

/** Android Chrome can go fullscreen + lock landscape; iPhone Safari can't, so the button hides there. */
function FullscreenButton() {
  if (!document.fullscreenEnabled) return null
  const go = async () => {
    try {
      if (!document.fullscreenElement) await document.documentElement.requestFullscreen()
      await screen.orientation?.lock?.('landscape')
    } catch {
      /* not allowed — ignore */
    }
  }
  return (
    <button type="button" onClick={go} className="ms-1 rounded-lg bg-white/10 px-2 py-1 text-base">
      ⛶
    </button>
  )
}
