import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { ArrowLeft } from 'lucide-react'
import { getArabicWords, getLanguages } from '../services/dataService.js'
import { scriptFont } from '../config/scripts.js'
import AlphaVideo from '../components/AlphaVideo.jsx'
import FallingLeaves from '../components/FallingLeaves.jsx'

// The home page is a misty forest (public/home/forest.webp). In its bottom-left corner a boy sits on giant
// mossy HTU letters, swinging his legs and looking up at the "hello"s changing above him: a looping video
// with a see-through background (public/home/htu-boy-alpha.mp4, drawn by AlphaVideo). Leaves keep falling
// through the scene (FallingLeaves), and the top bar turns into the forest canopy on this page (TopBar).
// Laptop: one screen, everything placed on the scene. Phones: the scene is the first screen (headline,
// hello, the boy), the words and the activities follow on the dark forest floor.
//
// The other centrepiece is the line: Devanagari letters hang *from* a line drawn along their tops
// (the shirorekha), Arabic letters sit *on* their line. So the same word is shown on both sides
// of one long branch: Arabic sitting on it, Hindi hanging from it.

// Census of India 2011 / RBI. TODO: verify wording/numbers.
const STATS = { official: 22, major: 120, mother: '19,500', banknote: 17 }

// Short words so six fit across the screen
const WORD_IDS = ['kitab', 'duniya', 'waqt', 'qalam', 'khabar', 'safar']
const GREETING_ORDER = ['hindi', 'tamil', 'bengali', 'urdu', 'malayalam', 'telugu', 'punjabi', 'gujarati', 'kannada', 'odia', 'meitei', 'santali', 'ladakhi', 'marathi', 'assamese']
const GREETING_MS = 2600
const art = (file) => `${import.meta.env.BASE_URL}home/${file}`

// The video's frame (the HTU letters and the boy fill it up to ~92% of its width)
const BOY = { width: 1200, height: 696 }

const ACTIVITIES = [
  { to: '/map', title: 'الخريطة', sub: 'لغة كل ولاية، واسمك بخطّها' },
  { to: '/game', title: 'خمّن الخط', sub: 'لعبة سريعة من خمس جولات' },
  { to: '/tour', title: 'جولات 360°', sub: 'تجوّل في الهند بهاتفك' },
  { to: '/football', title: 'كرة القدم', sub: 'العب بهاتفك ضد صديقك' },
  { to: '/tiles-qr', title: 'راغا تايلز', sub: 'بيانو على هاتفك' },
]

