# Deploy: Vercel (website) + Supabase (realtime)

The booth site is a static website on **Vercel** at **https://htuindia.lol**. The laptop and the visitors' phones
talk through **Supabase Realtime**, so phones can use their own mobile data or any Wi-Fi. There is no server of
our own any more (the old offline one is kept in [`legacy-local-server/`](legacy-local-server/README.md)).

```
 phone (4G/5G or any Wi-Fi) ──https──► htuindia.lol (Vercel: the pages)
        │                                     ▲
        └──── Supabase Realtime (room:K7QM2X) ┴──── laptop at the booth (htuindia.lol/football)
```

| What | Where it runs | Needs the internet? |
| --- | --- | --- |
| Home, map, names, games, chess page | Vercel (static) | only to load the page |
| Raga Tiles `/tiles`, Puzzle Challenge `/chess/puzzles` | the visitor's phone | only to load the page |
| Big Head Football `/football` + phone `/controller` | laptop + phones, through Supabase Realtime | yes, during the match |
| Virtual tours `/tour` + phone `/tour-controller` | laptop + one phone, through Supabase Realtime (the 360° photos are part of the site) | yes, while a phone controls it |

---

## 1. Supabase project (once)

1. Create a free account at [supabase.com](https://supabase.com) and a **new project**. Pick the region closest to
   Jordan that the list offers (for example *Central EU (Frankfurt)*). The database password is not needed by the site.
2. The **Connect** button at the top of the project dashboard (or **Project Settings → API Keys** and **Data API**) shows:
   - the **Project URL** (`https://<ref>.supabase.co`) → `VITE_SUPABASE_URL`
   - the **publishable** key (`sb_publishable_…`) or the legacy **anon** key (`eyJ…`); either works → `VITE_SUPABASE_ANON_KEY`

   This key is meant to be public: it ships inside the page. **Never** use the `service_role` / secret key in the site.
3. **Realtime → Settings**: keep public channels allowed (do not switch the project to *private channels only*).
   The rooms use public Broadcast/Presence channels named `room:<code>`; a random 6-character code changes after every game.

> The free plan **pauses a project after about a week without activity**. Open the Supabase dashboard a day before
> the event (and on the morning, see [BOOTH_SETUP.md](BOOTH_SETUP.md)) and press **Restore** if it says *Paused*.

Free-plan limits that matter here: about **100 Realtime messages per second** for the whole project (each message counts
once when sent and once per delivery) and 200 connected devices. A football match uses about 30–45 messages/s.

## 2. Try it locally

```bash
copy .env.example .env.local     # macOS/Linux: cp .env.example .env.local
npm install
npm run dev
```

Fill in `.env.local` (it is git-ignored, never commit it). Open `http://localhost:5173/football`.

- **With** the Supabase keys, phones on the same Wi-Fi can play too: open the laptop page as `http://<laptop-ip>:5173/football`
  (the QR always points to the address the laptop opened, so `localhost` would not work for a phone).
- **Without** keys the pages run in *local test mode*: the controller only works in another tab of the same browser
  (handy for development: open the QR link in a second tab). Add `?local` to force this mode, `?lag=80` to fake 80 ms of network delay.

`npm start` builds and serves the production version at `http://localhost:4173`.

## 3. Vercel (once)

1. Push this repository to GitHub (`main`).
2. On [vercel.com](https://vercel.com): **Add New → Project → Import** the GitHub repository. Vercel reads
   [`vercel.json`](vercel.json): framework Vite, build `npm run build`, output `dist`, and the page rewrites
   (`/tiles`, `/chess/puzzles`, and every other address → the single-page app).
3. **Settings → Environment Variables**, for *Production* and *Preview*:

   | Name | Value |
   | --- | --- |
   | `VITE_SUPABASE_URL` | the Project URL from step 1 |
   | `VITE_SUPABASE_ANON_KEY` | the anon / publishable key from step 1 |
   | `VITE_GOOGLE_MAPS_API_KEY` | the Street View browser key (optional; the tours fall back to the offline 360° photos) |

   `VITE_` variables are baked into the pages **at build time**: after changing one, **redeploy** (Deployments → ⋯ → Redeploy).
4. Every push to `main` deploys to production; other branches get a preview address.

### Domain: htuindia.lol (bought on Porkbun)

**On Vercel:** project → **Settings → Domains → Add** `htuindia.lol`. Choose the option that keeps `htuindia.lol` as the
main address and redirects `www.htuindia.lol` to it. Vercel then shows a card for each name with the DNS record it
needs (type, name, value) and *Invalid Configuration* until the records exist. Keep that page open.

**On Porkbun:** log in → **Domain Management** → next to `htuindia.lol` click **DNS** (opens *Manage DNS Records*).

1. **Delete Porkbun's parking records first**: every record whose answer is `pixie.porkbun.com` (normally an `ALIAS`
   with an empty host and a `CNAME` with host `*`). Click the trash icon on each. If they stay, Porkbun refuses the new
   records ("A CNAME or ALIAS record with that host already exists") and visitors keep seeing the parking page.
   Also delete any `AAAA` record with an empty host. **Keep** `MX` and `TXT` records (e-mail, verification).
2. Add the records **exactly as Vercel's domain card shows them**. Usually:

   | Type | Host (on Porkbun) | Answer | TTL |
   | --- | --- | --- | --- |
   | `A` | *(leave empty: that means `htuindia.lol` itself)* | the IP on Vercel's card (e.g. `76.76.21.21`) | 600 |
   | `CNAME` | `www` | the target on Vercel's card (e.g. `cname.vercel-dns.com`, or a project-specific `…vercel-dns-0xx.com`) | 600 |

   Porkbun adds the domain name by itself, so the host is `www`, not `www.htuindia.lol`.
3. Back on Vercel, press **Refresh** on the domain cards. Within minutes (sometimes up to a few hours) both turn
   **Valid Configuration**, and Vercel issues the HTTPS certificate by itself. Then https://htuindia.lol opens the site.

(Alternative: on Porkbun, change the domain's **nameservers** to `ns1.vercel-dns.com` and `ns2.vercel-dns.com` and let
Vercel manage all DNS. Not needed if the two records above work.)

Until the domain is ready, the project's `https://<project>.vercel.app` address works the same way, including the QR codes.

## 4. Testing latency with real phones

1. On the laptop open **https://htuindia.lol/football** and press **Shift+D** (or open `/football?debug`): the overlay
   shows messages per second and each phone's round trip (`p1 84 ms`).
2. Scan the QR with a phone **on mobile data**. On the phone, tap the ping indicator (top right, `84 ms`) **three times**
   for the same overlay.
3. Rough guide for the round trip (phone → Supabase → laptop → back): under ~150 ms feels instant, 150–250 ms is
   playable, above ~300 ms the controls feel late.
4. Supabase dashboard → **Reports → Realtime** shows the real message counts per second.

## 5. Going back to the offline version

The last fully-offline version (laptop server + Windows hotspot) is the git tag `local-hotspot-version`. Check it out
into its own folder (with internet, the day before, so `npm install` can run), and use it only if the booth has no internet:

```bash
git worktree add ../india-speaks-offline local-hotspot-version
cd ../india-speaks-offline
npm install
npm start
```

Then follow that folder's `BOOTH_SETUP.md`.
