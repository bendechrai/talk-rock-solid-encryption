/**
 * Scalability, and what symmetric encryption and Diffie-Hellman do about it.
 *
 * One message becomes one sealed copy per reader, so stored copies multiply. Public-key output
 * is also big. The way out is to agree a symmetric key on the devices with a Diffie-Hellman
 * exchange, which is worked through here with small numbers. The honest ending: every copy is
 * now small and cheap, but a shared secret belongs to one pair, so a message still goes out once
 * per recipient (7 messages x 3 people = 21 stored copies).
 */
import './scaling.css';
import {
  Actor, Character, CipherChip, Flow, Handset, Label, Laptop, PlainChip, PublicKey, ScreenCipher, ScreenMessage, Server,
  type ActorProps,
} from '../art/index.tsx';
import { CodeCard, SceneTitle } from '../art/html.tsx';
import { Svg } from '../engine/Stage.tsx';
import { along, fly, hide, moveTo, pop, pulse, show, swap, type Point } from '../engine/motion.ts';
import type { Scene, Timeline } from '../engine/types.ts';
import { cast, color, conversation, type, type Who } from '../theme.ts';
import { sectionTitle } from './sectionTitle.tsx';

const WARN = cast.eve.color;

// ---------------------------------------------------------------------------------------------
// Local actors. They follow the deck's visual language: plaintext is white, ciphertext is green,
// and a key inside a shield is secret. A shared secret is a shield outlined in both owners' colours.
// ---------------------------------------------------------------------------------------------

function pairId(a: Who, b: Who): string {
  return `scale-pair-${a}-${b}`;
}

/** A two-colour paint for things a pair of people share. Put it in the scene's <defs>. */
function PairPaint({ a, b }: { a: Who; b: Who }) {
  return (
    <linearGradient id={pairId(a, b)} x1="0" x2="1" y1="0" y2="0">
      <stop offset="0" stopColor={cast[a].color} />
      <stop offset="0.5" stopColor={cast[a].color} />
      <stop offset="0.5" stopColor={cast[b].color} />
      <stop offset="1" stopColor={cast[b].color} />
    </linearGradient>
  );
}

/**
 * A symmetric key: secret, so it sits in a shield, but it belongs to nobody in particular (a
 * white outline) or to a pair (their two colours). 64x76 at scale 1, the same as a private key.
 */
function SecretKey({ pair, ...actor }: ActorProps & { pair?: [Who, Who] }) {
  const outline = pair ? `url(#${pairId(pair[0], pair[1])})` : color.paper;
  return (
    <Actor {...actor}>
      <path d="M32 4l26 9v22c0 20-12 32-26 38C18 67 6 55 6 35V13z" fill="#1A2440" stroke={outline} strokeWidth="4" strokeLinejoin="round" />
      <g transform="translate(43 14) scale(.5) rotate(90)" fill={color.paper}>
        <path d="M21 2l17 10v20L21 42 4 32V12z M21 14a8 8 0 1 0 0 16a8 8 0 1 0 0-16z" fillRule="evenodd" />
        <rect x="36" y="18" width="56" height="8" rx="4" />
        <rect x="66" y="24" width="8" height="12" rx="2" />
        <rect x="80" y="24" width="8" height="9" rx="2" />
      </g>
    </Actor>
  );
}

/** A number on its own, centred on (x, y) with y as the baseline, so it can fly between places. */
function Num({
  id, x, y, text, size = 84, tint = color.paper, hidden = true,
}: {
  id?: string; x: number; y: number; text: string; size?: number; tint?: string; hidden?: boolean;
}) {
  return (
    <g id={id} transform={`translate(${x} ${y})`} opacity={hidden ? 0 : 1}>
      <text textAnchor="middle" fontSize={size} fontWeight={700} fill={tint}>{text}</text>
    </g>
  );
}

/** Several versions of one label stacked in the same place; steps swap between them. */
function Stack({
  id, values, x, y, size = type.label, tint = color.text, anchor = 'start',
}: {
  id: string; values: string[]; x: number; y: number; size?: number; tint?: string; anchor?: 'start' | 'middle' | 'end';
}) {
  return (
    <>
      {values.map((value, i) => (
        <Label key={i} id={`${id}-${i}`} x={x} y={y} text={value} size={size} tint={tint} anchor={anchor} hidden={i > 0} />
      ))}
    </>
  );
}

/** A cubic curve between two points, bowed sideways by `bend` pixels (the same shape `fly` uses). */
function curve(from: Point, to: Point, bend = 0): string {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.hypot(dx, dy) || 1;
  const nx = (-dy / length) * bend;
  const ny = (dx / length) * bend;
  const r = (n: number) => Math.round(n * 10) / 10;
  return `M${r(from.x)} ${r(from.y)}C${r(from.x + dx * 0.25 + nx)} ${r(from.y + dy * 0.25 + ny)} ${r(from.x + dx * 0.75 + nx)} ${r(from.y + dy * 0.75 + ny)} ${r(to.x)} ${r(to.y)}`;
}

/** A plain arrow, for "this becomes that" inside a diagram. */
function Arrow({ id, from, to, tint = color.muted, hidden = false }: { id?: string; from: Point; to: Point; tint?: string; hidden?: boolean }) {
  const angle = (Math.atan2(to.y - from.y, to.x - from.x) * 180) / Math.PI;
  return (
    <g id={id} opacity={hidden ? 0 : 1}>
      <path d={`M${from.x} ${from.y}L${to.x} ${to.y}`} stroke={tint} strokeWidth="7" strokeLinecap="round" />
      <path d="M-20 -14L4 0L-20 14" transform={`translate(${to.x} ${to.y}) rotate(${angle})`} fill="none" stroke={tint} strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
    </g>
  );
}

// ---------------------------------------------------------------------------------------------
// 1. One message, many copies
// ---------------------------------------------------------------------------------------------

const LAPTOP = 1.25;
const PHONE = 1.2;

interface Device {
  kind: 'laptop' | 'phone';
  x: number;
  y: number;
}

const devices = {
  a1: { kind: 'laptop', x: 60, y: 500 },
  a2: { kind: 'phone', x: 70, y: 190 },
  a3: { kind: 'laptop', x: 60, y: 800 },
  b1: { kind: 'laptop', x: 580, y: 235 },
  b2: { kind: 'phone', x: 905, y: 222 },
  b3: { kind: 'laptop', x: 1050, y: 235 },
  c2: { kind: 'phone', x: 590, y: 800 },
  c1: { kind: 'laptop', x: 800, y: 818 },
} satisfies Record<string, Device>;

type DeviceId = keyof typeof devices;
type Side = 'top' | 'bottom' | 'left' | 'right';

/** A point just outside the middle of one side of a device, optionally shifted along that side. */
function edge(id: DeviceId, side: Side, shift = 0): Point {
  const device: Device = devices[id];
  const gap = 30;
  const box = device.kind === 'laptop'
    ? { left: 22 * LAPTOP, right: 218 * LAPTOP, top: 6 * LAPTOP, bottom: 158 * LAPTOP, midX: 120 * LAPTOP, midY: 73 * LAPTOP }
    : { left: 8 * PHONE, right: 92 * PHONE, top: 4 * PHONE, bottom: 186 * PHONE, midX: 50 * PHONE, midY: 95 * PHONE };
  switch (side) {
    case 'top': return { x: device.x + box.midX + shift, y: device.y + box.top - gap };
    case 'bottom': return { x: device.x + box.midX + shift, y: device.y + box.bottom + gap };
    case 'left': return { x: device.x + box.left - gap, y: device.y + box.midY + shift };
    case 'right': return { x: device.x + box.right + gap, y: device.y + box.midY + shift };
  }
}

/** Where the nth sealed copy sits on a device's screen: a row on a laptop, a column on a phone. */
function slot(id: DeviceId, n: number): Point {
  const device: Device = devices[id];
  return device.kind === 'laptop'
    ? { x: device.x + 56 + n * 66, y: device.y + 63 }
    : { x: device.x + 32, y: device.y + 22 + n * 64 };
}

interface Route {
  id: string;
  d: string;
  target: DeviceId;
  slot: number;
}

function route(id: string, from: Point, to: Point, bend: number, target: DeviceId, slotIndex: number): Route {
  return { id, d: curve(from, to, bend), target, slot: slotIndex };
}

/** Message 1: Alice's laptop, in the group chat. Every other device of every member gets a copy. */
const first: Route[] = [
  route('m1-a2', edge('a1', 'top', -60), edge('a2', 'bottom'), 0, 'a2', 0),
  route('m1-a3', edge('a1', 'bottom'), edge('a3', 'top'), 0, 'a3', 0),
  route('m1-b1', edge('a1', 'right', -40), edge('b1', 'bottom', -70), -50, 'b1', 0),
  route('m1-b2', edge('a1', 'right', -20), edge('b2', 'bottom', -20), -40, 'b2', 0),
  route('m1-b3', edge('a1', 'right', 0), edge('b3', 'bottom', -70), -30, 'b3', 0),
  route('m1-c1', edge('a1', 'right', 20), edge('c1', 'top', -60), 30, 'c1', 0),
  route('m1-c2', edge('a1', 'right', 40), edge('c2', 'left', -30), 40, 'c2', 0),
];

