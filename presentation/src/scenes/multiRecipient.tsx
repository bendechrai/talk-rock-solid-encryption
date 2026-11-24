/**
 * A third person, multi-recipient encryption, and what one stolen private key exposes.
 *
 * These scenes follow Demo 3. Charlie joins and cannot read what was sent before. The fix is to
 * seal every message once per member, the sender included: each private key opens exactly one
 * copy. That same property is why one stolen private key exposes every conversation its owner
 * is in.
 */
import type { ReactNode } from 'react';
import {
  Actor, Character, Flow, Label, Laptop, PrivateKey, PublicKey, ScreenCipher, ScreenMessage, ScreenNote, Server,
  type ActorProps,
} from '../art/index.tsx';
import { CodeCard, SceneTitle } from '../art/html.tsx';
import { Svg } from '../engine/Stage.tsx';
import { fly, hide, moveTo, pop, pulse, show, swap, type Point } from '../engine/motion.ts';
import type { Scene, Timeline } from '../engine/types.ts';
import { cast, color, conversation, type, type Who } from '../theme.ts';
import { sectionTitle } from './sectionTitle.tsx';

type Member = 'alice' | 'bob' | 'charlie';
const MEMBERS: Member[] = ['alice', 'bob', 'charlie'];

const KEY = 1.4;
const CIPHER = ['9f1ab04e77c2', '47e0c2d1a8b3'];
const DANGER = cast.eve.color;

// ---- Local actors ---------------------------------------------------------------------------

/** The head of each member's key, without the shaft: it marks whose public key sealed a copy. */
function KeyHead({ owner }: { owner: Who }) {
  const fill = cast[owner].color;
  switch (cast[owner].shape) {
    case 'triangle':
      return (
        <path
          d="M8 22L32 8v28z M25 14.5a7.5 7.5 0 1 0 0 15a7.5 7.5 0 1 0 0-15z"
          fillRule="evenodd" fill={fill} stroke={fill} strokeWidth="5" strokeLinejoin="round"
        />
      );
    case 'square':
      return (
        <path
          d="M11 5h20a7 7 0 0 1 7 7v20a7 7 0 0 1-7 7H11a7 7 0 0 1-7-7V12a7 7 0 0 1 7-7z M21 16a6 6 0 1 0 0 12a6 6 0 1 0 0-12z"
          fillRule="evenodd" fill={fill}
        />
      );
    case 'circle':
      return <path d="M21 4a18 18 0 1 0 0 36a18 18 0 1 0 0-36z M21 16a6 6 0 1 0 0 12a6 6 0 1 0 0-12z" fillRule="evenodd" fill={fill} />;
    default:
      return (
        <path
          d="M4 22L21 5l17 17-17 17z M21 14.5a7.5 7.5 0 1 0 0 15a7.5 7.5 0 1 0 0-15z"
          fillRule="evenodd" fill={fill} stroke={fill} strokeWidth="5" strokeLinejoin="round"
        />
      );
  }
}

const COPY = { width: 104, height: 60, pitch: 110 };

/**
 * One sealed copy of a message: ciphertext (green, padlocked) tagged with the key head of the
 * one member whose private key opens it. With `breakable`, a second layer `#<id>-open` shows the
 * same copy opened by a stolen key.
 */
function CopyArt({ id, owner, breakable = false }: { id?: string; owner: Member; breakable?: boolean }) {
  return (
    <g id={id}>
      <rect x="2" y="2" width={COPY.width - 4} height={COPY.height - 4} rx="16" fill={color.cipherGround} stroke={color.cipher} strokeWidth="4" />
      <g transform="translate(10 8) scale(.62)">
        <path d="M16 32V22a14 14 0 0 1 28 0v10" fill="none" stroke={color.cipher} strokeWidth="7" />
        <rect x="8" y="30" width="44" height="36" rx="8" fill={color.cipher} />
      </g>
      <g transform="translate(55 8)"><KeyHead owner={owner} /></g>
      {breakable && (
        <g id={`${id}-open`} opacity="0">
          <rect x="2" y="2" width={COPY.width - 4} height={COPY.height - 4} rx="16" fill="#2A1416" stroke={DANGER} strokeWidth="4" />
          <g transform="translate(10 8) scale(.62)">
            <path d="M16 32V20a14 14 0 0 1 28 0" fill="none" stroke={DANGER} strokeWidth="7" strokeLinecap="round" />
            <rect x="8" y="30" width="44" height="36" rx="8" fill={DANGER} />
          </g>
          <g transform="translate(55 8)"><KeyHead owner={owner} /></g>
        </g>
      )}
    </g>
  );
}