export default function HomePage() {
  const [words, setWords] = useState([])
  const [languages, setLanguages] = useState([])

  useEffect(() => {
    getArabicWords().then((all) => setWords(WORD_IDS.map((id) => all.find((w) => w.id === id)).filter(Boolean)))
    getLanguages().then(setLanguages)
  }, [])

  const greetings = useMemo(
    () => GREETING_ORDER.map((id) => languages.find((l) => l.id === id)).filter((l) => l?.helloNative),
    [languages],
  )

  return (
    // laptop: the page is a size container, so everything on the scene is placed in units of the page
    // (cqw/cqh). --boy-h is the video's height there; the words and the activities start right of it.
    <div className="relative min-h-full lg:h-full lg:overflow-hidden lg:[container-type:size]" style={{ '--boy-h': 'min(46cqh, 23cqw)' }}>
      {/* ---------------------------------------------------------------- the scene: forest, headline, hello, the boy */}
      <div className="relative flex min-h-[calc(100svh-4rem)] flex-col overflow-hidden sm:min-h-[calc(100svh-5rem)] lg:absolute lg:inset-0 lg:block lg:min-h-0">
        <img
          src={art('forest.webp')}
          alt=""
          className="pointer-events-none absolute inset-0 h-full w-full object-cover object-[16%_100%] select-none lg:object-[0%_100%]"
          draggable={false}
        />
        <FallingLeaves layer="back" />

        <section className="relative px-5 pt-6 lg:absolute lg:top-[5.5cqh] lg:right-[4.5cqw] lg:w-[44cqw] lg:p-0">
          <h1 className="forest-glow font-display text-[2.6rem] leading-[1.12] text-leaf lg:text-[min(5cqw,9.4cqh)]">
            بلدٌ واحد،
            <br />
            وأصواتٌ كثيرة
          </h1>
          <p className="forest-glow mt-3 max-w-[46ch] text-lg leading-[1.6] font-semibold text-bark lg:mt-[1.6cqh] lg:text-[min(1.4cqw,2.6cqh)]">
            في الهند <Num>{STATS.official}</Num> لغة رسمية، وأكثر من <Num>{STATS.major}</Num> لغة رئيسية، و<Num>{STATS.mother}</Num> لغة أُمّ سجّلها
            التعداد. وأوراقها النقدية تكتب قيمتها بـ<Num>{STATS.banknote}</Num> لغة!
          </p>
          {/* laptop: the main call to action sits under the headline (phones: at the top of the forest floor) */}
          <NameCta className="hidden focus-visible:outline-bark lg:mt-[2.6cqh] lg:flex" />
        </section>

        {/* where the boy is looking */}
        <div className="relative px-5 pt-6 lg:absolute lg:top-[16cqh] lg:left-[26cqw] lg:w-[25cqw] lg:p-0 lg:[--hello-size:min(7.5cqw,13cqh)]">
          <Greeting greetings={greetings} />
        </div>

        <div className="min-h-6 flex-1 lg:hidden" />
        <AlphaVideo
          src={art('htu-boy-alpha.mp4')}
          still={art('htu-boy-still.webp')}
          width={BOY.width}
          height={BOY.height}
          className="w-full max-w-[38rem] lg:absolute lg:bottom-0 lg:left-0 lg:h-(--boy-h) lg:w-auto lg:max-w-none"
        />
        <FallingLeaves layer="front" />
      </div>

      {/* ---------------------------------------------------------------- phones: the forest floor below; laptop: on the scene */}
      <div className="relative bg-moss px-5 pt-6 pb-10 lg:static lg:bg-transparent lg:p-0">
        <div className="rounded-[1.75rem] bg-parchment px-4 pt-4 pb-3 shadow-[0_18px_40px_-18px_rgba(0,0,0,0.6)] lg:absolute lg:right-[3cqw] lg:bottom-[18cqh] lg:left-[calc(var(--boy-h)*1.724+2.5cqw)] lg:bg-parchment/78 lg:px-[1.8cqw] lg:pt-[1.6cqh] lg:pb-[1cqh] lg:ring-1 lg:ring-white/40 lg:backdrop-blur-[3px]">
          <WordLine words={words} />
        </div>

        <nav
          className="mt-4 lg:absolute lg:right-[3cqw] lg:bottom-[2.5cqh] lg:left-[calc(var(--boy-h)*1.6)] lg:mt-0 lg:h-[13cqh] lg:rounded-[1.6rem] lg:bg-moss/88 lg:shadow-[0_18px_40px_-18px_rgba(0,0,0,0.7)] lg:ring-1 lg:ring-parchment/10 lg:backdrop-blur-[3px]"
          aria-label="الأنشطة"
        >
          <div className="flex h-full flex-col gap-4 text-parchment lg:flex-row lg:items-stretch lg:gap-0 lg:px-[0.8cqw]">
            <NameCta className="focus-visible:outline-parchment lg:hidden" />
            <ul className="grid grid-cols-2 gap-2 lg:flex lg:flex-1 lg:items-stretch lg:gap-0">
              {ACTIVITIES.map((a) => (
                <li key={a.to} className="flex rounded-2xl bg-parchment/10 lg:my-[1.8cqh] lg:flex-1 lg:rounded-none lg:border-parchment/20 lg:bg-transparent lg:not-first:border-s">
                  <Link
                    to={a.to}
                    className="flex flex-1 flex-col justify-center rounded-2xl px-4 py-3 transition-colors hover:bg-parchment/10 focus-visible:bg-parchment/15 focus-visible:outline-none lg:rounded-xl lg:px-[1.2cqw] lg:py-0"
                  >
                    <span className="font-display text-xl leading-[1.25] lg:text-[min(1.8cqw,3.4cqh)]">{a.title}</span>
                    <span className="text-sm leading-snug text-parchment/75 lg:text-[min(0.95cqw,1.8cqh)]">{a.sub}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </nav>
      </div>
    </div>
  )
}

/** "Write your name": the page's main call to action. */
function NameCta({ className = '' }) {
  return (
    <Link
      to="/name"
      className={`group flex items-center justify-between gap-4 rounded-[1.4rem] bg-honey px-6 py-4 text-bark shadow-[0_8px_0_#9c6517] transition-[transform,box-shadow] hover:-translate-y-0.5 hover:shadow-[0_10px_0_#9c6517] focus-visible:outline-4 focus-visible:outline-offset-4 active:translate-y-2 active:shadow-[0_2px_0_#9c6517] lg:w-max lg:justify-start lg:gap-[1.4cqw] lg:rounded-[1.2rem] lg:px-[1.8cqw] lg:py-[1.2cqh] ${className}`}
    >
      <span>
        <span className="block font-display text-[2rem] leading-[1.15] lg:text-[min(2.3cqw,4.3cqh)]">اكتب اسمك</span>
        <span className="block text-base font-bold lg:text-[min(1cqw,1.85cqh)]">وشاهده بخمسة خطوط هندية</span>
      </span>
      <ArrowLeft className="h-9 w-9 transition-transform group-hover:-translate-x-1 lg:h-[min(2.3cqw,4.3cqh)] lg:w-[min(2.3cqw,4.3cqh)]" strokeWidth={3} />
    </Link>
  )
}

/** A number inside the stats sentence: set in the poster face, larger, in ember. */
function Num({ children }) {
  return (
    <bdi className="font-display text-[1.45em] leading-none font-normal text-ember" dir="ltr">
      {children}
    </bdi>
  )
}

/** One big "hello", changing language every few seconds. */
function Greeting({ greetings }) {
  const [i, setI] = useState(0)
  const reduce = useReducedMotion()

  useEffect(() => {
    if (greetings.length < 2) return
    const t = setInterval(() => setI((n) => (n + 1) % greetings.length), GREETING_MS)
    return () => clearInterval(t)
  }, [greetings.length])

  const g = greetings[i % Math.max(1, greetings.length)]
  if (!g) return <div className="h-32 lg:h-[min(12cqw,20cqh)]" />

  return (
    <div className="relative flex h-full min-w-0 flex-col items-center justify-center text-center" aria-live="polite" data-fit>
      <div className="relative grid h-32 w-full place-items-center lg:h-[min(12cqw,20cqh)]">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={g.id}
            className="col-start-1 row-start-1 flex w-full justify-center"
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: '18%' }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: '-18%' }}
            transition={{ duration: 0.45, ease: [0.2, 0.8, 0.2, 1] }}
          >
            <FitText className={`${scriptFont(g.script)} forest-glow text-ember`} lang={g.id}>
              {g.helloNative}
            </FitText>
          </motion.span>
        </AnimatePresence>
      </div>
      <AnimatePresence mode="wait" initial={false}>
        <motion.p
          key={g.id}
          className="forest-glow text-base font-semibold text-bark lg:text-[min(1.3cqw,2.4cqh)]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
        >
          «{g.helloPronunciationAr}» تعني مرحبًا {g.nameAr.startsWith('ال') ? `ب${g.nameAr}` : `بلغة ${g.nameAr}`}
        </motion.p>
      </AnimatePresence>
    </div>
  )
}