/** Message 2: Charlie's phone, in a private chat with Bob. */
const second: Route[] = [
  route('m2-b1', edge('c2', 'top', -25), edge('b1', 'bottom', -5), 30, 'b1', 1),
  route('m2-b2', edge('c2', 'top', -5), edge('b2', 'bottom', 20), 30, 'b2', 1),
  route('m2-b3', edge('c2', 'top', 15), edge('b3', 'bottom', -5), -40, 'b3', 1),
  route('m2-c1', edge('c2', 'right', -40), edge('c1', 'left', -40), 0, 'c1', 1),
];

/** Message 3: the same chat two minutes later, sealed with freshly rotated keys. */
const third: Route[] = [
  route('m3-b1', edge('c2', 'top', -15), edge('b1', 'bottom', 60), -20, 'b1', 2),
  route('m3-b2', edge('c2', 'top', 5), edge('b2', 'bottom', 55), -30, 'b2', 2),
  route('m3-b3', edge('c2', 'top', 25), edge('b3', 'bottom', 60), -90, 'b3', 2),
  route('m3-c1', edge('c2', 'right', 30), edge('c1', 'left', 30), 0, 'c1', 2),
];

/** One sealed copy: a green tile with a padlock. `fresh` marks copies sealed with new keys. */
function Token({ fresh = false, ...actor }: ActorProps & { fresh?: boolean }) {
  return (
    <Actor {...actor}>
      <rect x="2" y="2" width="52" height="52" rx="12" fill={color.cipherGround} stroke={color.cipher} strokeWidth="4" strokeDasharray={fresh ? '5 7' : undefined} strokeLinecap="round" />
      <path d="M20 26v-5a8 8 0 0 1 16 0v5" fill="none" stroke={color.cipher} strokeWidth="4.5" />
      <rect x="15" y="25" width="26" height="20" rx="5" fill={color.cipher} />
    </Actor>
  );
}

/** Someone typing: a white bubble with three dots. */
function Typing(actor: ActorProps) {
  return (
    <Actor {...actor}>
      <path d="M12 0h48a12 12 0 0 1 12 12v22a12 12 0 0 1-12 12H30L16 58V46h-4A12 12 0 0 1 0 34V12A12 12 0 0 1 12 0z" fill={color.paper} />
      <circle cx="20" cy="23" r="5" fill={color.ink} />
      <circle cx="36" cy="23" r="5" fill={color.ink} />
      <circle cx="52" cy="23" r="5" fill={color.ink} />
    </Actor>
  );
}

function Zone({ who, x, y, width, height }: { who: Who; x: number; y: number; width: number; height: number }) {
  return <rect x={x} y={y} width={width} height={height} rx="40" fill={cast[who].color} fillOpacity="0.09" />;
}

function DeviceActor({ id }: { id: DeviceId }) {
  const device: Device = devices[id];
  return device.kind === 'laptop'
    ? <Laptop x={device.x} y={device.y} scale={LAPTOP} />
    : <Handset x={device.x} y={device.y} scale={PHONE} />;
}

const tally = { left: 1440, right: 1885 };

function CopiesView() {
  const flows: [Route[], string][] = [[first, conversation.green], [second, conversation.blue], [third, conversation.blue]];
  return (
    <>
      <Svg>
        <Zone who="alice" x={40} y={172} width={350} height={872} />
        <Zone who="bob" x={440} y={196} width={940} height={282} />
        <Zone who="charlie" x={560} y={778} width={740} height={266} />
        <Label x={292} y={320} text="Alice" tint={cast.alice.color} />
        <Label x={510} y={352} text="Bob" tint={cast.bob.color} />
        <Label x={1202} y={930} text="Charlie" tint={cast.charlie.color} />

        {flows.map(([routes, tint]) => routes.map((r) => <Flow key={r.id} id={r.id} d={r.d} tint={tint} hidden />))}

        {(Object.keys(devices) as DeviceId[]).map((id) => <DeviceActor key={id} id={id} />)}

        <Typing id="typing-a1" x={devices.a1.x + 114} y={devices.a1.y + 62} hidden />
        <Typing id="typing-c2" x={devices.c2.x + 24} y={devices.c2.y + 156} hidden />

        {first.map((r) => <Token key={r.id} id={`tok-${r.id}`} x={0} y={0} hidden />)}
        {second.map((r) => <Token key={r.id} id={`tok-${r.id}`} x={0} y={0} hidden />)}
        {third.map((r) => <Token key={r.id} id={`tok-${r.id}`} x={0} y={0} fresh hidden />)}

        {/* The running count. */}
        <Label x={tally.left} y={250} text="sent" tint={color.muted} anchor="start" weight={500} />
        <Stack id="sent" values={['0', '1', '2', '3']} x={tally.left} y={362} size={120} />
        <Label x={1660} y={250} text="stored" tint={color.muted} anchor="start" weight={500} />
        <Stack id="stored" values={['0', '7', '11', '15']} x={1660} y={362} size={120} tint={color.cipher} />

        <Label id="tally-head" x={tally.right} y={452} text="messages × devices" tint={color.muted} size={type.min} weight={500} anchor="end" hidden />
        <g id="tally-1" opacity="0">
          <circle cx={tally.left + 14} cy={506} r="14" fill={conversation.green} />
          <Label x={tally.left + 44} y={522} text="group chat" anchor="start" weight={500} />
          <Label x={tally.right} y={522} text="1 × 7" anchor="end" />
        </g>
        <g id="tally-2" opacity="0">
          <circle cx={tally.left + 14} cy={574} r="14" fill={conversation.blue} />
          <Label x={tally.left + 44} y={590} text="private chat" anchor="start" weight={500} />
          <Label x={tally.right} y={590} text="1 × 4" anchor="end" />
        </g>
        <g id="tally-3" opacity="0">
          <circle cx={tally.left + 14} cy={642} r="12" fill="none" stroke={conversation.blue} strokeWidth="5" strokeDasharray="5 6" />
          <Label x={tally.left + 44} y={658} text="new keys" anchor="start" weight={500} />
          <Label x={tally.right} y={658} text="1 × 4" anchor="end" />
        </g>

        <g id="rule" opacity="0">
          <rect x={1420} y={724} width={470} height={300} rx="28" fill={color.cipherGround} stroke={color.cipher} strokeWidth="4" />
          <Label x={1655} y={800} text="Every message is" />
          <Label x={1655} y={860} text="stored once for" />
          <Label x={1655} y={920} text="every device that" />
          <Label x={1655} y={980} text="has to read it" />
        </g>
      </Svg>
      <SceneTitle>Scalability</SceneTitle>
    </>
  );
}

/** Light the routes, send one sealed copy down each, and park every copy on its device. */
function deliver(tl: Timeline, routes: Route[], start: number): number {
  const travel = 1.0;
  routes.forEach((r, i) => {
    const t = start + i * 0.1;
    show(tl, `#${r.id}-line`, t, 0.3);
    along(tl, `#tok-${r.id}`, `#${r.id}`, { at: t + 0.2, duration: travel });
    moveTo(tl, `#tok-${r.id}`, slot(r.target, r.slot), t + 0.2 + 0.15 + travel, 0.3);
  });
  return start + (routes.length - 1) * 0.1 + 0.2 + 0.15 + travel + 0.3;
}

function lines(routes: Route[]): string {
  return routes.map((r) => `#${r.id}-line`).join(', ');
}

const copies: Scene = {
  id: 'scale-copies',
  title: 'Scalability: one message, many copies',
  notes:
    'Somebody already said this is going to explode. A single message encrypted for three people means three messages. Here are three people and their eight devices.',
  View: CopiesView,
  steps: [
    {
      notes: 'Send one message from one device to all the others: there are seven messages in the system already.',
      build: (tl) => {
        pop(tl, '#typing-a1');
        const done = deliver(tl, first, 0.4);
        swap(tl, '#sent-0', '#sent-1', done - 0.3);
        swap(tl, '#stored-0', '#stored-1', '<');
        show(tl, '#tally-head, #tally-1', '<');
      },
    },
    {
      notes: 'Somebody else sends a message (a private chat this time): four more. Eleven stored for two actual messages.',
      build: (tl) => {
        tl.to(lines(first), { opacity: 0.25, duration: 0.3 });
        pop(tl, '#typing-c2', '<');
        const done = deliver(tl, second, 0.4);
        swap(tl, '#sent-1', '#sent-2', done - 0.3);
        swap(tl, '#stored-1', '#stored-2', '<');
        show(tl, '#tally-2', '<');
      },
    },
    {
      notes: 'The same device sends another, but two minutes later: the ephemeral keys have died, so these are sealed with different keys. Fifteen stored for three messages sent.',
      build: (tl) => {
        tl.to(lines(second), { opacity: 0.25, duration: 0.3 });
        pulse(tl, '#typing-c2', '<');
        const done = deliver(tl, third, 0.4);
        swap(tl, '#sent-2', '#sent-3', done - 0.3);
        swap(tl, '#stored-2', '#stored-3', '<');
        show(tl, '#tally-3', '<');
      },
    },
    {
      notes:
        'Ben says "growing exponentially"; the accurate word is multiplying. Stored copies = messages x the devices that must read each one. In a group where everyone talks that grows with the square of the group, which is bad enough.',
      build: (tl) => {
        tl.to(lines(third), { opacity: 0.25, duration: 0.3 });
        pop(tl, '#rule', '<');
        pulse(tl, '#stored-3', '>-0.1');
      },
    },
  ],
};

