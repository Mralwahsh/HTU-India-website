import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import { KEYS } from '../tour/config.js'
import { TOUR_PLACES, creditLine } from '../tour/places.js'
import { TourHost } from '../tour/net/TourHost.js'
import { MoveInterpreter } from '../tour/moveInterpreter.js'
import QrCode from '../components/football/QrCode.jsx'
import TourMap from '../components/tour/TourMap.jsx'
import RealtimeDebug from '../components/RealtimeDebug.jsx'
import { pageUrl, SCAN_HINT } from '../config/site.js'
import { prettyRoomCode } from '../realtime/roomCode.js'

/**
 * Virtual tours on the laptop: map of places → 360° tour.
 * Driven by the phone (/tour-controller?room=CODE, through Supabase Realtime) or the keyboard:
 * WASD move · arrows look · +/− zoom · I info · N next place · M back to the map.
 */
export default function TourPage() {
  const roomRef = useRef(null) // TourHost: room code + realtime channels
  const hostRef = useRef(null) // the element the 360° viewer renders into
  const providerRef = useRef(null)
  const [net, setNet] = useState({ code: null, status: 'connecting', phone: false, rtt: null })
  const phone = net.phone
  const [mode, setMode] = useState('map') // map | loading | tour
  const [selected, setSelected] = useState(0)
  const [showInfo, setShowInfo] = useState(false)
  const [toast, setToast] = useState(null)
  const [viewpoint, setViewpoint] = useState(null)
  const [providerKind, setProviderKind] = useState(null)
  const live = useRef({})
  useLayoutEffect(() => {
    live.current = { mode, selected }
  })

  const place = TOUR_PLACES[selected]
  const controllerUrl = net.code ? pageUrl(`/tour-controller?room=${net.code}`) : null

  // ------------------------------------------------------------ provider lifecycle
  const enterTour = useCallback(async (index) => {
    if (live.current.mode !== 'map') return
    setSelected(index)
    setShowInfo(false)
    setMode('loading')
    try {
      const { createTourProvider } = await import('../tour/providers/index.js')
      const provider = await createTourProvider(hostRef.current, TOUR_PLACES[index])
      providerRef.current = provider
      if (import.meta.env.DEV) window.__tour = provider // debugging aid
      setProviderKind(provider.kind)
      setViewpoint(provider.viewpointName?.() ?? null)
      setMode('tour')
    } catch (e) {
      console.error('[tour] could not start', e)
      setMode('map')
    }
  }, [])

  const exitTour = useCallback(() => {
    providerRef.current?.destroy()
    providerRef.current = null
    if (hostRef.current) hostRef.current.innerHTML = ''
    setShowInfo(false)
    setMode('map')
  }, [])

  const nextPlace = useCallback(async () => {
    const { mode: m, selected: s } = live.current
    const next = (s + 1) % TOUR_PLACES.length
    if (m === 'map') return setSelected(next)
    if (m !== 'tour' || !providerRef.current) return
    setSelected(next)
    setShowInfo(false)
    setMode('loading')
    await providerRef.current.loadPlace(TOUR_PLACES[next])
    setViewpoint(providerRef.current.viewpointName?.() ?? null)
    setMode('tour')
  }, [])

  useEffect(() => () => providerRef.current?.destroy(), [])

  // ------------------------------------------------------------ walking (move stick → actions)
  const say = useCallback((text) => {
    setToast({ text, id: Date.now() })
  }, [])
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 1400)
    return () => clearTimeout(t)
  }, [toast])

  const moveRef = useRef(null)
  if (!moveRef.current) {
    const walk = (dir) => async () => {
      const p = providerRef.current
      if (live.current.mode !== 'tour' || !p) return
      const ok = await p.step(dir)
      roomRef.current?.feedback(ok ? 'stepped' : 'no-path')
      if (ok) setViewpoint(p.viewpointName?.() ?? null)
      else say('لا يوجد طريق في هذا الاتجاه')
    }
    moveRef.current = new MoveInterpreter({
      forward: () => (live.current.mode === 'map' ? enterTour(live.current.selected) : walk('forward')()),
      left: () => (live.current.mode === 'map' ? setSelected((s) => (s - 1 + TOUR_PLACES.length) % TOUR_PLACES.length) : walk('left')()),
      right: () => (live.current.mode === 'map' ? setSelected((s) => (s + 1) % TOUR_PLACES.length) : walk('right')()),
      back: () => live.current.mode === 'tour' && providerRef.current?.turnAround(),
    })
  }
  useEffect(() => {
    const t = setInterval(() => moveRef.current.tick(), 40)
    return () => clearInterval(t)
  }, [])

  const handleStick = useCallback(({ stick, x, y }) => {
    if (stick === 'move') moveRef.current.set(x, y)
    else providerRef.current?.setLookVelocity(x, y)
  }, [])
  const handleZoom = useCallback(({ dir, pressed }) => providerRef.current?.setZoomVelocity(pressed ? (dir === 'out' ? -1 : 1) : 0), [])
  const toggleInfo = useCallback(() => setShowInfo((v) => !v), [])

  // ------------------------------------------------------------ room (Supabase Realtime)
  // the handlers are stable (useCallback with no changing deps), so the room and its code live as long as the page
  useEffect(() => {
    const actions = { info: toggleInfo, next: nextPlace, exit: exitTour }
    const room = new TourHost({ onChange: setNet, onStick: handleStick, onZoom: handleZoom, onAction: (a) => actions[a]?.() })
    roomRef.current = room
    if (import.meta.env.DEV) window.__tourHost = room // debugging aid
    return () => {
      room.destroy()
      roomRef.current = null
    }
  }, [handleStick, handleZoom, toggleInfo, nextPlace, exitTour])

  // tell the phone where we are (shown at the top of the controller)
  useEffect(() => {
    roomRef.current?.setState({ mode: mode === 'map' ? 'map' : 'tour', placeId: place.id, placeName: place.nameAr })
  }, [mode, place, phone])

  // ------------------------------------------------------------ keyboard fallback
  useEffect(() => {
    const held = new Set()
    const vec = (map) => {
      let x = 0
      let y = 0
      for (const code of held) if (map[code]) [x, y] = [x + map[code][0], y + map[code][1]]
      return [Math.max(-1, Math.min(1, x)), Math.max(-1, Math.min(1, y))]
    }
    const push = () => {
      const [mx, my] = vec(KEYS.move)
      const [lx, ly] = vec(KEYS.look)
      if (mx || my || held.has('_moveWasActive')) moveRef.current.set(mx, my)
      if (lx || ly) providerRef.current?.setLookVelocity(lx * 0.8, ly * 0.8)
    }
    const t = setInterval(push, 1000 / 30) // keep refreshing while keys are held (sticks time out otherwise)
    const onDown = (e) => {
      if (e.repeat) return
      const c = e.code
      if (KEYS.move[c] || KEYS.look[c]) {
        held.add(c)
        e.preventDefault()
        push()
      } else if (KEYS.zoomIn.includes(c)) providerRef.current?.setZoomVelocity(1)
      else if (KEYS.zoomOut.includes(c)) providerRef.current?.setZoomVelocity(-1)
      else if (KEYS.info.includes(c)) toggleInfo()
      else if (KEYS.next.includes(c)) nextPlace()
      else if (KEYS.map.includes(c) && live.current.mode === 'tour') exitTour()
    }
    const onUp = (e) => {
      const c = e.code
      if (held.delete(c)) {
        if (KEYS.move[c]) moveRef.current.set(...vec(KEYS.move))
        if (KEYS.look[c]) providerRef.current?.setLookVelocity(...vec(KEYS.look))
      }
      if (KEYS.zoomIn.includes(c) || KEYS.zoomOut.includes(c)) providerRef.current?.setZoomVelocity(0)
    }
    window.addEventListener('keydown', onDown)
    window.addEventListener('keyup', onUp)
    return () => {
      clearInterval(t)
      window.removeEventListener('keydown', onDown)
      window.removeEventListener('keyup', onUp)
    }
  }, [toggleInfo, nextPlace, exitTour])

  // ------------------------------------------------------------ render
  const inTour = mode !== 'map'
  return (
    <div className="relative h-full overflow-hidden">
      {/* 360° viewer host (kept mounted so the provider can render into it) */}
      <div ref={hostRef} className={`absolute inset-0 bg-[#0b0f3a] ${inTour ? '' : 'invisible'}`} />

      {!inTour && (
        <MapScreen
          selected={selected}
          setSelected={setSelected}
          onEnter={enterTour}
          controllerUrl={controllerUrl}
          code={net.code}
          status={net.status}
          phone={phone}
          showInfo={showInfo}
        />
      )}

      {inTour && (
        <>
          <div className="absolute start-6 top-5 flex flex-col items-start gap-3">
            <div className="pointer-events-none rounded-3xl bg-navy/80 px-6 py-3 text-white shadow-lg backdrop-blur">
              <p className="font-display text-4xl leading-tight font-extrabold">{place.nameAr}</p>
              <p className="text-xl text-white/80">
                {place.cityAr}
                {viewpoint ? ` · ${viewpoint}` : ''}
              </p>
            </div>
            {/* back to the map of places, without leaving the page (the phone stays connected) */}
            {mode === 'tour' && (
              <button
                type="button"
                onClick={exitTour}
                className="flex items-center gap-2 rounded-full bg-saffron px-5 py-2.5 text-xl font-extrabold text-navy shadow-lg transition-colors hover:bg-saffron-deep hover:text-white"
                title="الخريطة (M)"
              >
                <ArrowRight size={24} strokeWidth={2.6} />
                كل الأماكن
              </button>
            )}
          </div>
          <div className="pointer-events-none absolute end-6 top-5 flex items-center gap-2 rounded-full bg-black/45 px-4 py-2 text-lg font-bold text-white">
            <span className={`h-3 w-3 rounded-full ${phone ? 'bg-[#2ecc40]' : 'bg-white/40'}`} />
            {phone ? 'الهاتف متصل' : 'لوحة المفاتيح'}
            {providerKind === 'google' && <span className="ms-2 rounded bg-white/20 px-2 text-sm">Street View</span>}
          </div>
          <div className="pointer-events-none absolute inset-x-0 bottom-5 flex justify-center">
            <p className="rounded-full bg-black/45 px-6 py-2 text-lg font-semibold text-white">
              🚶 العصا اليسرى: مشي · 👀 العصا اليمنى: نظر · ℹ️ معلومات · ⏭️ المكان التالي · 🗺️ الخريطة
            </p>
          </div>
        </>
      )}

      <AnimatePresence>
        {mode === 'loading' && (
          <motion.div key="loading" className="absolute inset-0 grid place-items-center bg-[#0b0f3a]/70" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <p className="font-display text-4xl font-extrabold text-white">جارٍ الانتقال إلى {place.nameAr}…</p>
          </motion.div>
        )}
        {inTour && showInfo && <FactsCard key="facts" place={place} />}
        {toast && (
          <motion.div
            key={toast.id}
            className="pointer-events-none absolute inset-x-0 top-1/2 flex justify-center"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            <p className="rounded-full bg-black/60 px-6 py-3 text-2xl font-bold text-white">{toast.text}</p>
          </motion.div>
        )}
      </AnimatePresence>
      <RealtimeDebug />
    </div>
  )
}

