/**
 * Key rotation and private key retention.
 *
 * Conversation keys do not live for ever. When one expires its owner's device makes a new pair
 * and replaces the public key on the server, and the old private keys pile up on the device as
 * history. A stored message was sealed to whichever keys were current when it was sent, so the
 * keys in use today cannot open it: only the old private keys can, if the device kept them.
 * Keeping them keeps history readable; deleting them keeps the past sealed. That is the trade-off.
 *
 * In the diagrams time runs left to right, a key in a shield is a conversation private key on
 * its owner's device, and a key that has gone grey has expired.
 */
import { Fragment } from 'react';
import { Art, Character, CipherChip, Frame, Label, PlainChip, Server } from '../art/index.tsx';
import { SceneTitle } from '../art/html.tsx';
import { Svg } from '../engine/Stage.tsx';
import { fly, hide, pop, pulse, show, swap } from '../engine/motion.ts';
import type { Scene, Timeline } from '../engine/types.ts';
import { cast, color, conversation, type } from '../theme.ts';
import { sectionTitle } from './sectionTitle.tsx';
import './rotation.css';

type Person = 'bob' | 'alice' | 'charlie';
type Chat = 'blue' | 'green';

/** Top to bottom, as Ben refers to them: "the top one there is going to expire". */
const PEOPLE: Person[] = ['bob', 'alice', 'charlie'];
const CHATS: Chat[] = ['blue', 'green'];

const EXPIRED = '#7582A0';
const WARN = cast.eve.color;
const ICE = '#BFD9FF';

/**
 * Every conversation key each person's device has had, as the x position (time) at which it was
 * made. Devices rotate independently, so the columns do not line up. Charlie joined the blue chat
 * late and has one blue key fewer than the other two; the green chat is quieter and has rotated less.
 */
const KEY_X: Record<Chat, Record<Person, number[]>> = {
  blue: { bob: [270, 540, 820, 1090], alice: [270, 680, 960, 1210], charlie: [600, 880, 1150] },
  green: { bob: [270, 730, 1140], alice: [270, 900], charlie: [270, 640, 1010] },
};

const LANE = { x: 240, width: 1150 };

interface KeyTileProps {
  id?: string;
  className?: string;
  owner: Person;
  x: number;
  y: number;
  scale: number;
  expired?: boolean;
  hidden?: boolean;
}

/**
 * A private key that can expire. The shared <PrivateKey> fixes its colour, so this one draws the
 * same artwork in `currentColor`, and a step greys it out by animating `color`.
 */
function PrivateKeyTile({ id, className, owner, x, y, scale, expired = false, hidden = false }: KeyTileProps) {
  const member = cast[owner];
  return (
    <g id={id} className={className} transform={`translate(${x} ${y})`} opacity={hidden ? 0 : 1} style={{ color: expired ? EXPIRED : member.color }}>
      <g transform={`scale(${scale})`}>
        <Art name="shield" />
        <g transform="translate(43 14) scale(.5) rotate(90)">
          <Art name={`key-${member.shape}`} />
        </g>
      </g>
    </g>
  );
}

/** The matching public key, for the same reason. */
function PublicKeyTile({ id, owner, x, y, scale, expired = false, hidden = false }: KeyTileProps) {
  const member = cast[owner];
  return (
    <g id={id} transform={`translate(${x} ${y})`} opacity={hidden ? 0 : 1} style={{ color: expired ? EXPIRED : member.color }}>
      <g transform={`scale(${scale})`}>
        <Art name={`key-${member.shape}`} />
      </g>
    </g>
  );
}

function Member({ who, y }: { who: Person; y: number }) {
  return (
    <>
      <Character who={who} x={35} y={y - 4} scale={0.85} />
      <Label x={120} y={y + 280} text={cast[who].name} tint={cast[who].color} />
    </>
  );
}

/** The strip a person's keys for one conversation sit in, oldest on the left. */
function Lane({ id, chat, y, height, hidden = false }: { id?: string; chat: Chat; y: number; height: number; hidden?: boolean }) {
  const tint = conversation[chat];
  return (
    <rect
      id={id} x={LANE.x} y={y} width={LANE.width} height={height} rx={30}
      fill={tint} fillOpacity={0.09} stroke={tint} strokeOpacity={0.7} strokeWidth={3} opacity={hidden ? 0 : 1}
    />
  );
}