// ---------------------------------------------------------------------------------------------
// 2. What public-key output looks like
// ---------------------------------------------------------------------------------------------

/**
 * A real message: the two letters "hi", encrypted by GnuPG 2.4 for two throwaway RSA-4096 keys.
 * It is 1,589 bytes. The first 11 lines are the message key locked for one recipient, the next 11
 * the same key locked for the other, and the last two lines are the message itself under AES.
 */
const PGP_LINES = [
  'hQIMA7SKJwwoW9zmARAAhpwj53pB10h4ZqBxHy78zx37YMCTrkbQAVPDhOODdKKZ',
  'hZz03zc5mU+Qzco1ujODNmzDnTndkaT3vUhi9wPl5ri9ZgW8RqzTyGjwAYAy8sqL',
  'D3Vn0Eh9j8DhE7v6zQqEhUHCq9DrztaYO2DoZtfmRhtSfds3H1GJsl8mcAnYIPXG',
  '31U7h821XDl8PUH+tDV0RssnaMXtPWQ+c0oGVF35rsWikoSe9esbZ5Zh3uIOJzSj',
  'Xg923D5PfVkSlf8wnEBNI8CUNGBmzbOQ7IMg7ZovrQ76sHeq4oO5fjVw8UawoSBb',
  'JSbdvxgyIZ8XGp0dTd+S7KCpcc4fd4BXgaaTIV1M1eTuxJ3mduXdIssw5HXYAN/r',
  'SWaH6SHDMsleMr7XY+REQDDjwUG9nysV/wg2thtVVTxQSnac7Yzk7TyCr3I/JMIh',
  'vjrnlWv+0ocO/4h6k5/zUBqyfFgediYPxk2aTy3h6wmCApjBx8AtAPRtZRLBL/ZO',
  'yBx5uVItE2hBT4CXoIJLIOD4561sGrFNgl5yxDd6exhRpS3Uy3eFtCTQqZvFtCoo',
  'sXYXR07DyyD+V7ren5pqcQLvYMViSlAXaL8pwwJt4nX0pImubHdwuzsMwMeudeGV',
  'S3xQ4MvRifoEo0ekzshF3dcpahi18+is4fu0cnxnRufixwSlsqPS6JYydN9fSvmF',
  'AgwDowsSMXTDRtYBD/93D767ErjcaInpv138XfZ5meaJtr/PHy5zJd3P/wZMICEZ',
  '4BlxZbZShd25q97/RUpidodMmQa6yr4DsqqBSXuosw4M7BFg8ftNwJNoZ2vOHYp/',
  'd0QJslIneoKTz0tS8gBE1kjOgq0h4HeGwcUlWfz0EJ16OcLru4JUO7vRonoiRBk7',
  'Z8pQtVoH+Jd2zfKAtZpetDQV2Wbb+gQSZ6c7ToZ7WcZI/nl+R+dcgs31Fqu7blN6',
  'skQDdZl7EcK+tNsRBQVs3P3I9SsPoH0e3uau75deVsPP66zn4rMf1m3MCuSPhJFD',
  '6XLMoEwPjBCUe+wCdT0hwQvVG37wqKrpZLf8dsa5VD1R2VCU1PHNOZPu43AkeFza',
  'pAzvJfTthuJUY9SctyMCmbaQlvzFqPgTr2FRXrr50OiS+JdYOcmNHO1nwJhp5m2y',
  'LWjqgqfIU78WLy0LIglpRPpL/qcqAd1izKUEMwN9mOucd7g2G15K6s9ZnlpuSphU',
  'lpU0YeS//imR0fvSt9XVROrMa07LFP0ziDdp1g3llYlpLFHzH5vh51ik0EGevAf6',
  'gaHPriXFDvNSugGoZ/1+J+Gm5lpFF5BHjWcFlhI1yyTbczoCrYSLoLHKlyK6Yb1I',
  'ZAWdOyx1/RpgFEBr0xodqftv0Gr2iXnp0vQZF21yEARmrk9bB8PH0hqNvo0wOdRH',
  'AQkCELfU9G1f5Vf2XWIGXvMmBdq8GIRGe5UodTq2HkKHd4KnPfXE2PK1RVc363Vb',
  'NTYr7+8UYvV7nkmGsFARflVZu5NKOHI=',
];
const PGP_CHECKSUM = '99eJ';

function PgpBlock({ id, left, top, hidden = false }: { id: string; left: number; top: number; hidden?: boolean }) {
  return (
    <pre id={id} className="scaling-pgp" data-texture style={{ left, top, opacity: hidden ? 0 : 1 }}>
      {'-----BEGIN PGP MESSAGE-----'}
      <span className="gap" />
      {`${PGP_LINES.join('\n')}\n=${PGP_CHECKSUM}\n-----END PGP MESSAGE-----`}
    </pre>
  );
}

const pgp = {
  block: { left: 60, top: 160 },
  hiBig: { x: 795, y: 290 },
  hiSmall: { x: 1270, y: 50 },
  bobKeyBig: { x: 800, y: 700 },
  charlieKeyBig: { x: 980, y: 700 },
  bobKeySmall: { x: 1450, y: 68 },
  charlieKeySmall: { x: 1620, y: 68 },
};
const HI_SCALE = 2.2;

function Bracket({ y1, y2, tint }: { y1: number; y2: number; tint: string }) {
  return <path d={`M1198 ${y1}h18V${y2}h-18`} fill="none" stroke={tint} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />;
}

function PgpView() {
  return (
    <>
      <PgpBlock id="pgp-block" {...pgp.block} hidden />
      <Svg>
        <Label id="pgp-ask" x={960} y={640} text="encrypt it for two people" size={type.body} weight={500} />
        <PlainChip id="pgp-hi" text="hi" {...pgp.hiBig} scale={HI_SCALE} />
        <PublicKey id="pgp-key-bob" owner="bob" {...pgp.bobKeyBig} scale={1.4} />
        <PublicKey id="pgp-key-charlie" owner="charlie" {...pgp.charlieKeyBig} scale={1.4} />

        <g id="pgp-size" opacity="0">
          <Label x={1270} y={212} text="2 letters, for 2 people" tint={color.muted} anchor="start" weight={500} />
          <Label x={1270} y={294} text="1,589 bytes" tint={color.cipher} anchor="start" size={type.title} />
        </g>

        <g id="pgp-part-1" opacity="0">
          <Bracket y1={218} y2={540} tint={cast.bob.color} />
          <Label x={1244} y={378} text="the message key," tint={cast.bob.color} anchor="start" />
          <Label x={1244} y={432} text="locked for Bob" tint={cast.bob.color} anchor="start" />
          <Label x={1244} y={486} text="RSA: 512 bytes" tint={color.muted} anchor="start" size={type.min} weight={500} />
        </g>
        <g id="pgp-part-2" opacity="0">
          <Bracket y1={548} y2={870} tint={cast.charlie.color} />
          <Label x={1244} y={692} text="the same key," tint={cast.charlie.color} anchor="start" />
          <Label x={1244} y={746} text="locked for Charlie" tint={cast.charlie.color} anchor="start" />
          <Label x={1244} y={800} text="RSA: 512 bytes" tint={color.muted} anchor="start" size={type.min} weight={500} />
        </g>
        <g id="pgp-part-3" opacity="0">
          <Bracket y1={878} y2={930} tint={color.paper} />
          <Label x={1244} y={920} text="the message: “hi”" anchor="start" />
          <Label x={1244} y={974} text="AES: 73 bytes" tint={color.muted} anchor="start" size={type.min} weight={500} />
        </g>
      </Svg>
      <SceneTitle>One PGP message</SceneTitle>
    </>
  );
}

