import { useCallback, useEffect, useRef, useState } from 'react'
import { Info, Map as MapIcon, SkipForward, ZoomIn, ZoomOut } from 'lucide-react'
import { TourClient } from '../tour/net/TourClient.js'
import VirtualStick from '../components/tour/VirtualStick.jsx'
import RealtimeDebug from '../components/RealtimeDebug.jsx'
import { RoomCodeEntry, RoomStatusScreen } from '../components/RoomScreens.jsx'
import { roomCodeFromUrl } from '../realtime/roomCode.js'

// Separate id from the football controller, so the two never mix.
function clientId() {
  const KEY = 'india-tour:client-id'
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

const vibrate = (pattern) => {
  try {
    navigator.vibrate?.(pattern)
  } catch {
    /* not supported (iPhone) */
  }
}

/**
 * Phone controller for virtual tours: /tour-controller?room=K7QM2X (the QR on the tour screen).
 * Two sticks + buttons, landscape. Without a room code in the address the visitor can type it.
 */
export default function TourControllerPage() {
  const [code, setCode] = useState(roomCodeFromUrl)
  // a new code (typed, or the laptop moved on) remounts the controller with fresh state
  return code ? <TourController key={code} code={code} onNewCode={setCode} /> : <RoomCodeEntry title="يد التحكم: الجولات الافتراضية" emoji="🧭📱" onCode={setCode} />
}

function TourController({ code, onNewCode }) {
  const clientRef = useRef(null)
  const [net, setNet] = useState({ status: 'connecting', controlling: false, tour: { mode: 'map', placeName: null }, rtt: null })
  const { status, controlling, tour, rtt: ping } = net
  const debugTap = useRef(null)

  // ---------------------------------------------------------- room (Supabase Realtime)
  useEffect(() => {
    const client = new TourClient({
      code,
      clientId: clientId(),
      onChange: setNet,
      onFeedback: (type) => vibrate(type === 'stepped' ? 35 : [45, 70, 45]),
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

  // ---------------------------------------------------------- sticks and buttons → laptop (TourClient limits the rate)
  const stickMove = (stick) => (x, y) => clientRef.current?.setStick(stick, x, y)
  const stickRelease = (stick) => () => clientRef.current?.setStick(stick, 0, 0)
  const releaseAll = useCallback(() => clientRef.current?.releaseAll(), [])
  const act = (a) => () => clientRef.current?.action(a)
  const zoom = (dir) => (pressed) => clientRef.current?.setZoom(pressed ? dir : 0)

  // background / lock screen: release everything
  useEffect(() => {
    const onHide = () => document.visibilityState === 'hidden' && releaseAll()
    document.addEventListener('visibilitychange', onHide)
    window.addEventListener('blur', releaseAll)
    return () => {
      document.removeEventListener('visibilitychange', onHide)
      window.removeEventListener('blur', releaseAll)
    }
  }, [releaseAll])

  // no zoom / scroll / selection / long-press menus
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

  const onMap = tour.mode !== 'tour'

  return (
    <div dir="ltr" className="fixed inset-0 flex touch-none flex-col overflow-hidden bg-[#0b0f3a] text-white select-none" style={{ WebkitTouchCallout: 'none' }}>
      <div className="tricolor-band h-1.5 shrink-0" />
      <header
        className="flex shrink-0 items-center justify-between gap-3 py-1.5"
        dir="rtl"
        style={{ paddingLeft: 'max(1rem, env(safe-area-inset-left))', paddingRight: 'max(1rem, env(safe-area-inset-right))' }}
      >
        <span className="rounded-full bg-saffron px-3 py-0.5 text-base font-extrabold text-[#0b0f3a]">🧭 جولة</span>
        <span className="truncate font-display text-[4.2vh] font-extrabold">{onMap ? 'اختر مكانًا على الخريطة' : tour.placeName}</span>
        {/* tap three times: developer overlay (messages per second, round trip) */}
        <button type="button" onClick={() => debugTap.current?.()} className="flex items-center gap-2 text-sm">
          <span className={`h-3 w-3 rounded-full ${status === 'connected' ? 'bg-[#2ecc40]' : 'animate-pulse bg-[#ffb000]'}`} />
          <span className="text-white/70">{status === 'connected' ? `${ping ?? '–'} ms` : 'إعادة الاتصال…'}</span>
        </button>
      </header>

      <main
        className="relative grid min-h-0 flex-1 grid-cols-[auto_1fr_auto] items-end gap-3 pb-[4vh]"
        style={{ paddingLeft: 'max(4vw, env(safe-area-inset-left))', paddingRight: 'max(4vw, env(safe-area-inset-right))' }}
      >
        <VirtualStick color="#ff9933" label={onMap ? 'اختر / ادخل' : 'مشي'} icon="🚶" onMove={stickMove('move')} onRelease={stickRelease('move')} />

        <div className="flex flex-col items-center justify-end gap-[3vh] pb-[6vh]">
          <div className="flex gap-[2.5vw]">
            <RoundButton label="معلومات" color="#000080" onTap={act('info')}>
              <Info size="5.5vh" />
            </RoundButton>
            <RoundButton label="المكان التالي" color="#138808" onTap={act('next')}>
              <SkipForward size="5.5vh" />
            </RoundButton>
            <RoundButton label="الخريطة" color="#e5560c" onTap={act('exit')}>
              <MapIcon size="5.5vh" />
            </RoundButton>
          </div>
          <div className="flex gap-[2.5vw]">
            <RoundButton label="تصغير" color="#3b4bc4" small onHold={zoom(-1)}>
              <ZoomOut size="4.5vh" />
            </RoundButton>
            <RoundButton label="تكبير" color="#3b4bc4" small onHold={zoom(1)}>
              <ZoomIn size="4.5vh" />
            </RoundButton>
          </div>
        </div>

        <VirtualStick color="#38bdf8" label="نظر" icon="👀" onMove={stickMove('look')} onRelease={stickRelease('look')} />
      </main>

      {/* someone else has the controls */}
      {status === 'connected' && !controlling && (
        <RoomStatusScreen icon="⏳" title="شخص آخر يتحكم بالجولة" text="انتظر دورك، ستنتقل إليك تلقائيًا" code={code} />
      )}
      {status === 'connecting' && <RoomStatusScreen title="جارٍ الاتصال…" code={code} />}
      {status === 'no-screen' && (
        <RoomStatusScreen
          title="لا تجد الشاشة هذه الغرفة"
          text="ربما تغيّر الرمز. امسح الرمز الظاهر على شاشة الجولات الآن، أو اكتب رمز الغرفة."
          code={code}
          actions={[{ label: 'اكتب رمز الغرفة', onClick: () => onNewCode(null) }]}
          onTop
        />
      )}
      {status === 'closed' && (
        <RoomStatusScreen
          title="انتهت هذه الجولة"
          text="الشاشة تعرض رمزًا جديدًا. امسحه لتتحكم بالجولة."
          code={code}
          actions={[{ label: 'اكتب رمز الغرفة', onClick: () => onNewCode(null) }]}
          onTop
        />
      )}

      <RealtimeDebug toggleRef={debugTap} />

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

/** Big round button. onTap = single press; onHold(pressed) = press + release (hold to repeat on the laptop). */
function RoundButton({ children, label, color, small, onTap, onHold }) {
  const ids = useRef(new Set())
  const [pressed, setPressed] = useState(false)
  const down = (e) => {
    try {
      e.currentTarget.setPointerCapture(e.pointerId)
    } catch {
      /* ignore */
    }
    if (ids.current.size === 0) {
      setPressed(true)
      onTap?.()
      onHold?.(true)
    }
    ids.current.add(e.pointerId)
  }
  const up = (e) => {
    if (!ids.current.delete(e.pointerId) || ids.current.size > 0) return
    setPressed(false)
    onHold?.(false)
  }
  const size = small ? 'h-[min(15vh,9vw)] w-[min(15vh,9vw)]' : 'h-[min(19vh,11vw)] w-[min(19vh,11vw)]'
  return (
    <div className="flex flex-col items-center gap-1">
      <button
        type="button"
        className={`${size} grid touch-none place-items-center rounded-full shadow-lg transition-transform duration-75`}
        style={{ backgroundColor: color, transform: pressed ? 'scale(0.9)' : 'scale(1)', boxShadow: pressed ? '0 0 0 5px #fff' : '0 6px 0 rgba(0,0,0,0.35)' }}
        onPointerDown={down}
        onPointerUp={up}
        onPointerCancel={up}
        onLostPointerCapture={up}
      >
        {children}
      </button>
      <span className="text-[2.6vh] font-bold text-white/75" dir="rtl">
        {label}
      </span>
    </div>
  )
}