/** A round "no" badge, centred on x, y. */
function Cross({ id, x, y, hidden = false }: { id: string; x: number; y: number; hidden?: boolean }) {
  return (
    <g id={id} transform={`translate(${x} ${y})`} opacity={hidden ? 0 : 1}>
      <circle r={27} fill="#2A1416" stroke={WARN} strokeWidth={5} />
      <path d="M-11 -11L11 11M11 -11L-11 11" stroke={WARN} strokeWidth={7} strokeLinecap="round" />
    </g>
  );
}

const ids = (prefix: string) => PEOPLE.map((who) => `#${prefix}-${who}`).join(', ');

// ---------------------------------------------------------------------------------------------
// Key rotation: keys expire, devices replace them, and the old ones pile up
// ---------------------------------------------------------------------------------------------

const ROW: Record<Person, number> = { bob: 150, alice: 446, charlie: 742 };
const KEY = 1.4; // a shield is 90 x 106 at this scale
const PUBLIC = 1.25; // a bare key is 125 x 55
const SLOT_X: Record<Person, number> = { bob: 1462, alice: 1602, charlie: 1742 };
const FRAME_Y: Record<Chat, number> = { blue: 470, green: 690 };

const laneY = (chat: Chat, who: Person) => ROW[who] + (chat === 'blue' ? 4 : 146);
const keyAt = (chat: Chat, who: Person, generation: number) => ({ x: KEY_X[chat][who][generation - 1], y: laneY(chat, who) + 14 });
const slotAt = (chat: Chat, who: Person) => ({ x: SLOT_X[who], y: FRAME_Y[chat] + 100 });
const keyId = (chat: Chat, who: Person, generation: number) => `#key-${chat}-${who}-${generation}`;

function RotationView() {
  return (
    <>
      <Svg>
        <Label x={742} y={118} text="time" anchor="end" tint={color.muted} size={type.min} weight={500} />
        <path d="M764 104H1352" stroke={color.muted} strokeWidth={5} strokeLinecap="round" />
        <path d="M1352 89l28 15-28 15z" fill={color.muted} />

        {PEOPLE.map((who) => (
          <Fragment key={who}>
            <Member who={who} y={ROW[who]} />
            {CHATS.map((chat) => (
              <Lane key={chat} id={`lane-${chat}-${who}`} chat={chat} y={laneY(chat, who)} height={134} hidden={chat === 'blue' && who === 'charlie'} />
            ))}
          </Fragment>
        ))}

        <Server x={1545} y={170} scale={1.2} />
        <Label x={1665} y={447} text="current public keys" tint={color.muted} size={type.min} weight={500} />
        <Frame x={1440} y={FRAME_Y.blue} width={450} height={190} tint={conversation.blue} label="blue chat" />
        <Frame x={1440} y={FRAME_Y.green} width={450} height={190} tint={conversation.green} label="green chat" />

        {/* The server holds one public key per person per conversation: the newest. */}
        {CHATS.map((chat) => PEOPLE.map((who) => (
          <PublicKeyTile
            key={`${chat}-${who}`} id={`slot-${chat}-${who}`} owner={who} {...slotAt(chat, who)} scale={PUBLIC}
            hidden={chat === 'blue' && who === 'charlie'}
          />
        )))}

        {/* Every private key each device will ever hold in this scene. Only the first generation is there at the start. */}
        {CHATS.map((chat) => PEOPLE.map((who) => KEY_X[chat][who].map((_, index) => (
          <PrivateKeyTile
            key={`${chat}-${who}-${index}`} id={`key-${chat}-${who}-${index + 1}`} owner={who}
            {...keyAt(chat, who, index + 1)} scale={KEY} hidden={index > 0 || (chat === 'blue' && who === 'charlie')}
          />
        ))))}

        {/* A new public key on its way to the server. One per lane, reused for each rotation. */}
        {CHATS.map((chat) => PEOPLE.map((who) => (
          <PublicKeyTile key={`${chat}-${who}`} id={`courier-${chat}-${who}`} owner={who} {...slotAt(chat, who)} scale={PUBLIC} hidden />
        )))}

        <Label id="tag-expired" x={382} y={laneY('blue', 'bob') + 82} text="expired" tint={WARN} anchor="start" hidden />
        <Label id="tag-next-send" x={652} y={laneY('blue', 'bob') + 82} text="made when Bob next sends" tint={color.text} anchor="start" weight={500} hidden />
        <Label id="tag-joined" x={276} y={laneY('blue', 'charlie') + 81} text="joined later" tint={color.muted} anchor="start" size={type.min} weight={500} hidden />
      </Svg>

      <SceneTitle>Key rotation</SceneTitle>
    </>
  );
}