function SealedCopy({ owner, ...actor }: ActorProps & { owner: Member }) {
  return (
    <Actor {...actor}>
      <CopyArt owner={owner} />
    </Actor>
  );
}

const envelopeWidth = (count: number) => count * COPY.pitch + 14;
const ENVELOPE_HEIGHT = 80;

/**
 * A stored message: one sealed copy per member, kept and sent together. Each copy inside has the
 * id `<id>-<member>`. `empty` draws only the outline, for copies that arrive separately.
 */
function Envelope({
  owners, breakable = false, empty = false, ...actor
}: ActorProps & { owners: Member[]; breakable?: boolean; empty?: boolean }) {
  return (
    <Actor {...actor}>
      <rect x="1.5" y="1.5" width={envelopeWidth(owners.length) - 3} height={ENVELOPE_HEIGHT - 3} rx="24" fill={color.panel} stroke="#55648A" strokeWidth="3" />
      {!empty && owners.map((owner, i) => (
        <g key={owner} transform={`translate(${10 + i * COPY.pitch} 10)`}>
          <CopyArt id={actor.id ? `${actor.id}-${owner}` : undefined} owner={owner} breakable={breakable} />
        </g>
      ))}
    </Actor>
  );
}

/** A two-line message on a laptop screen, for text too long for <ScreenMessage>. */
function ScreenBubble({ id, lines, hidden = false }: { id?: string; lines: [string, string]; hidden?: boolean }) {
  return (
    <g id={id} opacity={hidden ? 0 : 1}>
      <path d="M52 22h136a12 12 0 0 1 12 12v58a12 12 0 0 1-12 12H92l-14 13v-13H52a12 12 0 0 1-12-12V34a12 12 0 0 1 12-12z" fill={color.paper} />
      <text x="120" y="57" textAnchor="middle" fontSize="28" fontWeight="700" fill={color.ink}>{lines[0]}</text>
      <text x="120" y="91" textAnchor="middle" fontSize="28" fontWeight="700" fill={color.ink}>{lines[1]}</text>
    </g>
  );
}

const HELLO: [string, string] = ['Hi', 'Charlie!'];

// ---- A person with their laptop ---------------------------------------------------------------

interface KitPlace extends Point {
  /** Mirrored kits have the laptop on the left and the person on the right. */
  mirror: boolean;
}

/** A character, their name and their laptop, as one group so they can move together. */
function Kit({
  id, who, place, hidden, children, extras,
}: {
  id?: string; who: Member; place: KitPlace; hidden?: boolean; children?: ReactNode; extras?: ReactNode;
}) {
  const { mirror } = place;
  return (
    <Actor id={id} x={place.x} y={place.y} hidden={hidden}>
      <Character who={who} x={mirror ? 310 : 0} y={0} scale={1.3} />
      <Label x={mirror ? 440 : 130} y={-15} text={cast[who].name} tint={cast[who].color} />
      <Laptop x={mirror ? 0 : 210} y={115} scale={1.5}>{children}</Laptop>
      {extras}
    </Actor>
  );
}

/** Where a kit's parts are, relative to the kit. Add the kit's position for stage coordinates. */
function parts(mirror: boolean) {
  const laptop = { x: mirror ? 0 : 210, y: 115 };
  const screen = { x: laptop.x + 180, y: laptop.y + 110 };
  return {
    laptop,
    /** A private key resting above the laptop, on the owner's side. */
    privateKey: { x: laptop.x + (mirror ? 250 : 20), y: 5 },
    /** A public key resting above the laptop, next to the private key. */
    publicKey: { x: laptop.x + (mirror ? 95 : 125), y: 27 },
    /** Keys in use sit over the middle of the screen. */
    publicOnScreen: { x: screen.x - 70, y: screen.y - 31 },
    privateOnScreen: { x: screen.x - 45, y: screen.y - 53 },
    /** An envelope of `count` copies rests across the foot of the laptop. */
    foot: (count: number) => ({ x: laptop.x + 180 - envelopeWidth(count) / 2, y: laptop.y + 185 }),
  };
}

