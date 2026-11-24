# Building Rock-Solid Encrypted Applications

Ben Dechrai's conference talk and its live demos, as one browser-based asset. See `README.md` for
how to run it and how the code is laid out.

## Definition of done

Set by Ben on 2026-11-24. Work on this repo is not finished until all five hold.

1. **Readable from the back of the room.** Everything on every slide, and in the demos, can be
   read from the back. Checked by `npm run audit:legibility -w presentation` (needs the
   presentation running): text the audience must read is at least 40 stage pixels; ciphertext
   shown as texture is at least 28 and is marked `data-texture`.
2. **Diagrams follow the narration.** Diagrams, transitions and animations make sense with what
   Ben is saying at that moment. The reference narration is
   `docs/transcript-ndc-melbourne-2025.md`. Each step's `notes` records the narration it serves.
3. **Technically accurate.** What the slides show is correct, and places where the spoken
   narration is inaccurate are flagged to Ben rather than copied onto a slide.
4. **The four demos do what the script says.** Each of the four phone demos has been played
   through following the narration, and behaves as described.
   `npm run audit:demos -w presentation` replays them.
5. **The audience can see behind the scenes.** Everything the original admin panel showed
   (database tables, API queries, stored message contents, per-device keys, decryption tools) is
   available in the demos' server inspector.

## Rules for scenes

- The stage is 1920x1080. Use the sizes in `type` (`presentation/src/theme.ts`); never go below
  `type.min` for anything meant to be read.
- Each character owns one colour and one shape (`cast` in `theme.ts`). Their keys, phone and
  messages carry both. Characters and their colours are deliberately gender-neutral: no pink/blue
  pairing, no gendered features, and no gendered pronouns in on-screen text.
- A bare key is a public key; a key inside a shield is a private key. Ciphertext is green;
  plaintext is white.
- A step is one click. Advance one idea per step, in the order Ben says it.
- Movement should carry meaning: a key that is shared travels; a private key never leaves its
  device except to be used on that device's screen.
- Put actors on stage with the components in `presentation/src/art/` and move them with the
  helpers in `presentation/src/engine/motion.ts`. New drawings go in
  `presentation/src/art/svg/` as standalone SVG files.
- After changing a scene, run the legibility audit and look at screenshots
  (`npm run audit:screenshots -w presentation -- <dir> <scene-id-prefix> --play`).
