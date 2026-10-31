// The site is on the web (https://htuindia.lol). Visitors' phones use their own mobile data or any Wi-Fi.
//
// QR codes point at the address the laptop itself opened, so they are right on https://htuindia.lol, on a
// Vercel preview address, and on http://<laptop-ip>:5173 during development.
export const pageUrl = (path) => `${window.location.origin}${path}`

/** Shown under every QR code. */
export const SCAN_HINT = 'امسح الرمز بكاميرا هاتفك'
