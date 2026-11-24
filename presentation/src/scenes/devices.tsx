/**
 * One user with several devices, and device linking.
 *
 * The keys drawn beside each person really belong to that person's device. A second device has
 * keys of its own, so the server sees one more client, and nothing yet says the laptop and the
 * phone are the same user. Linking fixes that: the laptop shows a QR code, the phone answers over
 * a connection with its public key, and the laptop sends an identity back, sealed to that key.
 * An identity is shared; no private key ever leaves the device that made it.
 */
import {
  Actor, type ActorProps, Art, Character, CipherChip, Flow, Frame, Handset, Label, Laptop, PrivateKey, PublicKey, Server,
} from '../art/index.tsx';
import { CodeCard, SceneTitle } from '../art/html.tsx';
import { Svg } from '../engine/Stage.tsx';
import { fly, hide, moveTo, pop, pulse, show, swap, type Point } from '../engine/motion.ts';
import type { Scene, Timeline } from '../engine/types.ts';
import { cast, color, conversation, type, type Who } from '../theme.ts';
import { sectionTitle } from './sectionTitle.tsx';

const ALICE = cast.alice.color;
const MESSAGE = 'Hi! This is Alice';
const MESSAGE_ON_PHONE = ['Hi! This', 'is Alice'];
const USER_ID = 'alice@example.com';
// Bubble widths are set by hand to fit the words: SVG text cannot size its own background.
const LAPTOP_BUBBLE = 560;
const PHONE_BUBBLE = 244;
const PHONE_BUBBLE_SMALL = 214;

// ---- Drawings used only in this section ----

const RING = { fill: 'none', strokeWidth: 3, strokeDasharray: '3 7', strokeLinecap: 'round' } as const;

/** A private key with the dashed ring that marks a short-lived key. 64x76 at scale 1, like PrivateKey. */
function ShortLivedPrivateKey({ owner, ...actor }: ActorProps & { owner: Who }) {
  return (
    <Actor {...actor}>
      <circle cx="32" cy="38" r="42" stroke={cast[owner].color} {...RING} />
      <PrivateKey owner={owner} x={0} y={0} />
    </Actor>
  );
}

/** A private key and its public key, moved as one. 178x76 at scale 1 (192 wide when short-lived). */
function KeyPair({ owner, shortLived = false, ...actor }: ActorProps & { owner: Who; shortLived?: boolean }) {
  return (
    <Actor {...actor}>
      {shortLived && <circle cx="32" cy="38" r="42" stroke={cast[owner].color} {...RING} />}
      <PrivateKey owner={owner} x={0} y={0} />
      <PublicKey owner={owner} ephemeral={shortLived} x={shortLived ? 92 : 78} y={16} />
    </Actor>
  );
}

const CHAT = { width: 201, height: 96 };

/** One conversation's short-lived key pair, boxed in that conversation's colour. */
function ChatKeyPair({ owner, tint, ...actor }: ActorProps & { owner: Who; tint: string }) {
  return (
    <Actor {...actor}>
      <rect x="2" y="2" width={CHAT.width - 4} height={CHAT.height - 4} rx="18" fill={tint} fillOpacity="0.12" stroke={tint} strokeWidth="4" />
      <KeyPair owner={owner} shortLived x={20} y={14} scale={0.9} />
    </Actor>
  );
}

const TOKEN = { width: 220, height: 64 };
const PROVISIONING_CODE = 'K7Q2-9F';

/** The provisioning request: a ticket carrying a random string. */
function Ticket({ ...actor }: ActorProps) {
  return (
    <Actor {...actor}>
      <path
        d="M12 2h196a10 10 0 0 1 10 10v10a10 10 0 0 0 0 20v10a10 10 0 0 1-10 10H12A10 10 0 0 1 2 52V42a10 10 0 0 0 0-20V12A10 10 0 0 1 12 2z"
        fill={color.panelRaised} stroke={color.paper} strokeWidth="3"
      />
      <text x="110" y="46" textAnchor="middle" className="mono" fontSize={type.min} fill={color.text}>{PROVISIONING_CODE}</text>
    </Actor>
  );
}

/** The connection info: where the other device should connect. */
function Address({ ...actor }: ActorProps) {
  return (
    <Actor {...actor}>
      <rect x="2" y="2" width={TOKEN.width - 4} height={TOKEN.height - 4} rx="30" fill={color.panelRaised} stroke={color.muted} strokeWidth="3" />
      <text x="110" y="46" textAnchor="middle" className="mono" fontSize={type.min} fill={color.text}>{'wss://…'}</text>
    </Actor>
  );
}

const ID_CARD = { width: 620, height: 72 };

/** The identity that linking hands over: plaintext, so it is drawn on white. */
function IdCard({ ...actor }: ActorProps) {
  return (
    <Actor {...actor}>
      <rect width={ID_CARD.width} height={ID_CARD.height} rx="14" fill={color.paper} />
      <text x="24" y="50" className="mono" fontSize={type.min} fill="#55648A">userId</text>
      <text x="188" y="50" className="mono" fontSize={type.min} fill={color.ink}>{USER_ID}</text>
    </Actor>
  );
}

