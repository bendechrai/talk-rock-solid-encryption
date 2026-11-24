# Accuracy review

A technical review of the talk against the Melbourne narration
(`transcript-ndc-melbourne-2025.md`) and the original slides. The slides in this repo show the
accurate version in every case below. What is left for Ben is the spoken part: each entry says
what was said or shown, what is accurate, and a suggested wording.

Entries are in talk order. Timestamps are from the Melbourne recording.

## Why we need encryption (1:32)

- **Signal's growth.** Said: "Signal's user base grew by 4,000% after the WhatsApp privacy
  changes." The widely reported figure is that Signal *downloads* rose by about 4,200% week on
  week after WhatsApp's January 2021 privacy policy change. Say "downloads".

## Encrypted on the server (7:12)

- **What the initialisation vector does.** Said: it encrypts a block, "and then it uses that
  block of data as the next initialisation vector to then encrypt the next block". That describes
  CBC chaining. The code is AES-GCM: the IV is a number used once per message, encryption is a
  counter mode, and an authentication tag is added so tampering is detected. Suggested: "a random
  starting value that must never be reused with the same key".
- **"It's padded out really, really quickly."** AES-GCM does not pad. The ciphertext is the
  length of the message plus a 16-byte tag; it looks longer because the IV and tag are stored
  with it and the whole thing is base64-encoded.

## End-to-end encryption (12:33)

- **Slips between "public" and "private".** At 13:50, "she will share the private key with Bob"
  (public). At 14:15, "public keys can also be used for sign" (corrected on the spot to
  private). At 23:17, "encrypted using Bob's private key" (corrected to public). The slides now
  label the keys the first time they appear and draw a private key inside a shield throughout,
  so the picture stays right when a word slips.
- **Signing, in passing.** Accurate as said. One caveat worth knowing if asked: the demo app does
  not sign messages, so a recipient cannot prove who sent one. The sender's name on a message is
  whatever the client claimed.

## Multi-recipient encryption (28:22)

- **"Using the sender's private key."** Said, and shown on the old code slide:
  `encryptMessage(message, member.publicKey, senderPrivateKey)`. The app does not use the
  sender's private key to encrypt. Each copy is sealed with a fresh one-off key pair and the
  recipient's public key (`shared/src/asymmetric.ts`). Suggested: "encrypt the message for that
  member using their public key".
- **A copy for yourself.** Said correctly in the demo and worth keeping: the sender must seal a
  copy to their own public key or they could never read their own message again.

## Ephemeral keys (31:43)

- **The definition of perfect forward secrecy.** Said: "if you get a key you can decrypt every
  message after that point but you can't decrypt messages that came before". In this design a
  stolen chat key opens only the messages sealed to that key: one conversation, for that key's
  lifetime. Messages before it used an older key and messages after rotation use a newer one. A
  stolen identity key opens no messages at all. Suggested: "a stolen key opens one conversation,
  for a short window, and nothing before or after".
- **"Perfect".** The design gives forward secrecy only if expired private keys are actually
  deleted, which the talk goes on to treat as a choice. Protocols described as having perfect
  forward secrecy, such as Signal's Double Ratchet, derive a new key for every message. "Forward
  secrecy" without "perfect" is the safer claim.

## Key rotation and retention (43:50)

- **Rotation is not automatic.** The narration reads as if a new key pair appears when the old
  one expires. In the app, a device makes a new key when it next sends. Until then, other people
  keep sealing to the expired key, and its owner can read those messages only because the device
  still holds the old private key. The slide now says "made when Bob next sends".
- **Which keys open the old message.** Said: "the active key pairs ... for Bob and Alice is not
  going to be able to decrypt that." True, and it understates it: none of the three current keys
  opens it. Suggested: "none of the current keys".
- **The key count.** Ben noted on stage that two slides had the wrong number of keys in the blue
  set. Fixed: blue holds Bob and Alice, then Charlie as well once Charlie has joined.
- **"Exponential."** Said at 46:36, "exponential data growth", and the old speaker notes say
  complexity "grows non-linearly" and management infrastructure "scales exponentially". Nothing
  here is exponential. Stored data grows with messages times recipients; the number of kept keys
  grows with time and with the number of conversations. Suggested: "it multiplies".
- **Retention periods.** Said: medical records are kept "typically for most countries 7 years".
  Periods vary widely by country and record type. Suggested: "for years".
- **Worth saying aloud.** Rotation only protects the past if old private keys are deleted. The
  slides show the trade-off; one sentence would make it explicit.