const pgpScene: Scene = {
  id: 'scale-pgp',
  title: 'Scalability: a PGP message for two people',
  notes: 'And consider the way public/private key encryption works with OpenPGP, or GnuPG: take a message that says "hi", for two people.',
  View: PgpView,
  steps: [
    {
      notes: 'That is a message encrypted for two people, and it says "hi". (This block is real: GnuPG, two RSA-4096 recipients, 1,589 bytes.)',
      build: (tl) => {
        hide(tl, '#pgp-ask');
        tl.to('#pgp-hi', { x: pgp.hiSmall.x, y: pgp.hiSmall.y, scale: 1 / HI_SCALE, transformOrigin: '0 0', duration: 0.8, ease: 'power2.inOut' }, '<');
        fly(tl, '#pgp-key-bob', pgp.bobKeyBig, pgp.bobKeySmall, { bend: 40, duration: 0.8, at: '<' });
        fly(tl, '#pgp-key-charlie', pgp.charlieKeyBig, pgp.charlieKeySmall, { bend: 40, duration: 0.8, at: '<' });
        show(tl, '#pgp-block', '<0.3', 0.6);
        pop(tl, '#pgp-size', '>-0.1');
      },
    },
    {
      notes:
        'Not in the narration, added for accuracy: PGP is itself hybrid. Almost all of this is one random message key, locked once per recipient with RSA. The message is the last two lines, under AES. Public-key output is big and slow to make; symmetric ciphertext is about the size of the message.',
      build: (tl) => {
        show(tl, '#pgp-part-1');
        show(tl, '#pgp-part-2', '>0.1');
        show(tl, '#pgp-part-3', '>0.1');
      },
    },
  ],
};

// ---------------------------------------------------------------------------------------------
// 3. Symmetric encryption, revisited
// ---------------------------------------------------------------------------------------------

function Tick({ x, y }: { x: number; y: number }) {
  return <path d={`M${x} ${y + 22}l16 16l30 -34`} fill="none" stroke={color.cipher} strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" />;
}

function Caution({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <path d="M26 3L50 45H2z" fill="none" stroke={WARN} strokeWidth="6" strokeLinejoin="round" />
      <rect x="23" y="17" width="6" height="15" rx="3" fill={WARN} />
      <circle cx="26" cy="38" r="3.5" fill={WARN} />
    </g>
  );
}

const pros = ['Faster', 'Easier on the CPU', 'Smaller ciphertext'];
const cons = [
  'Whoever holds it reads everything',
  'The same key locks and unlocks',
  'How do you share it safely?',
  'Demo 2 kept it on the server',
];

function SymmetricView() {
  return (
    <>
      <Svg>
        {/* What symmetric encryption is: one key, used in both directions. */}
        <PlainChip text="Hi!" x={90} y={170} scale={1.3} />
        <Arrow from={{ x: 312, y: 232 }} to={{ x: 372, y: 232 }} />
        <SecretKey id="sym-key-in" x={404} y={162} scale={1.8} />
        <Arrow from={{ x: 548, y: 232 }} to={{ x: 608, y: 232 }} />
        <CipherChip text="c26d74c865…" x={640} y={194} scale={1.25} />
        <Arrow from={{ x: 1004, y: 232 }} to={{ x: 1064, y: 232 }} />
        <SecretKey id="sym-key-out" x={1096} y={162} scale={1.8} />
        <Arrow from={{ x: 1240, y: 232 }} to={{ x: 1300, y: 232 }} />
        <PlainChip text="Hi!" x={1332} y={170} scale={1.3} />
        <Label x={1870} y={216} text="one key," tint={color.muted} anchor="end" weight={500} />
        <Label x={1870} y={268} text="both ways" tint={color.muted} anchor="end" weight={500} />

        {pros.map((text, i) => (
          <g key={text} id={`pro-${i}`} opacity="0">
            <Tick x={92} y={394 + i * 90} />
            <Label x={170} y={436 + i * 90} text={text} anchor="start" size={56} />
          </g>
        ))}
        <g id="sizes" opacity="0">
          <Label x={170} y={700} text="the letters “hi”, encrypted:" tint={color.muted} anchor="start" size={type.min} weight={500} />
          <Label x={170} y={772} text="RSA-4096" anchor="start" size={type.min} />
          <rect x={400} y={732} width={512} height={54} rx="10" fill={color.cipher} />
          <Label x={656} y={773} text="512 bytes" tint={color.ink} size={type.min} />
          <Label x={170} y={850} text="AES-GCM" anchor="start" size={type.min} />
          <rect x={400} y={810} width={30} height={54} rx="8" fill={color.cipher} />
          <Label x={448} y={851} text="30 bytes" anchor="start" size={type.min} />
        </g>
        <g id="demo-note" opacity="0">
          <rect x={92} y={916} width={8} height={104} rx="4" fill={color.cipher} />
          <Label x={124} y={956} text="Demo 3 already used AES" anchor="start" weight={500} />
          <Label x={124} y={1010} text="inside every sealed copy" anchor="start" weight={500} />
        </g>

        {cons.map((text, i) => (
          <g key={text} id={`con-${i}`} opacity="0">
            <Caution x={1000} y={396 + i * 110} />
            <Label x={1074} y={438 + i * 110} text={text} anchor="start" />
          </g>
        ))}
        <g id="sym-next" opacity="0">
          <Arrow from={{ x: 1002, y: 902 }} to={{ x: 1048, y: 902 }} tint={color.cipher} />
          <Label x={1074} y={918} text="So: make the key on the devices" tint={color.cipher} anchor="start" />
        </g>
      </Svg>
      <SceneTitle>Symmetric encryption</SceneTitle>
    </>
  );
}

const symmetric: Scene = {
  id: 'scale-symmetric',
  title: 'Symmetric encryption: why, and what is wrong with it',
  notes: 'So what we are going to do is use symmetric encryption. "What is going on? You just told us that was no good."',
  View: SymmetricView,
  steps: [
    {
      notes: 'It is faster, easier on the CPU, and it gives you a smaller ciphertext.',
      build: (tl) => {
        show(tl, '#pro-0');
        show(tl, '#pro-1', '>-0.1');
        show(tl, '#pro-2', '>-0.1');
        show(tl, '#sizes', '>');
      },
    },
    {
      notes: 'The JSON I was copying and pasting also said hi, but it was so much smaller: I was actually using symmetric encryption in there, on top of asymmetric.',
      build: (tl) => {
        show(tl, '#demo-note');
      },
    },
    {
      notes: 'What we have to get around is key compromise: anyone who gets the key reads everything it protects.',
      build: (tl) => {
        show(tl, '#con-0');
      },
    },
    {
      notes:
        'Ben says symmetric is "less secure" and "weak". AES is not weaker than public-key maths. The weakness is that there is one key: even with a key per conversation, the same key encrypts and decrypts.',
      build: (tl) => {
        show(tl, '#con-1');
        pulse(tl, '#sym-key-in', '<');
        pulse(tl, '#sym-key-out', '<');
      },
    },
    {
      notes: 'The whole point of a shared key is that everybody knows it. So how do you transmit it between systems?',
      build: (tl) => {
        show(tl, '#con-2');
      },
    },
    {
      notes:
        'We also want to get away from encrypting on the server. That was only necessary in Demo 2 because there was no safe way to hand the key to the devices. So: symmetric encryption, but on the device.',
      build: (tl) => {
        show(tl, '#con-3');
        show(tl, '#sym-next', '>0.3');
      },
    },
  ],
};

// ---------------------------------------------------------------------------------------------
// 4. Diffie-Hellman with small numbers
//
// Three columns. What only Alice knows stays on the left, what only Bob knows stays on the right,
// and everything said out loud sits in the middle, where Eve is listening.
// p = 23 (a prime) and g = 7 (a generator for it) are public. 6 and 5 are the private numbers.
// 7^6 mod 23 = 4 and 7^5 mod 23 = 17 are sent. 17^6 mod 23 = 4^5 mod 23 = 12 is the shared secret.
// ---------------------------------------------------------------------------------------------

const AB: [Who, Who] = ['alice', 'bob'];
const SHARED = `url(#${pairId('alice', 'bob')})`;

const dh = {
  left: 0,
  right: 1220,
  rows: [345, 465],
  /** Offsets from a column's left edge to each part of "base^exp mod 23 = result". */
  base: (digits: number) => (digits === 1 ? 142 : 116),
  exp: 190,
  mod: 279,
  modulus: 399,
  equals: 484,
  result: (digits: number) => (digits === 1 ? 552 : 586),
  thought: { alice: { x: 350, y: 520 }, bob: { x: 1270, y: 520 } },
  said: {
    g: { x: 760, y: 250 },
    p: { x: 1010, y: 250 },
    a: { x: 760, y: 445 },
    b: { x: 1010, y: 585 },
    password: { x: 770, y: 290 },
  },
  mouth: { alice: { x: 290, y: 800 }, bob: { x: 1480, y: 800 } },
};

/** The middle of the number inside a thought bubble or a speech bubble. */
const inThought = (who: 'alice' | 'bob'): Point => ({ x: dh.thought[who].x + 150, y: dh.thought[who].y + 145 });
const inSaid = (which: 'g' | 'p' | 'a' | 'b'): Point => ({ x: dh.said[which].x + 75, y: dh.said[which].y + 84 });