const BUNDLE = { width: 480, height: 118 };

/** A dashed white outline around things that are packed together before they are encrypted. */
function Bundle({ id, x, y, hidden = false }: { id: string; x: number; y: number; hidden?: boolean }) {
  return (
    <rect
      id={id} x={x} y={y} width={BUNDLE.width} height={BUNDLE.height} rx="22" opacity={hidden ? 0 : 1}
      fill={color.paper} fillOpacity="0.07" stroke={color.paper} strokeWidth="3" strokeDasharray="12 9"
    />
  );
}

function QrCode({ size, ...actor }: ActorProps & { size: number }) {
  return (
    <Actor {...actor} scale={size / 100}>
      <Art name="dev-qr" />
    </Actor>
  );
}

/**
 * A chat bubble as the app draws it: the reader's own messages sit on the right in their colour,
 * everyone else's on the left in grey. Positioned by its top-left corner.
 */
function Bubble({
  lines, mine, width, size = type.min, ...actor
}: ActorProps & { lines: string[]; mine: boolean; width: number; size?: number }) {
  const lineHeight = size * 1.2;
  const height = lines.length * lineHeight + 32;
  const [tl, tr, br, bl] = mine ? [30, 30, 8, 30] : [30, 30, 30, 8];
  const d = `M${tl} 0H${width - tr}a${tr} ${tr} 0 0 1 ${tr} ${tr}V${height - br}a${br} ${br} 0 0 1 ${-br} ${br}H${bl}`
    + `a${bl} ${bl} 0 0 1 ${-bl} ${-bl}V${tl}a${tl} ${tl} 0 0 1 ${tl} ${-tl}z`;
  return (
    <Actor {...actor}>
      <path d={d} fill={mine ? ALICE : '#24304C'} />
      {lines.map((line, i) => (
        <text key={i} x="24" y={16 + size * 0.92 + i * lineHeight} fontSize={size} fontWeight="700" fill={mine ? color.ink : color.text}>
          {line}
        </text>
      ))}
    </Actor>
  );
}

/** The sender's avatar the app shows beside a message from somebody else. */
function SenderBadge({ ...actor }: ActorProps) {
  return (
    <Actor {...actor}>
      <circle cx="24" cy="24" r="24" fill={ALICE} />
      <path d="M24 12l12 20H12z" fill="none" stroke={color.ink} strokeWidth="4.5" strokeLinejoin="round" />
    </Actor>
  );
}

// ---- Keys belong to devices (original slides 127-132) ----

type Chat = keyof typeof conversation;
const PEOPLE: { who: Who; x0: number; chats: Chat[] }[] = [
  { who: 'alice', x0: 30, chats: ['blue', 'green'] },
  { who: 'bob', x0: 650, chats: ['blue', 'green'] },
  // The blue conversation is the private chat between Alice and Bob, so Charlie has no key for it.
  { who: 'charlie', x0: 1270, chats: ['green'] },
];
const IDENTITY = 1.3;
const keysAt = {
  besidePerson: (x0: number): Point => ({ x: x0 + 275, y: 185 }),
  chatBesidePerson: (x0: number, index: number): Point => ({ x: x0 + 290, y: 305 + index * 107 }),
  onScreen: (x0: number): Point => ({ x: x0 + 196, y: 633 }),
  chatOnScreen: (x0: number, index: number, count: number): Point => ({ x: count === 1 ? x0 + 210 : x0 + 104 + index * 211, y: 745 }),
};

function KeysView() {
  return (
    <>
      <Svg>
        {PEOPLE.map(({ who, x0, chats }) => (
          <g key={who}>
            <Character who={who} x={x0 + 10} y={165} scale={1.2} />
            <Label x={x0 + 130} y={560} text={cast[who].name} tint={cast[who].color} />
            <Laptop x={x0 + 22} y={585} scale={2.4} />
            <Handset id={`phone-${who}`} x={x0 + 330} y={190} scale={1.6} hidden />
            <KeyPair id={`identity-${who}`} owner={who} {...keysAt.besidePerson(x0)} scale={IDENTITY} />
            {chats.map((chat, index) => (
              <ChatKeyPair key={chat} id={`${chat}-${who}`} owner={who} tint={conversation[chat]} {...keysAt.chatBesidePerson(x0, index)} />
            ))}
          </g>
        ))}
        <Label id="say-identity" x={960} y={1040} text="Identity keys identify the device" size={type.body} hidden />
        <Label id="say-chat" x={960} y={1040} text="Conversation keys are per device" size={type.body} hidden />
      </Svg>
      <SceneTitle>Single user, multiple devices</SceneTitle>
    </>
  );
}

