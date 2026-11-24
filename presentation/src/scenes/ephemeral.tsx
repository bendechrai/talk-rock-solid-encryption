/**
 * Ephemeral (per-conversation) keys, and re-encrypting history for a new member.
 *
 * Before Demo 4: everyone keeps a long-lived identity key pair, and makes one extra short-lived
 * key pair for each conversation they are in. A message in the blue chat is sealed to the blue
 * public keys only, so Charlie, who has no blue key, cannot open it.
 *
 * After Demo 4: Charlie joins the blue chat. Bob's device, which can already read the history,
 * re-seals it for the three blue keys and sends it back. The server could not have done that.
 */
import type { ReactNode } from 'react';
import {
  Actor, Character, Flow, Label, Laptop, PrivateKey, PublicKey, ScreenNote, Server, type ActorProps,
} from '../art/index.tsx';
import { CodeCard, SceneTitle } from '../art/html.tsx';
import { Svg } from '../engine/Stage.tsx';
import { along, fly, hide, moveTo, pop, pulse, show, swap, type Point } from '../engine/motion.ts';
import type { Scene, Timeline } from '../engine/types.ts';
import { cast, color, conversation, type } from '../theme.ts';
import { sectionTitle } from './sectionTitle.tsx';

type Member = 'alice' | 'bob' | 'charlie';
type Chat = 'blue' | 'green';

const MEMBERS: Member[] = ['alice', 'bob', 'charlie'];

// ---------------------------------------------------------------------------------------------
// Where things sit. Three people in a row, each beside a laptop; the server below, in the middle.
// Positions are top-left corners in stage pixels.
// ---------------------------------------------------------------------------------------------

/** Each person's column: where the character and the laptop go, and where the name ends. */
const column: Record<Member, { person: number; laptop: number; name: number }> = {
  alice: { person: 20, laptop: 248, name: 236 },
  bob: { person: 627, laptop: 855, name: 843 },
  charlie: { person: 1234, laptop: 1462, name: 1450 },
};

const PERSON_Y = 288;
const LAPTOP_Y = 405;
const NAME_Y = 214;
const TILE = 1.25; // a conversation's private key, on its tile: 125 x 140
const PUB = 1.3; // a conversation's public key: 130 x 57
const ID = 1.2; // identity keys, deliberately a little smaller

/** Three places above each laptop where that device's conversation keys sit. Blue first, then green. */
function slot(who: Member, index: number): Point {
  return { x: column[who].laptop + 8 + index * 134, y: 256 };
}
/** A public key shown in a slot, next to the private key it was made with. */
function slotPublic(who: Member, index: number): Point {
  return { x: slot(who, index).x + 6, y: 298 };
}
/** Where a private key goes to be used on its own device's screen. */
function onScreen(who: Member): Point {
  return { x: column[who].laptop + 118, y: 444 };
}

const identity = {
  /** Beside the laptop, where the last section left them. */
  tray: (who: Member) => ({ private: { x: column[who].laptop + 24, y: 282 }, public: { x: column[who].laptop + 130, y: 300 } }),
  /** Up beside the owner's name, out of the way. */
  header: (who: Member) => ({ private: { x: column[who].laptop + 8, y: 148 }, public: { x: column[who].laptop + 98, y: 166 } }),
};

const SERVER = { x: 840, y: 830 };
const SET_Y = 876;
const SET_KEY_Y = 896;
const SET_PITCH = 145;
/** The server's two sets of public keys. The blue box grows to the left when Charlie joins. */
const blueSet = { two: { x: 505, width: 305 }, three: { x: 360, width: 450 } };
const greenSet = { x: 1110, width: 450 };
const blueOnServer: Record<Member, Point> = {
  charlie: { x: 380, y: SET_KEY_Y },
  alice: { x: 525, y: SET_KEY_Y },
  bob: { x: 670, y: SET_KEY_Y },
};
const greenOnServer: Record<Member, Point> = {
  alice: { x: 1130, y: SET_KEY_Y },
  bob: { x: 1275, y: SET_KEY_Y },
  charlie: { x: 1420, y: SET_KEY_Y },
};

/** Which slot each device keeps each conversation's private key in: the order the keys were made. */
const tileSlot: Record<Member, Record<Chat, number>> = {
  alice: { blue: 0, green: 1 },
  bob: { blue: 0, green: 1 },
  charlie: { green: 0, blue: 1 },
};
const tileAt = (chat: Chat, who: Member) => slot(who, tileSlot[who][chat]);

/** A fetched set of public keys waits under the laptop until it is used. */
const park = { alice: { x: 250, y: 684 }, bob: { x: 530, y: 684 } };
const setOnScreen = { alice: { x: 275, y: 468 }, bob: { x: 810, y: 468 } };

/** Where a stored message rests on the server: two copies, then three. */
const stored = { two: { x: 860, y: 885 }, three: { x: 860, y: 854 } };

/** The conversation outlines: the blue chat is Alice and Bob; the green chat is everyone. */
const frame = { x: 16, y: 244, height: 526, two: 1220, three: 1880 };

const routes = {
  aliceToServer: 'M566 676C660 740 770 760 852 824',
  serverToAlice: 'M852 824C770 760 660 740 566 676',
  serverToBob: 'M992 820C1000 770 1030 730 1056 678',
  bobToServer: 'M1056 678C1030 730 1000 770 992 820',
  serverToCharlie: 'M1086 840C1220 770 1400 760 1560 678',
};

