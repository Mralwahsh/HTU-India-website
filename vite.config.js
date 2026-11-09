import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath } from 'node:url'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { PAGES as SEO_PAGES, seoHead, sitemap } from './src/config/seo.js'

const page = (p) => fileURLToPath(new URL(p, import.meta.url))

// Phone-sized pages are their own small HTML entries that share no code with the site, so phones never
// download the maps, Phaser, fonts etc.: /tiles (Raga Tiles) and /chess/puzzles (Puzzle Challenge).
// Locally their clean URLs are rewritten to the HTML files here; on Vercel, vercel.json does the same.
const PAGES = [
  [/^\/tiles\/?(?=\?|$)/, '/tiles.html'],
  [/^\/chess\/puzzles\/?(?=\?|$)/, '/chess-puzzles.html'],
]
// `npm run preview` also serves each app page's own built HTML (dist/map/index.html, see seo() below), like Vercel.
const BUILT_PAGES = [[/^\/(map|name|game|tour|football|chess|tiles-qr)\/?(?=\?|$)/, '/$1/index.html']]
function separatePages() {
  const rewriter = (list) => (req, _res, next) => {
    for (const [re, file] of list) if (re.test(req.url)) req.url = req.url.replace(re, file)
    next()
  }
  return {
    name: 'separate-pages',
    configureServer: (server) => void server.middlewares.use(rewriter(PAGES)),
    configurePreviewServer: (server) => void server.middlewares.use(rewriter([...PAGES, ...BUILT_PAGES])),
  }
}

// Search engines and link previews: every page gets its own <title>, description and share tags
// (src/config/seo.js). The app's pages are one index.html, so the build copies it once per page
// (dist/map/index.html, ...: vercel.json serves them) with that page's tags, and writes dist/sitemap.xml.
function seo() {
  let outDir
  let isBuild = false
  const withTags = (html, path) =>
    html
      .replace(/\s*<!-- seo -->[\s\S]*?<!-- \/seo -->/, '') // (a page made from the built index.html)
      .replace(/<title>[^<]*<\/title>\s*/, '')
      .replace('</head>', `  ${seoHead(path)}
  </head>`)
  return {
    name: 'seo',
    configResolved(config) {
      outDir = resolve(config.root, config.build.outDir)
      isBuild = config.command === 'build'
    },
    // index.html, tiles.html and chess-puzzles.html: each with its own page's tags
    transformIndexHtml(html, ctx) {
      const path = Object.keys(SEO_PAGES).find((p) => SEO_PAGES[p].file && ctx.path.endsWith('/' + SEO_PAGES[p].file)) ?? '/'
      return withTags(html, path)
    },
    closeBundle() {
      if (!isBuild) return // (the dev server calls this too when it stops)
      const index = readFileSync(join(outDir, 'index.html'), 'utf8')
      for (const [path, page] of Object.entries(SEO_PAGES)) {
        if (path === '/' || page.file) continue
        mkdirSync(join(outDir, path), { recursive: true })
        writeFileSync(join(outDir, path, 'index.html'), withTags(index, path))
      }
      writeFileSync(join(outDir, 'sitemap.xml'), sitemap(new Date().toISOString().slice(0, 10)))
    },
  }
}

// Static site: hosted on Vercel (https://htuindia.lol); phones and the laptop talk through Supabase Realtime.
export default defineConfig({
  base: '/',
  plugins: [react(), tailwindcss(), separatePages(), seo()],
  // harfbuzzjs loads its .wasm via import.meta.url and uses top-level await,
  // so keep it out of dependency pre-bundling.
  optimizeDeps: { exclude: ['harfbuzzjs'] },
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 2000, // the laptop pages are big (maps, Phaser); the phone pages are kept small on purpose
    rollupOptions: { input: { main: page('./index.html'), tiles: page('./tiles.html'), chessPuzzles: page('./chess-puzzles.html') } },
  },
  server: {
    port: 5173,
    host: true, // reachable from phones on the same Wi-Fi during development
  },
  preview: { port: 4173 },
})