function on(place: KitPlace) {
  const p = parts(place.mirror);
  const add = (point: Point): Point => ({ x: place.x + point.x, y: place.y + point.y });
  return {
    laptop: add(p.laptop),
    privateKey: add(p.privateKey),
    publicKey: add(p.publicKey),
    publicOnScreen: add(p.publicOnScreen),
    privateOnScreen: add(p.privateOnScreen),
    foot: (count: number) => add(p.foot(count)),
    /** Where a private key sits to open copy number `index` of an envelope at the foot. */
    privateOnCopy: (count: number, index: number) => {
      const foot = add(p.foot(count));
      return { x: foot.x + 10 + index * COPY.pitch + COPY.width / 2 - 45, y: foot.y + ENVELOPE_HEIGHT / 2 - 53 };
    },
  };
}

// The three-person layout: Bob top centre, Alice bottom left, Charlie bottom right, server bottom centre.
const TRIO: Record<Member, KitPlace> = {
  alice: { x: 20, y: 660, mirror: false },
  bob: { x: 690, y: 110, mirror: true },
  charlie: { x: 1330, y: 660, mirror: true },
};
const SERVER = { x: 820, y: 785 };
const SERVER_SCALE = 1.4;
const spot = { alice: on(TRIO.alice), bob: on(TRIO.bob), charlie: on(TRIO.charlie) };
/** An envelope of `count` copies resting on the server, relative to the server's corner. */
const onServer = (count: number, server: Point = SERVER) => ({ x: server.x + 140 - envelopeWidth(count) / 2, y: server.y + 79 });

/** A quick sideways shake: this key does not fit. */
function refuse(tl: Timeline, target: string, rest: Point) {
  tl.to(target, { x: rest.x + 12, duration: 0.07, ease: 'power1.inOut', yoyo: true, repeat: 3 }, '>');
}

// ---- 1. A third person joins (slides 54-56) -------------------------------------------------

const ROW: Record<'alice' | 'bob', KitPlace> = {
  alice: { x: 20, y: 350, mirror: false },
  bob: { x: 1330, y: 350, mirror: true },
};
const ROW_SERVER = { x: 820, y: 420 };

function ThirdView() {
  const kit = parts(false);
  const mirrored = parts(true);
  return (
    <>
      <Svg>
        <Flow id="recap-up" d="M606 610C670 560 740 560 808 596" />
        <Flow id="recap-down" d="M1112 596C1180 560 1250 560 1314 610" />
        <Flow id="to-charlie" d="M1112 930C1180 890 1250 890 1322 930" hidden />

        <Kit id="alice-kit" who="alice" place={ROW.alice} extras={<PrivateKey owner="alice" {...kit.privateKey} scale={KEY} />}>
          <ScreenMessage text="Hi!" />
        </Kit>
        <Kit id="bob-kit" who="bob" place={ROW.bob} extras={<PrivateKey owner="bob" {...mirrored.privateKey} scale={KEY} />}>
          <ScreenMessage text="Hi!" />
        </Kit>
        <Kit id="charlie-kit" who="charlie" place={TRIO.charlie} hidden>
          <ScreenCipher id="charlie-cipher" lines={CIPHER} hidden />
          <ScreenNote id="charlie-stuck" text={"can't\ndecrypt"} hidden />
        </Kit>

        <Actor id="server-kit" {...ROW_SERVER}>
          <Server x={0} y={0} scale={SERVER_SCALE} />
          <Envelope owners={['alice', 'bob']} {...onServer(2, { x: 0, y: 0 })} />
        </Actor>

        <Envelope id="old-message" owners={['alice', 'bob']} {...onServer(2)} hidden />
        <PrivateKey id="charlie-private" owner="charlie" {...spot.charlie.privateKey} scale={KEY} hidden />
        <Label id="why" x={960} y={640} text="no copy was sealed for Charlie" tint={color.muted} weight={500} hidden />
      </Svg>
      <SceneTitle>A third person joins</SceneTitle>
    </>
  );
}

