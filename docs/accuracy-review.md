# Accuracy review

A technical review of the talk against the Melbourne narration
(`transcript-ndc-melbourne-2025.md`) and the original slides. The slides in this repo show the
accurate version in every case below. What is left for Ben is the spoken part: each entry says
what was said or shown, what is accurate, and a suggested wording.

Entries are in talk order. Timestamps are from the Melbourne recording.

## Why we need encryption (1:32)

- **Signal's growth.** Said: "Signal's user base grew by 4,000% after the WhatsApp privacy
  changes." The widely reported figure is that Signal *downloads* rose by about 4,200% week on
  week after WhatsApp's January 2021 privacy policy change. Say "downloads". The slide does.
- **The GDPR ceiling.** Said: "$20 million, uh, 20 million euros ... or 4% of your global
  revenue." It is EUR 20 million or 4% of worldwide annual turnover, whichever is higher.
- **Where each example sits.** In Melbourne the Colonial Pipeline figure came out under
  "regulatory" and the GDPR fine under "reputation". The slide puts each figure beside the reason
  it supports, so the order on screen differs slightly from that delivery.
- **Legal and ethical obligations** has no example: the screen flickered at that point in
  Melbourne and nothing was said. It may deserve one.

## Encrypted on the server (7:12)

- **What the initialisation vector does.** Said: it encrypts a block, "and then it uses that
  block of data as the next initialisation vector to then encrypt the next block". That describes
  CBC chaining. The code is AES-GCM: the IV is a number used once per message, encryption is a
  counter mode, and an authentication tag is added so tampering is detected. Suggested: "a random
  starting value that must never be reused with the same key".
- **"It's padded out really, really quickly."** AES-GCM does not pad. The ciphertext is the
  length of the message plus a 16-byte tag; it looks longer because the IV and tag are stored
  with it and the whole thing is base64-encoded.
- **What gets stored.** Said at 8:41: "we're encoding the plain text and returning that to the
  database". It is the ciphertext that goes to the database. And at 7:56 the message is described
  as stored before the key is mentioned; the slide has the server encrypt first, then store.
- **"Shared secret."** Said at 8:05 of the server's key. Nobody shares it: it is one key held
  only by the server and used for every message. The slide says "one key for every message".
- **"In transit it's still in plain text."** True of the application: the phone hands the server
  readable text. In production TLS would protect the wire, but TLS ends at the server, so the
  server still receives plaintext. Worth one clause if anyone asks.

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
  copy to their own public key or they could never read their own message again. The slide now
  shows it as "the sender's own copy".
- **Sending copies to people outside the group.** Said at 29:22 as something the system could do
  to hide who a message is for. The demo app does not do it. The slide draws it as a "could",
  with a grey route to a laptop marked "not in the group".
- **Simplified on the slide.** Each sealed copy is drawn as a padlocked chip tagged with its
  recipient. In reality every copy has different ciphertext and carries the one-off public key
  that sealed it; the slide leaves both out to keep the idea of "one copy each" clear.

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
- **"Doesn't really know who was the recipient."** Said at about 35:20 of someone watching
  traffic in and out of the server, and true of that observer. It is not true of the server,
  which holds the blue key set and so knows exactly who is in the chat; and the number of sealed
  copies tells anyone who sees the stored message how many recipients it has. The slide caption
  stays with what is certain: "Everyone fetches it. Only a blue key opens it."
- **"If this key gets exposed, anything encrypted with this key is no longer readable."** Said in
  Demo 4 as Bob's key expires. Expiry stops *new* messages being sealed to the key. Messages
  already sealed to it stay readable by anyone holding that private key, which is why the next
  section's question (keep old private keys or delete them) matters.
- **"We added Charlie to the conversation."** Said at 42:17. In Melbourne Charlie was added during
  Demo 3, to the Alice and Bob chat on identity keys, not in Demo 4. The slides show Charlie
  joining the blue chat, as the original slides did, so the picture is consistent either way.
