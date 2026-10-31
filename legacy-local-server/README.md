# Old local booth server (not used any more)

Until October 2026 the booth ran fully offline: this Node/Express + Socket.IO server ran on the laptop,
the phones joined the laptop's Windows hotspot, and the QR codes pointed at the laptop's LAN address.

The site now runs on the web (Vercel hosting + Supabase Realtime, see [DEPLOY.md](../DEPLOY.md)), so this
folder is kept only for reference. It is not part of the Vercel build, and the current pages no longer
speak its Socket.IO protocol.

## Going back to the offline version

Use the git tag that froze the last fully-local version (it has the matching frontend and setup guide), in its own
folder so the web version stays as it is. Do it while you have internet (`npm install` downloads the packages):

```bash
git worktree add ../india-speaks-offline local-hotspot-version
cd ../india-speaks-offline
npm install
npm start
```

Then follow that folder's `BOOTH_SETUP.md` (hotspot, firewall, QR codes).