const keysScene: Scene = {
  id: 'dev-keys',
  title: 'Single user, multiple devices: keys belong to devices',
  notes:
    'Single user, multiple devices. These keys I’ve been associating with the people are actually associated with the devices.',
  View: KeysView,
  steps: [
    {
      notes: 'So let’s move the identity keys into the device. Identity keys identify the device, not the person.',
      build: (tl) => {
        PEOPLE.forEach(({ who, x0 }, index) => {
          fly(tl, `#identity-${who}`, keysAt.besidePerson(x0), keysAt.onScreen(x0), { bend: 70, at: index ? '<0.12' : undefined });
        });
        show(tl, '#say-identity', '>-0.3');
      },
    },
    {
      notes: 'We’re also going to move the conversation keys in, per device, so they are all self-contained there.',
      build: (tl) => {
        hide(tl, '#say-identity');
        PEOPLE.forEach(({ who, x0, chats }) => {
          chats.forEach((chat, index) => {
            fly(tl, `#${chat}-${who}`, keysAt.chatBesidePerson(x0, index), keysAt.chatOnScreen(x0, index, chats.length), { bend: 50, at: '<0.1' });
          });
        });
        show(tl, '#say-chat', '>-0.3');
      },
    },
    {
      notes: 'And now, let’s say everybody wants to use their phone as well. So how do we get these phones into the system?',
      build: (tl) => {
        hide(tl, '#say-chat');
        PEOPLE.forEach(({ who }, index) => pop(tl, `#phone-${who}`, index ? '<0.15' : '>'));
      },
    },
  ],
};

// ---- A phone joins: its own keys, one more public key per conversation (original slides 132-135) ----

const DIRECTORY_KEY = 1.1;
const join = {
  laptopIdentity: { x: 474, y: 378 },
  laptopBlue: { x: 382, y: 490 },
  laptopGreen: { x: 593, y: 490 },
  phoneIdentity: { x: 985, y: 330 },
  phoneBlue: { x: 999, y: 490 },
  phoneGreen: { x: 999, y: 640 },
  // Where the public key sits inside each of the phone's conversation boxes.
  phoneBluePublic: { x: 1085, y: 508 },
  phoneGreenPublic: { x: 1085, y: 658 },
  slot: (row: Chat, index: number): Point => ({ x: 1326 + index * 140, y: row === 'blue' ? 562 : 782 }),
};

function JoinView() {
  return (
    <>
      <Svg>
        <Character who="alice" x={20} y={380} scale={1.4} />
        <Label x={160} y={850} text="Alice" tint={ALICE} />

        <Laptop x={300} y={330} scale={2.4} />
        <KeyPair owner="alice" {...join.laptopIdentity} scale={IDENTITY} />
        <ChatKeyPair owner="alice" tint={conversation.blue} {...join.laptopBlue} />
        <ChatKeyPair owner="alice" tint={conversation.green} {...join.laptopGreen} />

        <Handset x={930} y={210} scale={3.4} />
        <KeyPair id="phone-identity" owner="alice" {...join.phoneIdentity} scale={IDENTITY} hidden />
        <ChatKeyPair id="phone-blue" owner="alice" tint={conversation.blue} {...join.phoneBlue} hidden />
        <ChatKeyPair id="phone-green" owner="alice" tint={conversation.green} {...join.phoneGreen} hidden />

        <Server x={1475} y={190} scale={1.2} />
        <Frame x={1300} y={460} width={590} height={180} tint={conversation.blue} label="blue conversation" />
        <Frame x={1300} y={680} width={590} height={180} tint={conversation.green} label="green conversation" />
        <PublicKey owner="alice" ephemeral {...join.slot('blue', 0)} scale={DIRECTORY_KEY} />
        <PublicKey owner="bob" ephemeral {...join.slot('blue', 1)} scale={DIRECTORY_KEY} />
        <PublicKey owner="alice" ephemeral {...join.slot('green', 0)} scale={DIRECTORY_KEY} />
        <PublicKey owner="bob" ephemeral {...join.slot('green', 1)} scale={DIRECTORY_KEY} />
        <PublicKey owner="charlie" ephemeral {...join.slot('green', 2)} scale={DIRECTORY_KEY} />

        {/* The copies of the phone's public keys that go to the server. */}
        <PublicKey id="phone-blue-public" owner="alice" ephemeral {...join.phoneBluePublic} scale={DIRECTORY_KEY} hidden />
        <PublicKey id="phone-green-public" owner="alice" ephemeral {...join.phoneGreenPublic} scale={DIRECTORY_KEY} hidden />

        <Label id="say-copies" x={960} y={1010} text="Every message is now sealed once more: a copy for the phone" size={type.body} hidden />
      </Svg>
      <SceneTitle>Single user, multiple devices</SceneTitle>
    </>
  );
}

const joinScene: Scene = {
  id: 'dev-phone',
  title: 'Single user, multiple devices: a phone joins',
  notes: 'So how do we get these phones into the system? Same kind of thing as the laptop.',
  View: JoinView,
  steps: [
    {
      notes: 'We can generate a public/private key pair for the phone: its own identity keys.',
      build: (tl) => {
        pop(tl, '#phone-identity');
      },
    },
    {
      notes: 'We can generate conversation key pairs for each phone.',
      build: (tl) => {
        pop(tl, '#phone-blue');
        pop(tl, '#phone-green', '<0.2');
      },
    },
    {
      notes:
        'We can share those keys with the server: public keys only. So there is an additional key to encrypt things with (the sender seals one more copy, for the phone).',
      build: (tl) => {
        fly(tl, '#phone-blue-public', join.phoneBluePublic, join.slot('blue', 2), { bend: -70, reveal: true });
        fly(tl, '#phone-green-public', join.phoneGreenPublic, join.slot('green', 3), { bend: 70, reveal: true, at: '<0.2' });
        show(tl, '#say-copies', '>-0.2');
      },
    },
  ],
};

