import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Maximize, Menu, Minimize, RotateCcw, X } from 'lucide-react'
import { useVisitor } from '../context/VisitorContext.jsx'
import { useFullscreen } from '../hooks/useFullscreen.js'
import Chakra from './Chakra.jsx'

const NAV = [
  { to: '/', label: 'الرئيسية' },
  { to: '/map', label: 'الخريطة' },
  { to: '/name', label: 'اسمك' },
  { to: '/game', label: 'اللعبة' },
  { to: '/tour', label: 'جولات' },
  { to: '/football', label: 'كرة القدم' },
  { to: '/chess', label: 'شطرنج' },
  { to: '/tiles-qr', label: 'بيانو' }, // Raga Tiles: the laptop shows a QR code, a phone gets a "play here" button
]

// Two looks: the flag's colours on every page, and on the home page (a misty forest) the forest canopy:
// dark moss, with leaves hanging from its lower edge.
const LOOK = {
  flag: {
    header: 'bg-paper/85 shadow-[0_1px_0_rgba(16,18,58,0.06)]',
    rings: 'bg-paper shadow-[0_0_0_3px_#ff9933,0_0_0_6px_#fff,0_0_0_9px_#138808]',
    chakra: '#000080',
    title: 'text-navy',
    subtitle: 'text-green',
    soft: 'bg-ink/5', // the pill row, the menu button, the fullscreen button
    navText: 'text-ink/70 hover:text-ink',
    pill: 'bg-navy',
    pillText: 'text-white',
    menuButton: 'text-navy',
    iconButton: 'text-ink hover:bg-ink/10',
    visitor: 'bg-saffron-soft text-ink',
    reset: 'bg-accent text-white',
    menu: 'bg-paper',
    menuItem: 'bg-ink/5 text-ink active:bg-ink/10',
    menuActive: 'bg-navy text-white',
  },
  forest: {
    header: 'bg-moss shadow-[0_10px_24px_-14px_rgba(0,0,0,0.75)]',
    rings: 'bg-parchment shadow-[0_0_0_3px_#e9a23b,0_0_0_6px_#f7e9c4,0_0_0_9px_#6b8a2a]',
    chakra: '#3d2b12',
    title: 'text-parchment',
    subtitle: 'text-honey',
    soft: 'bg-parchment/10',
    navText: 'text-parchment/75 hover:text-parchment',
    pill: 'bg-honey',
    pillText: 'text-bark',
    menuButton: 'text-parchment',
    iconButton: 'text-parchment hover:bg-parchment/20',
    visitor: 'bg-parchment/15 text-parchment',
    reset: 'bg-ember text-parchment',
    menu: 'bg-moss',
    menuItem: 'bg-parchment/10 text-parchment active:bg-parchment/20',
    menuActive: 'bg-honey text-bark',
  },
}

export default function TopBar({ onReset }) {
  const { result } = useVisitor()
  const { isFullscreen, toggle } = useFullscreen()
  const { pathname } = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)
  const current = NAV.find((n) => n.to === pathname)?.label ?? 'القائمة'
  const forest = pathname === '/'
  const look = forest ? LOOK.forest : LOOK.flag

  return (
    <header className={`relative z-30 flex h-16 shrink-0 items-center gap-2 px-2 backdrop-blur transition-colors duration-500 sm:h-20 sm:gap-4 sm:px-6 xl:gap-6 xl:px-8 ${look.header}`}>
      {forest ? (
        // leaves hanging from the canopy over the top of the scene
        <div className="canopy-fringe pointer-events-none absolute inset-x-0 top-full h-[26px]" aria-hidden="true" />
      ) : (
        // tricolour band along the bottom of the bar
        <div className="tricolor-band absolute inset-x-0 bottom-0 h-1.5" />
      )}
      <NavLink to="/" className="flex shrink-0 items-center gap-4">
        <span className={`grid h-13 w-13 place-items-center rounded-full transition-colors duration-500 ${look.rings}`}>
          <Chakra size={42} spin duration={40} color={look.chakra} />
        </span>
        <span className="hidden leading-tight lg:block">
          <span className={`block font-display text-2xl font-extrabold ${look.title}`}>الهند تتحدّث</span>
          <span className={`block font-deva text-sm font-semibold ${look.subtitle}`}>भारत बोलता है</span>
        </span>
      </NavLink>

      {/* laptop: every page as a pill */}
      <nav className={`no-scrollbar mx-auto hidden min-w-0 items-center gap-1 overflow-x-auto rounded-full p-1.5 lg:flex ${look.soft}`}>
        {NAV.map((item) => (
          <NavLink key={item.to} to={item.to} end className="relative shrink-0 rounded-full px-3 py-1.5 text-base font-bold whitespace-nowrap sm:px-4 sm:py-2 sm:text-lg xl:px-6 xl:text-xl">
            {({ isActive }) => (
              <>
                {isActive && (
                  <motion.span
                    layoutId="nav-pill"
                    className={`absolute inset-0 rounded-full shadow ${look.pill}`}
                    transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                  />
                )}
                <span className={`relative ${isActive ? look.pillText : look.navText}`}>{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* phones and tablets: the current page + a menu with all of them */}
      <button
        type="button"
        onClick={() => setMenuOpen((v) => !v)}
        className={`mx-auto flex min-w-0 items-center gap-2 rounded-full px-4 py-2 text-lg font-bold lg:hidden ${look.soft} ${look.menuButton}`}
        aria-expanded={menuOpen}
        aria-controls="site-menu"
      >
        {menuOpen ? <X size={22} /> : <Menu size={22} />}
        <span className="truncate">{current}</span>
      </button>

      <div className="flex shrink-0 items-center gap-2 sm:gap-3">
        {result && (
          <motion.span
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className={`hidden max-w-56 truncate rounded-full px-4 py-2 text-lg font-semibold 2xl:block ${look.visitor}`}
            title="اسم الزائر"
          >
            👋 <bdi>{result.display}</bdi>
          </motion.span>
        )}
        <button
          onClick={toggle}
          className={`hidden h-12 w-12 place-items-center rounded-full transition sm:grid ${look.soft} ${look.iconButton}`}
          title={isFullscreen ? 'الخروج من ملء الشاشة' : 'ملء الشاشة'}
        >
          {isFullscreen ? <Minimize size={22} /> : <Maximize size={22} />}
        </button>
        <button
          onClick={onReset}
          className={`flex h-10 items-center gap-2 rounded-full px-3 text-lg font-bold shadow-sm transition hover:brightness-110 active:scale-95 sm:h-12 sm:px-5 ${look.reset}`}
          title="زائر جديد (Esc)"
        >
          <RotateCcw size={20} />
          <span className="hidden sm:inline">من جديد</span>
        </button>
      </div>

      <AnimatePresence>
        {menuOpen && (
          <>
            {/* tap outside to close */}
            <motion.button
              type="button"
              aria-label="إغلاق القائمة"
              className="fixed inset-0 top-16 z-0 bg-ink/30 sm:top-20 lg:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMenuOpen(false)}
            />
            <motion.nav
              id="site-menu"
              className={`absolute inset-x-0 top-full z-10 grid grid-cols-2 gap-2 p-3 shadow-xl lg:hidden ${look.menu}`}
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
            >
              {NAV.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end
                  onClick={() => setMenuOpen(false)}
                  className={({ isActive }) =>
                    `rounded-2xl px-4 py-3 text-center text-lg font-bold ${isActive ? look.menuActive : look.menuItem}`
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </motion.nav>
          </>
        )}
      </AnimatePresence>
    </header>
  )
}