/** A thought: a cloud in the thinker's colour, trailing off towards their head. */
function Thought({ id, x, y, text, tint, towards }: { id: string; x: number; y: number; text: string; tint: string; towards: 'left' | 'right' }) {
  const puffs = [[72, 112, 62, 58], [128, 70, 70, 60], [208, 78, 68, 58], [238, 124, 58, 54], [150, 138, 96, 56]];
  const flip = (n: number) => (towards === 'left' ? n : 300 - n);
  return (
    <g id={id} transform={`translate(${x} ${y})`} opacity="0">
      {puffs.map(([cx, cy, rx, ry], i) => <ellipse key={i} cx={cx} cy={cy} rx={rx} ry={ry} fill={color.panelRaised} stroke={tint} strokeWidth="10" />)}
      {puffs.map(([cx, cy, rx, ry], i) => <ellipse key={i} cx={cx} cy={cy} rx={rx} ry={ry} fill={color.panelRaised} />)}
      <circle cx={flip(6)} cy={214} r="17" fill={color.panelRaised} stroke={tint} strokeWidth="5" />
      <circle cx={flip(-34)} cy={246} r="10" fill={color.panelRaised} stroke={tint} strokeWidth="5" />
      <text x="150" y="145" textAnchor="middle" fontSize="120" fontWeight="700" fill={tint}>{text}</text>
    </g>
  );
}

/** Something said out loud: a white bubble whose tail points at whoever said it. */
function Said({ id, x, y, text, from, width = 150, size = 84 }: { id: string; x: number; y: number; text: string; from: 'left' | 'right'; width?: number; size?: number }) {
  const tail = from === 'left' ? 'M30 96L4 136L66 104z' : `M${width - 30} 96L${width - 4} 136L${width - 66} 104z`;
  return (
    <g id={id} transform={`translate(${x} ${y})`} opacity="0">
      <rect width={width} height="112" rx="28" fill={color.paper} />
      <path d={tail} fill={color.paper} />
      <text x={width / 2} y={size === 84 ? 84 : 72} textAnchor="middle" fontSize={size} fontWeight="700" fill={color.ink}>{text}</text>
    </g>
  );
}

interface Sum {
  /** Element id prefix, e.g. "a1" for Alice's first sum. */
  id: string;
  side: 'alice' | 'bob';
  row: number;
  base: string;
  baseFrom: 'g' | 'a' | 'b';
  exp: string;
  result: string;
}

const sums: Sum[] = [
  { id: 'a1', side: 'alice', row: 0, base: '7', baseFrom: 'g', exp: '6', result: '4' },
  { id: 'b1', side: 'bob', row: 0, base: '7', baseFrom: 'g', exp: '5', result: '17' },
  { id: 'a2', side: 'alice', row: 1, base: '17', baseFrom: 'b', exp: '6', result: '12' },
  { id: 'b2', side: 'bob', row: 1, base: '4', baseFrom: 'a', exp: '5', result: '12' },
];

function sumAt(sum: Sum) {
  const x = sum.side === 'alice' ? dh.left : dh.right;
  const y = dh.rows[sum.row];
  return {
    base: { x: x + dh.base(sum.base.length), y },
    exp: { x: x + dh.exp, y: y - 40 },
    mod: { x: x + dh.mod, y },
    modulus: { x: x + dh.modulus, y },
    equals: { x: x + dh.equals, y },
    result: { x: x + dh.result(sum.result.length), y },
  };
}

function SumParts({ sum }: { sum: Sum }) {
  const at = sumAt(sum);
  const secret = sum.result === '12';
  return (
    <>
      <g id={`${sum.id}-ops`} opacity="0">
        <Label x={at.mod.x} y={at.mod.y} text="mod" tint={color.muted} size={52} weight={500} />
        <Label x={at.equals.x} y={at.equals.y} text="=" tint={color.muted} size={72} weight={500} />
      </g>
      <Num id={`${sum.id}-base`} {...at.base} text={sum.base} />
      <Num id={`${sum.id}-exp`} {...at.exp} text={sum.exp} size={60} tint={cast[sum.side].color} />
      <Num id={`${sum.id}-modulus`} {...at.modulus} text="23" />
      {secret && (
        <rect id={`${sum.id}-ring`} x={at.result.x - 68} y={at.result.y - 86} width="136" height="112" rx="26" fill="none" stroke={SHARED} strokeWidth="7" opacity="0" />
      )}
      <Num id={`${sum.id}-result`} {...at.result} text={sum.result} tint={secret ? SHARED : color.paper} />
    </>
  );
}

/** Play one sum: the public numbers come in from the middle, the secret one from the thought. */
function work(tl: Timeline, sum: Sum) {
  const at = sumAt(sum);
  const id = `#${sum.id}`;
  fly(tl, `${id}-base`, inSaid(sum.baseFrom), at.base, { bend: sum.side === 'alice' ? 50 : -50, duration: 0.8, reveal: true });
  // The secret number shrinks into place as the exponent. It never crosses a line.
  fly(tl, `${id}-exp`, inThought(sum.side), at.exp, { bend: sum.side === 'alice' ? -40 : 40, duration: 0.8, reveal: true, at: '>-0.3' });
  tl.fromTo(`${id}-exp`, { scale: 2, transformOrigin: '50% 50%' }, { scale: 1, duration: 0.8, ease: 'power2.inOut', immediateRender: false }, '<');
  show(tl, `${id}-ops`, '>-0.2', 0.3);
  fly(tl, `${id}-modulus`, inSaid('p'), at.modulus, { bend: sum.side === 'alice' ? 50 : -50, duration: 0.8, reveal: true, at: '<' });
  pop(tl, `${id}-result`, '>0.1');
}

function DhView() {
  return (
    <>
      <Svg>
        <defs><PairPaint a="alice" b="bob" /></defs>

        <path d="M700 170V935M1220 170V935" stroke={color.muted} strokeOpacity="0.5" strokeWidth="4" strokeDasharray="4 16" strokeLinecap="round" />
        <Label x={350} y={216} text="only Alice knows" tint={cast.alice.color} />
        <Label x={960} y={216} text="said out loud" tint={color.paper} />
        <Label x={1570} y={216} text="only Bob knows" tint={cast.bob.color} />

        <Character who="alice" x={30} y={700} scale={1.25} />
        <Character who="bob" x={1640} y={700} scale={1.25} />
        <Character id="eve" who="eve" x={885} y={716} scale={0.75} hidden />

        <Thought id="think-alice" {...dh.thought.alice} text="6" tint={cast.alice.color} towards="left" />
        <Thought id="think-bob" {...dh.thought.bob} text="5" tint={cast.bob.color} towards="right" />

        <Said id="said-password" {...dh.said.password} text="password: blue" from="left" width={380} size={44} />
        <Label id="heard" x={960} y={470} text="everyone heard that" tint={WARN} hidden />

        <Said id="said-g" {...dh.said.g} text="7" from="left" />
        <Label id="label-g" x={835} y={420} text="generator" tint={color.muted} size={type.min} weight={500} hidden />
        <Said id="said-p" {...dh.said.p} text="23" from="right" />
        <Label id="label-p" x={1085} y={420} text="prime" tint={color.muted} size={type.min} weight={500} hidden />

        <Said id="said-a" {...dh.said.a} text="4" from="left" />
        <Label id="label-a" x={932} y={516} text="from Alice" tint={cast.alice.color} size={type.min} anchor="start" hidden />
        <Label id="doubt-a" x={932} y={516} text="from Alice?" tint={WARN} size={type.min} anchor="start" hidden />
        <Said id="said-b" {...dh.said.b} text="17" from="right" />
        <Label id="label-b" x={990} y={656} text="from Bob" tint={cast.bob.color} size={type.min} anchor="end" hidden />
        <Label id="doubt-b" x={990} y={656} text="from Bob?" tint={WARN} size={type.min} anchor="end" hidden />

        {sums.map((sum) => <SumParts key={sum.id} sum={sum} />)}
      </Svg>

      <SceneTitle>Diffie-Hellman key exchange</SceneTitle>
      <p id="banner-secret" className="scaling-banner" style={{ left: 310, top: 944, width: 1300, opacity: 0 }}>
        Both worked out <span className="secret">12</span>, and nobody said it.<br />
        Eve heard 7, 23, 4 and 17, but never 12.
      </p>
      <p id="banner-why" className="scaling-banner" style={{ left: 310, top: 944, width: 1300, opacity: 0 }}>
        Why it works: (7<sup>6</sup>)<sup>5</sup> and (7<sup>5</sup>)<sup>6</sup> are both 7<sup>30</sup>,<br />
        so both sides land on the same number.
      </p>
      <p id="banner-who" className="scaling-banner" style={{ left: 310, top: 944, width: 1300, opacity: 0 }}>
        <span className="warn">This does not prove who you are talking to.</span><br />
        Real apps sign 4 and 17 with their identity keys.
      </p>
    </>
  );
}