// ---- The same message on two devices (original slides 136-138) ----

const chat = {
  laptop: { x: 320, y: 230 },
  phone: { x: 1400, y: 210 },
  laptopBubble: { x: 510, y: 340 },
  phoneBadge: { x: 1467, y: 326 },
  phoneTheirs: { x: 1467, y: 386 },
  phoneMine: { x: 1473, y: 330 },
  chipStart: { x: 690, y: 350 },
  chipEnd: { x: 1428, y: 400 },
};

function SameUserView() {
  return (
    <>
      <Svg>
        <Character who="alice" x={20} y={420} scale={1.4} />
        <Label x={160} y={890} text="Alice" tint={ALICE} />
        <Laptop {...chat.laptop} scale={3.8} />
        <Handset {...chat.phone} scale={3.8} />

        <Bubble id="laptop-mine" lines={[MESSAGE]} mine width={LAPTOP_BUBBLE} size={56} {...chat.laptopBubble} hidden />
        <CipherChip id="copy" text="9b41f07e2c…" {...chat.chipStart} scale={1.2} hidden />
        <g id="phone-theirs" opacity="0">
          <SenderBadge {...chat.phoneBadge} />
          <Bubble lines={MESSAGE_ON_PHONE} mine={false} width={PHONE_BUBBLE} size={46} {...chat.phoneTheirs} />
        </g>
        <Bubble id="phone-mine" lines={MESSAGE_ON_PHONE} mine width={PHONE_BUBBLE} size={46} {...chat.phoneMine} hidden />

        <rect id="wrong-ring" x="1457" y="314" width="266" height="232" rx="34" fill="none" stroke={color.paper} strokeWidth="5" strokeDasharray="14 10" opacity="0" />
        <Label id="wrong-label" x={1590} y={180} text="from someone else?" hidden />
        <Label id="question" x={960} y={1030} text="How do the devices know they belong to the same user?" size={type.body} hidden />
      </Svg>
      <SceneTitle>Single user, multiple devices</SceneTitle>
    </>
  );
}

const sameUserScene: Scene = {
  id: 'dev-same-user',
  title: 'Single user, multiple devices: whose message is it?',
  notes: 'Alice now has two devices, each with its own keys.',
  View: SameUserView,
  steps: [
    {
      notes: 'And now when you send a message on your laptop, your phone will show the same message.',
      build: (tl) => {
        pop(tl, '#laptop-mine');
        fly(tl, '#copy', chat.chipStart, chat.chipEnd, { bend: -120, reveal: true, at: '>0.1' });
        hide(tl, '#copy', '>-0.1');
        show(tl, '#phone-theirs', '<');
      },
    },
    {
      notes: 'Does that look right? Something wrong with that one: the phone shows it as a message from somebody else.',
      build: (tl) => {
        show(tl, '#wrong-ring');
        show(tl, '#wrong-label', '<');
      },
    },
    {
      notes: 'I think we prefer it to look like that: Alice’s own message, on both devices.',
      build: (tl) => {
        hide(tl, '#wrong-ring, #wrong-label');
        swap(tl, '#phone-theirs', '#phone-mine', '<');
      },
    },
    {
      notes:
        'But how do we know that it’s the same user? Alice added a laptop, Bob added a laptop: why wouldn’t this be another one? This is where the question of how you transfer keys, or whether you even transfer keys, comes in.',
      build: (tl) => {
        show(tl, '#question');
      },
    },
  ],
};

// ---- Device linking (original slides 140-156) ----

const KEY = 1.6;
const TOKEN_SCALE = 1.1;
const CHIP = 1.5;
const CARD = 1.15;
const link = {
  // The laptop's keys, in a row along the top of its frame.
  identityPrivate: { x: 66, y: 250 },
  identityPublic: { x: 180, y: 276 },
  temporaryPrivate: { x: 440, y: 250 },
  temporaryPublic: { x: 575, y: 276 },
  // The phone's keys.
  phonePrivate: { x: 1140, y: 250 },
  phonePublic: { x: 1254, y: 276 },

  // The three things that go into the QR code, listed while the phone is not there yet.
  listAddress: { x: 880, y: 560 },
  listTicket: { x: 880, y: 680 },
  listKey: { x: 900, y: 800 },
  qr: { x: 460, y: 490 },
  intoQr: { x: 460, y: 565 },
  qrLeaving: { x: 507, y: 537 },
  qrOnPhone: { x: 1177, y: 545 },
  issuedTicket: { x: 62, y: 500 },

  // What the phone reads from the code.
  phoneAddress: { x: 1380, y: 455 },
  phoneTicket: { x: 1380, y: 545 },
  phoneTemporaryKey: { x: 1396, y: 640 },
  connectionEnd: { x: 854, y: 900 },

  // The work area along the bottom of each frame. Both sit at the same height, so what is sent
  // slides straight along the connection.
  phoneBundle: { x: 1130, y: 876 },
  phoneBundleTicket: { x: 1154, y: 900 },
  phoneBundleKey: { x: 1420, y: 900 },
  phoneSealing: { x: 1300, y: 900 },
  requestOnPhone: { x: 1168, y: 890 },
  requestOnLaptop: { x: 100, y: 890 },
  laptopBundle: { x: 62, y: 876 },
  laptopBundleTicket: { x: 86, y: 900 },
  laptopBundleKey: { x: 352, y: 900 },
  laptopOpening: { x: 250, y: 862 },
  receivedTicket: { x: 62, y: 582 },
  phoneKeyAside: { x: 90, y: 620 },
  identityOnLaptop: { x: 62, y: 893 },
  laptopSealing: { x: 340, y: 900 },
  sealedOnLaptop: { x: 216, y: 890 },
  sealedOnPhone: { x: 1289, y: 890 },
  phoneOpening: { x: 1440, y: 862 },
  identityOnPhone: { x: 1135, y: 893 },
};

