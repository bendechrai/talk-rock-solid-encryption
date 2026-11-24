# Building Rock-Solid Encrypted Applications

The talk and its live demos in one repository. The slides are animated scenes that run in the
browser, and the demos are the real chat app ("Whisper") running against a real backend, on the
same stage.

## Running it

You need Node.js 22 or newer.

```bash
npm install
```

Start the backend (the chat server, on port 4000):

```bash
npm run server
```

Start the presentation (on port 5173), then open http://localhost:5173:

```bash
npm run present
```

Or start both in one terminal:

```bash
npm run dev
```

Everything runs locally and nothing is fetched from the internet while presenting. The diagram
scenes work without the backend; the demos need it.

## Presenting

| Key | Does |
| --- | --- |
| Right arrow, Space, Enter, Page Down | Next step |
| Left arrow, Backspace, Page Up | Previous step |
| Home / End | First / last step of the talk |
| B or . | Blank the screen |
| N | Show speaker notes for the current step |
| F | Full screen |

A clicker sends Page Down and Page Up, which always work. While you are typing in a demo phone,
Space, Enter and the arrow keys belong to the text field and do not move the talk.

Pressing next while a step is still animating finishes that step immediately and plays the one
after. Going back never animates. The address bar always holds the current scene and step, so
reloading the page returns to exactly where you were.

## Layout

```
shared/        Types and the encryption code used by both sides (AES-GCM, X25519 sealed boxes)
server/        The Whisper backend: an HTTP API over one JSON file
presentation/  The stage: scenes, artwork, animation engine and the demo chat app
docs/          Reference material, including a transcript of the talk
```

### The server

The message endpoints come in three versions, one per stage of the talk:

- `/api/v1` stores and returns plaintext.
- `/api/v2` encrypts at rest with a single server key, and decrypts for anyone who asks.
- `/api/v3` stores and returns whatever the client sent, which with end-to-end encryption is
  ciphertext the server cannot read.

None of the endpoints check who is asking. That is part of the demonstration.

The database is `server/data/db.json`. It is created on first run and is not committed. "Reset" in
a demo's header empties it and clears the keys held in the browser.

### The presentation

- `src/art/svg/` holds every drawing as a standalone SVG file. Edit them in any vector tool.
- `src/art/index.tsx` turns drawings into actors: characters, laptops, keys, messages, routes.
- `src/engine/` is the stage. `Deck.tsx` handles navigation; `motion.ts` is the vocabulary scenes
  use to move things (`show`, `pop`, `fly` along a Bézier curve, `along` a route, and so on).
- `src/scenes/` holds the talk. `index.tsx` lists the scenes in order.
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

Every step carries a presenter note (press N) with the narration it serves, taken from the
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

Four audits drive a real browser against the running presentation (`npm run dev` first). They
need Playwright: `npm install --no-save playwright && npx playwright install chromium`.

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
