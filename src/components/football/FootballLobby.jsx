import { motion } from 'framer-motion'
import QrCode from './QrCode.jsx'
import { CHARACTERS, SLOT_COLOR, SLOT_LABEL_AR } from '../../game/football/characters/index.js'
import { headDataUrl } from '../../game/football/characters/art.js'
import { DEFAULT_PICKS } from '../../../shared/protocol.js'
import { SCAN_HINT } from '../../config/site.js'
import { REALTIME_KIND } from '../../realtime/channel.js'
import { prettyRoomCode } from '../../realtime/roomCode.js'

const STEPS = ['امسح الرمز بكاميرا هاتفك', 'أدر هاتفك بالعرض', 'اختر لاعبك بالسهمين', 'اضغط «ركل» لتبدأ المباراة']

/** Lobby: QR code + room code, the two players with their characters, today's records, "press KICK". */
export default function FootballLobby({ controllerUrl, code, status, room, pings, records, showPing, screenPing }) {
  const anyone = ['p1', 'p2'].some((s) => room?.slots?.[s]?.type === 'human' && room.slots[s].connected)

  return (
    <div className="mx-auto grid h-full max-w-[1800px] grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] gap-8 px-10 py-5">
      <section className="flex min-h-0 flex-col">
        <h1 className="font-display text-5xl leading-tight font-extrabold text-navy 2xl:text-6xl">
          كرة <span className="text-saffron-deep">الرؤوس</span> <span className="text-green">الكبيرة</span> ⚽
        </h1>
        <p className="text-2xl text-muted">العب بهاتفك، ضد الكمبيوتر أو ضد صديق!</p>

        <div className="mt-4 grid grid-cols-2 gap-4">
          {['p1', 'p2'].map((slot) => (
            <PlayerCard key={slot} slot={slot} info={room?.slots?.[slot]} ping={pings?.[slot]} showPing={showPing} />
          ))}
        </div>

        <ol className="mt-4 grid grid-cols-2 gap-2">
          {STEPS.map((s, i) => (
            <li key={s} className="flex items-center gap-3 rounded-2xl bg-paper px-3 py-2 shadow-sm ring-1 ring-ink/5">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-navy font-display text-lg font-extrabold text-white">{i + 1}</span>
              <span className="text-base leading-snug font-bold">{s}</span>
            </li>
          ))}
        </ol>

        <Records records={records} />

        <div className="flex-1" />
        <motion.p
          className={`rounded-full px-6 py-3 text-center font-display text-3xl font-extrabold ${anyone ? 'bg-green text-white' : 'bg-saffron-soft text-saffron-deep'}`}
          animate={{ scale: [1, 1.03, 1] }}
          transition={{ duration: 1.2, repeat: Infinity }}
        >
          {anyone ? 'اضغط «ركل» في هاتفك للبدء!' : 'امسح الرمز لتلعب!'}
        </motion.p>
        <p className="mt-2 text-center text-sm text-muted" dir="ltr">
          Keyboard: P1 A/D move · W jump · S kick — P2 ←/→ · ↑ jump · ↓ kick — A/D or ←/→ in the lobby change character · P = ping · M = sound
        </p>
      </section>

      <section className="flex min-h-0 flex-col items-center justify-center gap-4 rounded-[2.5rem] bg-paper p-6 shadow-sm ring-1 ring-ink/5">
        <p className="font-display text-3xl font-extrabold text-navy">امسح لتحصل على يد التحكم</p>
        <div className="relative">
          {controllerUrl ? <QrCode text={controllerUrl} size={290} /> : <div className="h-[290px] w-[290px] animate-pulse rounded-2xl bg-ink/5" />}
          {status !== 'live' && (
            <div className="absolute inset-0 grid place-items-center rounded-2xl bg-paper/85 text-center">
              <p className="text-2xl font-bold text-navy">{status === 'reconnecting' ? 'انقطع الاتصال بالإنترنت… جارٍ إعادة الاتصال' : 'جارٍ الاتصال…'}</p>
            </div>
          )}
        </div>
        <p className="text-xl font-bold text-ink/80">📱 {SCAN_HINT}</p>
        <div className="flex items-center gap-3 rounded-3xl bg-navy px-6 py-2 text-white">
          <span className="text-lg">رمز الغرفة</span>
          <bdi className="font-mono text-4xl font-extrabold tracking-[0.2em] text-saffron" dir="ltr">
            {prettyRoomCode(code)}
          </bdi>
        </div>
        <p className="font-mono text-base text-muted" dir="ltr">
          {controllerUrl ?? '…'}
        </p>
        {REALTIME_KIND === 'local' && (
          <p className="max-w-md rounded-2xl bg-saffron-soft px-4 py-2 text-center text-sm text-saffron-deep">
            وضع الاختبار المحلي: مفاتيح Supabase غير موجودة، فتعمل يد التحكم فقط في تبويب آخر من المتصفح نفسه.
          </p>
        )}
        {showPing && (
          <p className="font-mono text-sm text-muted" dir="ltr">
            laptop↔Supabase {screenPing == null ? '–' : `${Math.round(screenPing)} ms`}
          </p>
        )}
      </section>
    </div>
  )
}

function PlayerCard({ slot, info, ping, showPing }) {
  const char = CHARACTERS[info?.character ?? DEFAULT_PICKS[slot]]
  const human = info?.type === 'human'
  const connected = human && info.connected
  let status
  if (connected) status = <span className="text-green">✅ متصل</span>
  else if (human) status = <span className="text-accent">⏳ انقطع الاتصال…</span>
  else if (slot === 'p2') status = <span className="text-navy">🤖 الكمبيوتر</span>
  else status = <span className="text-muted">بانتظار…</span>

  return (
    <div className="flex items-center gap-3 rounded-3xl bg-paper p-3 shadow-sm ring-2" style={{ '--tw-ring-color': `${SLOT_COLOR[slot]}88` }}>
      <motion.img
        key={char.id}
        src={headDataUrl(char)}
        alt=""
        className={`h-24 w-24 shrink-0 ${slot === 'p2' ? '-scale-x-100' : ''}`}
        initial={{ scale: 0.6, rotate: -10 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 14 }}
      />
      <div className="min-w-0">
        <p className="text-lg font-bold" style={{ color: SLOT_COLOR[slot] === '#ff9933' ? '#e2700a' : SLOT_COLOR[slot] }}>
          {SLOT_LABEL_AR[slot]}
        </p>
        <p className="font-display text-3xl leading-tight font-extrabold">{char.nameAr}</p>
        <p className="text-base text-muted">{char.regionAr}</p>
        <p className="text-lg font-bold">
          {status}
          {showPing && ping != null && (
            <span className="ms-2 font-mono text-sm text-muted" dir="ltr">
              {ping} ms
            </span>
          )}
        </p>
      </div>
    </div>
  )
}

function Records({ records }) {
  if (!records?.matches) return null
  const { biggestWin, mostGoals } = records
  return (
    <div className="mt-3 flex flex-wrap gap-3 rounded-2xl bg-saffron-soft/60 px-4 py-2 text-lg">
      <span className="font-extrabold text-saffron-deep">🏆 أفضل نتائج اليوم:</span>
      {biggestWin && (
        <span>
          أكبر فوز: <b>{biggestWin.winnerName}</b>{' '}
          <bdi dir="ltr">
            {biggestWin.score.p1}-{biggestWin.score.p2}
          </bdi>
        </span>
      )}
      {mostGoals && (
        <span>
          أكثر أهداف: <b>{mostGoals.total}</b>
        </span>
      )}
      <span className="text-muted">({records.matches} مباراة)</span>
    </div>
  )
}
