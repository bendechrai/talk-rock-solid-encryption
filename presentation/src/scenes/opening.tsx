/**
 * The opening of the talk, up to the limits of encrypting on the server.
 *
 * Title, who Ben is and why encryption matters; then a chat app that stores plain text (Eve reads
 * it straight off the server), and the same app encrypting at rest with ONE server key (Eve reads
 * only ciphertext from the database, until she finds the key or simply asks the API).
 *
 * At this stage the message is plain text on both devices and on its way to and from the server.
 * It is a white bubble everywhere except where it sits on the server, where it is a green chip.
 */
import type { ReactNode } from 'react';
import {
  Actor, Art, Character, CipherChip, Flow, Label, Laptop, PlainChip, ScreenCipher, ScreenMessage, Server,
  type ActorProps,
} from '../art/index.tsx';
import { CodeCard, SceneTitle } from '../art/html.tsx';
import { Svg } from '../engine/Stage.tsx';
import { fly, hide, moveTo, pop, pulse, show, swap } from '../engine/motion.ts';
import type { Scene, Timeline } from '../engine/types.ts';
import { cast, color, type } from '../theme.ts';
import { sectionTitle } from './sectionTitle.tsx';
import './opening.css';

// ---------------------------------------------------------------------------------------------
// Title
// ---------------------------------------------------------------------------------------------

const CHIP = '01lM09urpN…';

function TitleView() {
  return (
    <>
      <Svg>
        <Character who="eve" x={1320} y={130} scale={1.3} />
        <Character who="alice" x={1000} y={560} scale={1.3} />
        <CipherChip text={CHIP} x={1295} y={742} />
        <Character who="bob" x={1600} y={560} scale={1.3} />
      </Svg>
      <div className="opening-title">
        <h1>Building<br />Rock-Solid<br /><em>Encrypted</em><br />Applications</h1>
        <p>Ben Dechrai<span>@bendechr.ai</span></p>
      </div>
    </>
  );
}

const title: Scene = {
  id: 'open-title',
  title: 'Building Rock-Solid Encrypted Applications',
  notes:
    'Welcome. Security and encryption: how to encrypt things, what kinds of encryption there are, how they work, and when you should and should not choose them.',
  View: TitleView,
  steps: [],
};

// ---------------------------------------------------------------------------------------------
// Who is this clown?
// ---------------------------------------------------------------------------------------------

const BIO = [
  { age: '12', did: 'Coding' },
  { age: '15', did: 'Breaking software' },
  { age: '18', did: 'Advocating for security and privacy' },
  { age: '25', did: 'Running tech events' },
  { age: '40', did: 'Set my hair on fire at a tech festival' },
];

function BioView() {
  return (
    <>
      <SceneTitle>Who is this clown?</SceneTitle>
      <div className="opening-bio-head">age</div>
      <ol className="opening-bio">
        {BIO.map((row, index) => (
          <li key={row.age} id={`bio-${index}`} style={{ opacity: 0 }}>
            <span className="opening-bio-age">{row.age}</span>
            {row.did}
          </li>
        ))}
      </ol>
      <figure className="opening-bio-photo">
        <img src={`${import.meta.env.BASE_URL}images/speaker.jpg`} alt="Ben Dechrai" />
        <figcaption>
          <strong>Ben Dechrai</strong>
          <span id="bio-handle">@bendechr.ai</span>
        </figcaption>
      </figure>
    </>
  );
}

const bio: Scene = {
  id: 'open-bio',
  title: 'Who is this clown?',
  notes: 'Who am I? Who is this clown? Hi, my name is Ben.',
  View: BioView,
  steps: [
    { notes: 'I have been coding since I was 12.', build: (tl) => { show(tl, '#bio-0'); } },
    { notes: 'Breaking software since I was 15.', build: (tl) => { show(tl, '#bio-1'); } },
    {
      notes: 'I have loved security and privacy, and the adjacent things like civil liberties, for quite a long time.',
      build: (tl) => { show(tl, '#bio-2'); },
    },
    {
      notes: 'I have been running tech events, so I appreciate what it takes to put something like this together. Thank the crew.',
      build: (tl) => { show(tl, '#bio-3'); },
    },
    {
      notes: 'I successfully set my hair on fire at a tech festival when I was 40. So do not trust everything I say.',
      build: (tl) => { show(tl, '#bio-4'); },
    },
    {
      notes: 'To contact me, I am on Bluesky: bendechr.ai.',
      build: (tl) => { pulse(tl, '#bio-handle'); },
    },
  ],
};