/** A new public key leaves the device it was made on and lands on its slot on the server. */
function publish(tl: Timeline, chat: Chat, who: Person, generation: number, at: number | string) {
  const made = keyAt(chat, who, generation);
  fly(tl, `#courier-${chat}-${who}`, { x: made.x - 18, y: made.y + 26 }, slotAt(chat, who), {
    bend: chat === 'blue' ? -50 : 50, duration: 0.7, reveal: true, at,
  });
}

/**
 * One rotation, starting `at` seconds into the step: the old private key goes grey, a new pair is
 * made on the device, and the new public key replaces the old one on the server.
 */
function rotate(tl: Timeline, chat: Chat, who: Person, generation: number, at: number) {
  tl.to(keyId(chat, who, generation - 1), { color: EXPIRED, duration: 0.35 }, at);
  pop(tl, keyId(chat, who, generation), at + 0.25);
  publish(tl, chat, who, generation, at + 0.65);
  hide(tl, `#courier-${chat}-${who}`, at + 1.35, 0.15);
  pulse(tl, `#slot-${chat}-${who}`, at + 1.35);
}

const rotation: Scene = {
  id: 'rot-rotation',
  title: 'Key rotation',
  notes:
    'We have kind of spoken about this already. A blue chat for two people, a green chat for three, and each has their keys: the private keys stay on the devices, the server holds the current public keys.',
  View: RotationView,
  steps: [
    {
      notes:
        'At some point the top one there is going to expire: we saw that happen in the demo. Bob\'s blue key goes grey, and so does the copy of its public key on the server. Until Bob\'s device replaces it, senders still seal to it, and Bob can still read those messages because the device still holds the private key.',
      build: (tl) => {
        tl.to(keyId('blue', 'bob', 1), { color: EXPIRED, duration: 0.5 });
        tl.to('#slot-blue-bob', { color: EXPIRED, duration: 0.5 }, '<');
        show(tl, '#tag-expired', '<0.2');
      },
    },
    {
      notes:
        'So Bob creates a new key pair and updates the server, which only keeps the newest public key. It is not automatic: you have to code it. In the demo the device notices the expiry when it next sends, and makes the new pair then.',
      build: (tl) => {
        hide(tl, '#tag-expired');
        pop(tl, keyId('blue', 'bob', 2), '<0.1');
        show(tl, '#tag-next-send', '<0.2');
        publish(tl, 'blue', 'bob', 2, '>');
        tl.to('#slot-blue-bob', { color: cast.bob.color, duration: 0.2 }, '>-0.05');
        hide(tl, '#courier-blue-bob', '>', 0.15);
        pulse(tl, '#slot-blue-bob', '<');
      },
    },
    {
      notes:
        'Meanwhile, we saw Charlie join the conversation, so Charlie now has a blue key pair too. Blue now has three public keys on the server. (The old slides had the wrong number of keys in the blue set here.)',
      build: (tl) => {
        hide(tl, '#tag-next-send');
        show(tl, '#lane-blue-charlie', '<');
        pop(tl, keyId('blue', 'charlie', 1), '>-0.1');
        show(tl, '#tag-joined', '<0.2');
        publish(tl, 'blue', 'charlie', 1, '>');
        show(tl, '#slot-blue-charlie', '>-0.05', 0.15);
        hide(tl, '#courier-blue-charlie', '>', 0.15);
        pulse(tl, '#slot-blue-charlie', '<');
      },
    },
    {
      notes: 'So now, all the time, we are going through time, or maybe it is a number of messages, and these keys keep expiring.',
      build: (tl) => {
        rotate(tl, 'green', 'charlie', 2, 0);
        rotate(tl, 'blue', 'alice', 2, 0.3);
        rotate(tl, 'green', 'bob', 2, 0.6);
      },
    },
    {
      notes: 'Each time, the device makes a new pair and replaces its public key on the server. And we have spoken about what happens when keys expire: what do we do with them?',
      build: (tl) => {
        rotate(tl, 'blue', 'bob', 3, 0);
        rotate(tl, 'blue', 'charlie', 2, 0.3);
        rotate(tl, 'green', 'alice', 2, 0.6);
        rotate(tl, 'blue', 'alice', 3, 0.9);
        rotate(tl, 'green', 'charlie', 3, 1.2);
      },
    },
    {
      notes:
        'So we get to a result where we have a whole lot of historical stuff. Charlie joined blue late, so Charlie has three blue keys where the others have four. The server still holds just one public key each.',
      build: (tl) => {
        rotate(tl, 'blue', 'bob', 4, 0);
        rotate(tl, 'green', 'bob', 3, 0.3);
        rotate(tl, 'blue', 'charlie', 3, 0.6);
        rotate(tl, 'blue', 'alice', 4, 0.9);
      },
    },
  ],
};