const diffieHellman: Scene = {
  id: 'scale-dh',
  title: 'Diffie-Hellman key exchange',
  notes: 'Alice and Bob want to come up with a shared key so they can symmetrically encrypt their messages.',
  View: DhView,
  steps: [
    {
      notes: 'They could just say "I am going to use blue as the password". But now anybody in this room heard that blue is the password.',
      build: (tl) => {
        fly(tl, '#said-password', { x: 300, y: 600 }, dh.said.password, { bend: -60, duration: 0.8, reveal: true });
        pop(tl, '#eve', '>-0.2');
        show(tl, '#heard', '>-0.1');
      },
    },
    {
      notes: 'So how do we come up with a shared key without telling each other the key? They each start by thinking of a number. Alice picks six. Bob goes with five.',
      build: (tl) => {
        hide(tl, '#said-password, #heard');
        pop(tl, '#think-alice');
        pop(tl, '#think-bob', '>0.3');
      },
    },
    {
      notes:
        'Then they each shout a number: seven, and twenty-three. These two are public and have roles: 23 is the prime everything is taken modulo, 7 is the generator that gets raised to a power.',
      build: (tl) => {
        fly(tl, '#said-g', dh.mouth.alice, dh.said.g, { bend: -60, duration: 0.8, reveal: true });
        show(tl, '#label-g', '>-0.1');
        fly(tl, '#said-p', dh.mouth.bob, dh.said.p, { bend: 60, duration: 0.8, reveal: true, at: '>0.1' });
        show(tl, '#label-p', '>-0.1');
      },
    },
    {
      notes: 'Alice takes the seven, raises it to the power of the secret number that nobody else knows, and takes the modulus by 23. "What is going on?" Alice gets four.',
      build: (tl) => work(tl, sums[0]),
    },
    {
      notes: 'So Alice says it out loud: "Four."',
      build: (tl) => {
        fly(tl, '#said-a', { x: sumAt(sums[0]).result.x - 75, y: dh.rows[0] - 84 }, dh.said.a, { bend: 60, duration: 0.9, reveal: true });
        show(tl, '#label-a', '>-0.1');
      },
    },
    {
      notes: 'Bob does the same thing: the seven, raised to the five Bob imagined, mod 23. Bob gets seventeen. (Ben stumbles here: "mod it by the five". It is 7 to the power 5, mod 23.)',
      build: (tl) => work(tl, sums[1]),
    },
    {
      notes: 'And Bob says "Seventeen." Everybody heard, because we are all nosy.',
      build: (tl) => {
        fly(tl, '#said-b', { x: sumAt(sums[1]).result.x - 75, y: dh.rows[0] - 84 }, dh.said.b, { bend: 60, duration: 0.9, reveal: true });
        show(tl, '#label-b', '>-0.1');
      },
    },
    {
      notes: 'Alice does the same sum again, but instead of the seven uses the seventeen Bob said: 17 to the 6, mod 23. Alice gets twelve.',
      build: (tl) => work(tl, sums[2]),
    },
    {
      notes: '"This is crazy." Bob takes the four Alice said out loud, raises it to the secret five, mod 23. Bob also gets twelve.',
      build: (tl) => work(tl, sums[3]),
    },
    {
      notes: 'We can use that as a shared key. They each derived the same secret, and it was never said out loud.',
      build: (tl) => {
        show(tl, '#a2-ring, #b2-ring');
        pulse(tl, '#a2-result', '<');
        pulse(tl, '#b2-result', '<');
        show(tl, '#banner-secret', '>');
      },
    },
    {
      notes: '"For some reason that works every time. I think it is pure magic." The reason: raising to the 6 and then the 5 is the same as the 5 and then the 6.',
      build: (tl) => {
        swap(tl, '#banner-secret', '#banner-why');
      },
    },
    {
      notes:
        'Ben: "they would probably use the public/private key for communicating the numbers, just to keep it a bit more safe, but you do not have to." You do have to: on its own the exchange does not say who sent the 17, so Eve can sit in the middle and run one exchange with each side. Real systems sign the public values with the identity keys.',
      build: (tl) => {
        swap(tl, '#banner-why', '#banner-who');
        swap(tl, '#label-a', '#doubt-a', '<');
        swap(tl, '#label-b', '#doubt-b', '<');
        pulse(tl, '#eve', '>-0.2');
      },
    },
  ],
};

// ---------------------------------------------------------------------------------------------
// 5. The shared secret is the symmetric key
// ---------------------------------------------------------------------------------------------

const KEY = 1.4;
const use = {
  aliceKey: { x: 470, y: 420 },
  aliceScreen: { x: 435, y: 618 },
  bobKey: { x: 1360, y: 420 },
  bobScreen: { x: 1395, y: 618 },
  chipOnServer: { x: 825, y: 606 },
};
const USE_CIPHER = ['01lM09UrpNYe', 'RYi1NzvH51cG'];
const USE_CHIP = '01lM09Urp…';

function UseView() {
  return (
    <>
      <Svg>
        <defs><PairPaint a="alice" b="bob" /></defs>
        <Flow id="to-server" d="M650 660C710 590 760 590 808 634" hidden />
        <Flow id="to-bob" d="M1112 634C1160 590 1210 590 1270 660" hidden />

        <Character who="alice" x={40} y={400} scale={1.5} />
        <Label x={190} y={890} text="Alice" tint={cast.alice.color} />
        <Laptop x={300} y={560} scale={1.5}>
          <ScreenMessage id="alice-plain" text="Hi!" hidden />
          <ScreenCipher id="alice-cipher" lines={USE_CIPHER} hidden />
        </Laptop>

        <Server x={800} y={500} scale={1.6} />
        <Label id="server-note" x={960} y={950} text="only ever sees ciphertext" tint={color.muted} size={type.min} weight={500} hidden />

        <Laptop x={1260} y={560} scale={1.5}>
          <ScreenCipher id="bob-cipher" lines={USE_CIPHER} hidden />
          <ScreenMessage id="bob-plain" text="Hi!" hidden />
        </Laptop>
        <Character who="bob" x={1580} y={400} scale={1.5} />
        <Label x={1730} y={890} text="Bob" tint={cast.bob.color} />

        {/* Each side made the same key from the 12 it worked out. Neither key was ever sent. */}
        <Num x={372} y={502} text="12" tint={SHARED} size={type.title} hidden={false} />
        <Arrow from={{ x: 424, y: 474 }} to={{ x: 456, y: 474 }} />
        <SecretKey id="alice-key" pair={AB} {...use.aliceKey} scale={KEY} />
        <Num x={1548} y={502} text="12" tint={SHARED} size={type.title} hidden={false} />
        <Arrow from={{ x: 1496, y: 474 }} to={{ x: 1464, y: 474 }} />
        <SecretKey id="bob-key" pair={AB} {...use.bobKey} scale={KEY} />

        <CipherChip id="chip-stored" text={USE_CHIP} x={0} y={0} hidden />
        <CipherChip id="chip-to-bob" text={USE_CHIP} {...use.chipOnServer} hidden />
      </Svg>
      <SceneTitle>The shared secret is the key</SceneTitle>
    </>
  );
}

const useSecret: Scene = {
  id: 'scale-dh-use',
  title: 'Diffie-Hellman: using the shared secret as a symmetric key',
  notes:
    'They came up with a shared secret, and now they can use symmetric encryption with it, because each of them derived the same secret on their own device.',
  View: UseView,
  steps: [
    {
      notes: 'So Alice says hi.',
      build: (tl) => {
        pop(tl, '#alice-plain');
      },
    },
    {
      notes: 'Alice grabs the super secret, 12, and uses it as the key to encrypt the data. Symmetric encryption, but it is happening on the device.',
      build: (tl) => {
        fly(tl, '#alice-key', use.aliceKey, use.aliceScreen, { bend: -40, duration: 0.7 });
        swap(tl, '#alice-plain', '#alice-cipher', '>-0.1');
        fly(tl, '#alice-key', use.aliceScreen, use.aliceKey, { bend: 40, duration: 0.6, at: '>0.15' });
      },
    },
    {
      notes: 'It goes to the server, and the server still has no idea what the original was.',
      build: (tl) => {
        show(tl, '#to-server-line');
        along(tl, '#chip-stored', '#to-server', { at: '>-0.1' });
        moveTo(tl, '#chip-stored', use.chipOnServer, '>', 0.35);
        show(tl, '#server-note', '>-0.1');
      },
    },
    {
      notes: 'It is still transmitted encrypted.',
      build: (tl) => {
        show(tl, '#to-bob-line');
        along(tl, '#chip-to-bob', '#to-bob', { at: '>-0.1' });
        show(tl, '#bob-cipher', '>-0.1');
        hide(tl, '#chip-to-bob', '<');
      },
    },
    {
      notes: 'Bob uses the same key, the one Bob derived separately, and comes up with the original message: hi. Isn\'t that cool?',
      build: (tl) => {
        fly(tl, '#bob-key', use.bobKey, use.bobScreen, { bend: 40, duration: 0.7 });
        swap(tl, '#bob-cipher', '#bob-plain', '>-0.1');
        fly(tl, '#bob-key', use.bobScreen, use.bobKey, { bend: -40, duration: 0.6, at: '>0.15' });
      },
    },
  ],
};

// ---------------------------------------------------------------------------------------------
// 6. The same exchange with real numbers, and where the demo already did it
// ---------------------------------------------------------------------------------------------

