/**
 * End-to-end encryption between Alice and Bob.
 *
 * Both generate a key pair, publish their public keys, and then a message travels
 * Alice -> server -> Bob as ciphertext that only Bob's private key can open. Eve taps the server
 * and gets nothing she can read.
 */
import {
  Character, CipherChip, Flow, Label, Laptop, PrivateKey, PublicKey, ScreenCipher, ScreenMessage, ScreenNote, Server,
} from '../art/index.tsx';
import { CodeCard, SceneTitle } from '../art/html.tsx';
import { Svg } from '../engine/Stage.tsx';
import { along, fly, hide, moveTo, pop, pulse, show, swap } from '../engine/motion.ts';
import type { Scene } from '../engine/types.ts';
import { cast, color, type } from '../theme.ts';

// Where things sit. Actor positions are top-left corners in stage pixels.
const KEY = 1.4;
const at = {
  alicePrivate: { x: 300, y: 440 },
  alicePublic: { x: 430, y: 462 },
  bobPublicAtAlice: { x: 590, y: 462 },
  aliceScreen: { x: 410, y: 638 },

  alicePublicAtBob: { x: 1190, y: 462 },
  bobPublic: { x: 1350, y: 462 },
  bobPrivate: { x: 1530, y: 440 },
  bobScreen: { x: 1395, y: 616 },

  alicePublicOnServer: { x: 812, y: 830 },
  bobPublicOnServer: { x: 968, y: 830 },
  chipOnServer: { x: 825, y: 606 },
};

const CIPHER = ['c26d74c865bc', 'df1c08d38559'];
const CHIP = 'c26d74c865…';

function View() {
  return (
    <>
      <Svg>
        <Flow id="to-server" d="M650 660C710 590 760 590 808 634" hidden />
        <Flow id="to-bob" d="M1112 634C1160 590 1210 590 1270 660" hidden />
        <Flow id="to-eve" d="M960 506C960 440 1100 470 1150 400" tint={cast.eve.color} hidden />

        <Character who="alice" x={40} y={400} scale={1.5} />
        <Label x={190} y={890} text="Alice" tint={cast.alice.color} />
        <Laptop x={300} y={560} scale={1.5}>
          <ScreenMessage id="alice-plain" text="Hi!" hidden />
          <ScreenCipher id="alice-cipher" lines={CIPHER} hidden />
        </Laptop>

        <Server x={800} y={500} scale={1.6} />
        <Label id="directory-label" x={960} y={950} text="public keys" tint={color.muted} size={type.min} weight={500} hidden />

        <Laptop x={1260} y={560} scale={1.5}>
          <ScreenCipher id="bob-cipher" lines={CIPHER} hidden />
          <ScreenMessage id="bob-plain" text="Hi!" hidden />
        </Laptop>
        <Character who="bob" x={1580} y={400} scale={1.5} />
        <Label x={1730} y={890} text="Bob" tint={cast.bob.color} />

        <Character id="eve" who="eve" x={880} y={70} scale={1.15} hidden />
        <Label id="eve-name" x={860} y={260} text="Eve" tint={cast.eve.color} anchor="end" hidden />
        <Laptop id="eve-laptop" x={1130} y={150} scale={1.5} hidden>
          <ScreenCipher id="eve-cipher" lines={CIPHER} hidden />
          <ScreenNote id="eve-stuck" text={"can't\ndecrypt"} hidden />
        </Laptop>

        {/* Key pairs. Copies of the public keys start hidden on top of the originals. */}
        <PrivateKey id="alice-private" owner="alice" {...at.alicePrivate} scale={KEY} hidden />
        <PublicKey id="alice-public" owner="alice" {...at.alicePublic} scale={KEY} hidden />
        <PublicKey id="alice-public-server" owner="alice" {...at.alicePublic} scale={KEY} hidden />
        <PublicKey id="alice-public-bob" owner="alice" {...at.alicePublicOnServer} scale={KEY} hidden />
        <Label id="alice-private-label" x={345} y={420} text="private" tint={color.muted} size={type.min} weight={500} hidden />
        <Label id="alice-public-label" x={500} y={420} text="public" tint={color.muted} size={type.min} weight={500} hidden />

        <PrivateKey id="bob-private" owner="bob" {...at.bobPrivate} scale={KEY} hidden />
        <PublicKey id="bob-public" owner="bob" {...at.bobPublic} scale={KEY} hidden />
        <PublicKey id="bob-public-server" owner="bob" {...at.bobPublic} scale={KEY} hidden />
        <PublicKey id="bob-public-alice" owner="bob" {...at.bobPublicOnServer} scale={KEY} hidden />
        <Label id="bob-public-label" x={1420} y={420} text="public" tint={color.muted} size={type.min} weight={500} hidden />
        <Label id="bob-private-label" x={1575} y={420} text="private" tint={color.muted} size={type.min} weight={500} hidden />

        {/* The message in transit. One chip per hop, so the server keeps its copy. */}
        <CipherChip id="chip-stored" text={CHIP} x={0} y={0} hidden />
        <CipherChip id="chip-to-bob" text={CHIP} {...at.chipOnServer} hidden />
        <CipherChip id="chip-to-eve" text={CHIP} {...at.chipOnServer} hidden />
      </Svg>

      <SceneTitle>End-to-end encryption</SceneTitle>
      <CodeCard id="keygen-code" left={404} top={156} hidden>
        <span className="dim">{'// on the device, never on the server\n'}</span>
        {'const privateKey = '}<span className="hl">randomPrivateKey</span>{'();\n'}
        {'const publicKey  = '}<span className="hl">getPublicKey</span>{'(privateKey);'}
      </CodeCard>
    </>
  );
}

