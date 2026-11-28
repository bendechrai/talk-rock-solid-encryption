# Building Rock-Solid Encrypted Applications

The talk and its live demos in one repository. The slides are animated scenes that run in the
browser, and the demos are the real chat app ("Whisper") running against a real backend, on the
same stage.

## Running it

### With Docker (recommended)

All you need is Docker. On a new machine:

```bash
git clone https://github.com/bendechrai/talk-rock-solid-encryption.git
```

```bash
cd talk-rock-solid-encryption && docker compose up -d --build
```

Then open http://localhost:5173. That is the whole talk: one container, one port, serving the
built presentation and the chat backend together. It needs no internet once the image is built.

```bash
docker compose logs -f
```

```bash
docker compose down
```

The demo database lives in a Docker volume and survives restarts. `docker compose down -v`
deletes it; so does "Reset" in a demo.

The port is published on this machine only, because the demo backend has no login (that is part
of the demonstration). `TALK_PORT=8080 docker compose up -d` moves it to another port, and
`TALK_BIND=0.0.0.0` offers it to the local network.

### Working on the talk

The same container with hot reload: edit anything under `presentation/src`, `server/src` or
`shared/src` and the browser updates.

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build
```

Run it again with `--build` after changing a `package.json`.

### Sharing it

The service is called `web` and listens on 5173, so with
[devtun](https://www.npmjs.com/package/devtun) set up, from this folder:

```bash
devtun add rock-solid web 5173
```

devtun writes `docker-compose.override.yml`, which Docker Compose picks up by itself; that file
is specific to your machine and is not committed. Share the built talk, not the hot-reload
version: Vite's dev server refuses host names it does not know (set `VITE_ALLOWED_HOSTS` to the
tunnel's host name if you do need it).

Everyone with the address shares one database and can send messages, change chat members and
press Reset. That is fine for letting people play with the demos, and a reason to keep the
tunnel closed while presenting.

### Without Docker

You need Node.js 22 or newer.

```bash
npm install
```

Either build the talk and serve it from the backend alone (set `PORT` to choose the port, which
defaults to 4000):

```bash
npm run build && npm start
```

Or run the two development servers, backend on 4000 and presentation on 5173, then open
http://localhost:5173:

```bash
npm run dev
```

The diagram scenes work without the backend; the demos need it.

## Presenting

| Key | Does |
| --- | --- |
| Right arrow, Space, Enter, Page Down | Next step |
| Left arrow, Backspace, Page Up | Previous step |
| Home / End | First / last step of the talk |
| B or . | Blank the screen |
| F | Full screen |
| S | Open the presenter's notes window |
| A | Show the room the code for following along on their own screens |

A clicker sends Page Down and Page Up, which always work. While you are typing in a demo phone,
Space, Enter and the arrow keys belong to the text field and do not move the talk.

On a touch screen with no keyboard, tap the right two thirds of the stage for next and the left
third for back. Taps on a demo's buttons and fields do their own job and do not turn the page.

Pressing next while a step is still animating finishes that step immediately and plays the one
after. Going back never animates. The address bar always holds the current scene and step, so
reloading the page returns to exactly where you were.

### The notes window and the presenter remote

Press S and a second window opens for you alone: the slide that is on stage, its note, the next
slide and its note, a timer, and Next and Back. Put the stage on the projector and keep this
window on the laptop's own screen. Speaker notes are never shown on the stage.

The arrow keys, Space, Enter and a clicker work in the notes window as they do on the stage, so
it does not matter which window has the keyboard. If the browser blocks the new window, the
stage offers a link to open it; allowing pop-ups for the talk avoids that.

"Maximise slide" fills the window with the slide that is on stage (and the laptop's screen,
where the browser allows a window to resize itself). It is there for the demos: you work the
phones and the server view on the laptop's own screen, facing the room, and the stage on the
projector shows the same thing. Which user each phone is, the chat that is open, what you are
typing, the server view's tab and how far it is scrolled all carry across; the mouse pointer
does not. While the slide is maximised, the arrow keys, Space, Enter and clicks do not turn the
page, so nothing you do in a demo can move the talk. A clicker's Page Down and Page Up still
do. Escape, or the faint "Notes" button in the corner, brings the notes back. This sharing is
between windows of one browser on one computer.

Your phone can be the same thing in your hand. "Pair a phone" in the notes window shows a QR
code; scan it and the phone shows the same view and buttons. The code is only ever shown in the
notes window, never on the stage, because anyone who scans it can drive the slides. Once the
phone is paired you can close the notes window and present from the phone alone. Up to six
windows and phones can share one pairing, and all of them follow the stage. On a phone the
demos are replaced by a placeholder: a phone can step past a demo but cannot drive it.

The pairing lasts as long as the stage's browser tab, reloads included. Opening the talk in a
new tab makes a new pairing and cuts off anything on the old one. The timer starts on your
first Next; click it to reset it.

The phone has to reach whatever serves the talk, which is the fragile part at a venue.
Conference Wi-Fi often blocks one device from talking to another, and a tunnel needs internet at
both ends. The dependable arrangement is the laptop joined to the phone's hotspot, the talk
started with `TALK_BIND=0.0.0.0`, opened on the laptop by its address on that network, and a
clicker in your pocket in case.

### Letting the audience follow along

Press A on the stage, or "Show audience code" in the notes window or on the phone, and the stage shows a
large QR code. Whoever scans it gets the talk on their own screen, moving in step with the
stage. The code goes away at your next click, so the natural place for it is the title slide
while people settle, or the last slide.

This code is safe to show. It holds a second token, worked out from the pairing token by a
one-way hash, that can only listen: it cannot move the slides, and the pairing token cannot be
worked back from it. People following can page around by themselves; your next click brings
them back. They see a "Live demo" placeholder in place of each demo, because every copy of a
demo talks to the same server and would write into the chat on stage. The notes window shows
how many people are following.

### Who can use the demos

Every browser that opens the talk is given a device id, in a cookie, on its first page load.
The first browser to open the stage itself becomes yours, and from then on the demo server
answers only your browsers and the screens you let in. Everyone else gets the "Live demo"
placeholder, and the server refuses their demo requests even if they open the talk's bare
address. By the time a code is on screen for anyone to scan, your laptop has already loaded the
stage, so it is always first.

"Screens" in the notes window lists every connected screen (your stage and notes windows,
paired phones, people following) with a switch for each: off is the placeholder, on is the live
demos. "Everyone" at the top opens the demos to all of them at once, which suits the end of a
talk. A paired phone that is switched on gets its own copy of a demo; only a notes window on the
presenting computer is mirrored to the stage.

Until a stage has been opened nothing is locked, so a fresh checkout works as before. The
record of which browser is yours is kept beside the database (`stage.json` in the data volume)
and survives a restart; `docker compose down -v` forgets it along with the demo data. The same
file holds a stage key. Opening the talk as `/?stage-key=<key>` makes that browser yours as
well, which is how to move to another laptop, and how the audit scripts get in: they read the
key from the running container, or from `TALK_STAGE_KEY`.

## Layout

```
shared/        Types and the encryption code used by both sides (AES-GCM, X25519 sealed boxes)
server/        The Whisper backend: an HTTP API over one JSON file
presentation/  The stage: scenes, artwork, animation engine and the demo chat app
Dockerfile, docker-compose*.yml   The talk as one container; see "Running it"
docs/          Reference material, including a transcript of the talk
```

### The server

The message endpoints come in three versions, one per stage of the talk:

- `/api/v1` stores and returns plaintext.
- `/api/v2` encrypts at rest with a single server key, and decrypts for anyone who asks.
- `/api/v3` stores and returns whatever the client sent, which with end-to-end encryption is
  ciphertext the server cannot read.

None of the endpoints check who is asking. That is part of the demonstration.

`/api/remote` is separate from the chat app: it relays the slide position and next/back between
the stage and a paired phone (`server/src/remote.ts`), over Server-Sent Events, and does need
the pairing token.

Outside Docker the database is `server/data/db.json` (`WHISPER_DB` moves it). It is created on
first run and is not committed. "Reset" in
a demo's header empties it and clears the keys held in the browser.

### The presentation

- `src/art/svg/` holds every drawing as a standalone SVG file. Edit them in any vector tool.
- `src/art/index.tsx` turns drawings into actors: characters, laptops, keys, messages, routes.
- `src/engine/` is the stage. `Deck.tsx` handles navigation; `motion.ts` is the vocabulary scenes
  use to move things (`show`, `pop`, `fly` along a Bézier curve, `along` a route, and so on).
- `src/scenes/` holds the talk. `index.tsx` lists the scenes in order.
- `src/remote/` is the presenter's side: the notes window and phone page, which is this same app
  opened with `?remote=<token>`, and the code the room scans to follow along (`?follow=<token>`).
- `src/demo/` is the chat app. `protocols.ts` defines what a phone does to a message at each
  stage; the phone and the server inspector are shared by every demo.

A scene is a component that puts every actor on stage, plus a list of steps. Each step describes
one click's worth of change:

```tsx
{
  notes: 'Alice encrypts with Bob\'s public key.',
  build: (tl) => {
    fly(tl, '#bob-public-alice', at.bobPublicAtAlice, at.aliceScreen, { bend: -50 });
    swap(tl, '#alice-plain', '#alice-cipher');
  },
}
```

## The talk

65 scenes, 226 clicks. Each file in `presentation/src/scenes/` is one part of the talk:

| File | Scenes | Covers |
| --- | --- | --- |
| `opening.tsx` | `open-*` | Title, bio, why encryption matters, the plaintext chat app, encryption on the server, recap |
| `endToEnd.tsx` | `e2e` | Key pairs, exchanging public keys through the server, one message end to end |
| `multiRecipient.tsx` | `multi-*` | A third person, one sealed copy per member, what a stolen key exposes |
| `ephemeral.tsx` | `eph-*` | A key pair per conversation, and re-encrypting history for a new member |
| `rotation.tsx` | `rot-*` | Key rotation, and whether to keep old private keys |
| `devices.tsx` | `dev-*` | One user with several devices, and linking a new device |
| `scaling.tsx` | `scale-*` | How copies multiply, symmetric encryption, Diffie-Hellman |
| `metadata.tsx` | `meta-*` | What metadata gives away, ways to hide it, summary |

Every step carries a presenter note (shown in the notes window) with the narration it serves, taken from the
Melbourne recording (`docs/transcript-ndc-melbourne-2025.md`). Where that narration was
technically inaccurate, the slide shows the accurate version and
`docs/accuracy-review.md` lists what to say instead.

## The demos

Four demo scenes sit in the talk where the live demos happen. Each shows two phones running the
chat app against the real server:

1. **A simple chat app.** Nothing is encrypted.
2. **Encrypted on the server.** The server encrypts at rest with one key and decrypts for anyone.
3. **End-to-end encryption.** Each device has a key pair; a message is sealed once per member.
4. **Short-lived chat keys.** Each conversation gets its own keys, which expire after a minute.

"Behind the scenes" opens the presenter's view of the server next to one phone (pick which with
the two badges beside it):

| Tab | Shows |
| --- | --- |
| Messages | Every stored message: readable text in white, ciphertext in green, sealed messages as one chip per recipient. "Raw" shows the stored value; "Copy" copies it. |
| Chats | Conversations, with members you can add and remove, and the users table. |
| Keys | The public keys the server holds, and each chat key with its time left. |
| API | Ask the API for anything. There is no login. |
| Devices | The keys each device holds. Generate, reveal, copy, delete; for chat keys, expire one now rather than waiting out the minute. |
| Decrypt | Try a key against a stored message. |

"Reset" empties the database and every device's keys; it asks twice.

## Checks

```bash
npm test
```

```bash
npm run typecheck
```

Four audits drive a real browser against the running talk, however it was started. They run on
the host and need Node.js and Playwright:
`npm install && npm install --no-save playwright && npx playwright install chromium`. Set
`PRESENTATION_URL` if the talk is not on http://localhost:5173.

Flag any text too small to read from the back of a room, at every step of every scene:

```bash
npm run audit:legibility -w presentation
```

Replay the four demos following the Melbourne narration and check each beat (this resets the
database):

```bash
npm run audit:demos -w presentation
```

Print every presenter note in click order, and fail if a step has none:

```bash
npm run audit:notes -w presentation
```

Save a screenshot of every step, to review a scene as the audience sees it:

```bash
npm run audit:screenshots -w presentation -- /tmp/shots e2e --play
```

## Licence

MIT.
