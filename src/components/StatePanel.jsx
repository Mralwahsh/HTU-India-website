import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import { useVisitor } from '../context/VisitorContext.jsx'
import { nameInScript } from '../services/transliteration.js'
import { SCRIPTS, scriptDir, scriptFont } from '../config/scripts.js'
import { formatSpeakers } from '../utils/format.js'
import GlyphText from './GlyphText.jsx'
import NameMini from './NameMini.jsx'
import FitText from './FitText.jsx'

/** Side panel for a clicked state: the visitor's name in that state's script + a few facts. */
export default function StatePanel({ state, language, family, onClose }) {
  const { result } = useVisitor()
  const script = language?.script ?? 'latin'
  const name = nameInScript(result, script)
  const facts = [...state.facts, ...(language?.funFacts ?? [])].slice(0, 4)

  return (
    <motion.div
      className="flex flex-col overflow-hidden rounded-[2rem] bg-paper shadow-sm ring-1 ring-ink/5 lg:h-full lg:rounded-[2.5rem]"
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -30 }}
      transition={{ type: 'spring', stiffness: 260, damping: 28 }}
    >
      <div className="px-5 pt-5 pb-4 lg:px-8 lg:pt-6" style={{ backgroundColor: `${family?.color}26` }}>
        <div className="flex items-start justify-between">
          <div>
            <p className="text-lg font-semibold text-muted">{state.type === 'ut' ? 'إقليم اتحادي' : 'ولاية'}</p>
            <h2 className="font-display text-3xl leading-snug font-extrabold lg:text-4xl 2xl:text-5xl">{state.nameAr}</h2>
          </div>
          <button onClick={onClose} className="grid h-12 w-12 place-items-center rounded-full bg-paper/70 hover:bg-paper">
            <X size={26} />
          </button>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-base lg:text-lg">
          <span className="rounded-full px-3 py-0.5 font-bold text-ink" style={{ backgroundColor: family?.color }}>
            {family?.nameAr}
          </span>
          <span className="font-bold">{language?.nameAr}</span>
          <span className={`${scriptFont(script)} text-xl`} dir={scriptDir(script)}>
            {language?.nativeName}
          </span>
          <span className="text-muted">· ≈ {formatSpeakers(language?.speakersApprox)} متحدث</span>
        </div>
      </div>

      {/* the visitor's name */}
      <div className="flex flex-col items-center justify-center bg-navy px-5 py-6 text-white lg:min-h-0 lg:flex-1 lg:px-8 lg:py-4">
        {result && name ? (
          <>
            <p className="text-xl font-semibold text-saffron">
              <bdi>{result.display}</bdi> باللغة {language?.nameAr}
            </p>
            <AnimatePresence mode="wait">
              <motion.div
                key={`${state.id}-${name.text}`}
                className="flex w-full justify-center"
                initial={{ opacity: 0, y: 20, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ type: 'spring', stiffness: 200, damping: 18 }}
              >
                {script === 'latin' ? (
                  <span className="font-display text-6xl font-extrabold lg:text-8xl">{name.text}</span>
                ) : SCRIPTS[script]?.fontFile ? (
                  <GlyphText text={name.text} script={script} height={script === 'urdu' ? 170 : 140} color="#ffffff" mode="write" speed={0.6} />
                ) : (
                  <span className={`${scriptFont(script)} text-6xl font-bold lg:text-8xl`}>{name.text}</span>
                )}
              </motion.div>
            </AnimatePresence>
            {script === 'latin' && <p className="mt-1 text-lg text-white/70">تُكتب {language?.nameAr} بالحروف اللاتينية، مثل الإنجليزية!</p>}
            {name.approximate && script !== 'latin' && <p className="mt-1 text-sm text-white/50">≈ تهجئة تقريبية</p>}
          </>
        ) : (
          <div className="w-full max-w-lg text-center">
            <p className="text-xl font-bold lg:text-2xl">اكتب اسمك لتراه باللغة {language?.nameAr}!</p>
            <NameMini compact />
          </div>
        )}
      </div>

      <div className="flex flex-col gap-4 px-5 py-5 lg:grid lg:grid-cols-[auto_1fr] lg:gap-x-6 lg:gap-y-0 lg:px-8">
        <div className="flex flex-col items-center justify-center border-b border-ink/10 pb-4 lg:w-56 lg:border-e lg:border-b-0 lg:pe-6 lg:pb-0">
          <FitText className={`${scriptFont(script)} text-5xl leading-[1.5] font-bold text-navy`} dir={scriptDir(script)}>
            {language?.helloNative}
          </FitText>
          <span className="text-lg text-muted">«{language?.helloPronunciationAr}» = مرحبا</span>
        </div>
        <ul className="flex flex-col justify-center gap-2">
          {facts.slice(0, 3).map((f, i) => (
            <motion.li
              key={f}
              className="flex gap-2 text-base leading-relaxed lg:text-lg"
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.15 + i * 0.08 }}
            >
              <span className="text-saffron">●</span>
              {f.replace(/\s*TODO: verify.*$/i, '')}
            </motion.li>
          ))}
        </ul>
      </div>
    </motion.div>
  )
}