// The same message sealed twice never looks the same, so the re-sealed copies get new bytes.
const SEALED: Record<Member, string> = { alice: 'c26d74c865', bob: 'df1c08d385', charlie: '' }; // nothing was sealed for Charlie
const RESEALED: Record<Member, string> = { alice: '91ab3f07e2', bob: '3e07b1c94d', charlie: '7be40a91f3' };

// ---------------------------------------------------------------------------------------------
// Actors that only this section needs.
// ---------------------------------------------------------------------------------------------

const SHIELD = 'M32 4l26 9v22c0 20-12 32-26 38C18 67 6 55 6 35V13z';

/**
 * A private key for one conversation: still a key in a shield, with the dashed outline that marks
 * a short-lived key, on a tile in the conversation's colour. 100 x 112 at scale 1. Without a
 * `chat` there is no tile: a short-lived private key in general.
 */
function ChatPrivateKey({ owner, chat, ...actor }: ActorProps & { owner: Member; chat?: Chat }) {
  const tint = chat && conversation[chat];
  return (
    <Actor {...actor}>
      {tint && <rect x="2" y="2" width="96" height="108" rx="18" fill={tint} fillOpacity="0.2" stroke={tint} strokeWidth="4" />}
      <g transform="translate(18 18)">
        <path
          d={SHIELD}
          transform="translate(32 38) scale(1.23) translate(-32 -38)"
          fill="none"
          stroke={cast[owner].color}
          strokeWidth="2.5"
          strokeDasharray="2.5 6"
          strokeLinecap="round"
        />
        <PrivateKey owner={owner} x={0} y={0} />
      </g>
    </Actor>
  );
}

/** A public key for one conversation: a bare key with the dashed ring. */
function ChatPublicKey({ owner, scale = PUB, ...actor }: ActorProps & { owner: Member }) {
  return <PublicKey owner={owner} ephemeral scale={scale} {...actor} />;
}

/** The outline the server keeps round one conversation's public keys. */
function SetBox({ id, chat, x, width, hidden = false }: { id?: string; chat: Chat; x: number; width: number; hidden?: boolean }) {
  const tint = conversation[chat];
  return (
    <rect id={id} x={x} y={SET_Y} width={width} height="96" rx="20" fill={tint} fillOpacity="0.1" stroke={tint} strokeWidth="4" opacity={hidden ? 0 : 1} />
  );
}

/** A copy of a conversation's set of public keys, as handed out by the server. 96 pixels tall. */
function KeySet({ owners, chat, ...actor }: ActorProps & { owners: Member[]; chat: Chat }) {
  const tint = conversation[chat];
  return (
    <Actor {...actor}>
      <rect x="0" y="0" width={owners.length * SET_PITCH + 15} height="96" rx="20" fill={color.ground} />
      <rect x="0" y="0" width={owners.length * SET_PITCH + 15} height="96" rx="20" fill={tint} fillOpacity="0.1" stroke={tint} strokeWidth="4" />
      {owners.map((owner, i) => <ChatPublicKey key={owner} owner={owner} x={20 + i * SET_PITCH} y={SET_KEY_Y - SET_Y} />)}
    </Actor>
  );
}

/** A person's shape in their colour, to say who a sealed copy is for. */
function Mark({ who, cx, cy, r }: { who: Member; cx: number; cy: number; r: number }) {
  const fill = cast[who].color;
  if (who === 'alice') return <path d={`M${cx} ${cy - r}L${cx + r} ${cy + r * 0.8}H${cx - r}z`} fill={fill} stroke={fill} strokeWidth={r * 0.3} strokeLinejoin="round" />;
  if (who === 'bob') return <rect x={cx - r * 0.9} y={cy - r * 0.9} width={r * 1.8} height={r * 1.8} rx={r * 0.3} fill={fill} />;
  return <circle cx={cx} cy={cy} r={r} fill={fill} />;
}

/**
 * One message as it travels and as the server stores it: one sealed copy per recipient, each
 * marked with the shape and colour of the person whose key it was sealed to. 200 wide, 62 per copy.
 */
function Sealed({ copies, bytes, ...actor }: ActorProps & { copies: Member[]; bytes: Record<Member, string> }) {
  return (
    <Actor {...actor}>
      {copies.map((who, i) => (
        <g key={who} transform={`translate(0 ${i * 62})`}>
          <rect x="2" y="2" width="196" height="52" rx="14" fill={color.cipherGround} stroke={color.cipher} strokeWidth="4" />
          <g transform="translate(11 6) scale(.58)">
            <path d="M16 32V22a14 14 0 0 1 28 0v10" fill="none" stroke={color.cipher} strokeWidth="7" />
            <rect x="8" y="30" width="44" height="36" rx="8" fill={color.cipher} />
          </g>
          <Mark who={who} cx={66} cy={28} r={13} />
          <text x="88" y="38" className="mono" data-texture fontSize={type.texture} fill={color.cipher}>{bytes[who].slice(0, 6)}</text>
        </g>
      ))}
    </Actor>
  );
}

// ---- On a laptop screen (laptop coordinates: the screen is x 32-208, y 16-130) ----

/** The same sealed copies, as a device shows them before it has opened one. */
function ScreenCopies({ id, copies, bytes, hidden = false }: { id?: string; copies: Member[]; bytes: Record<Member, string>; hidden?: boolean }) {
  const three = copies.length > 2;
  const height = three ? 32 : 38;
  const top = three ? 21 : 30;
  const pitch = three ? 36 : 46;
  return (
    <g id={id} opacity={hidden ? 0 : 1}>
      {copies.map((who, i) => (
        <g key={who} transform={`translate(0 ${top + i * pitch})`}>
          <rect x="40" y="0" width="160" height={height} rx="8" fill={color.cipherGround} stroke={color.cipher} strokeWidth="2.5" />
          <Mark who={who} cx={60} cy={height / 2} r={10.5} />
          <text x="82" y={height / 2 + 7} className="mono" data-texture fontSize="19" fill={color.cipher}>{bytes[who].slice(0, 9)}</text>
        </g>
      ))}
    </g>
  );
}