/** One line per step, beside the title, saying what just happened. */
const CAPTIONS = [
  'A temporary key pair, just for linking',
  'Where the phone should connect',
  'A random string, unique to this attempt',
  'The temporary PUBLIC key',
  'Shown on screen, never sent over a network',
  'The new phone makes its own key pair',
  'The phone scans the code and reads all three',
  'The phone connects to the laptop',
  'The request plus the phone’s PUBLIC key',
  'Encrypted with the temporary public key',
  'Only the temporary private key can open it',
  'Sent over the connection',
  'Opened with the temporary private key',
  'It matches the request the laptop issued',
  'An identity: a user id or a signed token',
  'Encrypted with the phone’s public key',
  'Sent back over the connection',
  'Opened with the phone’s own private key',
  'One identity, two devices. No private key moved.',
];

/** Replace the previous step's caption with this step's. Captions are numbered from 1. */
function say(tl: Timeline, step: number): void {
  if (step > 1) hide(tl, `#cap-${step - 1}`, undefined, 0.2);
  show(tl, `#cap-${step}`, undefined, 0.3);
}

const REQUEST_CIPHER = '5e9a03c7d1b…';
const IDENTITY_CIPHER = 'b72f41e80a6…';

function LinkView() {
  const keyLabel = { tint: color.muted, size: type.min, weight: 500, anchor: 'start' } as const;
  return (
    <>
      <Svg>
        <Frame x={40} y={170} width={800} height={880} tint={ALICE} label="Alice’s laptop" />
        <Frame id="phone-frame" x={1110} y={170} width={770} height={880} tint={ALICE} label="Alice’s new phone" hidden />
        <Character who="alice" x={855} y={150} scale={1.2} />

        {/* The connection between the two devices, and the direction of travel while something is sent. */}
        <path id="connection" d="M1108 935H842" fill="none" stroke="#2A3550" strokeWidth="38" strokeDasharray="266" opacity="0" />
        <Label id="connection-label" x={975} y={884} text="connection" tint={color.muted} size={type.min} weight={500} hidden />
        <Flow id="to-laptop" d="M1098 935H858" hidden />
        <Flow id="to-phone" d="M852 935H1092" hidden />

        <Laptop x={306} y={440} scale={2.2} />
        <QrCode id="qr" size={220} {...link.qr} hidden />
        <Handset id="phone" x={1140} y={440} scale={2} hidden />
        <path id="camera" d="M1168 608L682 492V708z" fill={color.paper} opacity="0" />
        <QrCode id="qr-scanned" size={126} {...link.qrOnPhone} hidden />

        {/* Each device's keys. None of the private keys ever leaves its frame. */}
        <PrivateKey owner="alice" {...link.identityPrivate} scale={KEY} />
        <PublicKey owner="alice" {...link.identityPublic} scale={KEY} />
        <Label x={62} y={422} text="identity keys" {...keyLabel} />
        <ShortLivedPrivateKey id="temporary-private" owner="alice" {...link.temporaryPrivate} scale={KEY} hidden />
        <PublicKey id="temporary-public" owner="alice" ephemeral {...link.temporaryPublic} scale={KEY} hidden />
        <Label id="temporary-label" x={428} y={422} text="temporary keys" {...keyLabel} hidden />
        <PrivateKey id="phone-private" owner="alice" {...link.phonePrivate} scale={KEY} hidden />
        <PublicKey id="phone-public" owner="alice" {...link.phonePublic} scale={KEY} hidden />
        <Label id="phone-keys-label" x={1134} y={422} text="identity keys" {...keyLabel} hidden />

        {/* What goes into the QR code. */}
        <Address id="list-address" {...link.listAddress} scale={TOKEN_SCALE} hidden />
        <Label id="list-address-name" x={1160} y={612} text="connection info" size={type.body} anchor="start" hidden />
        <Ticket id="list-ticket" {...link.listTicket} scale={TOKEN_SCALE} hidden />
        <Label id="list-ticket-name" x={1160} y={732} text="provisioning request" size={type.body} anchor="start" hidden />
        <PublicKey id="list-key" owner="alice" ephemeral {...link.temporaryPublic} scale={KEY} hidden />
        <Label id="list-key-name" x={1160} y={852} text="temporary public key" size={type.body} anchor="start" hidden />
        <Ticket id="issued-ticket" {...link.issuedTicket} scale={TOKEN_SCALE} hidden />

        {/* What the phone reads out of it. */}
        <Address id="phone-address" {...link.phoneAddress} scale={TOKEN_SCALE} hidden />
        <Ticket id="phone-ticket" {...link.phoneTicket} scale={TOKEN_SCALE} hidden />
        <PublicKey id="phone-temporary-key" owner="alice" ephemeral {...link.phoneTemporaryKey} scale={KEY} hidden />

        {/* The provisioning request and the phone's public key, bundled, encrypted and sent. */}
        <Bundle id="phone-bundle" {...link.phoneBundle} hidden />
        <PublicKey id="phone-public-copy" owner="alice" {...link.phonePublic} scale={KEY} hidden />
        <CipherChip id="request" text={REQUEST_CIPHER} {...link.requestOnPhone} scale={CHIP} hidden />
        <Bundle id="laptop-bundle" {...link.laptopBundle} hidden />
        <Ticket id="received-ticket" {...link.laptopBundleTicket} scale={TOKEN_SCALE} hidden />
        <PublicKey id="received-key" owner="alice" {...link.laptopBundleKey} scale={KEY} hidden />
        <Actor id="match" x={288} y={541} hidden><Art name="dev-check" /></Actor>

        {/* The identity, encrypted to the phone's public key and sent back. */}
        <IdCard id="laptop-identity" {...link.identityOnLaptop} scale={CARD} hidden />
        <CipherChip id="sealed-identity" text={IDENTITY_CIPHER} {...link.sealedOnLaptop} scale={CHIP} hidden />
        <IdCard id="phone-identity" {...link.identityOnPhone} scale={CARD} hidden />

        {CAPTIONS.map((text, index) => (
          <Label key={text} id={`cap-${index + 1}`} x={690} y={118} text={text} size={type.body} weight={500} anchor="start" hidden />
        ))}
      </Svg>
      <SceneTitle>Device linking</SceneTitle>
    </>
  );
}