// ---------------------------------------------------------------------------------------------
// One stored message, and the keys that can open it. Used twice: before and after the
// retention considerations.
// ---------------------------------------------------------------------------------------------

const FOCUS: Record<Person, number> = { bob: 180, alice: 472, charlie: 764 };
const BIG = 1.7; // a shield is 109 x 129 at this scale
const BIG_WIDTH = 109;

/** Which generation of each person's blue key the stored message was sealed to. */
const SEALED: Record<Person, number> = { bob: 2, alice: 2, charlie: 1 };
const CHIP_TEXT: Record<Person, string> = { bob: 'c26d74c865…', alice: 'df1c08d385…', charlie: '9a41be07f2…' };

const blueKeys = (who: Person) => KEY_X.blue[who];
const sealedX = (who: Person) => blueKeys(who)[SEALED[who] - 1];
const currentX = (who: Person) => blueKeys(who)[blueKeys(who).length - 1];

/** From a sealed copy on the server, over the newer keys, down onto the key that sealed it. */
function linkPath(who: Person): string {
  const row = FOCUS[who];
  const end = sealedX(who) + BIG_WIDTH / 2;
  return `M1474 ${row + 145}C1370 ${row - 6} ${end + 230} ${row + 2} ${end} ${row + 74}`;
}

interface Headline {
  id: string;
  text: string;
  detail?: string;
}

/**
 * `resolved` opens the diagram as the message scene leaves it: every copy linked to the key that
 * sealed it, and the current keys marked as unable to open it.
 */