/** A plaintext message wide enough for "Psst! Bob!". */
function ScreenBubble({ id, text, hidden = false }: { id?: string; text: string; hidden?: boolean }) {
  return (
    <g id={id} opacity={hidden ? 0 : 1}>
      <path d="M50 36h140a12 12 0 0 1 12 12v28a12 12 0 0 1-12 12H78l-14 13V88H50a12 12 0 0 1-12-12V48a12 12 0 0 1 12-12z" fill={color.paper} />
      <text x="120" y="72" textAnchor="middle" fontSize="27" fontWeight="700" fill={color.ink}>{text}</text>
    </g>
  );
}

/** A conversation's outline round the people in it, labelled at the bottom left. */
function ChatFrame({ id, chat, width, hidden = false }: { id: string; chat: Chat; width: number; hidden?: boolean }) {
  const tint = conversation[chat];
  return (
    <g id={id} opacity={hidden ? 0 : 1}>
      <rect id={`${id}-outline`} x={frame.x} y={frame.y} width={width} height={frame.height} rx="36" fill={tint} fillOpacity="0.07" stroke={tint} strokeWidth="4" />
      <text x={frame.x + 32} y={frame.y + frame.height - 26} fontSize={type.label} fontWeight="700" fill={tint}>{chat} chat</text>
    </g>
  );
}

/** One line of commentary to the right of the scene title. */
function Caption({ id, text, tint = color.text, hidden = true }: { id: string; text: string; tint?: string; hidden?: boolean }) {
  return <Label id={id} x={1860} y={116} text={text} tint={tint} anchor="end" hidden={hidden} />;
}

// ---------------------------------------------------------------------------------------------
// The parts of the picture every scene shares.
// ---------------------------------------------------------------------------------------------

/** Alice, Bob and Charlie with their laptops, and the server. `screens` is what each laptop shows. */
function People({ screens = {} }: { screens?: Partial<Record<Member, ReactNode>> }) {
  return (
    <>
      {MEMBERS.map((who) => (
        <g key={who}>
          <Character who={who} x={column[who].person} y={PERSON_Y} scale={1.3} />
          <Laptop x={column[who].laptop} y={LAPTOP_Y} scale={1.5}>{screens[who]}</Laptop>
          <Label x={column[who].name} y={NAME_Y} text={cast[who].name} tint={cast[who].color} anchor="end" />
        </g>
      ))}
      <Server {...SERVER} scale={1.2} />
    </>
  );
}

/** The long-lived identity key pairs, either beside the laptops or up beside the names. */
function IdentityKeys({ at }: { at: 'tray' | 'header' }) {
  return (
    <>
      {MEMBERS.map((who) => (
        <g key={who}>
          <PrivateKey id={`${who}-id-private`} owner={who} {...identity[at](who).private} scale={ID} />
          <PublicKey id={`${who}-id-public`} owner={who} {...identity[at](who).public} scale={ID} />
          <Label
            id={`${who}-id-tag`}
            x={column[who].laptop + 234}
            y={210}
            text="identity"
            tint={color.muted}
            size={type.min}
            weight={500}
            anchor="start"
            hidden={at === 'tray'}
          />
        </g>
      ))}
    </>
  );
}

/** The private keys each device holds once both conversations are set up. */
function ConversationKeys({ hidden = false }: { hidden?: boolean }) {
  return (
    <>
      <ChatPrivateKey id="alice-blue" owner="alice" chat="blue" {...tileAt('blue', 'alice')} scale={TILE} hidden={hidden} />
      <ChatPrivateKey id="bob-blue" owner="bob" chat="blue" {...tileAt('blue', 'bob')} scale={TILE} hidden={hidden} />
      <ChatPrivateKey id="alice-green" owner="alice" chat="green" {...tileAt('green', 'alice')} scale={TILE} hidden={hidden} />
      <ChatPrivateKey id="bob-green" owner="bob" chat="green" {...tileAt('green', 'bob')} scale={TILE} hidden={hidden} />
      <ChatPrivateKey id="charlie-green" owner="charlie" chat="green" {...tileAt('green', 'charlie')} scale={TILE} hidden={hidden} />
    </>
  );
}

/** The server's two sets of public keys, as they stand once both conversations are set up. */
function ServerSets({ blue }: { blue: 'two' | 'three' }) {
  return (
    <>
      <SetBox id="blue-box" chat="blue" {...blueSet[blue]} />
      <Label x={810} y={1018} text="blue chat" tint={conversation.blue} anchor="end" />
      <ChatPublicKey id="alice-blue-server" owner="alice" {...blueOnServer.alice} />
      <ChatPublicKey id="bob-blue-server" owner="bob" {...blueOnServer.bob} />
      {blue === 'three' && <ChatPublicKey owner="charlie" {...blueOnServer.charlie} />}
      <SetBox chat="green" {...greenSet} />
      <Label x={1110} y={1018} text="green chat" tint={conversation.green} anchor="start" />
      {MEMBERS.map((who) => <ChatPublicKey key={who} owner={who} {...greenOnServer[who]} />)}
    </>
  );
}

