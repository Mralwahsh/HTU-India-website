# Booth setup: India Speaks at HTU International Week

The site runs on the web at **https://htuindia.lol** (Vercel). The laptop opens it like any website, and visitors'
phones scan QR codes and use **their own mobile data or any Wi-Fi**. The phone controllers talk to the laptop through
Supabase Realtime. How it is deployed: [DEPLOY.md](DEPLOY.md).

```
 phone (4G/5G or any Wi-Fi) ──► htuindia.lol/controller?room=K7QM2X ──► Supabase Realtime ──► laptop: htuindia.lol/football
```

---

## 0. Morning of the event (checklist)

1. **Laptop internet**: connect the laptop to the venue Wi-Fi (or a phone hotspot / USB tethering as a backup) and open any website to be sure.
2. **Supabase is awake**: open the [Supabase dashboard](https://supabase.com/dashboard). If the project says *Paused*, press **Restore** and wait until it is green (free projects pause after about a week without use).
3. **Open the site**: **https://htuindia.lol** in Chrome or Edge, fullscreen (**F11** or the ⛶ button), and click once on the page (browsers only play sound after a click).
4. **Test one QR per feature with a phone on mobile data** (Wi-Fi off):
   - Football `/football`: scan → the phone shows *اللاعب 1* → press **ركل** → the match starts. Press **Shift+D** on the laptop: the phone's round trip (`p1 … ms`) should be under ~250 ms.
   - Raga Tiles `/tiles-qr`: scan → the song list loads.
   - Chess `/chess`: scan the puzzle QR → the first puzzle appears.
   - Tours `/tour`: scan → the laptop shows "✅ الهاتف متصل" → push the left stick up to enter a place.
5. **If the internet at the booth fails completely**: use the offline version (laptop server + Windows hotspot, no internet
   needed). Prepare it **the day before, while you have internet**, in its own folder next to this one, so its packages
   are already on the laptop:
   ```bash
   git worktree add ../india-speaks-offline local-hotspot-version
   cd ../india-speaks-offline
   npm install
   ```
   On the day, if needed: `cd ../india-speaks-offline` and `npm start`, then follow **that folder's** `BOOTH_SETUP.md`
   (hotspot, firewall, QR codes). This folder (the web version) stays untouched.

---

## 1. Big Head Football (`/football`)

1. Open **https://htuindia.lol/football** on the laptop.
2. The lobby shows a QR code and a **room code** (e.g. `K7Q M2X`). Visitors scan the QR with the phone camera; the
   controller opens at `htuindia.lol/controller?room=K7QM2X`. Without a camera they can open `htuindia.lol/controller`
   and type the room code.
3. The first phone is **Player 1**, the second **Player 2**; without a second phone, P2 is played on the keyboard.
4. Players pick a character with ◀ ▶ and press **ركل** (kick) to start.

After every game the laptop shows a **new room code** (when it goes back to the lobby). Phones on the old code are told
"انتهت هذه الجولة" and scan again; a rematch straight from the result screen (press **ركل**) keeps the same code.

### Keys on the laptop

| Key | Action |
| --- | --- |
| **Esc** / **من جديد** button | End the match and go back to the lobby (with a new room code) |
| **A D W S** | Play P1 with the keyboard (move, jump, kick); in the lobby A/D change P1's character |
| **← → ↑ ↓** | Play P2 with the keyboard; in the lobby ←/→ change P2's character |
| **P** | Show / hide each phone's ping on the lobby |
| **Shift+D** | Developer overlay: Realtime messages per second and round trips (phones: tap the ping three times) |
| **M** | Sound on / off |

### What visitors do (shown on the lobby screen)

1. Scan the QR code with the phone camera
2. Turn the phone sideways
3. Pick a player with the arrows
4. Press «ركل» to start the match

---

## 2. Troubleshooting

| Problem | Fix |
| --- | --- |
| **Lobby says "جارٍ الاتصال…" / "انقطع الاتصال بالإنترنت" over the QR** | The laptop can't reach Supabase: check the laptop's internet; check the Supabase project isn't paused (step 0.2). |
| **Lobby shows "وضع الاختبار المحلي"** | The site was built without the Supabase keys. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in Vercel and redeploy ([DEPLOY.md](DEPLOY.md) §3). |
| **Phone shows "لا تجد الشاشة هذه الغرفة" or "انتهت هذه الجولة"** | The code is old (the laptop moved on to a new game). Scan the QR on the laptop again. |
| **"اللعبة ممتلئة" (game full) on a phone** | Two phones are already playing. The phone joins by itself when the match ends. |
| **A player's phone locked or lost signal mid-match** | The match pauses after a few seconds. Unlock the phone / reopen the page (it gets its slot back by itself) or scan the QR again; a 3-2-1 countdown resumes the match. |
| **The laptop lost the internet mid-match** | The match pauses ("انقطع اتصال الحاسوب بالإنترنت") and resumes with a countdown when the connection is back. |
| **Controls feel late** | Shift+D on the laptop: if the phone's round trip is above ~300 ms, try the phone on Wi-Fi instead of mobile data (or the other way round). |
| **No sound** | Click anywhere on the laptop page once (browser rule), and check **M** / the speaker button. |

---

## 3. Development

```bash
npm run dev
```

Vite on `http://localhost:5173`. Without Supabase keys in `.env.local` the realtime pages run in *local test mode*
(open the controller link in a second tab of the same browser). Details in [DEPLOY.md](DEPLOY.md) §2.

Debug helpers in development builds: `window.__footballHost` (room, slots, held buttons) and `window.__football`
(the Phaser scene) in the console; `?debug` on `/football` or `/controller` shows the Realtime overlay.

---

## 4. Virtual tours (`/tour`)

Visitors walk through 360° photos of places in India with a phone that works like a gamepad. It has its **own controller page** (`/tour-controller`) and its own room code: the football `/controller` is not affected.

```
 Laptop:  https://htuindia.lol/tour
 Phones:  https://htuindia.lol/tour-controller?room=K7QM2X   (the QR code on the tour screen)
```

1. Open **https://htuindia.lol/tour** (or click **جولات** in the top bar).
2. The visitor scans the QR with the phone camera (or opens `htuindia.lol/tour-controller` and types the **room code** shown under the QR), then turns the phone sideways.
3. On the map, the **left stick** picks a place (← →) and pushing it **up** enters the tour.
4. Inside a tour, the **كل الأماكن** button (top right, under the place name) goes back to the map of places, so a visitor can pick another place without leaving the page. The phone stays connected.

The room code stays the same while the page is open. **Esc** / **من جديد** (new visitor) starts a fresh code: the phone on the old code is told to scan again.

### The phone controller

| Control | What it does |
| --- | --- |
| Left stick (orange) | **Up**: walk forward to the next viewpoint in the direction you are looking (keeps walking every 0.8 s while held). **Left / right**: step to a side path. **Down**: turn around. |
| Right stick (blue) | Look around. The further you push, the faster it turns. It eases to a stop when you let go. |
| ⊕ / ⊖ | Zoom in / out while held |
| ℹ️ | Facts about the place on the laptop screen (press again to hide) |
| ⏭️ | Next place |
| 🗺️ | Back to the map |

The phone buzzes briefly on every step and twice when there is no path that way. **Only one phone controls the tour at a time.** A second phone shows "شخص آخر يتحكم بالجولة" and takes over automatically when the first one leaves (a phone that drops out keeps its seat for 15 s so it can reconnect).

The phone sends both sticks in one message, only when they change and at most 10 times a second (once a second while a stick is held still); the laptop smooths the look stick between messages. Shift+D on the laptop (or three taps on the phone's ping) shows the message rate and the round trip.

### Keys on the laptop (testing without a phone)

| Key | Action |
| --- | --- |
| **W A S D** | Move stick (on the map: A / D choose a place, W enters) |
| **Arrow keys** | Look around |
| **+ / −** | Zoom |
| **I** | Facts |
| **M** / **كل الأماكن** button | Back to the map of places (the phone stays connected) |
| **N** | Next place |
| **Esc** | New visitor: back to the map with a new room code (the phone must scan again) |

### Offline photos or Google Street View

The booth default is **offline**: 23 freely licensed 360° photos in `public/tours/` for 6 places (Sanchi Stupa, Gateway of India, Ajanta Caves, Ellora Caves, Hyderabad, Udayagiri Caves), with no internet needed.

All of them are full 360° photos. The Sanchi, Ajanta, Ellora and Udayagiri ones are cropped a little below the horizon (their bottom had a watermark and the photographer), so the view stops about 15° down. Free 360° photos of the Taj Mahal, Meenakshi Temple, Kailasa or the root bridges don't exist yet; to add a place later, drop its 360° photo(s) in `public/tours/` and add an entry to `src/tour/places.js`.

Google Street View can be used instead when the laptop has internet:

1. Create a Google Maps API key with **Maps JavaScript API** enabled, and restrict it by HTTP referrer to `https://htuindia.lol/*`, `http://localhost:5173/*` and your Vercel preview addresses.
2. Put it in a file named **`.env.local`** in the project folder (this file is not committed):
   ```
   VITE_GOOGLE_MAPS_API_KEY=your-key-here
   ```
3. In [`src/tour/config.js`](src/tour/config.js) set `provider: 'auto'` (Street View when online, offline photos otherwise) or `'google'`.
4. On Vercel, add the same variable under Settings → Environment Variables and redeploy ([DEPLOY.md](DEPLOY.md) §3). If Google fails to load, or rejects the key, the tour falls back to the offline photos by itself.

**Test page: `/streetview-test`** (e.g. https://htuindia.lol/streetview-test, not in the top bar). Use it to check the key before the event:

- The chips at the top say whether the key is set, the laptop is online, the Google script loaded and **whether Google accepted the key**. Google finds panoramas even with a bad key and only refuses when it draws one, so "Key: accepted" appears only after a panorama is actually shown.
- Pick a ready-made place (Taj Mahal, Meenakshi, Kailasa, the root bridges, the Golden Temple… and the current tour places in green) or type a latitude / longitude. Set the search radius, and tick "outdoor only" to skip visitors' photo spheres.
- It shows the panorama id, distance, date, author and how many walkable neighbours it has. Walk and look around with the same keys as the tour (W A S D, arrows, + / −).
- **Copy** gives a ready line such as `google: { panoId: '…', heading: 120 },` for that place in [`src/tour/places.js`](src/tour/places.js), so the tour opens exactly on that panorama, facing that way.

All the "feel" settings (stick dead zone, look speed, smoothing, walk interval, zoom speed, keys) are in [`src/tour/config.js`](src/tour/config.js). Places, facts and walking directions are in [`src/tour/places.js`](src/tour/places.js).

### Test with a real phone before the event

- [ ] Scan the tour QR **on mobile data**: the controller opens, shows the place name at the top and a green dot; the laptop shows "✅ الهاتف متصل".
- [ ] Hold the phone upright: the "turn your phone" screen appears; sideways: the controls come back.
- [ ] Both sticks at the same time (walk + look) work with two thumbs.
- [ ] Look stick: smooth turning, stops gently on release, can't look past straight up/down.
- [ ] Walk all the way around Sanchi Stupa (south → east → north → west gate) and down into the Ajanta caves; the phone buzzes once per step.
- [ ] Look all the way around and up/down in each place: no black areas.
- [ ] Walk into a wall: double buzz and "لا يوجد طريق في هذا الاتجاه" on the laptop.
- [ ] Pull the left stick down: a smooth 180° turn.
- [ ] Hold ⊕ / ⊖, then ℹ️, ⏭️ and 🗺️.
- [ ] Inside a tour, click **كل الأماكن** on the laptop: back to the map, the phone still controls it.
- [ ] No page zoom, scrolling, text selection or long-press menu while playing.
- [ ] A second phone shows the "wait for your turn" screen, and takes over after the first phone closes the page.
- [ ] Lock the first phone for a few seconds, then unlock: it reconnects and still controls the tour.
- [ ] The football `/controller` still works as before.

Debug helper: add `?timer=1` to the `/tour` URL to keep the tour running in a background tab. In development builds the active tour is available as `window.__tour` and the room (seat, sticks) as `window.__tourHost`.

---

## 5. Raga Tiles (`/tiles-qr` on the laptop, `/tiles` on phones)

A piano-tiles game that visitors play **on their own phones**, as many at once as you like. The laptop only shows a QR code; the game and its music run on each phone (sound comes from the phone's speaker, never the laptop).

```
 Laptop:  https://htuindia.lol/tiles-qr   (only the big QR code; Esc goes back to the site)
 Phones:  https://htuindia.lol/tiles      (what the QR code opens)
```

1. Open **https://htuindia.lol/tiles-qr** on the laptop (fullscreen with F11).
2. Visitors scan the QR code with the phone camera (mobile data or any Wi-Fi).
3. On the phone: wait for the short loading bar → **اضغط للبدء** (Tap to start; this also switches the sound on) → pick a song and Easy / Normal.

The phone downloads everything once (about 110 KB: the game, one font and the songs, nothing else from the site). After that it needs no network at all: no server calls, no sockets, so losing the signal mid-song changes nothing.

**Sound tip for iPhones:** Web audio is muted when the **silent switch** (side of the iPhone) is on. The game shows "لا يوجد صوت؟ أطفئ الوضع الصامت 🔔"; flip the switch and turn the volume up.

### The two kinds of song

| Mode | How it plays |
| --- | --- |
| **Respectful** (the National Anthem) | The melody plays by itself from start to finish at its normal tempo, and the tiles fall with it. Tapping only adds points and a soft glow; missing never stops the music. No fail sound, no game over, no speed-up, no effects. A calm screen before ("Jana Gana Mana", one line about Tagore) and a calm "شكرًا لك" at the end. |
| **Classic** | The first tile waits for a tap; then each correct tap plays that tile's note (hold the long tiles). Missing a tile or tapping an empty lane ends the round → "حاول مرة أخرى". |

Easy shows fewer tiles (only notes on the beat; in classic the notes in between play by themselves after the tap). Best scores are saved per song and difficulty on each phone.

### Add a song from a MIDI file

Songs are JSON files in `public/songs/`, listed in `public/songs/index.json` (respectful songs are always shown first). The converter writes both:

```bash
npm run song -- path/to/song.mid --title "Song name" --title-ar "اسم الأغنية"
```

**The National Anthem is included**: its melody (Rabindranath Tagore) comes from the public-domain score harmonized by Herbert Murrill (1950) on Wikimedia Commons, played at the official length of about 52 seconds. How it was made, and the source files, are in [`songs-src/`](songs-src/README.md). To use a different MIDI of it instead:

```bash
npm run song -- path/to/jana-gana-mana.mid --preset anthem
```

The preset sets the id `jana-gana-mana`, the titles, the one-line intro and **respectful** mode, and overwrites the current file. Commit and push to publish it.

The converter prints every track of the MIDI file and picks the melody (the highest non-drum track). Useful options:

| Option | When |
| --- | --- |
| `--track 2` | It picked the wrong track: choose the melody track from the printed list |
| `--min-gap 0.16` | It warns that notes are too fast: drop ornaments closer than this |
| `--tempo-scale 0.9` | Play slower (0.9) or faster (1.1) |
| `--transpose -12` | Move up or down (it already moves the melody into a comfortable piano range) |
| `--mode respectful` | Any other song that must play uninterrupted |
| `--dry-run` | Only print what it would do |

Use only MIDI files you are allowed to use (public domain, or your own arrangement). The classic "لحن تجريبي" song is an original test tune.

Melodies written as LilyPond notation (common on Wikipedia/Commons) can be turned into MIDI first with `node scripts/lilypond-melody-to-midi.js melody.ly out.mid --relative "c''" --seconds 52` (the melody line only).

### Tapping

A tile counts when you touch the tile itself or near it: half a tile above or below it, and a little into the lanes beside it. Tiles can be tapped early, before they reach the line (they then score "جيد" instead of "ممتاز"). Tapping a tile you have just played again doesn't count as a mistake. The sizes are in `TOUCH` and `TILE_SEC` in [`src/tiles/config.js`](src/tiles/config.js).

### Test with real phones before the event

- [ ] Scan the QR on `/tiles-qr`: the loading bar finishes, then "اضغط للبدء".
- [ ] Sound plays on an Android phone and on an iPhone (silent switch off).
- [ ] Classic: tap the first tile to start; a wrong tap ends the round; "حاول مرة أخرى" restarts.
- [ ] Hold tiles: holding keeps the note sounding; two fingers at once work.
- [ ] Respectful: put the phone down without tapping: the melody plays to the end and "شكرًا لك" appears.
- [ ] Turn mobile data and Wi-Fi off after the song list appears: everything still works.
- [ ] Three or four phones playing at the same time.
- [ ] No page zoom, scrolling or long-press menu while playing; turning the phone sideways shows "أمسك الهاتف بشكل عمودي".

Debug helper: `/tiles?timer=1` keeps the game running in a background tab (for testing on the laptop).

---

## 6. India & Chess (`/chess`) and the Puzzle Challenge (`/chess/puzzles`)

```
 Laptop:  https://htuindia.lol/chess            (top bar: شطرنج)
 Phones:  https://htuindia.lol/chess/puzzles    (the QR code at the bottom of /chess)
```

`/chess` is a short scrolling page: the countdown to the World Championship match, how the Chaturanga pieces became today's pieces (tap or hover a piece), the journey India → Persia → Arab world → Europe → the world, and a timeline. At the bottom: **ابدأ تحدّي الألغاز** (plays on the same device), a QR code to play on a phone, and **today's top solvers**, which refresh every 5 seconds.

The **Puzzle Challenge** is a 15-level ladder: mate in 1 (levels 1–6), mate in 2 (7–12), mate in 3 (13–15). Three lives for the whole run; a wrong move costs one and the board shakes. At zero lives the answer is shown, then the end screen. Solving all 15 gives the "غراندماستر!" screen. The page is its own small download (about 450 KB) and needs no network after it has loaded, except to send the final score.

### Leaderboard

> ⚠️ **Being migrated:** the leaderboard still expects the old local server; it moves to a Supabase table in a next
> step. Until then the web version shows "الخادم غير متصل" there, and finished runs wait on the phones.

- Kept on the laptop in `data/chess-leaderboard.json`: today's results only; it starts empty every day by itself.
- Ranking: most levels completed, then the fastest total time. Each name appears once (its best run).
- **Clear it:** on the laptop, on the `/chess` page, press **Shift + R three times** quickly and confirm. This only works on the laptop itself; phones can't clear it.
- If a phone loses its connection at the end of a run, its score waits on the phone and is sent automatically later.

### Puzzles

Every puzzle is checked by `npm run puzzles`, and again at the start of every `npm run build` (also on Vercel). The build stops if a puzzle is wrong. It checks, by trying every defence:
- the position is legal;
- the mate is forced in exactly the stated number of moves;
- any other move that also mates in time is accepted as correct;
- every answer line ends in checkmate (double-checked with chess.js).

It then measures each puzzle's difficulty and puts it on a level, printing a report (puzzles per level). The list you edit is [`puzzle-sources/puzzles.json`](puzzle-sources/README.md); the game reads the generated `public/puzzles/puzzles.json`.

**Add puzzles from real games** (e.g. Anand's or Gukesh's games): put the PGN files in `puzzle-sources/`, then

```bash
npm run puzzles:pgn -- puzzle-sources/anand.pgn --scan
```

It lists every position where the side to move has a forced mate in 1–3 (or use `--move 31` / `--move 31 --side b` for one position). Add `--add` to save them, then run `npm run puzzles` to verify them and see which level each lands on. Puzzles from real games show a "هل تعلم؟" card with the player, event and year after they are solved.

**More original puzzles:** `npm run puzzles:generate` constructs new positions until every tier has 11 (options: `--per-tier 15`, `--tier 5 --count 4`).

**Testing:** open `/chess/puzzles?test`. **A** plays the correct move (such runs are never sent to the leaderboard) and **W** plays a wrong one.

The match date, the history texts and the timeline are in [`src/config/chess.js`](src/config/chess.js); everything marked `TODO: verify` there must be checked before the event.

### Test with real phones before the event

- [ ] Scan the QR at the bottom of `/chess`: the challenge opens; play as a guest and with a nickname.
- [ ] Tap a piece then a square, and drag a piece: both work; legal moves show as dots.
- [ ] A mate in 2: after your first move, the opponent answers by itself.
- [ ] A wrong move shakes the board and removes a ♟️; at zero the answer plays, then the end screen.
- [ ] The score appears on `/chess` within a few seconds.
- [ ] Turn the phone's data off before finishing a run: the end screen says the score will be sent later; turn it back on: it arrives.
- [ ] `/chess` scrolls on a phone and the top bar menu slides sideways.
- [ ] Shift+R ×3 on the laptop clears the list.