/** Text as big as --hello-size while still fitting the width of its parent. */
function FitText({ children, className, lang }) {
  const ref = useRef(null)
  const scaleRef = useRef(1)
  const [scale, setScale] = useState(1)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const fit = () => {
      // width at full size = current width / current scale
      const natural = el.scrollWidth / scaleRef.current
      const room = el.closest('[data-fit]').clientWidth * 0.94
      scaleRef.current = Math.min(1, room / Math.max(1, natural))
      setScale(scaleRef.current)
    }
    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(el.closest('[data-fit]'))
    document.fonts?.ready.then(fit)
    return () => ro.disconnect()
  }, [children])
  return (
    <span ref={ref} className={`${className} whitespace-nowrap`} style={{ fontSize: `calc(var(--hello-size) * ${scale})`, lineHeight: 1.5 }} lang={lang}>
      {children}
    </span>
  )
}

/**
 * The branch across the page. Each Arabic word sits on it, the same Hindi word hangs from it.
 * Hover or tap a word to see it in Urdu too (Urdu = Hindi's spoken twin, written in Arabic letters).
 */
function WordLine({ words }) {
  const [open, setOpen] = useState(null)
  const reduce = useReducedMotion()

  return (
    <section className="relative flex w-full flex-col justify-center" aria-label="كلمات هندية تعرفها">
      <div className="grid grid-cols-6 items-stretch lg:grid-cols-[minmax(0,2.2fr)_repeat(6,minmax(0,1fr))]">
        {/* heading: it is Arabic too, so it sits on the line like the words */}
        <div className="col-span-6 flex flex-col justify-end pb-3 lg:col-span-1 lg:pb-[0.9cqh]">
          <h2 className="font-display text-[1.7rem] leading-[1.2] text-leaf lg:text-[min(1.9cqw,3.6cqh)]">
            أنت تعرف هذه
            <br />
            الكلمات الهندية!
          </h2>
        </div>
        {words.map((w, i) => (
          <motion.button
            key={w.id}
            type="button"
            onMouseEnter={() => setOpen(w.id)}
            onMouseLeave={() => setOpen((o) => (o === w.id ? null : o))}
            onFocus={() => setOpen(w.id)}
            onBlur={() => setOpen((o) => (o === w.id ? null : o))}
            onClick={() => setOpen((o) => (o === w.id ? null : w.id))}
            className="flex cursor-pointer flex-col items-center justify-end rounded-t-2xl pt-[1vh] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ember"
            initial={reduce ? false : { opacity: 0, y: -24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 + i * 0.07, type: 'spring', stiffness: 260, damping: 22 }}
            aria-label={`${w.arabic} = ${w.hindi}`}
          >
            <span className="font-arab text-[1.1rem] leading-[1.45] font-bold text-leaf lg:text-[min(2.1cqw,3.9cqh)]" style={{ marginBottom: SIT }}>
              {w.arabic}
            </span>
          </motion.button>
        ))}
      </div>

      {/* the line */}
      <motion.div
        className="h-1 origin-right rounded-full bg-bark lg:h-[min(0.5cqw,0.95cqh)]"
        initial={reduce ? false : { scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 0.7, ease: [0.6, 0, 0.2, 1] }}
      />

      <div className="grid grid-cols-6 lg:grid-cols-[minmax(0,2.2fr)_repeat(6,minmax(0,1fr))]">
        <p className="order-last col-span-6 pt-3 text-base leading-[1.6] text-bark/80 lg:order-none lg:col-span-1 lg:pt-[1.2cqh] lg:pe-[1cqw] lg:text-[min(0.9cqw,1.7cqh)]">
          حروف الهندية تتدلّى من خطٍّ فوقها، وحروف العربية تجلس على السطر. والكلمة نفسها!
          <span className="mt-[0.5vh] block font-bold text-ember">المس كلمة لتراها بالأردية.</span>
        </p>
        {words.map((w, i) => (
          <motion.div
            key={w.id}
            className="flex flex-col items-center"
            initial={reduce ? false : { opacity: 0, y: -18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.55 + i * 0.07, type: 'spring', stiffness: 260, damping: 22 }}
          >
            {/* pulled up so the Devanagari headline bar merges into the line */}
            <span className="font-deva text-[1.05rem] leading-none font-bold text-bark lg:text-[min(2.1cqw,3.9cqh)]" style={{ marginTop: HANG }} lang="hi">
              {w.hindi}
            </span>
            <span
              className={`mt-[0.2vh] text-center transition-opacity duration-200 ${open === w.id ? 'opacity-100' : 'opacity-0'}`}
              aria-hidden={open !== w.id}
            >
              <span className="block text-[0.7rem] font-bold text-ember lg:text-[min(0.8cqw,1.5cqh)]">بالأردية</span>
              <span className="font-urdu block text-base leading-[1.9] text-bark lg:text-[min(1.7cqw,3.1cqh)]" lang="ur">
                {w.urdu}
              </span>
            </span>
          </motion.div>
        ))}
      </div>
    </section>
  )
}

// Measured against the fonts' metrics so the letters meet the bar exactly:
// HANG pulls the Hindi word up until its headline stroke starts at the top edge of the bar,
// SIT pulls the Arabic word down until its baseline is a hair above the bar (tails may cross it, as on ruled paper).
const HANG = '-0.27em'
const SIT = '-0.39em'