/** Use a private key on its own device's screen: it goes to the screen, the screen changes, it goes home. */
function applyKey(tl: Timeline, key: string, home: Point, who: Member, from: string, to: string, at?: string) {
  fly(tl, key, home, onScreen(who), { bend: 40, duration: 0.6, at });
  swap(tl, from, to, '>-0.1');
  fly(tl, key, onScreen(who), home, { bend: -40, duration: 0.5, at: '>0.1' });
}

// ---------------------------------------------------------------------------------------------
// Scene: what an ephemeral key is, on one person's device.
// ---------------------------------------------------------------------------------------------

const lane = { x: 470, width: 1030, identity: 250, blue: 445, green: 650 };
const idea = {
  idPrivate: { x: 800, y: 278 },
  idPublic: { x: 935, y: 302 },
  blueOld: { x: 800, y: 462 },
  blueOldPublic: { x: 965, y: 503 },
  blueNew: { x: 1150, y: 462 },
  blueNewPublic: { x: 1315, y: 503 },
  green: { x: 800, y: 667 },
  greenPublic: { x: 965, y: 708 },
  stolen: { x: 1530, y: 520 },
};

function LaneOutline({ id, y, height, tint, label, hidden = false }: { id: string; y: number; height: number; tint: string; label: string; hidden?: boolean }) {
  return (
    <g id={id} opacity={hidden ? 0 : 1}>
      <rect x={lane.x} y={y} width={lane.width} height={height} rx="36" fill={tint} fillOpacity="0.07" stroke={tint} strokeWidth="4" />
      <text x={lane.x + 36} y={y + height / 2 + 16} fontSize={type.label} fontWeight="700" fill={tint}>{label}</text>
    </g>
  );
}

function IdeaView() {
  return (
    <>
      <Svg>
        <Character who="alice" x={80} y={330} scale={1.5} />
        <Label x={230} y={832} text="Alice" tint={cast.alice.color} />

        <g id="what">
          <ChatPrivateKey owner="alice" x={619} y={359} scale={3.2} />
          <ChatPublicKey owner="alice" x={952} y={465} scale={3.4} />
        </g>

        <LaneOutline id="lane-identity" y={lane.identity} height={170} tint={color.muted} label="identity" hidden />
        <PrivateKey id="id-private" owner="alice" {...idea.idPrivate} scale={1.5} hidden />
        <PublicKey id="id-public" owner="alice" {...idea.idPublic} scale={1.5} hidden />

        <LaneOutline id="lane-blue" y={lane.blue} height={180} tint={conversation.blue} label="blue chat" hidden />
        <g id="blue-old">
          <ChatPrivateKey id="blue-old-private" owner="alice" chat="blue" {...idea.blueOld} scale={1.3} hidden />
          <ChatPublicKey id="blue-old-public" owner="alice" {...idea.blueOldPublic} scale={1.5} hidden />
        </g>
        <ChatPrivateKey id="blue-new-private" owner="alice" chat="blue" {...idea.blueNew} scale={1.3} hidden />
        <ChatPublicKey id="blue-new-public" owner="alice" {...idea.blueNewPublic} scale={1.5} hidden />

        <LaneOutline id="lane-green" y={lane.green} height={180} tint={conversation.green} label="green chat" hidden />
        <ChatPrivateKey id="green-private" owner="alice" chat="green" {...idea.green} scale={1.3} hidden />
        <ChatPublicKey id="green-public" owner="alice" {...idea.greenPublic} scale={1.5} hidden />

        <Character id="eve" who="eve" x={1640} y={380} scale={1.3} hidden />
        <Label id="eve-name" x={1770} y={808} text="Eve" tint={cast.eve.color} hidden />
        <ChatPrivateKey id="stolen" owner="alice" chat="blue" {...idea.blueNew} scale={1.3} hidden />

        <Label id="say-what" x={960} y={990} text="A short-lived key, made for one purpose" size={type.body} />
        <Label id="say-identity" x={960} y={990} text="Identity keys stay: long-lived, one pair per device" size={type.body} hidden />
        <Label id="say-each" x={960} y={990} text="Plus a new key pair for every conversation" size={type.body} hidden />
        <Label id="say-rotate" x={960} y={990} text="Replaced after a set time, or a number of messages" size={type.body} hidden />
        <Label id="say-stolen" x={960} y={990} text="A stolen key opens one conversation, for a short time" size={type.body} hidden />
      </Svg>
      <SceneTitle>Ephemeral keys</SceneTitle>
    </>
  );
}

const ideaScene: Scene = {
  id: 'eph-idea',
  title: 'Ephemeral keys: the idea',
  notes: 'An ephemeral key is basically a short-lived key that you use for a specific purpose.',
  View: IdeaView,
  steps: [
    {
      notes: 'We still keep the per-device public/private key pair. That one stands for the identity of the device.',
      build: (tl) => {
        hide(tl, '#what');
        swap(tl, '#say-what', '#say-identity', '<');
        show(tl, '#lane-identity', '<');
        pop(tl, '#id-private', '>-0.2');
        pop(tl, '#id-public', '<0.15');
      },
    },
    {
      notes: 'But now we generate a new ephemeral key pair for each conversation.',
      build: (tl) => {
        swap(tl, '#say-identity', '#say-each');
        show(tl, '#lane-blue', '<');
        pop(tl, '#blue-old-private', '>-0.2');
        pop(tl, '#blue-old-public', '<0.15');
        show(tl, '#lane-green', '>-0.1');
        pop(tl, '#green-private', '>-0.2');
        pop(tl, '#green-public', '<0.15');
      },
    },
    {
      notes: 'And you can rotate those keys, based on time or even on the number of messages. (More on rotation after the demo.)',
      build: (tl) => {
        swap(tl, '#say-each', '#say-rotate');
        tl.to('#blue-old', { opacity: 0.28, duration: 0.5, ease: 'power1.inOut' }, '<');
        pop(tl, '#blue-new-private', '>-0.1');
        pop(tl, '#blue-new-public', '<0.15');
      },
    },
    {
      notes:
        'Why bother: it limits the damage. A stolen key opens only what was sealed to it: one conversation, until that key is replaced. Other chats, and messages under other keys, stay shut. (The transcript calls this "perfect forward secrecy" and words it differently; use the wording on the slide.)',
      build: (tl) => {
        swap(tl, '#say-rotate', '#say-stolen');
        pop(tl, '#eve', '<');
        show(tl, '#eve-name', '<0.1');
        fly(tl, '#stolen', idea.blueNew, idea.stolen, { bend: -70, reveal: true, at: '>' });
      },
    },
  ],
};