// ---------------------------------------------------------------------------------------------
// Three things that are certain in life
// ---------------------------------------------------------------------------------------------

const CERTAIN = [
  { id: 'phishing', art: 'opening-phishing', text: 'Phishing' },
  { id: 'theft', art: 'opening-data-theft', text: 'Data theft' },
  { id: 'authority', art: 'opening-authoritarianism', text: 'Authoritarianism' },
];

function CertainView() {
  return (
    <>
      <Svg>
        {CERTAIN.map((thing, index) => {
          const x = 80 + index * 600;
          return (
            <g key={thing.id} id={`certain-${thing.id}`} opacity={0}>
              <rect x={x} y={300} width={560} height={640} rx={36} fill={color.panel} stroke={color.line} strokeWidth={2} />
              <g transform={`translate(${x + 115} 362) scale(1.65)`}>
                <Art name={thing.art} tint={color.text} />
              </g>
              <text x={x + 280} y={848} textAnchor="middle" fontSize={58} fontWeight={700} fill={color.text}>{thing.text}</text>
            </g>
          );
        })}
      </Svg>
      <SceneTitle>There are three things<br />that are certain in life</SceneTitle>
    </>
  );
}

const certain: Scene = {
  id: 'open-certain',
  title: 'Three things that are certain in life',
  notes: 'We will start at the beginning. There are three things that are certain in life. Does anybody know this quote? It is not the one you think.',
  View: CertainView,
  steps: [
    { notes: 'Phishing.', build: (tl) => { pop(tl, '#certain-phishing'); } },
    { notes: 'Data theft.', build: (tl) => { pop(tl, '#certain-theft'); } },
    {
      notes:
        'And, because it is topical, authoritarianism. These are what we face day to day as software engineers while we try to keep our users, and their data, safe.',
      build: (tl) => { pop(tl, '#certain-authority'); },
    },
  ],
};

// ---------------------------------------------------------------------------------------------
// Why do we need encryption?
// ---------------------------------------------------------------------------------------------

function WhyView() {
  return (
    <>
      <SceneTitle>Why do we need encryption?</SceneTitle>
      <div className="opening-why">
        <div className="opening-why-row" id="why-regulation" style={{ opacity: 0 }}>
          <div className="opening-why-reason">Regulatory requirements<small>GDPR, CCPA, etc.</small></div>
          <div className="opening-why-facts">
            <div className="opening-why-fact"><b>€20M</b><span>or 4% of global turnover:<br />the ceiling for a GDPR fine</span></div>
          </div>
        </div>
        <div className="opening-why-row" id="why-reputation" style={{ opacity: 0 }}>
          <div className="opening-why-reason">Company reputation<br />and PR risk</div>
          <div className="opening-why-facts">
            <div className="opening-why-fact"><b>$4.4M</b><span>ransom paid by<br />Colonial Pipeline, 2021</span></div>
          </div>
        </div>
        <div className="opening-why-row" id="why-trust" style={{ opacity: 0 }}>
          <div className="opening-why-reason">User trust<br />and expectations</div>
          <div className="opening-why-facts">
            <div className="opening-why-fact"><b>$100K</b><span>paid by Uber to hide a breach</span></div>
            <div className="opening-why-fact"><b>+4,200%</b><span>Signal downloads in one week</span></div>
          </div>
        </div>
        <div className="opening-why-row" id="why-ethics" style={{ opacity: 0 }}>
          <div className="opening-why-reason" style={{ width: 'auto' }}>Legal and ethical obligations</div>
        </div>
      </div>
    </>
  );
}