function MessageView({ resolved, headlines }: { resolved: boolean; headlines: Headline[] }) {
  return (
    <>
      <Svg>
        <Server x={1738} y={14} scale={0.72} />
        <Frame x={1450} y={158} width={440} height={822} tint={conversation.blue} label="blue chat" />

        {PEOPLE.map((who) => {
          const row = FOCUS[who];
          const keys = blueKeys(who);
          const expired = keys.slice(0, -1);
          return (
            <Fragment key={who}>
              <Member who={who} y={row} />
              <Lane chat="blue" y={row + 58} height={172} />

              {/* Cold storage: a box around the keys that have expired. */}
              <g id={`box-${who}`} opacity={0}>
                <rect
                  x={expired[0] - 14} y={row + 64} width={expired[expired.length - 1] + BIG_WIDTH + 28 - expired[0]} height={160} rx={26}
                  fill={ICE} fillOpacity={0.07} stroke={ICE} strokeWidth={4} strokeDasharray="14 12" strokeLinecap="round"
                />
                <g transform={`translate(${expired[0] - 44} ${row + 34}) scale(1.3)`}>
                  <Art name="rotation-cold" tint={ICE} />
                </g>
              </g>

              {keys.map((x, index) => (
                <PrivateKeyTile
                  key={index} id={`focus-${who}-${index + 1}`} className={index < keys.length - 1 ? 'rotation-old' : undefined}
                  owner={who} x={x} y={row + 80} scale={BIG} expired={index < keys.length - 1}
                />
              ))}

              <path
                id={`link-${who}`} d={linkPath(who)} fill="none" stroke={cast[who].color} strokeWidth={6}
                pathLength={1} strokeDasharray="1" strokeDashoffset={resolved ? 0 : 1} opacity={resolved ? 1 : 0}
              />
              <rect
                id={`ring-${who}`} x={sealedX(who) - 10} y={row + 72} width={BIG_WIDTH + 20} height={146} rx={22}
                fill="none" stroke={cast[who].color} strokeWidth={6} opacity={resolved ? 1 : 0}
              />
              <rect
                id={`probe-${who}`} x={currentX(who) - 10} y={row + 72} width={BIG_WIDTH + 20} height={146} rx={22}
                fill="none" stroke={WARN} strokeWidth={7} opacity={0}
              />
              <Cross id={`cross-${who}`} x={currentX(who) + BIG_WIDTH - 4} y={row + 203} hidden={!resolved} />
              <Cross id={`miss-${who}`} x={keys[keys.length - 2] + BIG_WIDTH - 4} y={row + 203} hidden />
              <PlainChip id={`plain-${who}`} text="Hi!" x={sealedX(who) + 119} y={row + 97} hidden />

              <Label x={1642} y={row + 92} text={`sealed for ${cast[who].name}`} tint={cast[who].color} size={type.min} />
              <CipherChip id={`chip-${who}`} text={CHIP_TEXT[who]} x={1480} y={row + 109} scale={1.2} />
              <Cross id={`lost-${who}`} x={1848} y={row + 145} hidden />
            </Fragment>
          );
        })}

        <Label x={276} y={FOCUS.charlie + 158} text="joined later" tint={color.muted} anchor="start" size={type.min} weight={500} />
      </Svg>

      {headlines.map((headline, index) => (
        <h1 key={headline.id} id={headline.id} className="rotation-headline" style={{ opacity: index === 0 ? 1 : 0 }}>
          {headline.text}
          {headline.detail && <small>{headline.detail}</small>}
        </h1>
      ))}
    </>
  );
}

/** Draw the line from one sealed copy to the key that sealed it, then ring that key. */
function link(tl: Timeline, who: Person, at: number) {
  tl.set(`#link-${who}`, { strokeDashoffset: 1, opacity: 1 }, at);
  tl.to(`#link-${who}`, { strokeDashoffset: 0, duration: 0.7, ease: 'power1.inOut' }, at);
  pop(tl, `#ring-${who}`, at + 0.6);
}

const MESSAGE_HEADLINES: Headline[] = [
  { id: 'head-copies', text: 'One stored message, three sealed copies' },
  { id: 'head-sealed', text: 'Each copy was sealed to the key in use at the time' },
  { id: 'head-current', text: 'The current keys cannot open it' },
];

const message: Scene = {
  id: 'rot-message',
  title: 'Key rotation: one stored message',
  notes:
    'Now look at one of the messages on the server. This one is in the blue chat: three sealed copies, one each for Bob, Alice and Charlie. On the left, every blue key each device has had; the grey ones have expired.',
  View: () => <MessageView resolved={false} headlines={MESSAGE_HEADLINES} />,
  steps: [
    {
      notes:
        'The copies could be encrypted with different keys from different times. Charlie joined late, so Charlie only has three keys where the others have four. Each copy is associated with one key pair: the one that was current when the message was sent.',
      build: (tl) => {
        swap(tl, '#head-copies', '#head-sealed');
        PEOPLE.forEach((who, index) => link(tl, who, 0.5 + index * 0.35));
      },
    },
    {
      notes:
        'This is where we need to choose what we are actually going to do. The active key pairs, the ones we are currently encrypting and decrypting with in our app, are not going to be able to decrypt that.',
      build: (tl) => {
        swap(tl, '#head-sealed', '#head-current');
        PEOPLE.forEach((who, index) => {
          pulse(tl, `#focus-${who}-${blueKeys(who).length}`, 0.4 + index * 0.15);
          pop(tl, `#cross-${who}`, 0.6 + index * 0.15);
        });
      },
    },
  ],
};

