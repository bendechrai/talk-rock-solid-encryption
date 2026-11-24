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

The database is `server/data/db.json`. It is created on first run and is not committed. "Reset
everything" in a demo's server inspector empties it and clears the keys held in the browser.

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

## What is ported so far

The end-to-end encryption section is fully animated, and demos 1 to 3 run live. The other
sections of the talk are still to be ported.

## Checks

```bash
npm test
npm run typecheck
```

## Licence

MIT.