const why: Scene = {
  id: 'open-why',
  title: 'Why do we need encryption?',
  notes: 'So why do we need encryption? There are a couple of reasons why we might want to encrypt things.',
  View: WhyView,
  steps: [
    {
      notes:
        'We might be forced to: regulatory requirements. In Europe, GDPR; plenty of others. (They also clash: the right to be forgotten.) GDPR fines can reach 20 million euros or 4% of global revenue, whichever is higher.',
      build: (tl) => { show(tl, '#why-regulation'); },
    },
    {
      notes:
        'Company reputation and PR risk. In 2021 Colonial Pipeline paid 4.4 million dollars in ransom after their data was encrypted and held to ransom. That obviously affected them.',
      build: (tl) => { show(tl, '#why-reputation'); },
    },
    {
      notes:
        'User trust and expectations. Uber paid a 100,000 dollar ransom after a 2016 data breach and then tried to hide it: not great for trust. Signal downloads grew about 4,200% in a week after the WhatsApp privacy changes of January 2021.',
      build: (tl) => { show(tl, '#why-trust'); },
    },
    {
      notes: 'And legal and ethical obligations: it is other people\'s data, and we are expected to keep it safe.',
      build: (tl) => { show(tl, '#why-ethics'); },
    },
  ],
};

// ---------------------------------------------------------------------------------------------
// The chat app: Alice, the server and Bob
// ---------------------------------------------------------------------------------------------

// Where things sit. Actor positions are top-left corners in stage pixels.
const at = {
  /** A travelling bubble lying exactly over the bubble drawn on each laptop's screen. */
  aliceBubble: { x: 405, y: 623 },
  bobBubble: { x: 1365, y: 623 },
  eveBubble: { x: 1315, y: 213 },

  /** On the server: the stored message, and the plain text the server holds while it works. */
  storedPlain: { x: 885, y: 590 },
  storedChip: { x: 825, y: 606 },
  decrypted: { x: 885, y: 484 },

  keyHome: { x: 902, y: 812 },
  keyOnMessage: { x: 902, y: 568 },
  keyOnEveScreen: { x: 1332, y: 192 },
  keyAtEve: { x: 1600, y: 190 },
  chipOnEveScreen: { x: 1255, y: 230 },
};

const CIPHER = ['01lM09urpNYe', 'Ryi1NzvH51cG'];
const SERVER_KEY_TINT = '#C9D2E6';
const SERVER_KEY_SCALE = 1.8;

/**
 * The server's one symmetric key. It is a secret, so it is drawn like a private key (inside a
 * shield), in a colour and head shape that belong to nobody in the cast.
 */
function ServerKey(actor: ActorProps) {
  return (
    <Actor {...actor}>
      <Art name="shield" tint={SERVER_KEY_TINT} />
      <g transform="translate(43 14) scale(.5) rotate(90)">
        <Art name="opening-key-hex" tint={SERVER_KEY_TINT} />
      </g>
    </Actor>
  );
}

interface DiagramProps {
  title: string;
  /** The server holds one key and stores ciphertext. Otherwise it stores plain text. */
  encrypted?: boolean;
  /** Open with the message already sent, stored and delivered. */
  delivered?: boolean;
  /** Whether Eve is in this scene, and if so whether a step brings her on or she is there from the start. */
  eve?: 'absent' | 'waiting' | 'present';
  /** Extra actors for one scene, drawn above everything else. */
  children?: ReactNode;
  /** Code cards and other HTML. */
  html?: ReactNode;
}

