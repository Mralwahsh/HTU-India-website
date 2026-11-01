import { motion } from 'framer-motion'
import QrCode from './QrCode.jsx'
import { CHARACTERS, SLOT_COLOR, SLOT_LABEL_AR } from '../../game/football/characters/index.js'
import { headDataUrl } from '../../game/football/characters/art.js'
import { DEFAULT_PICKS } from '../../../shared/protocol.js'
import { SCAN_HINT } from '../../config/site.js'
import { REALTIME_KIND } from '../../realtime/channel.js'
import { prettyRoomCode } from '../../realtime/roomCode.js'
import { bothPlayersReady } from '../../game/net/footballProtocol.js'

const STEPS = ['امسح الرمز بكاميرا هاتفك', 'أدر هاتفك بالعرض', 'صديقك يمسح الرمز بهاتفه أيضًا', 'اختارا لاعبيكما ثم اضغطا «ركل»']

/** Lobby: QR code + room code, the two players with their characters, today's records, "press KICK". */
export default function FootballLobby({ controllerUrl, code, status, room, pings, records, showPing, screenPing, keyboardTest }) {
  const joined = ['p1', 'p2'].filter((s) => room?.slots?.[s]?.type === 'human' && room.slots[s].connected).length
  const ready = bothPlayersReady(room)
  let callout = 'امسح الرمز لتلعب!'
  if (ready) callout = 'اضغط «ركل» في هاتفك للبدء!'
  else if (joined === 1) callout = 'بانتظار اللاعب الثاني… امسح الرمز!'
  const qrSize = window.innerWidth >= 1024 ? 290 : 200

  return (
    <div className="mx-auto flex max-w-[1800px] flex-col gap-4 px-4 py-4 lg:grid lg:h-full lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:gap-8 lg:px-10 lg:py-5">
      <section className="flex min-h-0 flex-col max-lg:contents">
        <h1 className="order-1 font-display text-4xl leading-tight font-extrabold text-navy lg:order-none lg:text-5xl 2xl:text-6xl">
          كرة <span className="text-saffron-deep">الرؤوس</span> <span className="text-green">الكبيرة</span> ⚽
        </h1>
        <p className="order-1 -mt-3 text-lg text-muted lg:order-none lg:mt-0 lg:text-2xl">مباراة بين لاعبين: كل لاعب يتحكم بهاتفه!</p>

        <div className="order-4 grid grid-cols-2 gap-3 lg:order-none lg:mt-4 lg:gap-4">
          {['p1', 'p2'].map((slot) => (
            <PlayerCard key={slot} slot={slot} info={room?.slots?.[slot]} ping={pings?.[slot]} showPing={showPing} />
          ))}
        </div>

        <ol className="order-5 grid gap-2 sm:grid-cols-2 lg:order-none lg:mt-4">
          {STEPS.map((s, i) => (
            <li key={s} className="flex items-center gap-3 rounded-2xl bg-paper px-3 py-2 shadow-sm ring-1 ring-ink/5">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-navy font-display text-lg font-extrabold text-white">{i + 1}</span>
              <span className="text-base leading-snug font-bold">{s}</span>
            </li>
          ))}
        </ol>

        <div className="order-6 lg:order-none">
          <Records records={records} />
        </div>

        <div className="hidden flex-1 lg:block" />
        <motion.p
          className={`order-3 rounded-full px-5 py-3 text-center font-display text-xl font-extrabold lg:order-none lg:px-6 lg:text-3xl ${ready ? 'bg-green text-white' : 'bg-saffron-soft text-saffron-deep'}`}
          animate={{ scale: [1, 1.03, 1] }}
          transition={{ duration: 1.2, repeat: Infinity }}
        >
          {callout}
        </motion.p>
        <p className="mt-2 hidden text-center text-sm text-muted lg:block" dir="ltr">
          Keyboard: P1 A/D move · W jump · S kick — P2 ←/→ · ↑ jump · ↓ kick — A/D or ←/→ in the lobby change character · P = ping · M = sound
          {keyboardTest ? ' · keyboard test mode: S starts a match without phones' : ' · /football?keyboard = test without phones'}
        </p>
      </section>

      <section className="order-2 flex flex-col items-center justify-center gap-3 rounded-[2rem] bg-paper p-5 shadow-sm ring-1 ring-ink/5 lg:order-none lg:min-h-0 lg:gap-4 lg:rounded-[2.5rem] lg:p-6">
        <p className="text-center font-display text-2xl font-extrabold text-navy lg:text-3xl">امسح لتحصل على يد التحكم</p>
        <div className="relative">
          {controllerUrl ? <QrCode text={controllerUrl} size={qrSize} /> : <div className="animate-pulse rounded-2xl bg-ink/5" style={{ width: qrSize, height: qrSize }} />}
          {status !== 'live' && (
            <div className="absolute inset-0 grid place-items-center rounded-2xl bg-paper/85 p-2 text-center">
              <p className="text-lg font-bold text-navy lg:text-2xl">{status === 'reconnecting' ? 'انقطع الاتصال بالإنترنت… جارٍ إعادة الاتصال' : 'جارٍ الاتصال…'}</p>
            </div>
          )}
        </div>
        <p className="text-center text-lg font-bold text-ink/80 lg:text-xl">📱 {SCAN_HINT}</p>
        <div className="flex items-center gap-3 rounded-3xl bg-navy px-5 py-2 text-white lg:px-6">
          <span className="text-base lg:text-lg">رمز الغرفة</span>
          <bdi className="font-mono text-3xl font-extrabold tracking-[0.2em] whitespace-nowrap text-saffron lg:text-4xl" dir="ltr">
            {prettyRoomCode(code)}
          </bdi>
        </div>
        <p className="text-center font-mono text-sm break-all text-muted lg:text-base" dir="ltr">
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
  else status = <span className="text-muted">بانتظار هاتف…</span>

  return (
    <div className="flex flex-col items-center gap-1 rounded-3xl bg-paper p-3 text-center shadow-sm ring-2 sm:flex-row sm:gap-3 sm:text-start" style={{ '--tw-ring-color': `${SLOT_COLOR[slot]}88` }}>
      <motion.img
        key={char.id}
        src={headDataUrl(char)}
        alt=""
        className={`h-16 w-16 shrink-0 lg:h-24 lg:w-24 ${slot === 'p2' ? '-scale-x-100' : ''}`}
        initial={{ scale: 0.6, rotate: -10 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 14 }}
      />
      <div className="min-w-0">
        <p className="text-base font-bold lg:text-lg" style={{ color: SLOT_COLOR[slot] === '#ff9933' ? '#e2700a' : SLOT_COLOR[slot] }}>
          {SLOT_LABEL_AR[slot]}
        </p>
        <p className="font-display text-2xl leading-tight font-extrabold lg:text-3xl">{char.nameAr}</p>
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
    <div className="flex flex-wrap gap-x-3 gap-y-1 rounded-2xl bg-saffron-soft/60 px-4 py-2 text-base lg:mt-3 lg:text-lg">
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