export const endToEnd: Scene = {
  id: 'e2e',
  title: 'End-to-end encryption',
  notes:
    'Rather than plaintext at either end and encrypted in the middle, encrypt at either end. Then it does not matter what happens in the middle: protected at rest on the server and in transit.',
  View,
  steps: [
    {
      notes: 'Alice generates a key pair: a random private key first, then a public key derived from it. Private stays private; public is shared.',
      build: (tl) => {
        show(tl, '#keygen-code');
        pop(tl, '#alice-private', '>-0.1');
        show(tl, '#alice-private-label', '<0.2');
        tl.fromTo(
          '#alice-public',
          { x: at.alicePrivate.x, opacity: 0 },
          { x: at.alicePublic.x, opacity: 1, duration: 0.6, ease: 'power2.out', immediateRender: false },
          '>',
        );
        show(tl, '#alice-public-label', '<0.3');
      },
    },
    {
      notes: 'Bob generates a key pair too, on his own device.',
      build: (tl) => {
        pop(tl, '#bob-private');
        show(tl, '#bob-private-label', '<0.2');
        tl.fromTo(
          '#bob-public',
          { x: at.bobPrivate.x, opacity: 0 },
          { x: at.bobPublic.x, opacity: 1, duration: 0.6, ease: 'power2.out', immediateRender: false },
          '>',
        );
        show(tl, '#bob-public-label', '<0.3');
      },
    },
    {
      notes: 'Each shares their PUBLIC key. It goes to the server, which hands it to anyone in the conversation. The private keys never move.',
      build: (tl) => {
        hide(tl, '#keygen-code');
        hide(tl, '#alice-private-label, #alice-public-label, #bob-private-label, #bob-public-label', '<');
        fly(tl, '#alice-public-server', at.alicePublic, at.alicePublicOnServer, { bend: 90, reveal: true, at: '>' });
        fly(tl, '#bob-public-server', at.bobPublic, at.bobPublicOnServer, { bend: -90, reveal: true, at: '<0.15' });
        show(tl, '#directory-label', '>-0.2');
      },
    },
    {
      notes: 'Alice now has Bob\'s public key, and Bob has Alice\'s.',
      build: (tl) => {
        fly(tl, '#bob-public-alice', at.bobPublicOnServer, at.bobPublicAtAlice, { bend: 110, reveal: true });
        fly(tl, '#alice-public-bob', at.alicePublicOnServer, at.alicePublicAtBob, { bend: -110, reveal: true, at: '<0.15' });
      },
    },
    {
      notes: 'Alice types a message.',
      build: (tl) => {
        pop(tl, '#alice-plain');
      },
    },
    {
      notes: 'Before it is sent, Alice encrypts it with Bob\'s public key. Public keys encrypt; you encrypt with the recipient\'s.',
      build: (tl) => {
        fly(tl, '#bob-public-alice', at.bobPublicAtAlice, at.aliceScreen, { bend: -50, duration: 0.7 });
        swap(tl, '#alice-plain', '#alice-cipher', '>-0.1');
        fly(tl, '#bob-public-alice', at.aliceScreen, at.bobPublicAtAlice, { bend: 50, duration: 0.6, at: '>0.15' });
      },
    },
    {
      notes: 'The server only ever receives ciphertext. Whoever gets access to it cannot decrypt it without Bob\'s private key.',
      build: (tl) => {
        show(tl, '#to-server-line');
        along(tl, '#chip-stored', '#to-server', { at: '>-0.1' });
        moveTo(tl, '#chip-stored', at.chipOnServer, '>', 0.35);
      },
    },
    {
      notes: 'Bob asks for new messages. What comes over is totally scrambled.',
      build: (tl) => {
        show(tl, '#to-bob-line');
        along(tl, '#chip-to-bob', '#to-bob', { at: '>-0.1' });
        show(tl, '#bob-cipher', '>-0.1');
        hide(tl, '#chip-to-bob', '<');
      },
    },
    {
      notes: 'Bob applies his private key to the payload and gets the original message out. Private keys decrypt.',
      build: (tl) => {
        fly(tl, '#bob-private', at.bobPrivate, at.bobScreen, { bend: 50, duration: 0.7 });
        swap(tl, '#bob-cipher', '#bob-plain', '>-0.1');
        fly(tl, '#bob-private', at.bobScreen, at.bobPrivate, { bend: -50, duration: 0.6, at: '>0.15' });
      },
    },
    {
      notes: 'Eve comes along.',
      build: (tl) => {
        pop(tl, '#eve');
        show(tl, '#eve-name', '<0.1');
        pop(tl, '#eve-laptop', '<0.1');
      },
    },
    {
      notes:
        'Whether Eve reads the server directly or goes through the API, she gets the encrypted data: the server never touches plaintext any more. Encrypted from end to end.',
      build: (tl) => {
        pulse(tl, '#chip-stored');
        show(tl, '#to-eve-line', '<');
        along(tl, '#chip-to-eve', '#to-eve', { at: '>-0.1' });
        show(tl, '#eve-cipher', '>-0.1');
        hide(tl, '#chip-to-eve', '<');
        swap(tl, '#eve-cipher', '#eve-stuck', '>0.5');
      },
    },
  ],
};