function ChatDiagram({ title, encrypted = false, delivered = false, eve = 'absent', children, html }: DiagramProps) {
  const eveHidden = eve !== 'present';
  return (
    <>
      <Svg>
        {/* Plain text travels on white routes. */}
        <Flow id="to-server" d="M650 660C710 590 760 590 808 634" tint={color.text} hidden={!delivered} />
        <Flow id="to-bob" d="M1112 634C1160 590 1210 590 1270 660" tint={color.text} hidden={!delivered} />
        <Flow id="bob-ask" d="M1270 724C1210 780 1166 776 1118 728" tint={cast.bob.color} hidden />
        {eve !== 'absent' && (
          <>
            <Flow id="to-eve" d="M1010 506C1010 440 1160 470 1250 404" tint={cast.eve.color} hidden />
            <Flow id="eve-ask" d="M1440 404C1440 500 1280 500 1118 548" tint={cast.eve.color} hidden />
          </>
        )}

        <Character who="alice" x={40} y={400} scale={1.5} />
        <Label x={190} y={890} text="Alice" tint={cast.alice.color} />
        <Laptop x={300} y={560} scale={1.5}>
          <ScreenMessage id="alice-plain" text="Hi!" hidden={!delivered} />
        </Laptop>

        <Server x={800} y={500} scale={1.6} />

        <Laptop x={1260} y={560} scale={1.5}>
          <ScreenMessage id="bob-plain" text="Hi!" hidden={!delivered} />
        </Laptop>
        <Character who="bob" x={1580} y={400} scale={1.5} />
        <Label x={1730} y={890} text="Bob" tint={cast.bob.color} />

        {eve !== 'absent' && (
          <>
            <Character id="eve" who="eve" x={960} y={70} scale={1.15} hidden={eveHidden} />
            <Label id="eve-name" x={950} y={260} text="Eve" tint={cast.eve.color} anchor="end" hidden={eveHidden} />
            <Laptop id="eve-laptop" x={1210} y={150} scale={1.5} hidden={eveHidden}>
              <ScreenCipher id="eve-cipher" lines={CIPHER} hidden />
              <ScreenMessage id="eve-plain" text="Hi!" hidden />
            </Laptop>
          </>
        )}

        {/* What the server keeps. */}
        {encrypted && (
          <>
            <CipherChip id="stored-cipher" text={CHIP} {...at.storedChip} hidden={!delivered} />
            <CipherChip id="chip-to-eve" text={CHIP} {...at.storedChip} hidden />
            <ServerKey id="server-key" {...at.keyHome} scale={SERVER_KEY_SCALE} hidden={!delivered} />
            <ServerKey id="stolen-key" {...at.keyHome} scale={SERVER_KEY_SCALE} hidden />
            <Label id="key-label" x={960} y={1004} text="one key for every message" tint={color.muted} size={type.min} weight={500} hidden={!delivered} />
          </>
        )}

        {/* The message as plain text. One bubble per hop, so each sender keeps a copy. */}
        <PlainChip id="msg-in" text="Hi!" {...(delivered ? at.storedPlain : at.aliceBubble)} hidden={!delivered || encrypted} />
        <PlainChip id="msg-out" text="Hi!" {...(encrypted ? at.decrypted : at.storedPlain)} hidden />
        {eve !== 'absent' && <PlainChip id="msg-eve" text="Hi!" {...(encrypted ? at.decrypted : at.storedPlain)} hidden />}

        {children}
      </Svg>

      <SceneTitle>{title}</SceneTitle>
      {html}
    </>
  );
}

// ---- A simple chat app (before Demo 1) ----

const plaintext: Scene = {
  id: 'open-plaintext',
  title: 'A simple chat app',
  notes:
    'Some icons, because they are fun. Alice and Bob: in a typical encryption story they are always trying to communicate secretly. You will meet Eve, the eavesdropper, later, and Charlie, the third participant.',
  View: () => <ChatDiagram title="A simple chat app" />,
  steps: [
    {
      notes: 'Alice and Bob start a conversation, and Alice wants to say hi. Alice writes "Hi!" into the chat app.',
      build: (tl) => {
        pop(tl, '#alice-plain');
      },
    },
    {
      notes: 'Alice sends that to the server. The server stores the plain text "Hi!".',
      build: (tl) => {
        show(tl, '#to-server-line');
        fly(tl, '#msg-in', at.aliceBubble, at.storedPlain, { bend: -50, reveal: true, at: '>-0.1' });
      },
    },
    {
      notes: 'The server sends that to Bob. Bob can read the message. Excellent. And then we have a demo.',
      build: (tl) => {
        show(tl, '#to-bob-line');
        fly(tl, '#msg-out', at.storedPlain, at.bobBubble, { bend: -50, reveal: true, at: '>-0.1' });
        swap(tl, '#msg-out', '#bob-plain', '>-0.1');
      },
    },
  ],
};

