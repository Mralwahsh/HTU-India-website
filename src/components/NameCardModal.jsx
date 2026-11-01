import { motion } from 'framer-motion'
import { X } from 'lucide-react'
import GlyphText from './GlyphText.jsx'
import Chakra from './Chakra.jsx'

// Colours follow the flag: saffron, green, navy…
const ROWS = [
  { key: 'hindi', script: 'devanagari', label: 'الهندية', color: '#e2700a' },
  { key: 'urdu', script: 'urdu', label: 'الأردية', color: '#138808' },
  { key: 'tamil', script: 'tamil', label: 'التاميلية', color: '#000080' },
  { key: 'bengali', script: 'bengali', label: 'البنغالية', color: '#e2700a' },
  { key: 'malayalam', script: 'malayalam', label: 'المالايالامية', color: '#138808' },
]

/** Full-screen "souvenir" card in the colours of the Indian flag, for visitors to photograph. */
export default function NameCardModal({ result, onClose }) {
  return (
    <motion.div
      className="fixed inset-0 z-50 flex cursor-pointer flex-col overflow-hidden bg-white"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      {/* saffron band with the title */}
      <div className="flex h-[16%] shrink-0 items-center justify-between bg-gradient-to-b from-[#ff8a1f] to-saffron px-5 text-white lg:h-[19%] lg:px-14">
        <div className="min-w-0">
          <p className="font-display text-lg font-bold text-white/85 lg:text-2xl">اسمي في الهند</p>
          <h2 className="truncate font-display text-4xl leading-tight font-extrabold drop-shadow-[0_2px_8px_rgba(0,0,0,0.15)] lg:text-6xl">
            <bdi>{result.display}</bdi>
          </h2>
        </div>
        <p className="me-12 font-deva text-3xl font-bold text-white/90 lg:me-14 lg:text-5xl">भारत</p>
      </div>

      {/* white centre */}
      <div className="relative min-h-0 flex-1 px-3 py-3 lg:px-12 lg:py-5">
        <Chakra size={460} className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.06]" />
        <div className="relative grid h-full grid-cols-2 grid-rows-3 gap-2 lg:grid-cols-3 lg:grid-rows-2 lg:gap-4">
          {ROWS.map((r, i) => (
            <motion.div
              key={r.key}
              className="relative flex min-h-0 flex-col items-center justify-center rounded-[1.4rem] bg-white/80 px-2 shadow-sm ring-2 lg:rounded-[2rem] lg:px-5"
              style={{ '--tw-ring-color': `${r.color}55` }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + i * 0.1 }}
            >
              <span className="absolute start-3 top-2 font-display text-sm font-bold lg:start-6 lg:top-3 lg:text-xl" style={{ color: r.color }}>
                {r.label}
              </span>
              <div style={{ color: r.color }} className="flex w-full justify-center pt-5 lg:pt-8">
                <GlyphText text={result[r.key]} script={r.script} height={r.script === 'urdu' ? 140 : 105} />
              </div>
            </motion.div>
          ))}

          {/* chakra cell */}
          <motion.div
            className="flex flex-col items-center justify-center gap-2 rounded-[1.4rem] bg-navy text-white shadow-sm lg:rounded-[2rem]"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.75 }}
          >
            <span className="rounded-full bg-white p-1.5">
              <Chakra size={84} spin duration={30} />
            </span>
            <p className="font-display text-2xl font-extrabold lg:text-4xl">الهند</p>
          </motion.div>
        </div>
      </div>

      {/* green band with branding */}
      <div className="flex h-[11%] shrink-0 items-center justify-between gap-2 bg-gradient-to-b from-green to-[#0f6e06] px-5 text-white lg:px-14">
        <p className="font-display text-base font-extrabold lg:text-2xl">الأسبوع الدولي · جامعة الحسين التقنية</p>
        {result.approximate && <p className="text-base text-white/70">≈ تهجئة تقريبية</p>}
      </div>

      <button
        className="absolute top-5 left-5 grid h-12 w-12 place-items-center rounded-full bg-white/25 text-white hover:bg-white/40"
        onClick={onClose}
      >
        <X size={28} />
      </button>
    </motion.div>
  )
}
