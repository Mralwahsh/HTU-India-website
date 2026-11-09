import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { seoFor } from '../config/seo.js'

// The built HTML of each page already has its title and tags (vite.config.js). This keeps them right while a
// visitor moves between pages inside the app (and for Google, which runs the app and reads the result).
export default function SeoTags() {
  const { pathname } = useLocation()
  useEffect(() => {
    const p = seoFor(pathname)
    document.title = p.title
    setTag('meta[name="description"]', () => meta('name', 'description'), 'content', p.description)
    setTag('meta[property="og:title"]', () => meta('property', 'og:title'), 'content', p.title)
    setTag('meta[property="og:description"]', () => meta('property', 'og:description'), 'content', p.description)
    setTag('meta[property="og:url"]', () => meta('property', 'og:url'), 'content', p.url)
    setTag('link[rel="canonical"]', () => link('canonical'), 'href', p.noindex ? null : p.url)
    setTag('meta[name="robots"]', () => meta('name', 'robots'), 'content', p.noindex ? 'noindex' : null)
  }, [pathname])
  return null
}

/** Set an attribute on the tag (creating it if needed); value null removes the tag. */
function setTag(selector, create, attr, value) {
  let el = document.head.querySelector(selector)
  if (value == null) return el?.remove()
  if (!el) document.head.append((el = create()))
  el.setAttribute(attr, value)
}

function meta(key, name) {
  const el = document.createElement('meta')
  el.setAttribute(key, name)
  return el
}

function link(rel) {
  const el = document.createElement('link')
  el.rel = rel
  return el
}
