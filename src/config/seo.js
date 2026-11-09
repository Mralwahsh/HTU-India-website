// What search engines and link previews (WhatsApp, Telegram, X, ...) show for each page.
//
// Used in two places:
// - vite.config.js, at build time: every page below gets its own HTML file with these tags (dist/map/index.html,
//   ...), so Google and the link-preview bots see the right title without running the app. It also writes
//   dist/sitemap.xml from this list.
// - src/components/SeoTags.jsx, in the browser: keeps the tab title and the tags right while a visitor moves
//   between pages.
// Plain JS on purpose (no JSX, no browser APIs): Node imports it too.

export const SITE_URL = 'https://www.htuindia.lol' // the apex htuindia.lol redirects here
export const SITE_NAME = 'HTU India'
export const SHARE_IMAGE = {
  path: '/og-image.jpg',
  width: 1200,
  height: 630,
  alt: 'HTU India, International Week: a boy sitting on giant HTU letters in an Indian forest · الهند في الأسبوع الدولي HTU',
}

// Every title and description is in English and Arabic, so the site is found either way
// ("HTU India", "International Week HTU India", "الهند الأسبوع الدولي HTU").
const BRAND = 'HTU India'

/** Every page that should be found on Google, by path. `file`: built by its own HTML entry (not the main app). */
export const PAGES = {
  '/': {
    title: 'HTU India | International Week HTU · جناح الهند في الأسبوع الدولي',
    description:
      'HTU India: the India booth website for International Week at Al Hussein Technical University (HTU). موقع جناح الهند في الأسبوع الدولي بجامعة الحسين التقنية: لغات الهند وخطوطها، اسمك بالخطوط الهندية، جولات 360° وألعاب بالهاتف.',
  },
  '/map': {
    title: `India Languages Map · خريطة لغات الهند | ${BRAND}`,
    description:
      'Tap any Indian state to see its language and script, and your name written in it. اضغط على أي ولاية هندية لتعرف لغتها وخطّها، وشاهد اسمك مكتوبًا به.',
  },
  '/name': {
    title: `Your Name in Indian Scripts · اكتب اسمك بالخطوط الهندية | ${BRAND}`,
    description:
      'Type your name in Arabic or English and see it written in five Indian scripts, letter by letter. اكتب اسمك وشاهده مكتوبًا بخمسة خطوط هندية، حرفًا حرفًا.',
  },
  '/game': {
    title: `Guess the Script · خمّن الخط | ${BRAND}`,
    description:
      'A quick five-round game: a word written in an Indian script, can you tell which one? لعبة سريعة من خمس جولات: هل تعرف بأي خط هندي كُتبت الكلمة؟',
  },
  '/tour': {
    title: `360° Tours of India · جولات 360° في الهند | ${BRAND}`,
    description: 'Walk around places in India in 360° and steer the tour from your phone. تجوّل في أماكن من الهند بزاوية 360°، وتحكّم بالجولة من هاتفك.',
  },
  '/football': {
    title: `Phone Football · كرة القدم بهاتفك | ${BRAND}`,
    description:
      'A two-player football match on the India booth screen, each player controls with their phone. مباراة كرة قدم للاعبَين على شاشة جناح الهند، يتحكّم كل لاعب بهاتفه.',
  },
  '/chess': {
    title: `Chess Was Born in India · الشطرنج وُلد في الهند | ${BRAND}`,
    description:
      'From chaturanga to chess: the game born in India about 1500 years ago, and a chess puzzle challenge on your phone. من «تشاتورانغا» إلى الشطرنج، وتحدٍّ لألغاز الشطرنج على هاتفك.',
  },
  '/tiles-qr': {
    title: `Raga Tiles: Indian Melodies Piano · راغا تايلز | ${BRAND}`,
    description: 'A piano tiles game with Indian melodies, on your phone. بيانو بألحان هندية على هاتفك: المس البلاطات في وقتها.',
  },
  '/tiles': {
    file: 'tiles.html',
    title: `Raga Tiles · راغا تايلز | ${BRAND}`,
    description: 'A piano tiles game with Indian melodies, on your phone. بيانو بألحان هندية على هاتفك: المس البلاطات في وقتها.',
  },
  '/chess/puzzles': {
    file: 'chess-puzzles.html',
    title: `Chess Puzzle Challenge · تحدّي ألغاز الشطرنج | ${BRAND}`,
    description:
      'A quick chess puzzle challenge on your phone, from the India booth at HTU International Week. تحدٍّ سريع لألغاز الشطرنج على هاتفك، من جناح الهند في الأسبوع الدولي.',
  },
}

/** Pages that are not for search results: the phone controllers and a team tool. */
export const NOINDEX = ['/controller', '/tour-controller', '/streetview-test']

/** The tags for one path: unknown paths show the home page, so they point Google at it. */
export function seoFor(pathname) {
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname
  const page = PAGES[path]
  return {
    ...(page ?? PAGES['/']),
    url: SITE_URL + (page ? (path === '/' ? '/' : path) : '/'),
    noindex: NOINDEX.includes(path),
  }
}

const escape = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/** The <head> tags for one path, as HTML (between markers, so the build can swap them per page). */
export function seoHead(pathname) {
  const p = seoFor(pathname)
  const image = SITE_URL + SHARE_IMAGE.path
  const tags = [
    `<title>${escape(p.title)}</title>`,
    `<meta name="description" content="${escape(p.description)}" />`,
    p.noindex ? '<meta name="robots" content="noindex" />' : `<link rel="canonical" href="${p.url}" />`,
    '<meta property="og:type" content="website" />',
    `<meta property="og:site_name" content="${escape(SITE_NAME)}" />`,
    '<meta property="og:locale" content="ar_AR" />',
    '<meta property="og:locale:alternate" content="en_US" />',
    `<meta property="og:title" content="${escape(p.title)}" />`,
    `<meta property="og:description" content="${escape(p.description)}" />`,
    `<meta property="og:url" content="${p.url}" />`,
    `<meta property="og:image" content="${image}" />`,
    `<meta property="og:image:width" content="${SHARE_IMAGE.width}" />`,
    `<meta property="og:image:height" content="${SHARE_IMAGE.height}" />`,
    `<meta property="og:image:alt" content="${escape(SHARE_IMAGE.alt)}" />`,
    '<meta name="twitter:card" content="summary_large_image" />',
  ]
  if (p.url === SITE_URL + '/' && !p.noindex) {
    // tells Google the site's name (shown above the result) and what it is
    const site = {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: SITE_NAME,
      alternateName: ['HTU India Website', 'International Week HTU India', 'HTU International Week India', 'الهند في الأسبوع الدولي HTU', 'جناح الهند HTU'],
      url: SITE_URL + '/',
      inLanguage: 'ar',
      description: p.description,
    }
    tags.push(`<script type="application/ld+json">${JSON.stringify(site).replace(/</g, '\\u003c')}</script>`)
  }
  return `<!-- seo -->\n    ${tags.join('\n    ')}\n    <!-- /seo -->`
}

/** sitemap.xml for every page above. */
export function sitemap(lastmod) {
  const urls = Object.keys(PAGES).map((path) => `  <url><loc>${SITE_URL}${path}</loc><lastmod>${lastmod}</lastmod></url>`)
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`
}