// ---- Eve reads the plain-text server (after Demo 1) ----

const plaintextEve: Scene = {
  id: 'open-plaintext-eve',
  title: 'A simple chat app: Eve',
  notes: 'Let us conclude with the problems we already know there are going to be, and work out what the next step is.',
  View: () => <ChatDiagram title="A simple chat app" delivered eve="waiting" />,
  steps: [
    {
      notes:
        'Eve comes along and wants to find out what all the conversations are. Eve is an expert hacker: either has direct access to the server, or can make a request to the API endpoint.',
      build: (tl) => {
        pop(tl, '#eve');
        show(tl, '#eve-name', '<0.1');
        pop(tl, '#eve-laptop', '<0.1');
      },
    },
    {
      notes:
        'Because the messages are plain text, Eve gets them out. Access control does not protect the data, it only stops people hitting certain endpoints. Eve plugs a laptop in and there you go: it says "Hi!".',
      build: (tl) => {
        pulse(tl, '#msg-in');
        show(tl, '#to-eve-line', '<');
        fly(tl, '#msg-eve', at.storedPlain, at.eveBubble, { bend: 70, reveal: true, at: '>-0.1' });
        swap(tl, '#msg-eve', '#eve-plain', '>-0.1');
      },
    },
  ],
};

// ---- Encrypted on the server (before Demo 2) ----

const CODE_LEFT = 284;
const CODE_TOP = 150;

function EncryptedCode() {
  return (
    <>
      <CodeCard id="encrypt-code" left={CODE_LEFT} top={CODE_TOP} hidden>
        {'const iv = crypto.getRandomValues(new Uint8Array(12));\n'}
        {'const ciphertext = await crypto.subtle.encrypt(\n'}
        {'  { name: '}<span className="hl">{'\'AES-GCM\''}</span>{', iv },  '}<span className="dim">{'// a new IV for every message\n'}</span>
        {'  '}<span className="hl">SERVER_KEY</span>{',               '}<span className="dim">{'// the one key\n'}</span>
        {'  encode(plaintext));'}
      </CodeCard>
      <CodeCard id="decrypt-code" left={CODE_LEFT} top={CODE_TOP} hidden>
        {'const plaintext = await crypto.subtle.decrypt(\n'}
        {'  { name: '}<span className="hl">{'\'AES-GCM\''}</span>{', iv },  '}<span className="dim">{'// the IV stored with it\n'}</span>
        {'  '}<span className="hl">SERVER_KEY</span>{',               '}<span className="dim">{'// the same key\n'}</span>
        {'  ciphertext);'}
      </CodeCard>
    </>
  );
}