const linkScene: Scene = {
  id: 'dev-link',
  title: 'Device linking',
  notes:
    'Each device is still a separate client as far as the server and the app are concerned. We connect the devices so they share an identity, which we can transfer without leaking any secrets. The laptop already has its long-lived identity key pair.',
  View: LinkView,
  steps: [
    {
      notes:
        'We generate another ephemeral key pair on the laptop, used just for the purposes of this device linking process. A very short-lived conversation.',
      build: (tl) => {
        say(tl, 1);
        pop(tl, '#temporary-private', '<');
        tl.fromTo(
          '#temporary-public',
          { x: link.temporaryPrivate.x, opacity: 0 },
          { x: link.temporaryPublic.x, opacity: 1, duration: 0.6, ease: 'power2.out', immediateRender: false },
          '>',
        );
        show(tl, '#temporary-label', '<0.2');
      },
    },
    {
      notes: 'We also generate some information. A connection info string: where can my phone connect to, to start communicating with the laptop?',
      build: (tl) => {
        say(tl, 2);
        pop(tl, '#list-address', '<');
        show(tl, '#list-address-name', '<0.15');
      },
    },
    {
      notes:
        'A provisioning request: a unique, randomly generated string, to verify that a request coming in belongs to this linking attempt. Like the code you match when you sign in on a TV.',
      build: (tl) => {
        say(tl, 3);
        pop(tl, '#list-ticket', '<');
        show(tl, '#list-ticket-name', '<0.15');
      },
    },
    {
      notes: 'And the temporary key: the public half of the ephemeral key pair we just generated.',
      build: (tl) => {
        say(tl, 4);
        fly(tl, '#list-key', link.temporaryPublic, link.listKey, { bend: -90, reveal: true, at: '<' });
        show(tl, '#list-key-name', '>-0.2');
      },
    },
    {
      notes:
        'We turn that into a QR code. We need a way to get it from one system to the other without going through a network that can be tampered or interfered with. Could be NFC or Bluetooth; you will often see the QR code.',
      build: (tl) => {
        say(tl, 5);
        hide(tl, '#list-address-name, #list-ticket-name, #list-key-name', '<');
        fly(tl, '#list-address', link.listAddress, link.intoQr, { bend: 40, duration: 0.7, at: '>' });
        fly(tl, '#list-ticket', link.listTicket, link.intoQr, { bend: 40, duration: 0.7, at: '<0.1' });
        fly(tl, '#list-key', link.listKey, link.intoQr, { bend: 40, duration: 0.7, at: '<0.1' });
        hide(tl, '#list-address, #list-ticket, #list-key', '>-0.15', 0.2);
        pop(tl, '#qr', '<');
        show(tl, '#issued-ticket', '>-0.1');
      },
    },
    {
      notes: 'Then you get your phone, and generate a key pair for your phone.',
      build: (tl) => {
        say(tl, 6);
        show(tl, '#phone-frame', '<');
        pop(tl, '#phone', '<0.1');
        pop(tl, '#phone-private', '>-0.1');
        tl.fromTo(
          '#phone-public',
          { x: link.phonePrivate.x, opacity: 0 },
          { x: link.phonePublic.x, opacity: 1, duration: 0.6, ease: 'power2.out', immediateRender: false },
          '>',
        );
        show(tl, '#phone-keys-label', '<0.2');
      },
    },
    {
      notes: 'Scan the QR code, and now the phone has the connection string, the provisioning request and the temporary key.',
      build: (tl) => {
        say(tl, 7);
        tl.to('#camera', { opacity: 0.16, duration: 0.3 }, '<');
        fly(tl, '#qr-scanned', link.qrLeaving, link.qrOnPhone, { bend: 0, duration: 0.8, reveal: true, at: '>' });
        hide(tl, '#camera', '>');
        pop(tl, '#phone-address', '<');
        pop(tl, '#phone-ticket', '<0.15');
        pop(tl, '#phone-temporary-key', '<0.15');
      },
    },
    {
      notes: 'First it uses that connection information to make a connection to the laptop. This is usually done via a websocket of some sort.',
      build: (tl) => {
        say(tl, 8);
        hide(tl, '#qr, #qr-scanned', '<');
        fly(tl, '#phone-address', link.phoneAddress, link.connectionEnd, { bend: 60, duration: 0.7, at: '<' });
        hide(tl, '#phone-address', '>-0.1', 0.2);
        tl.fromTo(
          '#connection',
          { opacity: 1, strokeDashoffset: 266 },
          { opacity: 1, strokeDashoffset: 0, duration: 0.6, ease: 'power1.inOut', immediateRender: false },
          '<',
        );
        show(tl, '#connection-label', '>-0.2');
      },
    },
    {
      notes:
        'It takes the PUBLIC key of the phone (Ben says "private" here and corrects himself) and adds it to the provisioning request. The private key stays on the phone.',
      build: (tl) => {
        say(tl, 9);
        fly(tl, '#phone-ticket', link.phoneTicket, link.phoneBundleTicket, { bend: -50, duration: 0.7, at: '<' });
        fly(tl, '#phone-public-copy', link.phonePublic, link.phoneBundleKey, { bend: -70, reveal: true, at: '<0.2' });
        show(tl, '#phone-bundle', '>-0.2');
        pulse(tl, '#phone-private', '>');
      },
    },
    {
      notes:
        'Then it uses the temporary key to encrypt the entire bundle: the encrypted provisioning request, encrypted with the ephemeral public key from the laptop.',
      build: (tl) => {
        say(tl, 10);
        fly(tl, '#phone-temporary-key', link.phoneTemporaryKey, link.phoneSealing, { bend: 50, duration: 0.7, at: '<' });
        swap(tl, '#phone-bundle, #phone-ticket, #phone-public-copy, #phone-temporary-key', '#request', '>-0.1');
      },
    },
    {
      notes: 'There are a lot of keys going on. That encrypted provisioning request can only be decrypted by this private key here, on the laptop.',
      build: (tl) => {
        say(tl, 11);
        pulse(tl, '#temporary-private', '<');
        pulse(tl, '#temporary-private', '>0.1');
      },
    },
    {
      notes: 'Let’s send it over, via the connection.',
      build: (tl) => {
        say(tl, 12);
        show(tl, '#to-laptop-line', '<');
        moveTo(tl, '#request', link.requestOnLaptop, '<0.1', 1.3);
      },
    },
    {
      notes: 'The laptop uses that temporary private key to decrypt it, and gets the provisioning request out, and also the public key from the phone.',
      build: (tl) => {
        say(tl, 13);
        hide(tl, '#to-laptop-line', '<');
        fly(tl, '#temporary-private', link.temporaryPrivate, link.laptopOpening, { bend: 80, duration: 0.8, at: '<' });
        swap(tl, '#request', '#laptop-bundle, #received-ticket, #received-key', '>-0.1');
        fly(tl, '#temporary-private', link.laptopOpening, link.temporaryPrivate, { bend: -80, duration: 0.7, at: '>0.15' });
      },
    },
    {
      notes:
        'The provisioning request is just matched: if the one I get is the same one I sent, then this is the provisioning cycle that I started. So now we have the public key of the new device.',
      build: (tl) => {
        say(tl, 14);
        hide(tl, '#laptop-bundle', '<');
        fly(tl, '#received-ticket', link.laptopBundleTicket, link.receivedTicket, { bend: 40, duration: 0.7, at: '<' });
        pop(tl, '#match', '>-0.1');
        pulse(tl, '#received-key', '>0.2');
      },
    },
    {
      notes: 'So we can now generate an identity token of some sort. It could be a JSON web token, an email address, or just a user id.',
      build: (tl) => {
        say(tl, 15);
        hide(tl, '#received-ticket, #issued-ticket, #match', '<');
        moveTo(tl, '#received-key', link.phoneKeyAside, '<', 0.6);
        pop(tl, '#laptop-identity', '>-0.1');
      },
    },
    {
      notes: 'We use the public key that just got transferred over, the phone’s, to encrypt the identity.',
      build: (tl) => {
        say(tl, 16);
        fly(tl, '#received-key', link.phoneKeyAside, link.laptopSealing, { bend: -60, duration: 0.7, at: '<' });
        swap(tl, '#laptop-identity, #received-key', '#sealed-identity', '>-0.1');
      },
    },
    {
      notes: 'And send it back to the phone.',
      build: (tl) => {
        say(tl, 17);
        show(tl, '#to-phone-line', '<');
        moveTo(tl, '#sealed-identity', link.sealedOnPhone, '<0.1', 1.3);
        show(tl, '#laptop-identity', '<0.4');
      },
    },
    {
      notes: 'The phone uses its own private key to decrypt it, and now has a JSON web token, or some kind of verifiable information.',
      build: (tl) => {
        say(tl, 18);
        hide(tl, '#to-phone-line', '<');
        fly(tl, '#phone-private', link.phonePrivate, link.phoneOpening, { bend: -80, duration: 0.8, at: '<' });
        swap(tl, '#sealed-identity', '#phone-identity', '>-0.1');
        fly(tl, '#phone-private', link.phoneOpening, link.phonePrivate, { bend: 80, duration: 0.7, at: '>0.15' });
      },
    },
    {
      notes:
        'The identity is now shared between the two. It was not a transfer of keys: each device keeps its own key pairs and still gets its own sealed copy of every message. The temporary keys are finished with.',
      build: (tl) => {
        say(tl, 19);
        hide(tl, '#temporary-private, #temporary-public, #temporary-label, #connection, #connection-label', '<', 0.5);
        pulse(tl, '#laptop-identity', '>');
        pulse(tl, '#phone-identity', '<');
      },
    },
  ],
};