const third: Scene = {
  id: 'multi-third',
  title: 'A third person joins',
  notes:
    'End-to-end encrypted chat app. What do we have here? Alice sends a message; both of them receive it from the server and use their keys to decrypt.',
  View: ThirdView,
  steps: [
    {
      notes: 'But what if you want to add a third person? We added Charlie to the conversation in the demo.',
      build: (tl) => {
        hide(tl, '#recap-up-line, #recap-down-line');
        moveTo(tl, '#alice-kit', TRIO.alice, '>', 0.9);
        moveTo(tl, '#bob-kit', TRIO.bob, '<', 0.9);
        moveTo(tl, '#server-kit', SERVER, '<', 0.9);
        pop(tl, '#charlie-kit', '>-0.15');
        pop(tl, '#charlie-private', '>-0.2');
      },
    },
    {
      notes: 'To start with, the earlier message came in to Charlie as well...',
      build: (tl) => {
        show(tl, '#to-charlie-line');
        fly(tl, '#old-message', onServer(2), spot.charlie.foot(2), { bend: -70, reveal: true, at: '>-0.1' });
        show(tl, '#charlie-cipher', '>-0.15');
      },
    },
    {
      notes:
        '...and Charlie was unable to decrypt it. It was sealed once for Alice and once for Bob, before Charlie had a key: Charlie’s private key opens neither copy.',
      build: (tl) => {
        const first = spot.charlie.privateOnCopy(2, 0);
        const second = spot.charlie.privateOnCopy(2, 1);
        fly(tl, '#charlie-private', spot.charlie.privateKey, first, { bend: 60, duration: 0.7 });
        refuse(tl, '#charlie-private', first);
        moveTo(tl, '#charlie-private', second, '>0.1', 0.35);
        refuse(tl, '#charlie-private', second);
        fly(tl, '#charlie-private', second, spot.charlie.privateKey, { bend: 60, duration: 0.6, at: '>0.1' });
        swap(tl, '#charlie-cipher', '#charlie-stuck', '<');
        show(tl, '#why', '>-0.1');
      },
    },
  ],
};

// ---- 2. Section title (slide 57) ------------------------------------------------------------

const title = sectionTitle(
  'multi-title',
  'Multi-recipient: title',
  <>Let&rsquo;s build an end-to-end encrypted <em>multi-recipient</em> chat app</>,
  'So what we want now is the multi-recipient chat app, which we have already seen the demo for. This is the pictorial version of the hand-wavy version I just gave you.',
);

// ---- 3. Everyone's public key (slides 58-60) ------------------------------------------------

const directory: Record<Member, Point> = {
  alice: { x: 745, y: 705 },
  bob: { x: 890, y: 705 },
  charlie: { x: 1035, y: 705 },
};
/** The keys Alice fetched wait in a column beside the laptop. */
const fetched: Record<Member, Point> = {
  alice: { x: 610, y: 790 },
  bob: { x: 610, y: 866 },
  charlie: { x: 610, y: 942 },
};

function KeysView() {
  return (
    <>
      <Svg>
        {MEMBERS.map((who) => (
          <Kit
            key={who}
            who={who}
            place={TRIO[who]}
            extras={
              <>
                <PrivateKey owner={who} {...parts(TRIO[who].mirror).privateKey} scale={KEY} />
                <PublicKey owner={who} {...parts(TRIO[who].mirror).publicKey} scale={KEY} />
              </>
            }
          >
            {who === 'alice' && <ScreenBubble id="alice-plain" lines={HELLO} hidden />}
          </Kit>
        ))}
        <Server {...SERVER} scale={SERVER_SCALE} />

        {/* Copies of the public keys start hidden on top of the originals. */}
        {MEMBERS.map((who) => (
          <PublicKey key={who} id={`${who}-published`} owner={who} {...spot[who].publicKey} scale={KEY} hidden />
        ))}
        {MEMBERS.map((who) => (
          <PublicKey key={who} id={`${who}-fetched`} owner={who} {...directory[who]} scale={KEY} hidden />
        ))}
      </Svg>
      <SceneTitle>Everyone&rsquo;s public key</SceneTitle>
    </>
  );
}

const keys: Scene = {
  id: 'multi-keys',
  title: 'Multi-recipient: everyone’s public key',
  notes: 'How this works. Alice, Bob and Charlie each have a key pair, made on their own device.',
  View: KeysView,
  steps: [
    {
      notes:
        'Everyone in the conversation has published their PUBLIC key to the server, as in the demo. The private keys stay where they are.',
      build: (tl) => {
        fly(tl, '#alice-published', spot.alice.publicKey, directory.alice, { bend: -70, reveal: true });
        fly(tl, '#bob-published', spot.bob.publicKey, directory.bob, { bend: 90, reveal: true, at: '<0.15' });
        fly(tl, '#charlie-published', spot.charlie.publicKey, directory.charlie, { bend: 70, reveal: true, at: '<0.15' });
      },
    },
    {
      notes: 'A message gets generated on a machine: Alice types one for the group.',
      build: (tl) => {
        pop(tl, '#alice-plain');
      },
    },
    {
      notes:
        'Grab all the public keys from the server: one for every member of the conversation. That includes Alice’s own.',
      build: (tl) => {
        fly(tl, '#charlie-fetched', directory.charlie, fetched.charlie, { bend: 90, reveal: true });
        fly(tl, '#bob-fetched', directory.bob, fetched.bob, { bend: 80, reveal: true, at: '<0.15' });
        fly(tl, '#alice-fetched', directory.alice, fetched.alice, { bend: 60, reveal: true, at: '<0.15' });
      },
    },
  ],
};