function RealView() {
  const rows = [300, 470, 640];
  return (
    <>
      <Svg>
        <defs><PairPaint a="alice" b="bob" /></defs>

        <Num x={250} y={rows[0]} text="23" size={110} hidden={false} />
        <Label x={250} y={rows[0] + 56} text="the prime" tint={color.muted} size={type.min} weight={500} />
        <Num x={206} y={rows[1]} text="6" size={110} tint={cast.alice.color} hidden={false} />
        <Num x={296} y={rows[1]} text="5" size={110} tint={cast.bob.color} hidden={false} />
        <Label x={250} y={rows[1] + 56} text="the secrets" tint={color.muted} size={type.min} weight={500} />
        <Num x={250} y={rows[2]} text="12" size={110} tint={SHARED} hidden={false} />
        <Label x={250} y={rows[2] + 56} text="the shared secret" tint={color.muted} size={type.min} weight={500} />

        <g id="real-prime" opacity="0">
          <Arrow from={{ x: 470, y: rows[0] - 14 }} to={{ x: 580, y: rows[0] - 14 }} />
          <Label x={640} y={rows[0] - 22} text="a prime 617 digits long" anchor="start" size={60} />
          <Label x={640} y={rows[0] + 40} text="(2,048 bits), or an elliptic curve instead" tint={color.muted} anchor="start" weight={500} />
        </g>
        <g id="real-secrets" opacity="0">
          <Arrow from={{ x: 470, y: rows[1] - 14 }} to={{ x: 580, y: rows[1] - 14 }} />
          <Label x={640} y={rows[1] - 22} text="256 random bits each" anchor="start" size={60} />
          <Label x={640} y={rows[1] + 40} text="made on the device, never sent" tint={color.muted} anchor="start" weight={500} />
        </g>
        <g id="real-shared" opacity="0">
          <Arrow from={{ x: 470, y: rows[2] - 14 }} to={{ x: 580, y: rows[2] - 14 }} />
          <Label x={640} y={rows[2] - 22} text="32 bytes, hashed into an AES-256 key" anchor="start" size={60} />
          <Label x={640} y={rows[2] + 40} text="too many possibilities to try them all" tint={color.muted} anchor="start" weight={500} />
        </g>
      </Svg>
      <SceneTitle>With real numbers</SceneTitle>
      <CodeCard id="real-code" left={110} top={790} hidden>
        <span className="dim">{'// Demo 3 did this already. X25519 is Diffie-Hellman on a curve.\n'}</span>
        {'const secret = x25519.'}<span className="hl">getSharedSecret</span>{'(myPrivateKey, theirPublicKey);\n'}
        {'const aesKey = '}<span className="hl">hkdf</span>{'(secret);'}<span className="dim">{'   // then AES-256-GCM'}</span>
      </CodeCard>
    </>
  );
}

const realNumbers: Scene = {
  id: 'scale-dh-real',
  title: 'Diffie-Hellman: real numbers, and the demo',
  notes: 'Question from the floor: did one of those numbers need to be a prime? Recap of the toy numbers: 23, the secrets 6 and 5, and the shared 12.',
  View: RealView,
  steps: [
    {
      notes:
        'Yes: the modulus has to be a prime, and a sufficiently large one. If everybody used numbers under 25 you could build a table of every possible key. (Or you use an elliptic curve, which is what the demo does.)',
      build: (tl) => {
        show(tl, '#real-prime');
      },
    },
    {
      notes: 'The maths still holds up. And the secret would be way bigger than 12.',
      build: (tl) => {
        show(tl, '#real-secrets');
        show(tl, '#real-shared', '>0.2');
      },
    },
    {
      notes:
        'Not in the narration, added to connect the dots: the demo app already works this way. Every sealed copy in Demo 3 is an X25519 exchange (Diffie-Hellman on an elliptic curve) followed by AES-GCM. That is the "symmetric on top of asymmetric" Ben mentioned.',
      build: (tl) => {
        show(tl, '#real-code');
      },
    },
  ],
};

// ---------------------------------------------------------------------------------------------
// 7. A shared secret belongs to one pair
// ---------------------------------------------------------------------------------------------

const PAIR_KEY = 1.8;
const pairs = {
  ab: { x: 902, y: 262 },
  ac: { x: 542, y: 590 },
  bc: { x: 1262, y: 590 },
  bubble: { x: 420, y: 170 },
  chipStart: { x: 430, y: 290 },
  chipBob: { x: 1262, y: 196 },
  chipCharlie: { x: 536, y: 880 },
  chipOwn: { x: 110, y: 640 },
};

function PairsView() {
  return (
    <>
      <Svg>
        <defs>
          <PairPaint a="alice" b="bob" />
          <PairPaint a="alice" b="charlie" />
          <PairPaint a="bob" b="charlie" />
        </defs>

        <path d="M400 372H1540" stroke={color.muted} strokeOpacity="0.6" strokeWidth="6" strokeDasharray="2 18" strokeLinecap="round" />
        <path id="edge-ac" d="M352 548L850 846" stroke={color.muted} strokeOpacity="0.6" strokeWidth="6" strokeDasharray="2 18" strokeLinecap="round" opacity="0" />
        <path id="edge-bc" d="M1568 548L1070 846" stroke={color.muted} strokeOpacity="0.6" strokeWidth="6" strokeDasharray="2 18" strokeLinecap="round" opacity="0" />

        <Character who="alice" x={120} y={190} scale={1.25} />
        <Label x={245} y={604} text="Alice" tint={cast.alice.color} />
        <Character who="bob" x={1550} y={190} scale={1.25} />
        <Label x={1675} y={604} text="Bob" tint={cast.bob.color} />
        <Character id="charlie" who="charlie" x={835} y={668} scale={1.25} hidden />
        <Label id="charlie-name" x={812} y={1012} text="Charlie" tint={cast.charlie.color} anchor="end" hidden />

        <SecretKey id="key-ab" pair={['alice', 'bob']} {...pairs.ab} scale={PAIR_KEY} />
        <SecretKey id="key-ac" pair={['alice', 'charlie']} {...pairs.ac} scale={PAIR_KEY} hidden />
        <SecretKey id="key-bc" pair={['bob', 'charlie']} {...pairs.bc} scale={PAIR_KEY} hidden />

        <Label id="count-people" x={1880} y={880} text="3 people, 3 secrets" anchor="end" size={56} hidden />
        <Label id="count-copies" x={1880} y={960} text="1 message, 3 sealed copies" tint={color.cipher} anchor="end" size={56} hidden />

        <PlainChip id="pair-hey" text="Hey" {...pairs.bubble} hidden />
        <CipherChip id="pair-chip-own" text="9f2c41d07a…" {...pairs.chipStart} hidden />
        <CipherChip id="pair-chip-bob" text="5be8d3a61c…" {...pairs.chipStart} hidden />
        <CipherChip id="pair-chip-charlie" text="e07a19c4f2…" {...pairs.chipStart} hidden />
      </Svg>
      <SceneTitle>A shared secret belongs to one pair</SceneTitle>
    </>
  );
}

const pairSecrets: Scene = {
  id: 'scale-pairs',
  title: 'A shared secret is per pair',
  notes: 'One warning before the group chat: that shared secret is per pair of users. This one is Alice and Bob\'s.',
  View: PairsView,
  steps: [
    {
      notes: 'Charlie was not part of that exchange, so Charlie needs a separate secret with Alice and another with Bob. Three people, three secrets.',
      build: (tl) => {
        pop(tl, '#charlie');
        show(tl, '#charlie-name', '<0.1');
        show(tl, '#edge-ac, #edge-bc', '>');
        pop(tl, '#key-ac', '>-0.1');
        pop(tl, '#key-bc', '<0.2');
        show(tl, '#count-people', '>');
      },
    },
    {
      notes:
        'So a message to the group is still sealed once per reader, each copy under a different key, plus a copy the sender can read back. Diffie-Hellman made each copy small and cheap; it did not make them fewer.',
      build: (tl) => {
        pop(tl, '#pair-hey');
        fly(tl, '#pair-chip-bob', pairs.chipStart, pairs.chipBob, { bend: -70, reveal: true, at: '>0.1' });
        fly(tl, '#pair-chip-charlie', pairs.chipStart, pairs.chipCharlie, { bend: 90, reveal: true, at: '<0.15' });
        fly(tl, '#pair-chip-own', pairs.chipStart, pairs.chipOwn, { bend: -60, reveal: true, at: '<0.15' });
        show(tl, '#count-copies', '>-0.1');
      },
    },
  ],
};

// ---------------------------------------------------------------------------------------------
// 8. Seven messages between three people
//
// Each row is one message. Its three sealed copies land in the same row, one column per reader,
// so the stored copies fill a 7 x 3 grid and the multiplication is visible.
// ---------------------------------------------------------------------------------------------