const encryptedOnServer: Scene = {
  id: 'open-encrypted',
  title: 'Encrypted on the server',
  notes: 'Our starting position: Alice and Bob want to send a message.',
  View: () => <ChatDiagram title="Encrypted on the server" encrypted html={<EncryptedCode />} />,
  steps: [
    {
      notes: 'Alice writes "Hi!" again.',
      build: (tl) => {
        pop(tl, '#alice-plain');
      },
    },
    {
      notes: 'Alice sends the message to the server, exactly as before: it arrives as plain text.',
      build: (tl) => {
        show(tl, '#to-server-line');
        fly(tl, '#msg-in', at.aliceBubble, at.storedPlain, { bend: -50, reveal: true, at: '>-0.1' });
      },
    },
    {
      notes:
        'The server, meanwhile, has a secret it is aware of, for symmetric encryption: you encrypt data with a key and use the same key to decrypt it. One key, for every message.',
      build: (tl) => {
        pop(tl, '#server-key');
        show(tl, '#key-label', '<0.2');
      },
    },
    {
      notes:
        'Example code. Create an initialisation vector: a fresh random value for every message, so the same text never encrypts the same way twice. Encrypt with the server key. The scrambled text is the encrypted version of "Hi!".',
      build: (tl) => {
        show(tl, '#encrypt-code');
        fly(tl, '#server-key', at.keyHome, at.keyOnMessage, { bend: 40, duration: 0.7, at: '>0.1' });
        swap(tl, '#msg-in', '#stored-cipher', '>-0.1');
        fly(tl, '#server-key', at.keyOnMessage, at.keyHome, { bend: -40, duration: 0.6, at: '>0.15' });
      },
    },
    {
      notes: 'We have the encrypted version on the server now. Anybody who comes along and has a look at that does not know what it says.',
      build: (tl) => {
        hide(tl, '#encrypt-code');
        pulse(tl, '#stored-cipher', '>');
      },
    },
    {
      notes: 'Meanwhile Bob comes along and asks: do I have any new messages? A request goes to the server.',
      build: (tl) => {
        show(tl, '#bob-ask-line');
      },
    },
    {
      notes:
        'Before the message goes out, the server uses that same key again and decrypts it. Here is the counterpart code. The server now has the word "Hi!" again; the stored copy stays encrypted.',
      build: (tl) => {
        show(tl, '#decrypt-code');
        fly(tl, '#server-key', at.keyHome, at.keyOnMessage, { bend: 40, duration: 0.7, at: '>0.1' });
        pop(tl, '#msg-out', '>-0.1');
        fly(tl, '#server-key', at.keyOnMessage, at.keyHome, { bend: -40, duration: 0.6, at: '>0.15' });
      },
    },
    {
      notes: '"Hi!" gets sent to Bob as plain text. The server can forget it: it can always decrypt again later. Bob receives the message.',
      build: (tl) => {
        hide(tl, '#decrypt-code');
        show(tl, '#to-bob-line', '<');
        fly(tl, '#msg-out', at.decrypted, at.bobBubble, { bend: -40, at: '>-0.1' });
        swap(tl, '#msg-out', '#bob-plain', '>-0.1');
      },
    },
  ],
};

// ---- Eve against the encrypted server (before Demo 2 in Melbourne; Ben refers back to it after) ----

function Attacks({ shown = false }: { shown?: boolean }) {
  return (
    <>
      <Label id="cap-db" x={80} y={236} text="Database: only ciphertext" tint={color.cipher} anchor="start" hidden={!shown} />
      <Label id="cap-key" x={80} y={304} text="1  Find the one key" tint={cast.eve.color} anchor="start" hidden={!shown} />
      <Label id="cap-api" x={80} y={372} text="2  Or just ask the API" tint={cast.eve.color} anchor="start" hidden={!shown} />
    </>
  );
}

/** The server decrypts the stored message and hands the plain text to Eve, as it does for Bob. */
function serverDecryptsForEve(tl: Timeline) {
  show(tl, '#eve-ask-line');
  fly(tl, '#server-key', at.keyHome, at.keyOnMessage, { bend: 40, duration: 0.6, at: '>-0.1' });
  pop(tl, '#msg-eve', '>-0.1');
  fly(tl, '#server-key', at.keyOnMessage, at.keyHome, { bend: -40, duration: 0.6, at: '>0.1' });
  show(tl, '#to-eve-line', '<');
  fly(tl, '#msg-eve', at.decrypted, at.eveBubble, { bend: 70, duration: 0.8, at: '<0.1' });
  swap(tl, '#msg-eve', '#eve-plain', '>-0.1');
}