// ---- 4. One sealed copy per member (slides 61-62) -------------------------------------------

const SEAL_LAPTOP = { x: 280, y: 700, scale: 1.8 };
const sealScreen = { x: SEAL_LAPTOP.x + 120 * SEAL_LAPTOP.scale, y: SEAL_LAPTOP.y + 73 * SEAL_LAPTOP.scale };
const ROWS: Record<Member, number> = { alice: 585, bob: 760, charlie: 935 };
const BIG = 1.5;
const sealKey = (who: Member): Point => ({ x: 800, y: ROWS[who] - 33 });
const sealKeyOnScreen: Point = { x: sealScreen.x - 75, y: sealScreen.y - 33 };
const sealCopyOnScreen: Point = { x: sealScreen.x - 78, y: sealScreen.y - 45 };
const sealCopy = (who: Member): Point => ({ x: 1130, y: ROWS[who] - 45 });
const BUNDLE = { x: 1130, y: 700 };
const bundled = (index: number): Point => ({ x: BUNDLE.x + (10 + index * COPY.pitch) * BIG, y: BUNDLE.y + 10 * BIG });

function SealView() {
  return (
    <>
      <Svg>
        <Character who="alice" x={40} y={610} scale={1.4} />
        <Label x={180} y={595} text="Alice" tint={cast.alice.color} />
        <Laptop {...SEAL_LAPTOP}>
          <ScreenBubble lines={HELLO} />
        </Laptop>

        <Envelope id="bundle" owners={MEMBERS} empty {...BUNDLE} scale={BIG} hidden />
        <Label id="bundle-label" x={BUNDLE.x + (envelopeWidth(3) * BIG) / 2} y={BUNDLE.y + 190} text="one message, three sealed copies" tint={color.muted} weight={500} hidden />

        {MEMBERS.map((who) => (
          <g key={who}>
            <SealedCopy id={`${who}-copy`} owner={who} {...sealCopyOnScreen} scale={BIG} hidden />
            <Label id={`${who}-for`} x={1320} y={ROWS[who] + 16} text={`for ${cast[who].name}`} tint={cast[who].color} size={type.body} anchor="start" hidden />
            <PublicKey id={`${who}-key`} owner={who} {...sealKey(who)} scale={BIG} />
          </g>
        ))}
        <Label id="alice-own" x={1320} y={ROWS.alice + 68} text={'the sender\u2019s own copy'} tint={color.muted} size={type.min} weight={500} anchor="start" hidden />
      </Svg>

      <SceneTitle>One sealed copy per member</SceneTitle>
      <CodeCard id="seal-code" left={80} top={170} hidden>
        <span className="dim">{'// one copy per member, the sender included\n'}</span>
        {'for (const member of members) {\n'}
        {'  copies.push(await '}<span className="hl">seal</span>{'(message, '}<span className="hl">member.publicKey</span>{'));\n'}
        {'}'}
      </CodeCard>
    </>
  );
}

function sealFor(tl: Timeline, who: Member, at: string, own = false) {
  fly(tl, `#${who}-key`, sealKey(who), sealKeyOnScreen, { bend: 40, duration: 0.5, at });
  fly(tl, `#${who}-copy`, sealCopyOnScreen, sealCopy(who), { bend: -50, duration: 0.6, reveal: true, at: '>0.05' });
  fly(tl, `#${who}-key`, sealKeyOnScreen, sealKey(who), { bend: 40, duration: 0.5, at: '<' });
  show(tl, `#${who}-for`, '>-0.3', 0.3);
  if (own) show(tl, '#alice-own', '<', 0.3);
}

const seal: Scene = {
  id: 'multi-seal',
  title: 'Multi-recipient: one sealed copy per member',
  notes: 'Alice’s device now holds the message and the three public keys it fetched.',
  View: SealView,
  steps: [
    {
      notes:
        'Bit of code. Go through each member of the group and, for each of them, encrypt the message using THEIR public key. (Not the sender’s private key: that is never used here, and never leaves the device.)',
      build: (tl) => {
        show(tl, '#seal-code');
      },
    },
    {
      notes:
        'Same message, sealed three times: once for Alice, once for Bob, once for Charlie. Alice gets a copy too, or Alice could never read the message again.',
      build: (tl) => {
        sealFor(tl, 'alice', '>', true);
        sealFor(tl, 'bob', '>0.1');
        sealFor(tl, 'charlie', '>0.1');
      },
    },
    {
      notes:
        'That converts into three messages, one for each recipient, kept together as one array. Each copy can only be opened by one private key.',
      build: (tl) => {
        hide(tl, '#alice-for, #bob-for, #charlie-for, #alice-own');
        show(tl, '#bundle', '>');
        MEMBERS.forEach((who, i) => moveTo(tl, `#${who}-copy`, bundled(i), i === 0 ? '<' : '<0.08', 0.6));
        show(tl, '#bundle-label', '>-0.1');
      },
    },
  ],
};