- **Re-encrypting history is a choice.** The slides show how a new member can be given old
  messages: an existing member's device opens each one and seals it again for everyone, because
  the server cannot. Whether a new member *should* see history is a product decision, and many
  secure messengers deliberately do not allow it. Worth a sentence.
- **New on the slides.** One scene (`eph-idea`) was added before the key-pair diagram to carry
  what was said over the title slide: identity keys stay, each conversation gets its own
  short-lived pair, pairs are replaced, and a stolen one opens little. Drop it from
  `beforeDemo4` in `presentation/src/scenes/ephemeral.tsx` to talk over the title instead.

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

## Single user, multiple devices (47:49)

- **"The server now has an additional key to encrypt things with."** The server never encrypts in
  this design. The sender's device fetches one more public key and seals one more copy.
  Suggested: "so every message now gets one more sealed copy, for the phone".
- **"How do we know that it's the same device?"** and later "they're both from the same device".
  The question is whether two devices belong to the same *user*. The slide says "the same user".

## Device linking (49:23)

- **"Take the private key of the device."** Said at 51:29 and again at 51:45, then corrected. The
  phone sends its *public* key. No private key leaves either device anywhere in this flow, and
  the slide makes that explicit: the phone's shield stays put under the label "private key stays
  on the phone", and the final caption reads "No private key moved".
- **What Signal does.** Said at 21:06, introducing this section: Signal's devices "don't actually
  share public private keys". As far as I know that is not accurate for Signal: when a device is
  linked, the existing device sends the account's identity key pair to the new one, encrypted to
  a temporary public key the new device shows in its QR code. Signal also has the *new* device
  display the code and the existing one scan it, the reverse of this diagram. The flow on the
  slide is a sound design in its own right, so the simplest fix is not to attribute it to Signal.
  Nothing on the slides names Signal.
- **Why the QR code matters.** Said: it avoids "a network that can be tampered or interfered
  with". That is the whole point, and worth one more sentence: because the temporary public key
  arrives by camera, the phone knows whose key it is encrypting to. The slide caption says
  "Shown on screen, never sent over a network".
- **What the identity proves.** Said: the identity "could just be an email address or even just a
  user ID". That is enough for the app to decide which bubbles are "mine", but it proves nothing
  to anyone else: any device could claim the same id. A signed token, or a check by the server,
  is what makes it trustworthy. The slide caption says "a user id or a signed token".
- **Not shown.** The linked phone would also publish its identity public key to the server. Like
  the original, the slide shows only the conversation key sets growing.

## Scalability (about 54:30)

- **"Growing exponentially."** The amount stored multiplies; it does not grow exponentially.
  Every message is stored once for every device that has to read it. The slide shows the sum
  (1 × 7, 1 × 4, 1 × 4 = 15 stored for 3 sent) and never uses the word. Suggested: "it
  multiplies".
- **Why seven, then four.** Not explained in Melbourne. The slide reads it as: the first message
  is in the group chat, so the other seven of eight devices each get a copy; the second and third
  are in a chat with fewer devices, so four each. Check that this is the story intended.
- **The PGP block.** Shown as evidence that public-key encryption is bulky, and the narration
  credits the demo app's smaller payload to "using symmetric encryption". PGP is hybrid too: the
  message is encrypted once with a symmetric key and only that key is encrypted per recipient.
  The block is big because each RSA-4096 recipient costs 512 bytes, plus base64 armour. The block
  on the slide is real (GnuPG, "hi", two RSA-4096 recipients, 1,589 bytes), and a second click
  brackets it into its three parts. The honest comparison, which the last slide of the section
  captions, is X25519 + AES (635 bytes for three recipients) against RSA-4096 (1,589 for two).

## Symmetric encryption (about 56:30)

- **"That's weak. Yes, it is weak"** and later "symmetric key encryption is less secure because
  of the fact that there's one key". AES-256 is not weaker than public-key encryption; the
  messages in Demo 3 were already encrypted with it. The real difficulty is the one the narration
  then names: both sides need the same key, so how do you get it to them? The slide lists that,
  and does not say "weak" or "less secure". Suggested: "the cipher is strong; the hard part is
  sharing the key".