// ---------------------------------------------------------------------------------------------
// Scene: identity keys, then one key pair per person per conversation. Eight pairs in all.
// ---------------------------------------------------------------------------------------------

/** The order Ben counts the key pairs in: three identity, two blue, three green. */
const COUNTED = [
  '#alice-id-private', '#bob-id-private', '#charlie-id-private',
  '#alice-blue', '#bob-blue',
  '#alice-green', '#bob-green', '#charlie-green',
];

function KeysView() {
  return (
    <>
      <Svg>
        <ChatFrame id="blue-frame" chat="blue" width={frame.two} hidden />
        <ChatFrame id="green-frame" chat="green" width={frame.three} hidden />
        <People />

        <SetBox id="blue-box" chat="blue" {...blueSet.two} hidden />
        <Label id="blue-label" x={810} y={1018} text="blue chat" tint={conversation.blue} anchor="end" hidden />
        <SetBox id="green-box" chat="green" {...greenSet} hidden />
        <Label id="green-label" x={1110} y={1018} text="green chat" tint={conversation.green} anchor="start" hidden />

        <IdentityKeys at="tray" />
        <ConversationKeys hidden />
        <ChatPublicKey id="alice-blue-public" owner="alice" {...slotPublic('alice', 1)} hidden />
        <ChatPublicKey id="bob-blue-public" owner="bob" {...slotPublic('bob', 1)} hidden />
        <ChatPublicKey id="alice-green-public" owner="alice" {...slotPublic('alice', 2)} hidden />
        <ChatPublicKey id="bob-green-public" owner="bob" {...slotPublic('bob', 2)} hidden />
        <ChatPublicKey id="charlie-green-public" owner="charlie" {...slotPublic('charlie', 1)} hidden />

        {COUNTED.map((_, i) => (
          <Label key={i} id={`count-${i + 1}`} x={1090} y={124} text={String(i + 1)} size={type.title} anchor="end" hidden />
        ))}
        <Label id="count-what" x={1112} y={116} text="key pairs: 2 chats, 3 people" anchor="start" hidden />
        <Caption id="say-local" text="Private keys stay on each device" />
      </Svg>

      <SceneTitle>Ephemeral keys</SceneTitle>
      <CodeCard id="pair-code" left={24} top={792} hidden>
        <span className="dim">{'// for this conversation only\n'}</span>
        {'const pair = '}<span className="hl">generateKeyPair</span>{'();\n'}
        {'pair.'}<span className="hl">expiresAt</span>{' = now + MINUTE;'}
      </CodeCard>
    </>
  );
}