// ---- 5. Deliver and open (slides 63-65) -----------------------------------------------------

const OUTSIDER = { x: 1500, y: 150 };
const outsiderFoot = { x: OUTSIDER.x + 180 - envelopeWidth(3) / 2, y: OUTSIDER.y + 185 };

function DeliverView() {
  return (
    <>
      <Svg>
        <Flow id="to-server" d="M606 905C670 870 740 870 808 905" hidden />
        <Flow id="to-bob" d="M930 775C900 700 880 640 872 508" hidden />
        <Flow id="to-charlie" d="M1112 905C1180 870 1250 870 1322 905" hidden />
        <Flow id="to-outsider" d="M1100 800C1240 720 1380 640 1490 440" tint={color.muted} hidden />

        <Kit who="alice" place={TRIO.alice}>
          <ScreenCipher id="alice-cipher" lines={CIPHER} />
          <ScreenBubble id="alice-plain" lines={HELLO} hidden />
        </Kit>
        <Kit who="bob" place={TRIO.bob}>
          <ScreenCipher id="bob-cipher" lines={CIPHER} hidden />
          <ScreenBubble id="bob-plain" lines={HELLO} hidden />
        </Kit>
        <Kit who="charlie" place={TRIO.charlie}>
          <ScreenCipher id="charlie-cipher" lines={CIPHER} hidden />
          <ScreenBubble id="charlie-plain" lines={HELLO} hidden />
        </Kit>
        <Server {...SERVER} scale={SERVER_SCALE} />

        <Laptop id="outsider" {...OUTSIDER} scale={1.5} hidden>
          <ScreenCipher id="outsider-cipher" lines={CIPHER} hidden />
          <ScreenNote id="outsider-stuck" text={"can't\ndecrypt"} hidden />
        </Laptop>
        <Label id="outsider-label" x={OUTSIDER.x + 180} y={OUTSIDER.y - 24} text="not in the group" tint={color.muted} weight={500} hidden />

        {/* One envelope per place it ends up. Alice's is the one made on Alice's device. */}
        <Envelope id="at-alice" owners={MEMBERS} {...spot.alice.foot(3)} />
        <Envelope id="stored" owners={MEMBERS} {...spot.alice.foot(3)} hidden />
        <Envelope id="at-bob" owners={MEMBERS} {...onServer(3)} hidden />
        <Envelope id="at-charlie" owners={MEMBERS} {...onServer(3)} hidden />
        <Envelope id="at-outsider" owners={MEMBERS} {...onServer(3)} hidden />

        {MEMBERS.map((who) => (
          <PrivateKey key={who} id={`${who}-private`} owner={who} {...spot[who].privateKey} scale={KEY} />
        ))}
      </Svg>
      <SceneTitle>One key opens one copy</SceneTitle>
    </>
  );
}

function openOwnCopy(tl: Timeline, who: Member, at: string) {
  const index = MEMBERS.indexOf(who);
  const target = spot[who].privateOnCopy(3, index);
  const others = MEMBERS.filter((m) => m !== who).map((m) => `#at-${who}-${m}`).join(', ');
  fly(tl, `#${who}-private`, spot[who].privateKey, target, { bend: who === 'alice' ? -50 : 50, duration: 0.7, at });
  tl.to(others, { opacity: 0.22, duration: 0.3 }, '>-0.1');
  swap(tl, `#${who}-cipher`, `#${who}-plain`, '<');
  fly(tl, `#${who}-private`, target, spot[who].privateKey, { bend: who === 'alice' ? 50 : -50, duration: 0.6, at: '>0.1' });
}