// ---- Both devices know who they are (original slide 157) ----

const linked = {
  laptop: { x: 300, y: 420 },
  phone: { x: 1380, y: 400 },
  laptopBubble: { x: 380, y: 520 },
  phoneBubble: { x: 1448, y: 520 },
  chipStart: { x: 560, y: 530 },
  chipEnd: { x: 1390, y: 580 },
};

function LinkedView() {
  return (
    <>
      <Svg>
        <Character who="alice" x={20} y={560} scale={1.3} />
        <Laptop {...linked.laptop} scale={3.2} />
        <Handset {...linked.phone} scale={3.4} />
        <IdCard x={374} y={306} />
        <IdCard x={1240} y={306} />

        <Bubble id="laptop-mine" lines={[MESSAGE]} mine width={LAPTOP_BUBBLE} size={56} {...linked.laptopBubble} hidden />
        <CipherChip id="copy" text="9b41f07e2c…" {...linked.chipStart} scale={1.2} hidden />
        <Bubble id="phone-mine" lines={MESSAGE_ON_PHONE} mine width={PHONE_BUBBLE_SMALL} size={type.min} {...linked.phoneBubble} hidden />
      </Svg>
      <SceneTitle>Device linking</SceneTitle>
      <CodeCard id="is-sender" left={80} top={164} hidden>
        <span style={{ fontVariantLigatures: 'none' }}>
          <span className="dim">const</span>{' isSender = message.sender === '}<span className="hl">identity.userId</span>;
        </span>
      </CodeCard>
    </>
  );
}

