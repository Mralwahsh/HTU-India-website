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
export const SITE_NAME = 'الهند تتحدّث · India Speaks'
export const SHARE_IMAGE = { path: '/og-image.jpg', width: 1200, height: 630, alt: 'الهند تتحدّث: ولد يجلس على حروف HTU الكبيرة في غابة هندية' }

const BRAND = 'الهند تتحدّث'

/** Every page that should be found on Google, by path. `file`: built by its own HTML entry (not the main app). */
export const PAGES = {
  '/': {
    title: 'الهند تتحدّث · India Speaks | جناح الهند في الأسبوع الدولي HTU',
    description:
      'جناح الهند في الأسبوع الدولي بجامعة الحسين التقنية (HTU): لغات الهند وخطوطها، اكتب اسمك بالخطوط الهندية، جولات 360° في الهند، وألعاب تلعبها بهاتفك.',
  },
  '/map': {
    title: `خريطة لغات الهند | ${BRAND}`,
    description: 'اضغط على أي ولاية هندية لتعرف لغتها وخطّها، وشاهد اسمك مكتوبًا به.',
  },
  '/name': {
    title: `اكتب اسمك بالخطوط الهندية | ${BRAND}`,
    description: 'اكتب اسمك بالعربية أو الإنجليزية وشاهده مكتوبًا بخمسة خطوط هندية، حرفًا حرفًا.',
  },
  '/game': {
    title: `خمّن الخط: لعبة الخطوط الهندية | ${BRAND}`,
    description: 'لعبة سريعة من خمس جولات: كلمة مكتوبة بخط هندي، فهل تعرف أيّ خط هو؟',
  },
  '/tour': {
    title: `جولات 360° في الهند | ${BRAND}`,
    description: 'تجوّل في أماكن من الهند بزاوية 360°، وتحكّم بالجولة من هاتفك.',
  },
  '/football': {
    title: `كرة القدم بهاتفك | ${BRAND}`,
    description: 'مباراة كرة قدم للاعبَين على شاشة جناح الهند، يتحكّم كل لاعب بهاتفه.',
  },
  '/chess': {
    title: `الشطرنج وُلد في الهند | ${BRAND}`,
    description: 'من «تشاتورانغا» إلى الشطرنج: قصة اللعبة التي وُلدت في الهند قبل نحو 1500 سنة، وتحدٍّ لألغاز الشطرنج على هاتفك.',
  },
  '/tiles-qr': {
    title: `راغا تايلز: بيانو بألحان هندية | ${BRAND}`,
    description: 'بيانو بألحان هندية على هاتفك: المس البلاطات في وقتها.',
  },
  '/tiles': {
    file: 'tiles.html',
    title: `راغا تايلز · Raga Tiles | ${BRAND}`,
    description: 'بيانو بألحان هندية على هاتفك: المس البلاطات في وقتها.',
  },
  '/chess/puzzles': {
    file: 'chess-puzzles.html',
    title: `تحدّي ألغاز الشطرنج ♟️ | ${BRAND}`,
    description: 'تحدٍّ سريع لألغاز الشطرنج على هاتفك، من جناح الهند في الأسبوع الدولي بجامعة الحسين التقنية.',
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
      alternateName: ['India Speaks', 'الهند تتحدث', 'HTU India'],
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