const deliver: Scene = {
  id: 'multi-deliver',
  title: 'Multi-recipient: deliver and open',
  notes: 'On Alice’s device the message is now three sealed copies, one for each member.',
  View: DeliverView,
  steps: [
    {
      notes: 'Those three copies get saved onto the server, which cannot open any of them.',
      build: (tl) => {
        show(tl, '#to-server-line');
        fly(tl, '#stored', spot.alice.foot(3), onServer(3), { bend: -60, reveal: true, at: '>-0.1' });
      },
    },
    {
      notes: '...which then get spread out to every member. Every member receives all three copies.',
      build: (tl) => {
        show(tl, '#to-bob-line, #to-charlie-line');
        fly(tl, '#at-bob', onServer(3), spot.bob.foot(3), { bend: 50, reveal: true, at: '>-0.1' });
        fly(tl, '#at-charlie', onServer(3), spot.charlie.foot(3), { bend: -60, reveal: true, at: '<0.15' });
        show(tl, '#bob-cipher, #charlie-cipher', '>-0.15');
      },
    },
    {
      notes:
        'People using the same app who are not part of this group could receive these too, and that is fine: their private key will not decrypt any of them. If everyone gets every message, it is much harder to work out which messages were meant for whom. More on metadata and traffic analysis later.',
      build: (tl) => {
        pop(tl, '#outsider');
        show(tl, '#outsider-label', '<0.1');
        show(tl, '#to-outsider-line', '>');
        fly(tl, '#at-outsider', onServer(3), outsiderFoot, { bend: -60, reveal: true, at: '>-0.1' });
        show(tl, '#outsider-cipher', '>-0.15');
        swap(tl, '#outsider-cipher', '#outsider-stuck', '>0.4');
      },
    },
    {
      notes:
        'The members each use their own private key to decrypt, and then they can read it. Each private key opens exactly one of the three copies; the others stay shut, by design. That was the demo I just gave you.',
      build: (tl) => {
        openOwnCopy(tl, 'alice', '>');
        openOwnCopy(tl, 'bob', '<-0.9');
        openOwnCopy(tl, 'charlie', '<-0.9');
      },
    },
  ],
};

// ---- 6. Conversations, and what one stolen key exposes (slides 66-73) -----------------------

const PEOPLE: Record<Member, Point> = {
  bob: { x: 230, y: 570 },
  alice: { x: 780, y: 570 },
  charlie: { x: 1370, y: 570 },
};
const PERSON = 1.4;
const ownKey = (who: Member): Point => ({ x: PEOPLE[who].x + 250, y: PEOPLE[who].y + 190 });
const loot: Record<'bob' | 'alice', Point> = {
  bob: { x: 1612, y: 35 },
  alice: { x: 1727, y: 35 },
};

/** A conversation: an outline around its members that can light up when its messages are exposed. */
function Chat({
  id, x, y, width, height, tint, label, labelAt, anchor = 'start',
}: {
  id: string; x: number; y: number; width: number; height: number; tint: string; label: string; labelAt: Point;
  anchor?: 'start' | 'end';
}) {
  return (
    <g id={id} opacity="0">
      <rect x={x} y={y} width={width} height={height} rx="36" fill={tint} fillOpacity="0.07" stroke={tint} strokeWidth="4" />
      <rect id={`${id}-glow`} x={x} y={y} width={width} height={height} rx="36" fill={tint} fillOpacity="0.2" stroke={tint} strokeWidth="8" opacity="0" />
      <text x={labelAt.x} y={labelAt.y} textAnchor={anchor} fontSize={type.label} fontWeight="700" fill={tint}>{label}</text>
    </g>
  );
}