const linkedScene: Scene = {
  id: 'dev-linked',
  title: 'Device linking: one identity on both devices',
  notes: 'Both devices now hold the same identity. Each still has its own keys.',
  View: LinkedView,
  steps: [
    {
      notes:
        'A message is shown as mine not because it was encrypted or decrypted with the same key, but because the message sender is the same as the user id this device knows it is representing.',
      build: (tl) => {
        show(tl, '#is-sender');
      },
    },
    {
      notes:
        'So now all of my devices can say "this was sent by me" and show it as my message. Question that came up here: could you use SSO or an identity server instead? Same outcome, but you delegate identity to a third party. This way two devices share an identity securely with no account and no third party.',
      build: (tl) => {
        pop(tl, '#laptop-mine');
        fly(tl, '#copy', linked.chipStart, linked.chipEnd, { bend: -120, reveal: true, at: '>0.1' });
        hide(tl, '#copy', '>-0.1');
        pop(tl, '#phone-mine', '<');
      },
    },
  ],
};

export const deviceScenes: Scene[] = [
  sectionTitle(
    'dev-title',
    'Single user, multiple devices: title',
    <>Single user, <em>multiple devices</em></>,
    'Single user, multi-device. This is where the earlier questions about transferring keys were heading.',
  ),
  keysScene,
  joinScene,
  sameUserScene,
  sectionTitle(
    'dev-link-title',
    'Device linking: title',
    <>Device <em>linking</em></>,
    'So let’s have a look at how we link devices. Each device stays a separate client; we connect them so they share an identity. This bit is fun, I promise.',
  ),
  linkScene,
  linkedScene,
];