const encryptedEve: Scene = {
  id: 'open-encrypted-eve',
  title: 'Encrypted on the server: Eve',
  notes: 'Meanwhile, Eve comes along and tries to access the data on the server.',
  View: () => (
    <ChatDiagram title="Encrypted on the server" encrypted delivered eve="present">
      <Attacks />
    </ChatDiagram>
  ),
  steps: [
    {
      notes: 'Reading the database, Eve just gets the encrypted version. However, there are two things that could happen here.',
      build: (tl) => {
        pulse(tl, '#stored-cipher');
        show(tl, '#to-eve-line', '<');
        fly(tl, '#chip-to-eve', at.storedChip, at.chipOnEveScreen, { bend: 60, reveal: true, at: '>-0.1' });
        show(tl, '#eve-cipher', '>-0.1');
        hide(tl, '#chip-to-eve', '<');
        show(tl, '#cap-db', '<');
      },
    },
    {
      notes:
        'One: if Eve has access to the server to read the database, Eve might also have access to the code, and perhaps the environment variables, and be able to find that one key. Every message opens with it.',
      build: (tl) => {
        show(tl, '#cap-key');
        pulse(tl, '#server-key', '<');
        fly(tl, '#stolen-key', at.keyHome, at.keyOnEveScreen, { bend: 170, duration: 1.1, reveal: true, at: '>' });
        swap(tl, '#eve-cipher', '#eve-plain', '>-0.1');
        moveTo(tl, '#stolen-key', at.keyAtEve, '>0.1');
      },
    },
    {
      notes:
        'Two: alternatively, Eve just makes a direct request to the API. If access control is insufficient, the server decrypts the message for Eve in the same way as it did for Bob. Demo two.',
      build: (tl) => {
        // Start again without the stolen key: this attack does not need it.
        hide(tl, '#stolen-key, #eve-plain, #to-eve-line');
        tl.to('#cap-key', { opacity: 0.45, duration: 0.3 }, '<');
        show(tl, '#cap-api', '<');
        serverDecryptsForEve(tl);
      },
    },
  ],
};

// ---- Recap (after Demo 2) ----

function Recap() {
  return (
    <>
      {/* The message caught on each hop: still plain text on the way in and on the way out. */}
      <PlainChip text="Hi!" x={655} y={560} />
      <PlainChip text="Hi!" x={1115} y={560} />
      <Label x={480} y={890} text="plain text" tint={color.text} weight={500} />
      <Label x={1440} y={890} text="plain text" tint={color.text} weight={500} />
      <Label x={960} y={1004} text="encrypted only here" tint={color.cipher} />
      <Label id="cap-api" x={80} y={236} text="The API decrypts for whoever asks" tint={cast.eve.color} anchor="start" hidden />
    </>
  );
}

const recap: Scene = {
  id: 'open-recap',
  title: 'Encrypted only in the middle',
  notes:
    'At this point the data is unencrypted on the two devices, it goes unencrypted to the server, and it only gets encrypted on the server. In transit it is still plain text. Probably not ideal.',
  View: () => (
    <ChatDiagram title="Encrypted only in the middle" encrypted delivered eve="present">
      <Recap />
    </ChatDiagram>
  ),
  steps: [
    {
      notes:
        'This is the slide I was talking about before. As demonstrated just now: if Eve makes a request through the API rather than getting into the server itself, the information still gets decrypted, because the endpoint\'s job is to decrypt and send out plain text.',
      build: (tl) => {
        show(tl, '#cap-api');
        serverDecryptsForEve(tl);
      },
    },
  ],
};

// ---------------------------------------------------------------------------------------------

export const beforeDemo1: Scene[] = [
  title,
  bio,
  certain,
  why,
  sectionTitle(
    'open-chat-title',
    'A simple chat app: title',
    <>Let&rsquo;s build a chat app</>,
    'We are going to build a chat app. Anybody ever built one? An input field, save it to a database, display it on another screen. We will build it up piece by piece and learn what kind of encryption protects the data. It applies well beyond chat: data in, data out, and how you keep it safe in the middle and in transit.',
  ),
  plaintext,
];

export const betweenDemo1And2: Scene[] = [
  plaintextEve,
  sectionTitle(
    'open-encrypted-title',
    'An encrypted chat app: title',
    <>Let&rsquo;s build an <em>encrypted</em> chat app</>,
    'We want to make this a bit more secure. So let us encrypt it.',
  ),
  encryptedOnServer,
  encryptedEve,
];

export const afterDemo2: Scene[] = [recap];