const keysScene: Scene = {
  id: 'eph-keys',
  title: 'Ephemeral keys: one pair per conversation',
  notes: 'So how does this work? Alice, Bob and Charlie each still have the key pair from before.',
  View: KeysView,
  steps: [
    {
      notes: 'We are going to keep these as long-life keys, for identity. So I\'ve moved them up to the top.',
      build: (tl) => {
        MEMBERS.forEach((who, i) => {
          const start = i === 0 ? undefined : '<0.1';
          fly(tl, `#${who}-id-private`, identity.tray(who).private, identity.header(who).private, { bend: 0, duration: 0.7, at: start });
          fly(tl, `#${who}-id-public`, identity.tray(who).public, identity.header(who).public, { bend: 0, duration: 0.7, at: '<' });
        });
        show(tl, '#alice-id-tag, #bob-id-tag, #charlie-id-tag', '>-0.2');
      },
    },
    {
      notes: 'Meanwhile, down here, we\'ve got this private chat between these two: the blue conversation.',
      build: (tl) => {
        show(tl, '#blue-frame');
      },
    },
    {
      notes: 'When the chat starts, each of them creates a new key pair: the ephemeral key pair, for this conversation only.',
      build: (tl) => {
        pop(tl, '#alice-blue');
        pop(tl, '#alice-blue-public', '<0.15');
        pop(tl, '#bob-blue', '<0.25');
        pop(tl, '#bob-blue-public', '<0.15');
      },
    },
    {
      notes:
        'It is just generateKeyPair: a standard key pair again. But you can add an expiry: the end of the session, a certain amount of time, a number of messages. Very short-lived. If you lose one it is not the end of the world, and every other conversation stays secure.',
      build: (tl) => {
        show(tl, '#pair-code');
      },
    },
    {
      notes: 'The public keys are sent to the server, and the server remembers: for the conversation between these two, these are the keys.',
      build: (tl) => {
        hide(tl, '#pair-code');
        show(tl, '#blue-box, #blue-label', '<0.1');
        fly(tl, '#alice-blue-public', slotPublic('alice', 1), blueOnServer.alice, { bend: 70, at: '>-0.1' });
        fly(tl, '#bob-blue-public', slotPublic('bob', 1), blueOnServer.bob, { bend: -70, at: '<0.15' });
      },
    },
    {
      notes: 'The private keys stay on the device. And this is the private key for the blue conversation only.',
      build: (tl) => {
        hide(tl, '#blue-frame');
        pulse(tl, '#alice-blue', '<0.1');
        pulse(tl, '#bob-blue', '<');
      },
    },
    {
      notes: 'Meanwhile we have a group chat. That\'s the green conversation.',
      build: (tl) => {
        show(tl, '#green-frame');
      },
    },
    {
      notes: 'Each of them creates another ephemeral public/private key pair, for this conversation.',
      build: (tl) => {
        pop(tl, '#alice-green');
        pop(tl, '#alice-green-public', '<0.15');
        pop(tl, '#bob-green', '<0.2');
        pop(tl, '#bob-green-public', '<0.15');
        pop(tl, '#charlie-green', '<0.2');
        pop(tl, '#charlie-green-public', '<0.15');
      },
    },
    {
      notes: 'We store those public keys on the server, and the server remembers: these are the keys for this conversation.',
      build: (tl) => {
        show(tl, '#green-box, #green-label');
        fly(tl, '#alice-green-public', slotPublic('alice', 2), greenOnServer.alice, { bend: 80, at: '>-0.1' });
        fly(tl, '#bob-green-public', slotPublic('bob', 2), greenOnServer.bob, { bend: 60, at: '<0.15' });
        fly(tl, '#charlie-green-public', slotPublic('charlie', 1), greenOnServer.charlie, { bend: -60, at: '<0.15' });
      },
    },
    {
      notes:
        'Those five keys are all different. None is reused, and none is the same as an identity key pair. One, two, three, four, five, six, seven, eight key pairs, for two conversations and three people. But it is going to give us added security.',
      build: (tl) => {
        hide(tl, '#green-frame');
        show(tl, '#count-what', '<0.2');
        COUNTED.forEach((key, i) => {
          const time = 0.6 + i * 0.3;
          if (i > 0) tl.set(`#count-${i}`, { opacity: 0 }, time);
          tl.set(`#count-${i + 1}`, { opacity: 1 }, time);
          pulse(tl, key, time);
        });
      },
    },
    {
      notes:
        'We store the private keys locally, per conversation. Charlie has only one, as a member of just the green conversation; the other two also hold a blue one. I have not drawn the devices keeping the public halves: they do not need them, though holding on to them is a good idea.',
      build: (tl) => {
        hide(tl, '#count-what, #count-8');
        show(tl, '#say-local', '>-0.1');
        pulse(tl, '#charlie-green', '<0.1');
      },
    },
  ],
};

// ---------------------------------------------------------------------------------------------
// Scene: a message in the blue chat. Bob opens it; Charlie has no blue key.
// ---------------------------------------------------------------------------------------------

function SendView() {
  return (
    <>
      <Svg>
        <Flow id="to-server" d={routes.aliceToServer} hidden />
        <Flow id="to-bob" d={routes.serverToBob} hidden />
        <Flow id="to-charlie" d={routes.serverToCharlie} hidden />
        <People
          screens={{
            alice: (
              <>
                <ScreenBubble id="alice-plain" text="Psst! Bob!" />
                <ScreenCopies id="alice-copies" copies={['alice', 'bob']} bytes={SEALED} hidden />
              </>
            ),
            bob: (
              <>
                <ScreenCopies id="bob-copies" copies={['alice', 'bob']} bytes={SEALED} hidden />
                <ScreenBubble id="bob-plain" text="Psst! Bob!" hidden />
              </>
            ),
            charlie: (
              <>
                <ScreenCopies id="charlie-copies" copies={['alice', 'bob']} bytes={SEALED} hidden />
                <ScreenNote id="charlie-stuck" text={"can't\ndecrypt"} hidden />
              </>
            ),
          }}
        />
        <ServerSets blue="two" />
        <IdentityKeys at="header" />
        <ConversationKeys />

        <KeySet id="blue-fetched" owners={['alice', 'bob']} chat="blue" x={blueSet.two.x} y={SET_Y} hidden />
        <Sealed id="stored" copies={['alice', 'bob']} bytes={SEALED} x={0} y={0} hidden />
        <Sealed id="for-bob" copies={['alice', 'bob']} bytes={SEALED} {...stored.two} hidden />
        <Sealed id="for-charlie" copies={['alice', 'bob']} bytes={SEALED} {...stored.two} hidden />
        <Caption id="say-everyone" text="Everyone fetches it. Only a blue key opens it." />
      </Svg>
      <SceneTitle>Ephemeral keys</SceneTitle>
    </>
  );
}