function MapScreen({ selected, setSelected, onEnter, controllerUrl, code, status, phone, showInfo }) {
  const p = TOUR_PLACES[selected]
  const startNode = p.offline?.nodes?.find((n) => n.id === p.offline.start)
  const preview = startNode?.file
  // centre the preview on the start direction (matters for very wide strips like the Taj Mahal)
  const coverH = startNode?.fov?.h ?? 360
  const previewX = Math.min(100, Math.max(0, ((startNode?.startYaw ?? 0) / coverH + 0.5) * 100))
  return (
    <div className="mx-auto grid h-full max-w-[1800px] grid-cols-[minmax(0,1fr)_minmax(0,0.95fr)] gap-6 px-8 py-5">
      <section className="flex min-h-0 flex-col">
        <h1 className="font-display text-5xl leading-tight font-extrabold text-navy">
          جولات <span className="text-saffron-deep">افتراضية</span> 🧭
        </h1>
        <p className="text-2xl text-muted">تجوّل في أماكن من الهند بهاتفك، بزاوية 360°!</p>

        <motion.button
          key={p.id}
          onClick={() => onEnter(selected)}
          className="relative mt-4 min-h-0 flex-1 overflow-hidden rounded-[2rem] text-start shadow-lg"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {preview && (
            <div
              className="absolute inset-0 bg-cover"
              style={{ backgroundImage: `url(${import.meta.env.BASE_URL}tours/${preview})`, backgroundPosition: `${previewX}% center` }}
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-6 text-white">
            <p className="text-xl font-bold text-saffron">{p.cityAr}</p>
            <p className="font-display text-5xl leading-tight font-extrabold">{p.nameAr}</p>
            <ul className="mt-2 space-y-1 text-lg leading-snug text-white/90">
              {(showInfo ? p.facts : p.facts.slice(0, 2)).map((f) => (
                <li key={f}>• {f.replace(/\s*TODO: verify.*$/i, '')}</li>
              ))}
            </ul>
            <p className="mt-3 inline-block rounded-full bg-saffron px-5 py-1.5 text-xl font-extrabold text-navy">ادفع عصا المشي للأمام للدخول ▲</p>
          </div>
        </motion.button>

        <div className="mt-4 flex items-center gap-5 rounded-3xl bg-paper p-4 shadow-sm ring-1 ring-ink/5">
          <div className="relative shrink-0">
            {controllerUrl ? <QrCode text={controllerUrl} size={150} /> : <div className="h-[150px] w-[150px] animate-pulse rounded-2xl bg-ink/5" />}
            {status !== 'live' && (
              <div className="absolute inset-0 grid place-items-center rounded-2xl bg-paper/85 p-2 text-center">
                <p className="text-base font-bold text-navy">{status === 'reconnecting' ? 'انقطع الاتصال… جارٍ إعادة الاتصال' : 'جارٍ الاتصال…'}</p>
              </div>
            )}
          </div>
          <div className="min-w-0">
            <p className="font-display text-2xl font-extrabold text-navy">امسح للتحكم بالجولة</p>
            <p className="text-base font-bold text-ink/80">📱 {SCAN_HINT}</p>
            <p className="mt-1 text-lg">
              رمز الغرفة:{' '}
              <bdi className="font-mono text-2xl font-extrabold tracking-[0.15em] text-saffron-deep" dir="ltr">
                {prettyRoomCode(code)}
              </bdi>
            </p>
            <p className={`text-lg font-bold ${phone ? 'text-green' : 'text-muted'}`}>{phone ? '✅ الهاتف متصل' : 'بانتظار هاتف…'}</p>
            <p className="text-sm text-muted" dir="ltr">
              Keyboard: A/D choose · W enter · arrows look · +/− zoom · I info · N next · M map
            </p>
          </div>
        </div>
      </section>

      <section className="min-h-0 rounded-[2.5rem] bg-paper p-4 shadow-sm ring-1 ring-ink/5">
        <TourMap places={TOUR_PLACES} selected={selected} onSelect={(i) => (i === selected ? onEnter(i) : setSelected(i))} />
      </section>
    </div>
  )
}

function FactsCard({ place }) {
  return (
    <motion.div
      className="absolute end-6 top-28 w-[min(32rem,40vw)] rounded-[2rem] bg-paper/95 p-6 shadow-2xl backdrop-blur"
      initial={{ opacity: 0, x: -30 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -30 }}
    >
      <p className="text-lg font-bold text-saffron-deep">{place.cityAr}</p>
      <p className="font-display text-4xl leading-tight font-extrabold text-navy">{place.nameAr}</p>
      <ul className="mt-3 space-y-2 text-xl leading-relaxed">
        {place.facts.map((f) => (
          <li key={f} className="flex gap-2">
            <span className="text-saffron">●</span>
            {f.replace(/\s*TODO: verify.*$/i, '')}
          </li>
        ))}
      </ul>
      <p className="mt-4 text-xs text-muted" dir="ltr">
        {creditLine(place)}
      </p>
    </motion.div>
  )
}