const OPTION_HEADLINES: Headline[] = [
  { id: 'head-current', text: 'The current keys cannot open it' },
  { id: 'head-kept', text: 'The old keys still can, if the device kept them' },
  { id: 'head-try', text: '1. Keep every key, try each in turn', detail: 'works, but one failed attempt for every wrong key' },
  { id: 'head-archive', text: '2. Archive old keys, record which key sealed what', detail: 'one lookup, but more to build, store and guard' },
  { id: 'head-forget', text: '3. Delete old keys', detail: 'nothing left to steal, and no history left to read' },
];

const options: Scene = {
  id: 'rot-options',
  title: 'Private key retention: the options',
  notes: 'So the question now is: what do we do with all of these old keys? Back to the message the current keys cannot open.',
  View: () => <MessageView resolved headlines={OPTION_HEADLINES} />,
  steps: [
    {
      notes: 'We have got historical keys which could decrypt that, if you want: but only if the device kept them, and your app has to be aware of that.',
      build: (tl) => {
        swap(tl, '#head-current', '#head-kept');
        hide(tl, ids('cross'), '<');
        PEOPLE.forEach((who, index) => {
          pulse(tl, `#focus-${who}-${SEALED[who]}`, 0.5 + index * 0.2);
          pop(tl, `#plain-${who}`, 0.7 + index * 0.2);
        });
      },
    },
    {
      notes:
        'Do you keep all your keys in the same memory space and just cycle through them all until one decrypts it? That again is computationally very expensive.',
      build: (tl) => {
        swap(tl, '#head-kept', '#head-try');
        hide(tl, [ids('link'), ids('ring'), ids('plain')].join(', '), '<');
        PEOPLE.forEach((who) => {
          const keys = blueKeys(who);
          const newest = keys[keys.length - 1];
          // Newest first: wrong, wrong, and the third one opens it.
          pop(tl, `#probe-${who}`, 0.5);
          pop(tl, `#cross-${who}`, 1.0);
          tl.to(`#probe-${who}`, { x: keys[keys.length - 2] - newest, duration: 0.4, ease: 'power2.inOut' }, 1.3);
          pop(tl, `#miss-${who}`, 1.8);
          tl.to(`#probe-${who}`, { x: keys[keys.length - 3] - newest, duration: 0.4, ease: 'power2.inOut' }, 2.1);
          tl.to(`#probe-${who}`, { stroke: cast[who].color, duration: 0.2 }, 2.5);
          pop(tl, `#plain-${who}`, 2.6);
        });
      },
    },
    {
      notes:
        'Or do you have some mechanism that takes those keys and puts them into cold storage, almost, and then if the primary key does not work you have a way of looking up which key was used?',
      build: (tl) => {
        swap(tl, '#head-try', '#head-archive');
        hide(tl, [ids('probe'), ids('plain'), ids('cross'), ids('miss')].join(', '), '<');
        PEOPLE.forEach((who, index) => {
          pop(tl, `#box-${who}`, 0.5 + index * 0.12);
          link(tl, who, 1.1 + index * 0.25);
          pop(tl, `#plain-${who}`, 2.0 + index * 0.25);
        });
      },
    },
    {
      notes:
        'Or you just forget them, which is so much easier: and the past stays sealed even if the device is compromised. But your users are not going to be happy when the messages disappear. So again, pros and cons: you have to weigh them up.',
      build: (tl) => {
        swap(tl, '#head-archive', '#head-forget');
        hide(tl, [ids('plain'), ids('link'), ids('ring'), ids('box')].join(', '), '<');
        tl.to('.rotation-old', { opacity: 0, scale: 0.6, transformOrigin: '50% 50%', duration: 0.5, ease: 'power1.in', stagger: 0.05 }, 0.5);
        tl.to(ids('chip'), { opacity: 0.35, duration: 0.4 }, 1.3);
        PEOPLE.forEach((who, index) => pop(tl, `#lost-${who}`, 1.4 + index * 0.12));
      },
    },
  ],
};