const sendScene: Scene = {
  id: 'eph-send',
  title: 'Ephemeral keys: a message in the blue chat',
  notes: 'So now we send a message to Bob.',
  View: SendView,
  steps: [
    {
      notes: 'We grab the keys for conversation blue.',
      build: (tl) => {
        pulse(tl, '#blue-box');
        fly(tl, '#blue-fetched', { x: blueSet.two.x, y: SET_Y }, park.alice, { bend: -70, reveal: true, at: '>-0.1' });
      },
    },
    {
      notes: 'We encrypt it for conversation blue. There are only two payloads here, because there are two recipients: two public keys.',
      build: (tl) => {
        fly(tl, '#blue-fetched', park.alice, setOnScreen.alice, { bend: -40, duration: 0.7 });
        swap(tl, '#alice-plain', '#alice-copies', '>-0.1');
        hide(tl, '#blue-fetched', '>0.1');
      },
    },
    {
      notes: 'That then gets saved to the server.',
      build: (tl) => {
        show(tl, '#to-server-line');
        along(tl, '#stored', '#to-server', { at: '>-0.1' });
        moveTo(tl, '#stored', stored.two, '>', 0.35);
      },
    },
    {
      notes: 'And it gets distributed to everybody.',
      build: (tl) => {
        hide(tl, '#to-server-line');
        show(tl, '#to-bob-line, #to-charlie-line', '<');
        along(tl, '#for-bob', '#to-bob', { at: '>-0.1' });
        along(tl, '#for-charlie', '#to-charlie', { at: '<-0.15' });
        show(tl, '#bob-copies, #charlie-copies', '>-0.1');
        hide(tl, '#for-bob, #for-charlie', '<');
      },
    },
    {
      notes: 'Bob can use the private key for conversation blue and decrypt it.',
      build: (tl) => {
        applyKey(tl, '#bob-blue', tileAt('blue', 'bob'), 'bob', '#bob-copies', '#bob-plain');
      },
    },
    {
      notes: 'Charlie doesn\'t have one, so can\'t decrypt it.',
      build: (tl) => {
        pulse(tl, '#charlie-green');
        swap(tl, '#charlie-copies', '#charlie-stuck', '>0.1');
      },
    },
    {
      notes:
        'Anybody monitoring the data going in and out of the server can\'t tell from the traffic who the recipient was, because everybody requested it. Only the people it was intended for can decrypt it. That brings me to the last demo.',
      build: (tl) => {
        show(tl, '#say-everyone');
        pulse(tl, '#stored', '<');
      },
    },
  ],
};

// ---------------------------------------------------------------------------------------------
// After Demo 4. Scene: Charlie is added to the blue chat, and still cannot read its history.
// ---------------------------------------------------------------------------------------------

/** How the picture stood when the message had been delivered: Bob has read it, Charlie cannot. */
function deliveredScreens(extra: Partial<Record<Member, ReactNode>> = {}) {
  return {
    alice: (
      <>
        <ScreenCopies id="alice-copies" copies={['alice', 'bob']} bytes={SEALED} />
        {extra.alice}
      </>
    ),
    bob: (
      <>
        <ScreenBubble id="bob-plain" text="Psst! Bob!" />
        {extra.bob}
      </>
    ),
    charlie: (
      <>
        <ScreenNote id="charlie-stuck" text={"can't\ndecrypt"} />
        {extra.charlie}
      </>
    ),
  };
}

function JoinView() {
  return (
    <>
      <Svg>
        <ChatFrame id="blue-frame" chat="blue" width={frame.two} hidden />
        <People screens={deliveredScreens()} />
        <ServerSets blue="two" />
        <IdentityKeys at="header" />
        <ConversationKeys />
        <Sealed id="stored" copies={['alice', 'bob']} bytes={SEALED} {...stored.two} />
        <Caption id="say-joins" text="Charlie joins the blue chat" tint={conversation.blue} />
      </Svg>
      <SceneTitle>Ephemeral keys</SceneTitle>
    </>
  );
}

const joinScene: Scene = {
  id: 'eph-join',
  title: 'Ephemeral keys: Charlie joins the blue chat',
  notes: 'That\'s the end of the demos. Back to the picture: Bob read the message in the blue chat, and Charlie could not.',
  View: JoinView,
  steps: [
    {
      notes: 'We added Charlie to the conversation.',
      build: (tl) => {
        show(tl, '#blue-frame');
        tl.to('#blue-frame-outline', { attr: { width: frame.three }, duration: 0.9, ease: 'power2.inOut' }, '>0.1');
        show(tl, '#say-joins', '<0.3');
      },
    },
  ],
};

// ---------------------------------------------------------------------------------------------
// Scene: Bob's device re-seals the history for the three blue keys.
// ---------------------------------------------------------------------------------------------

const ALL: Member[] = ['alice', 'bob', 'charlie'];

function ResealView() {
  return (
    <>
      <Svg>
        <ChatFrame id="blue-frame" chat="blue" width={frame.three} />
        <Flow id="to-server" d={routes.bobToServer} hidden />
        <Flow id="to-alice" d={routes.serverToAlice} hidden />
        <Flow id="to-charlie" d={routes.serverToCharlie} hidden />
        <People
          screens={deliveredScreens({
            alice: (
              <>
                <ScreenCopies id="alice-resealed" copies={ALL} bytes={RESEALED} hidden />
                <ScreenBubble id="alice-plain" text="Psst! Bob!" hidden />
              </>
            ),
            bob: <ScreenCopies id="bob-resealed" copies={ALL} bytes={RESEALED} hidden />,
            charlie: (
              <>
                <ScreenCopies id="charlie-resealed" copies={ALL} bytes={RESEALED} hidden />
                <ScreenBubble id="charlie-plain" text="Psst! Bob!" hidden />
              </>
            ),
          })}
        />
        <ServerSets blue="two" />
        <IdentityKeys at="header" />
        <ConversationKeys />
        <ChatPrivateKey id="charlie-blue" owner="charlie" chat="blue" {...tileAt('blue', 'charlie')} scale={TILE} hidden />
        <ChatPublicKey id="charlie-blue-public" owner="charlie" {...slotPublic('charlie', 2)} hidden />

        <Sealed id="stored" copies={['alice', 'bob']} bytes={SEALED} {...stored.two} />
        <KeySet id="blue-fetched" owners={['charlie', 'alice', 'bob']} chat="blue" x={blueSet.three.x} y={SET_Y} hidden />
        <Sealed id="resealed" copies={ALL} bytes={RESEALED} x={0} y={0} hidden />
        <Sealed id="for-alice" copies={ALL} bytes={RESEALED} {...stored.three} hidden />
        <Sealed id="for-charlie" copies={ALL} bytes={RESEALED} {...stored.three} hidden />

        <Caption id="say-none" text="No copy was sealed for Charlie" />
        <Caption id="say-bob" text="Bob can re-seal it. The server can't." />
        <Caption id="say-history" text="Charlie can now read the old messages" />
      </Svg>
      <SceneTitle>Re-encrypting history</SceneTitle>
    </>
  );
}