- **"The whole point of a shared key is everybody knows it."** Everybody *in the conversation*.
- **"Having to encrypt server side."** That was a property of Demo 2's design, not of symmetric
  encryption. The slide says "Demo 2 kept it on the server".

## Diffie-Hellman key exchange (about 57:30)

- **The roles of 7 and 23.** Said as two numbers shouted at random, ordered lowest and highest.
  They are a generator (7) and a prime modulus (23), agreed in public; in practice they are
  fixed, published parameters. The slide labels them.
- **Bob's sum.** Said: "take the seven that Alice shouted out, mod it by the five that I imagined,
  then raise it by the five, and then mod by the 23". It is 7 to the power 5, mod 23, which is 17.
  The slide shows it.
- **"For some reason, that works every time. I think it's pure magic."** One click shows why:
  (7⁶)⁵ and (7⁵)⁶ are both 7³⁰. Skip the click to keep the magic.
- **"They would probably use the public private key ... to keep it a bit more safe, but you don't
  have to."** You do have to authenticate the exchange somehow. Without it, someone in the
  middle can run one exchange with Alice and another with Bob and read everything. The numbers
  do not need to be secret; they need to be *signed*. The last click of the diagram says so.
- **The audience question about primes.** Answered roughly right. The precise version is on a
  new slide ("With real numbers"): the prime is about 617 digits (2,048 bits), or an elliptic
  curve is used instead; each secret is 256 random bits; the shared secret is hashed into the AES
  key. "Rainbow table" is not quite the term: with numbers this small an attacker just tries
  every secret.
- **This is not new to the demo.** Demo 3 already does a Diffie-Hellman exchange (X25519) and
  encrypts with AES for every sealed copy. The same slide shows the two lines of code. Worth
  saying, because the narration presents it as a change of approach.
- **It does not remove the multiplication.** A shared secret belongs to one pair of people, so a
  group message still needs one sealed copy per recipient. The narration gets there ("seven
  messages between three people, 21 messages"); a slide before it now shows why.

## Metadata attacks (about 1:01:30)

- **Gendered wording.** "This one guy", "what are you doing, dude", "because he's leaking". The
  slides say "this person", "their manager" and "if it is financial data that is leaking".
- **Friday at 4.** The original slide said 4:55pm; the slide keeps that.
- **How sure the inferences are.** The original slides stated some of them flatly. Every guess on
  the new slides carries a "probably" or a question mark, and the last one reads "All guesswork,
  yet these devices now have likely owners", which matches "I totally made it up".
- **"300%".** A rise of 300% is four times the traffic. Fine as said.

## Metadata protection (about 1:04:00)

- **Padding.** The original code card padded to 512 bytes "PKCS#7-style". PKCS#7 padding cannot
  exceed 255 bytes, so that would not work. The new card marks the end of the message with one
  byte and fills the rest of the block with zeros. Two things worth saying: pad *before*
  encrypting, and padding hides length only to the nearest block (a third click shows a 600-byte
  message taking two blocks).
- **Decoy traffic.** Said: "encrypt it, store it in the database". A decoy has to be *sent* by a
  device to hide who is talking to whom from the server or the network. Rows the server invents
  would only mislead someone who reads the database later. The slide shows decoys travelling
  between devices, and names the cost: bandwidth, storage and battery.
- **Key rotation.** Not spoken to in Melbourne. New keys make messages harder to link to earlier
  ones only if the server cannot tie the new key to the old one. In the demo app it can, because
  keys are published per user. The slide carries that condition.
- **Retrieve all messages.** Said: "if everybody gets everything it's really hard to work out who
  it's for". True of which conversations you read. The server still sees that you are online and
  how much you send, and the cost is the same as for decoys. The slide says both.

## Beyond chat apps and summary

- **Beyond chat apps** was skipped in Melbourne. The three cards carry the original slides'
  text.
- **Summary.** There was no summary slide; one was built from the closing words. "Super
  encrypted" became "end-to-end", and "implementation challenges" is spelled out as "key
  rotation, many devices, scale".