// ---------------------------------------------------------------------------------------------
// Key retention considerations
// ---------------------------------------------------------------------------------------------

const CONSIDERATIONS = [
  { id: 'history', title: 'Access to historical data', detail: 'Does anyone need to read old messages again?' },
  { id: 'risk', title: 'Security impact', detail: 'Every private key kept is one more that can leak' },
  { id: 'law', title: 'Compliance and legal requirements', detail: 'Some rules say keep it, others say erase it' },
  { id: 'ops', title: 'Operational complexity', detail: 'Track which key sealed which data' },
  { id: 'resources', title: 'Resource constraints', detail: 'Keys are small; the systems that manage them are not' },
];

function ConsiderationsView() {
  return (
    <>
      <SceneTitle>Key retention considerations</SceneTitle>
      <div className="rotation-list">
        {CONSIDERATIONS.map((item) => (
          <div key={item.id} id={`consider-${item.id}`} className="rotation-item" style={{ opacity: 0 }}>
            <svg className="rotation-icon" viewBox="0 0 100 100">
              <Art name={`rotation-${item.id}`} tint={color.text} />
            </svg>
            <div>
              <div className="rotation-item-title">{item.title}</div>
              <div className="rotation-item-sub">{item.detail}</div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

/** Bring in one consideration from the left. */
function consider(tl: Timeline, id: string) {
  tl.fromTo(
    `#consider-${id}`,
    { opacity: 0, x: -50 },
    { opacity: 1, x: 0, duration: 0.5, ease: 'power2.out', immediateRender: false },
  );
}

const considerations: Scene = {
  id: 'rot-considerations',
  title: 'Key retention considerations',
  notes: 'So: private key retention questions. These are things you have to ask yourself to work out what kind of key rotation mechanism you need.',
  View: ConsiderationsView,
  steps: [
    {
      notes:
        'Do you want access to historical data? That is the first thing to answer. What data loss is acceptable? Is losing data even desirable? If you are building Snapchat, you do not want access to historical data.',
      build: (tl) => consider(tl, 'history'),
    },
    {
      notes:
        'What is the security impact? Keeping old keys is a risk in itself. Think about tiered security for older keys, and consider offline key storage.',
      build: (tl) => consider(tl, 'risk'),
    },
    {
      notes:
        'Compliance and legal requirements. Healthcare, finance and government often have explicit retention requirements: medical records are typically kept for years, and the period varies by country. GDPR has a right to be forgotten. How do you balance those? Which regulations affect your system, your industry, your country? Document your policy decisions for audits.',
      build: (tl) => consider(tl, 'law'),
    },
    {
      notes:
        'Operational complexity. Encrypting things is operationally complex: you may need to track which keys encrypted which data. Is it worth adding that to your application, or can you get away with something simpler?',
      build: (tl) => consider(tl, 'ops'),
    },
    {
      notes:
        'Resource constraints. Keys are small, but key management systems consume significant resources, and public key operations are CPU intensive. Stored data grows with messages times recipients; kept keys grow with time and with the number of conversations.',
      build: (tl) => consider(tl, 'resources'),
    },
  ],
};

// ---------------------------------------------------------------------------------------------

export const rotationScenes: Scene[] = [
  sectionTitle(
    'rot-title',
    'Key rotation: title',
    <>Let&rsquo;s talk about <em>key rotation</em></>,
    'All right, so let us talk about key rotation.',
  ),
  rotation,
  message,
  sectionTitle(
    'rot-retention-title',
    'Private key retention: title',
    <>Private key <em>retention</em></>,
    'So: private key retention. At this point you have a choice on the device. Do you keep all of your old private keys so you can decrypt historical messages, or do you delete them so they can never be exposed?',
  ),
  considerations,
  options,
];