function ChatsView() {
  return (
    <>
      <Svg>
        <Chat id="group" x={60} y={175} width={1800} height={875} tint={conversation.green} label="Group chat" labelAt={{ x: 96, y: 240 }} />
        <Chat id="blue" x={130} y={290} width={1050} height={710} tint={conversation.blue} label="Private chat" labelAt={{ x: 166, y: 352 }} />
        <Chat id="grey" x={740} y={320} width={1050} height={710} tint={color.muted} label="Private chat" labelAt={{ x: 1754, y: 382 }} anchor="end" />

        {MEMBERS.map((who) => (
          <g key={who}>
            <Character who={who} {...PEOPLE[who]} scale={PERSON} />
            <Label x={PEOPLE[who].x + 140} y={PEOPLE[who].y - 14} text={cast[who].name} tint={cast[who].color} />
          </g>
        ))}

        {/* A message in each conversation: one sealed copy per member. */}
        <Envelope id="group-message" owners={MEMBERS} breakable x={370} y={186} hidden />
        <Envelope id="blue-message" owners={['alice', 'bob']} breakable x={460} y={306} hidden />
        <Envelope id="grey-message" owners={['alice', 'charlie']} breakable x={1216} y={336} hidden />

        <Label id="group-exposed" x={736} y={240} text="exposed" tint={DANGER} anchor="start" hidden />
        <Label id="blue-exposed" x={166} y={408} text="exposed" tint={DANGER} anchor="start" hidden />
        <Label id="grey-safe" x={1754} y={438} text="still safe" tint={color.cipher} anchor="end" hidden />
        <Label id="grey-exposed" x={1754} y={438} text="exposed" tint={DANGER} anchor="end" hidden />

        <g id="loot" opacity="0">
          <rect x="1400" y="22" width="440" height="132" rx="28" fill="#2A1416" stroke={DANGER} strokeWidth="4" strokeDasharray="14 12" />
          <text x="1430" y="104" fontSize={type.label} fontWeight="700" fill={DANGER}>stolen</text>
        </g>

        {MEMBERS.map((who) => (
          <PrivateKey key={who} owner={who} {...ownKey(who)} scale={KEY} />
        ))}
        <PrivateKey id="bob-stolen" owner="bob" {...ownKey('bob')} scale={KEY} hidden />
        <PrivateKey id="alice-stolen" owner="alice" {...ownKey('alice')} scale={KEY} hidden />
      </Svg>

      <div id="title-chats"><SceneTitle>Three conversations</SceneTitle></div>
      <div id="title-stolen" style={{ opacity: 0 }}><SceneTitle>One stolen private key</SceneTitle></div>
    </>
  );
}

const chats: Scene = {
  id: 'multi-chats',
  title: 'Three conversations, one stolen key',
  notes: 'Alice, Bob and Charlie, each with their own private key.',
  View: ChatsView,
  steps: [
    {
      notes: 'We have a group chat here between all the people. Every message in it carries three sealed copies.',
      build: (tl) => {
        show(tl, '#group');
        pop(tl, '#group-message', '>-0.1');
      },
    },
    {
      notes: 'And now a private chat between just Alice and Bob: the blue conversation. Two copies per message.',
      build: (tl) => {
        show(tl, '#blue');
        pop(tl, '#blue-message', '>-0.1');
      },
    },
    {
      notes: 'We could also have another private chat, between Alice and Charlie.',
      build: (tl) => {
        show(tl, '#grey');
        pop(tl, '#grey-message', '>-0.1');
      },
    },
    {
      notes:
        'The issue: say there is a way a private key can be intercepted. A rootkit on your device; handing it over to a border official. Let’s say Bob’s private key is intercepted.',
      build: (tl) => {
        swap(tl, '#title-chats', '#title-stolen');
        show(tl, '#loot', '<');
        fly(tl, '#bob-stolen', ownKey('bob'), loot.bob, { bend: -120, duration: 1.1, reveal: true, at: '>' });
      },
    },
    {
      notes:
        'Suddenly the private chat between Bob and Alice is compromised. Only one of the copies in each message needs to be decryptable, and that one key opens Bob’s copy of every message.',
      build: (tl) => {
        pulse(tl, '#bob-stolen');
        show(tl, '#blue-message-bob-open', '>-0.1');
        show(tl, '#blue-glow', '<');
        show(tl, '#blue-exposed', '<0.1');
      },
    },
    {
      notes: 'But the problem is you can also access everything in the group chat: the same key opens Bob’s copy there too.',
      build: (tl) => {
        pulse(tl, '#bob-stolen');
        show(tl, '#group-message-bob-open', '>-0.1');
        show(tl, '#group-glow', '<');
        show(tl, '#group-exposed', '<0.1');
      },
    },
    {
      notes: 'The private chat between Alice and Charlie is still safe: no copy in it was sealed for Bob. Unless Alice’s key is compromised...',
      build: (tl) => {
        pulse(tl, '#grey-message');
        show(tl, '#grey-safe', '<0.1');
      },
    },
    {
      notes:
        'Alice is the linchpin of the entire organisation: the CEO, in every single chat. Get that key and you can read every chat Alice is in, which is probably every chat. So what can we do to limit the damage?',
      build: (tl) => {
        fly(tl, '#alice-stolen', ownKey('alice'), loot.alice, { bend: -120, duration: 1.1, reveal: true });
        show(tl, '#blue-message-alice-open, #group-message-alice-open, #grey-message-alice-open', '>');
        swap(tl, '#grey-safe', '#grey-exposed', '<');
        show(tl, '#grey-glow', '<');
      },
    },
  ],
};

export const afterDemo3: Scene[] = [third, title, keys, seal, deliver, chats];