const chat: { who: Who; text: string }[] = [
  { who: 'charlie', text: 'I missed that!' },
  { who: 'alice', text: 'Now you’ll get it' },
  { who: 'charlie', text: 'Thanks!' },
  { who: 'charlie', text: 'Hey' },
  { who: 'alice', text: 'Yeah?' },
  { who: 'charlie', text: 'Where’s Bob?' },
  { who: 'bob', text: 'I’m here!' },
];
const readers: Who[] = ['alice', 'bob', 'charlie'];
const grid = {
  bubbleX: 275,
  columns: [880, 1180, 1480],
  rowTop: (i: number) => 248 + i * 114,
};
const bubbleWidth = (text: string) => Math.round(text.length * 24.5 + 64);

/** Ciphertext for a chip: fixed, so the stage looks the same every time. */
function scrambled(seed: number): string {
  let state = (seed * 2654435761) >>> 0;
  let out = '';
  for (let i = 0; i < 10; i++) {
    state = (state * 1664525 + 1013904223) >>> 0;
    out += (state >>> 28).toString(16);
  }
  return `${out}…`;
}

function GroupView() {
  return (
    <>
      <Svg>
        {readers.map((who, j) => (
          <g key={who}>
            <PublicKey owner={who} x={grid.columns[j] + 8} y={184} />
            <Label x={grid.columns[j] + 122} y={225} text={cast[who].name} tint={cast[who].color} anchor="start" />
          </g>
        ))}
        <Label x={1860} y={76} text="messages × people = sealed copies" tint={color.muted} size={type.min} weight={500} anchor="end" />
        <Stack id="count" values={chat.map((_, i) => `${i} × 3 = ${i * 3}`).concat('7 × 3 = 21')} x={1860} y={156} size={84} tint={color.cipher} anchor="end" />

        {/* Chips are drawn first so that they come out from behind the message they are copies of. */}
        {chat.map((_, i) => readers.map((who, j) => (
          <CipherChip key={`${i}-${who}`} id={`copy-${i}-${j}`} text={scrambled(i * 3 + j + 1)} x={grid.columns[j]} y={grid.rowTop(i) + 16} hidden />
        )))}

        {chat.map((message, i) => {
          const top = grid.rowTop(i);
          const tint = cast[message.who].color;
          return (
            <g key={i} id={`said-${i}`} opacity="0">
              <Label x={250} y={top + 60} text={cast[message.who].name} tint={tint} size={type.min} anchor="end" />
              <rect x={grid.bubbleX} y={top} width={bubbleWidth(message.text)} height="92" rx="30" fill={tint} />
              <Label x={grid.bubbleX + 32} y={top + 61} text={message.text} tint={color.ink} anchor="start" />
            </g>
          );
        })}
      </Svg>
      <SceneTitle>7 messages, 3 people</SceneTitle>
    </>
  );
}

const group: Scene = {
  id: 'scale-group',
  title: '7 messages between 3 people',
  notes: 'Let us rush through these. Seven entire messages between these three people. Each one is sealed once for each of them.',
  View: GroupView,
  steps: chat.map((message, i) => ({
    notes:
      `${cast[message.who].name} says "${message.text}" ${(i + 1) * 3} stored.` +
      (i === chat.length - 1 ? ' Seven messages between three people: 21 messages. It grows quickly.' : ''),
    build: (tl: Timeline) => {
      const top = grid.rowTop(i);
      const from = { x: grid.bubbleX + bubbleWidth(message.text) - 270, y: top + 16 };
      show(tl, `#said-${i}`, undefined, 0.3);
      readers.forEach((_, j) => {
        fly(tl, `#copy-${i}-${j}`, from, { x: grid.columns[j], y: top + 16 }, { bend: 0, duration: 0.6 + j * 0.1, reveal: true, at: j === 0 ? '>' : '<0.08' });
      });
      swap(tl, `#count-${i}`, `#count-${i + 1}`, '>-0.2');
      if (i === chat.length - 1) pulse(tl, `#count-${i + 1}`, '>');
    },
  })),
};

// ---------------------------------------------------------------------------------------------
// 9. What one stored message looks like
// ---------------------------------------------------------------------------------------------

/**
 * A real envelope from the demo app (shared/src/envelope.ts): "I'm here!" from Bob, sealed for
 * all three members. As JSON it is 635 bytes.
 */
const ENVELOPE: { who: Who; publicKey: string; iv: string; ciphertext: string }[] = [
  { who: 'alice', publicKey: '851e1e7ac97f1cfded3c44ec5d2903cc027954ed3ecdebdb3c321c866e119654', iv: 'cNTD9a83o+pQoUqg', ciphertext: 'QQbgebeAiLdMwuQmqztX8rc4/y/cYsHLQA==' },
  { who: 'bob', publicKey: '8c47740c1ebc35f8c4638de5cd9cd4d7099787064e4a8fc862c6d6cd17dd1267', iv: 'SbRIlVz1rji3Ju7Q', ciphertext: 'yJEppei7nzi4IW37kPVA4idCwH5eSNf9dw==' },
  { who: 'charlie', publicKey: '6b814f333a5cfe48dcf1945d9749fe009e78cf86ac58d3578b6c8d6678fbba03', iv: 'fsT5/UItGG6QX1ei', ciphertext: 'alyr9cbMsQNFp1ebqQF7TfirEf9Pi+GllQ==' },
];

function PayloadView() {
  return (
    <>
      <Svg>
        <Label x={80} y={186} text="Demo app, 3 recipients: X25519 + AES, 635 bytes" anchor="start" weight={500} tint={color.muted} />
        <g id="pgp-caption" opacity="0">
          <Label x={1880} y={92} text="PGP, 2 recipients" anchor="end" />
          <Label x={1880} y={148} text="RSA-4096, 1,589 bytes" anchor="end" weight={500} tint={color.muted} />
        </g>
        <g id="verdict" opacity="0">
          <Label x={80} y={846} text="Much smaller, much faster." anchor="start" />
          <Label x={80} y={926} text="Still one copy per recipient:" anchor="start" tint={color.cipher} />
          <Label x={80} y={990} text="7 messages × 3 people = 21" anchor="start" tint={color.cipher} />
        </g>
      </Svg>
      <SceneTitle>One stored message</SceneTitle>
      <div className="scaling-json" style={{ left: 60, top: 210 }}>
        <div>{'{ "sender": "2", "recipients": ['}</div>
        {ENVELOPE.map((copy, i) => (
          <div key={copy.who} className="rec" style={{ borderColor: cast[copy.who].color }}>
            <div>
              {`{ "userId": "${cast[copy.who].id}",  `}
              <span className="name" style={{ color: cast[copy.who].color }}>{cast[copy.who].name}</span>
            </div>
            <div className="sealed" data-texture>
              {`"sealed":{"publicKey":"${copy.publicKey}",\n"iv":"${copy.iv}","ciphertext":"${copy.ciphertext}"},"keyType":"identity"}${i < ENVELOPE.length - 1 ? ',' : ''}`}
            </div>
          </div>
        ))}
        <div>{'] }'}</div>
      </div>
      <PgpBlock id="payload-pgp" left={760} top={200} hidden />
    </>
  );
}

const payload: Scene = {
  id: 'scale-payload',
  title: 'What one stored message looks like',
  notes:
    'That is what the payload of that conversation looks like in the demo app. That is basically one message: you can see user ID 1, 2 and 3 down the left-hand side.',
  View: PayloadView,
  steps: [
    {
      notes:
        'Compare that with what we had originally: one message between two people. Ben credits the difference to symmetric encryption, but PGP also encrypts the message symmetrically. The demo is smaller because a curve key is 32 bytes where an RSA-4096 block is 512, and nothing is armoured.',
      build: (tl) => {
        tl.fromTo('#payload-pgp', { x: 1200, opacity: 0 }, { x: 0, opacity: 1, duration: 0.8, ease: 'power2.out', immediateRender: false });
        show(tl, '#pgp-caption', '>-0.2');
      },
    },
    {
      notes:
        'This is already a lot more compact, and when you decrypt it, it is much easier on your system. Less operational overhead. What it did not change is the count: one sealed copy per recipient.',
      build: (tl) => {
        show(tl, '#verdict');
      },
    },
  ],
};

// ---------------------------------------------------------------------------------------------

export const scalingScenes: Scene[] = [
  sectionTitle(
    'scale-title',
    'Scalability: title',
    <>Scalability</>,
    'Five minutes left: let us see how much we can rush through. Actually, there is some maths coming up. This will be fun.',
  ),
  copies,
  pgpScene,
  sectionTitle(
    'scale-symmetric-title',
    'Symmetric encryption: title',
    <><em>Symmetric</em> encryption</>,
    'So what we are going to do is use symmetric encryption. "What is going on? You just told us that was not any good."',
  ),
  symmetric,
  sectionTitle(
    'scale-dh-title',
    'Diffie-Hellman key exchange: title',
    <><em>Diffie-Hellman</em> key exchange</>,
    'So we are going to use the Diffie-Hellman key exchange. Anybody know it? This one is fun.',
  ),
  diffieHellman,
  useSecret,
  realNumbers,
  pairSecrets,
  group,
  payload,
];
