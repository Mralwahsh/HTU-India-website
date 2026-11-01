import { useEffect, useState } from 'react'
import QrCode from '../components/football/QrCode.jsx'
import Rangoli from '../components/tiles/Rangoli.jsx'
import { pageUrl, SCAN_HINT } from '../config/site.js'

/**
 * /tiles-qr (top bar: بيانو): where to play Raga Tiles. The game itself runs on each visitor's phone (/tiles),
 * so the laptop shows a big QR code; on a phone the page offers to play right there instead.
 */
export default function TilesQrPage() {
  const [qrSize, setQrSize] = useState(() => qrFor(window))

  useEffect(() => {
    const onResize = () => setQrSize(qrFor(window))
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const url = pageUrl('/tiles')

  return (
    <div className="relative grid min-h-full place-items-center overflow-hidden bg-[#2a1240] px-4 py-8 text-white lg:h-full lg:py-0" dir="rtl">
      <Rangoli size="125vh" className="pointer-events-none absolute -end-[38vh] -top-[30vh] opacity-90" />
      <Rangoli size="95vh" className="pointer-events-none absolute -start-[34vh] -bottom-[36vh] opacity-90" />

      <section className="relative flex flex-col items-center text-center">
        <h1 className="font-display text-[2.1rem] leading-tight text-[#fff4e0] drop-shadow-[0_4px_0_#1b0a2c] lg:text-[min(5.6vw,8.5vh)]">
          <span className="lg:hidden">
            العب <bdi dir="ltr">Raga Tiles</bdi> 🎹
          </span>
          <span className="hidden lg:inline">
            امسح الرمز والعب <bdi dir="ltr">Raga Tiles</bdi> 🎹
          </span>
        </h1>

        {/* phones and tablets: play right here (the game is its own small page) */}
        <div className="mt-5 flex flex-col items-center lg:hidden">
          <p className="max-w-xs rounded-2xl bg-[#2a1240]/80 px-4 py-1.5 text-lg text-white">بيانو بألحان هندية: المس البلاطات في وقتها.</p>
          <a
            href="/tiles"
            className="mt-5 rounded-[1.6rem] bg-[#ffb000] px-10 py-4 font-display text-[1.8rem] text-[#2a1240] shadow-[0_8px_0_#b37800] active:translate-y-1 active:shadow-[0_3px_0_#b37800]"
          >
            العب الآن ▶
          </a>
          <p className="mt-8 rounded-full bg-[#2a1240]/80 px-4 py-1 text-base font-bold text-white">أو امسح الرمز من هاتف آخر:</p>
        </div>

        <div className="mt-4 rounded-[2.2rem] bg-[#fff4e0] p-3 shadow-[0_24px_60px_-10px_rgba(0,0,0,0.6)] ring-8 ring-[#ffb000] lg:mt-[3vh] lg:p-[2.2vh]">
          <QrCode text={url} size={qrSize} dark="#2a1240" light="#fff4e0" />
        </div>
        <p className="mt-[2.4vh] hidden text-[min(2.2vw,3.6vh)] font-bold text-[#fff4e0] lg:block">📱 {SCAN_HINT}</p>
        <p className="mt-2 rounded-full bg-[#2a1240]/80 px-3 font-mono text-sm text-white/85 lg:mt-[0.6vh] lg:bg-transparent lg:px-0 lg:text-[min(1.6vw,2.6vh)] lg:text-white/75" dir="ltr">
          {url}
        </p>
      </section>
    </div>
  )
}

// laptop: as big as the screen allows; phones and tablets: a smaller code under the play button
const qrFor = (w) => (w.innerWidth >= 1024 ? Math.round(Math.min(w.innerHeight * 0.56, w.innerWidth * 0.42)) : Math.round(Math.min(220, w.innerWidth * 0.55)))