const resealScene: Scene = {
  id: 'eph-reseal',
  title: 'Re-encrypting history for a new member',
  notes:
    'We saw that Charlie wasn\'t able to read the old messages. What if we wanted that? Say it is a drive of encrypted documents and someone new needs them: how do they get access to documents that were never encrypted with their key, because they never had one?',
  View: ResealView,
  steps: [
    {
      notes: 'Charlie joins the chat, and creates a public/private key pair for the blue conversation.',
      build: (tl) => {
        pop(tl, '#charlie-blue');
        pop(tl, '#charlie-blue-public', '<0.15');
      },
    },
    {
      notes: 'The public key goes to the server, and the server goes: OK, cool, new public key for blue, I\'ll store that here. And now Charlie also has a private key for blue.',
      build: (tl) => {
        hide(tl, '#blue-frame');
        tl.to('#blue-box', { attr: { x: blueSet.three.x, width: blueSet.three.width }, duration: 0.5, ease: 'power2.inOut' }, '<');
        fly(tl, '#charlie-blue-public', slotPublic('charlie', 2), blueOnServer.charlie, { bend: -90, at: '>-0.2' });
        pulse(tl, '#charlie-blue', '>-0.1');
      },
    },
    {
      notes: 'But of course, none of the messages were encrypted with those keys. So what happens now?',
      build: (tl) => {
        show(tl, '#say-none');
        pulse(tl, '#stored', '<');
        pulse(tl, '#charlie-stuck', '>-0.1');
      },
    },
    {
      notes: 'Bob can grab all of the public keys now, including the new one that Charlie just added.',
      build: (tl) => {
        hide(tl, '#say-none');
        pulse(tl, '#blue-box', '<');
        fly(tl, '#blue-fetched', { x: blueSet.three.x, y: SET_Y }, park.bob, { bend: -60, reveal: true, at: '>-0.1' });
      },
    },
    {
      notes:
        'Bob takes the message already decrypted. It is in memory on the device right now, but Bob could also ask the server for every message in this chat since the beginning of time. Then Bob uses the three public keys to re-encrypt them all. Only a device that can already read them can do this; the server never could.',
      build: (tl) => {
        fly(tl, '#blue-fetched', park.bob, setOnScreen.bob, { bend: 40, duration: 0.7 });
        swap(tl, '#bob-plain', '#bob-resealed', '>-0.1');
        hide(tl, '#blue-fetched', '>0.1');
        show(tl, '#say-bob', '<');
      },
    },
    {
      notes: 'And then Bob sends those back to the server.',
      build: (tl) => {
        show(tl, '#to-server-line');
        along(tl, '#resealed', '#to-server', { at: '>-0.1' });
        hide(tl, '#stored', '>-0.2');
        moveTo(tl, '#resealed', stored.three, '<', 0.35);
      },
    },
    {
      notes: 'Next time Charlie asks for the messages, Charlie gets all of them, but now in three versions: one for Alice, one for Bob, one for Charlie.',
      build: (tl) => {
        hide(tl, '#to-server-line, #say-bob');
        show(tl, '#to-alice-line, #to-charlie-line', '<');
        along(tl, '#for-charlie', '#to-charlie', { at: '>-0.1' });
        along(tl, '#for-alice', '#to-alice', { at: '<-0.15' });
        hide(tl, '#for-alice, #for-charlie', '>-0.1');
        swap(tl, '#charlie-stuck', '#charlie-resealed', '<');
        swap(tl, '#alice-copies', '#alice-resealed', '<');
      },
    },
    {
      notes:
        'And now Charlie can decrypt a historical message with a key that was generated after the message was sent, because we re-encrypted it. It\'s a laborious process, but it\'s fairly straightforward.',
      build: (tl) => {
        applyKey(tl, '#charlie-blue', tileAt('blue', 'charlie'), 'charlie', '#charlie-resealed', '#charlie-plain');
        show(tl, '#say-history', '<0.4');
        applyKey(tl, '#alice-blue', tileAt('blue', 'alice'), 'alice', '#alice-resealed', '#alice-plain', '>-0.5');
        applyKey(tl, '#bob-blue', tileAt('blue', 'bob'), 'bob', '#bob-resealed', '#bob-plain', '<');
      },
    },
  ],
};

// ---------------------------------------------------------------------------------------------

export const beforeDemo4: Scene[] = [
  sectionTitle(
    'eph-title',
    'Ephemeral keys: title',
    <>Let&rsquo;s build an end-to-end encrypted multi-recipient chat app with <em>ephemeral keys</em></>,
    'One stolen private key opens every chat its owner is in. How do we limit that? Has anybody used ephemeral keys? Anybody know what ephemeral means?',
  ),
  ideaScene,
  keysScene,
  sendScene,
];

export const afterDemo4: Scene[] = [
  joinScene,
  sectionTitle(
    'eph-reseal-title',
    'Re-encrypting history: title',
    <>&hellip;and <em>historical message <span style={{ whiteSpace: 'nowrap' }}>re-encryption</span></em></>,
    'So: historical message re-encryption.',
  ),
  resealScene,
];
