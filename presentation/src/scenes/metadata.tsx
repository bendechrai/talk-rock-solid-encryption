/**
 * Metadata: what an observer learns without reading a single message, and what can be done
 * about it. Then "beyond chat apps", the spoken summary and the closing slide.
 *
 * The first half watches one organisation of 18 devices. The observer never sees content, only
 * who sends, who fetches, how much and when; the scene decodes the organisation from that.
 */
import type { ReactNode } from 'react';
import {
  Actor, Art, Character, CipherChip, Flow, Frame, Handset, Label, Laptop, Lock, PrivateKey, PublicKey,
  ScreenMessage, Server,
} from '../art/index.tsx';
import { CodeCard, SceneTitle } from '../art/html.tsx';
import { Svg } from '../engine/Stage.tsx';
import { along, fly, hide, pop, pulse, show, swap, type Point } from '../engine/motion.ts';
import type { Scene, Timeline } from '../engine/types.ts';
import { cast, color, conversation, type } from '../theme.ts';
import { sectionTitle } from './sectionTitle.tsx';
import './metadata.css';

// ---------------------------------------------------------------------------------------------
// The organisation: 18 devices in rows of 4, 5, 4 and 5. Positions are top-left corners; a
// device is 180 x 134.
// ---------------------------------------------------------------------------------------------

const DEVICES: Point[] = [
  { x: 236, y: 334 }, { x: 570, y: 312 }, { x: 918, y: 306 }, { x: 1262, y: 326 },
  { x: 62, y: 498 }, { x: 398, y: 486 }, { x: 746, y: 516 }, { x: 1090, y: 512 }, { x: 1440, y: 492 },
  { x: 226, y: 676 }, { x: 578, y: 664 }, { x: 914, y: 684 }, { x: 1266, y: 668 },
  { x: 54, y: 856 }, { x: 406, y: 846 }, { x: 748, y: 864 }, { x: 1086, y: 850 }, { x: 1436, y: 858 },
];
const ALL = DEVICES.map((_, i) => i);
const SIZE = 1.2;

/** Who the story decides each device belongs to. The audience only learns this at the end. */
const who = { manager: 1, spy: 3, ceo: 6, cto: 7, cfo: 10, hr: 11, legal: 15 };

const PAIR = [who.ceo, who.cto];
/** The group chat created with 14 members at once: everyone except these four. */
const FOURTEEN = ALL.filter((i) => ![who.spy, 4, 12, 14].includes(i));
/** The 12 colleagues (of 17) who share a group chat with the device that is in 70% of them. */
const SHARED = [1, 2, 3, 5, 6, 8, 10, 11, 12, 15, 16, 17];
const ACTIVE = [who.spy, who.cto, who.ceo];
const OCCASIONAL = [who.manager, who.cfo];
const SILENT = [who.hr, who.legal];
const FINANCE = [who.cfo, 9, 14, 5];
const FINANCE_LINKS: [number, number][] = [[10, 9], [10, 14], [10, 5], [9, 14], [5, 9]];

/** Who reports to whom, as a guess from position. Parent first, the top of the company first. */
const TREE: [number, number][] = [
  [6, 7], [6, 10], [6, 11], [6, 15], [6, 5], [6, 1],
  [7, 8], [7, 12], [10, 9], [10, 14], [1, 0], [1, 2],
  [2, 3], [5, 4], [9, 13], [11, 16], [12, 17],
];

const centre = (i: number): Point => ({ x: DEVICES[i].x + 90, y: DEVICES[i].y + 62 });
const distance = (a: number, b: number) => Math.hypot(centre(a).x - centre(b).x, centre(a).y - centre(b).y);

/** In a crisis everyone talks to their neighbours: every near pair that the hierarchy did not already link. */
const MESH: [number, number][] = ALL.flatMap((a) =>
  ALL.filter((b) => b > a && distance(a, b) < 362 && !TREE.some(([p, q]) => (p === a && q === b) || (p === b && q === a)))
    .map((b): [number, number] => [a, b]));

const BLUE = conversation.blue;
const IDLE = '#5E6E94';

function Device({ i, lit = false }: { i: number; lit?: boolean }) {
  const { x, y } = DEVICES[i];
  return (
    <g id={`dev-${i}`} transform={`translate(${x} ${y})`} style={{ color: lit ? BLUE : IDLE }}>
      <rect id={`halo-${i}`} x="-12" y="-12" width="204" height="158" rx="28" fill="currentColor" fillOpacity="0.16" stroke="currentColor" strokeWidth="6" opacity={lit ? 1 : 0} />
      <rect id={`ring-${i}`} x="-12" y="-12" width="204" height="158" rx="28" fill="none" stroke="currentColor" strokeWidth="6" strokeDasharray="16 12" opacity="0" />
      <g transform={`scale(${SIZE})`}><Art name="meta-device" /></g>
    </g>
  );
}

/** The edge of the company. */
function Walls() {
  return <rect x="30" y="292" width="1622" height="770" rx="40" fill={color.panel} fillOpacity="0.45" stroke={color.line} strokeWidth="4" />;
}

function Link({ id, a, b, hidden = true, width = 7 }: { id: string; a: number; b: number; hidden?: boolean; width?: number }) {
  const from = centre(a);
  const to = centre(b);
  return <line id={id} x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke={BLUE} strokeWidth={width} strokeLinecap="round" opacity={hidden ? 0 : 1} />;
}

/** A name tag that lands on a device once we think we know whose it is. */
function Tag({ id, on, text, width }: { id: string; on: number; text: string; width: number }) {
  const { x, y } = DEVICES[on];
  return (
    <Actor id={id} x={x + 90 - width / 2} y={y + 104} hidden>
      <rect width={width} height="58" rx="29" fill={color.paper} />
      <text x={width / 2} y="43" textAnchor="middle" fontSize={type.label} fontWeight="700" fill={color.ink}>{text}</text>
    </Actor>
  );
}

/** Packets are drawn at 56 x 44 and enlarged so the back row can follow them. */
const PACKET = 1.5;

function Packets({ count }: { count: number }) {
  return (
    <>
      {Array.from({ length: count }, (_, n) => (
        <Actor key={n} id={`pk-${n}`} x={0} y={0} scale={PACKET} hidden>
          <Art name="meta-packet" />
        </Actor>
      ))}
    </>
  );
}

function Caption({ id, wide = false, hidden = true, children }: { id: string; wide?: boolean; hidden?: boolean; children: ReactNode }) {
  return <p id={id} className={wide ? 'meta-caption meta-wide' : 'meta-caption'} style={{ opacity: hidden ? 0 : 1 }}>{children}</p>;
}

// ---- Movement shared by the scenes that show the organisation ----

type Look = 'idle' | 'dim' | 'lit' | 'soft' | 'pale';
const LOOKS: Record<Look, { opacity: number; color: string; halo: number; ring: number }> = {
  idle: { opacity: 1, color: IDLE, halo: 0, ring: 0 },
  dim: { opacity: 0.28, color: IDLE, halo: 0, ring: 0 },
  lit: { opacity: 1, color: BLUE, halo: 1, ring: 0 },
  soft: { opacity: 1, color: BLUE, halo: 0, ring: 1 },
  pale: { opacity: 1, color: color.text, halo: 0, ring: 1 },
};

const ids = (prefix: string, list: number[]) => list.map((i) => `#${prefix}-${i}`).join(', ');

/** Say how every device should look. Devices not named take the `rest` look. */
function look(tl: Timeline, named: Partial<Record<Look, number[]>>, rest: Look, at: number = 0): void {
  const taken = new Set(Object.values(named).flat());
  const plan: Partial<Record<Look, number[]>> = { ...named, [rest]: [...(named[rest] ?? []), ...ALL.filter((i) => !taken.has(i))] };
  (Object.entries(plan) as [Look, number[]][]).forEach(([name, list]) => {
    if (list.length === 0) return;
    const { opacity, color: tint, halo, ring } = LOOKS[name];
    tl.to(ids('dev', list), { opacity, color: tint, duration: 0.4, ease: 'power1.out' }, at);
    tl.to(ids('halo', list), { opacity: halo, duration: 0.4, ease: 'power1.out' }, at);
    tl.to(ids('ring', list), { opacity: ring, duration: 0.4, ease: 'power1.out' }, at);
  });
}

/** One encrypted message travels from one device to another and is gone. */
function send(tl: Timeline, packet: number, a: number, b: number, at: number, duration = 0.7, bend = 28): void {
  const from = centre(a);
  const to = centre(b);
  const dx = 28 * PACKET;
  const dy = 22 * PACKET;
  fly(tl, `#pk-${packet}`, { x: from.x - dx, y: from.y - dy }, { x: to.x - dx, y: to.y - dy }, { reveal: true, at, duration, bend });
  hide(tl, `#pk-${packet}`, at + duration, 0.15);
}

/** A message each way between the two people who talk on Sunday nights. */
function sundayExchange(tl: Timeline, at: number): void {
  send(tl, 0, who.ceo, who.cto, at, 0.7, 26);
  send(tl, 1, who.cto, who.ceo, at + 0.8, 0.7, -26);
}

/** A ring spreads from the middle of the company as the whole group appears at once. */
function burst(tl: Timeline, at: number): void {
  tl.fromTo(
    '#burst',
    { scale: 0.15, opacity: 0.9, transformOrigin: '50% 50%' },
    { scale: 9, opacity: 0, duration: 1.1, ease: 'power2.out', immediateRender: false },
    at,
  );
  pulse(tl, ids('dev', FOURTEEN), at + 0.1);
}

/** A large message leaves the company. Nothing comes back. */
function fridayUpload(tl: Timeline, at: number): void {
  pop(tl, '#outsider', at);
  show(tl, '#outsider-label', at + 0.1);
  show(tl, '#out-line', at + 0.3);
  along(tl, '#big', '#out-path', { at: at + 0.5, duration: 1.2 });
}

function clearUpload(tl: Timeline, at: number): void {
  hide(tl, '#outsider, #outsider-label, #out-line, #big', at);
}

/** Messages arrive at one device from all over the company; none leave it. */
function listenIn(tl: Timeline, at: number): void {
  tl.to(SHARED.map((i) => `#spoke-${i}`).join(', '), { opacity: 0.75, duration: 0.3, stagger: 0.04 }, at);
  [5, 2, 16, 1, 12, 10, 17].forEach((from, n) => send(tl, n, from, who.cto, at + 0.5 + n * 0.22, 0.75, n % 2 ? 30 : -30));
}

/** Three people do the talking, two say something now and then, two never do. */
function groupOfSeven(tl: Timeline, at: number): void {
  look(tl, { lit: ACTIVE, soft: OCCASIONAL, pale: SILENT }, 'dim', at);
  send(tl, 0, who.spy, who.cto, at + 0.4, 0.6);
  send(tl, 1, who.cto, who.ceo, at + 0.65, 0.6);
  send(tl, 2, who.ceo, who.spy, at + 0.9, 0.7);
  send(tl, 3, who.manager, who.ceo, at + 1.2, 0.7);
  send(tl, 0, who.spy, who.ceo, at + 1.45, 0.7, -28);
  send(tl, 1, who.cto, who.spy, at + 1.7, 0.6, -28);
  send(tl, 4, who.cfo, who.ceo, at + 1.9, 0.7);
  send(tl, 2, who.ceo, who.cto, at + 2.2, 0.6, -28);
}

// ---------------------------------------------------------------------------------------------
// Scene: one organisation, observed and decoded
// ---------------------------------------------------------------------------------------------

function OrganisationView() {
  const hub = centre(who.cto);
  return (
    <>
      <Svg>
        <g id="org">
          <Walls />

          {/* Lines sit behind the devices. */}
          <Link id="pair-link" a={who.ceo} b={who.cto} width={9} />
          {SHARED.map((i) => (
            <line key={i} id={`spoke-${i}`} x1={hub.x} y1={hub.y} x2={centre(i).x} y2={centre(i).y} stroke={BLUE} strokeWidth="5" strokeLinecap="round" strokeDasharray="2 14" opacity="0" />
          ))}
          <g id="tree" opacity="0">{TREE.map(([a, b]) => <Link key={`${a}-${b}`} id={`tree-${a}-${b}`} a={a} b={b} hidden={false} />)}</g>
          <g id="mesh">{MESH.map(([a, b]) => <Link key={`${a}-${b}`} id={`mesh-${a}-${b}`} a={a} b={b} />)}</g>
          {FINANCE_LINKS.map(([a, b]) => <Link key={`${a}-${b}`} id={`money-${a}-${b}`} a={a} b={b} />)}
          <Flow id="out" d="M1458 388H1698" hidden />
          <path id="out-path" d="M1352 388H1600" fill="none" />

          {ALL.map((i) => <Device key={i} i={i} />)}

          <Actor id="outsider" x={1712} y={326} scale={SIZE} hidden>
            <g style={{ color: color.muted }}><Art name="meta-device" /></g>
          </Actor>
          <Label id="outsider-label" x={1802} y={514} text="external" tint={color.muted} hidden />

          <Tag id="tag-cto" on={who.cto} text="CTO" width={130} />
          <Tag id="tag-ceo" on={who.ceo} text="CEO" width={130} />
          <Tag id="tag-spy" on={who.spy} text="Spy?" width={144} />
          <Tag id="tag-manager" on={who.manager} text="Manager" width={224} />
          <Tag id="tag-cfo" on={who.cfo} text="CFO" width={130} />
          <Tag id="tag-hr" on={who.hr} text="HR" width={108} />
          <Tag id="tag-legal" on={who.legal} text="Legal" width={160} />

          <Label id="size-label" x={1008} y={482} text="300–400 bytes" tint={BLUE} size={type.min} hidden />

          <circle id="burst" cx="840" cy="676" r="90" fill="none" stroke={BLUE} strokeWidth="5" opacity="0" />
          <Packets count={12} />
          <Actor id="big" x={0} y={0} scale={2.7} hidden>
            <Art name="meta-packet" />
          </Actor>
        </g>
      </Svg>

      <h1 id="title-issue" className="scene-title">What&rsquo;s the issue?</h1>
      <h1 id="title-infer" className="scene-title" style={{ opacity: 0 }}>What can we infer?</h1>

      <Caption id="c-open" hidden={false}>One company, 18 devices. Every message is end-to-end encrypted.</Caption>
      <Caption id="c-pair">Two people communicate every Sunday at 10pm</Caption>
      <Caption id="c-fourteen">A group chat was created with 14 initial members, in a company of 18</Caption>
      <Caption id="c-upload">This person sends a large message to an external recipient every Friday at 4:55pm. The recipient never replies.</Caption>
      <Caption id="c-seventy">This person is a member of 70% of the organisation&rsquo;s group chats, but hardly contributes</Caption>
      <Caption id="c-seven">This group of 7 has <b>3 active</b> members, <span className="meta-soft">2 occasional</span> participants and <span className="meta-pale">2 silent</span> observers</Caption>
      <Caption id="c-unread">All of this comes from who sends, who fetches, how much and when. Not one message was read.</Caption>

      <Caption id="i-pair">Probably the co-founders, chatting on Sunday night before the week starts</Caption>
      <Caption id="i-fourteen">Something big happened when this group was created</Caption>
      <Caption id="i-upload">Corporate espionage?</Caption>
      <Caption id="i-seventy">We think this is a founder: part of 70% of groups. CTO rather than CEO?</Caption>
      <Caption id="i-seven">So what is happening in this group of 7?</Caption>
      <Caption id="i-founders">If that is the CTO, the other founder is probably the CEO</Caption>
      <Caption id="i-spy">The third active member: a spy?</Caption>
      <Caption id="i-manager">Hardly contributing: maybe their manager has been pulled in&hellip;</Caption>
      <Caption id="i-cfo">&hellip;and the CFO, if it is financial data that is leaking</Caption>
      <Caption id="i-silent">Which would bring in HR and Legal, silently observing</Caption>
      <Caption id="i-made-up">All guesswork, yet these devices now have likely owners. Not from content: from patterns.</Caption>

      <Caption id="s-size"><b>Message size.</b> The Sunday-night pair always send one message of 300 to 400 bytes: status reports?</Caption>
      <Caption id="s-rate"><b>Message frequency.</b> Traffic between finance team members rises by <b>300%</b>: a reporting cycle?</Caption>
      <Caption id="s-tree"><b>Communication patterns.</b> Messages normally follow the hierarchy&hellip;</Caption>
      <Caption id="s-mesh"><b>Communication patterns.</b> &hellip;then suddenly everyone is talking to everyone: a crisis?</Caption>

      <p id="punch" className="meta-punch" style={{ opacity: 0 }}>
        Even with perfect encryption, <em>metadata</em> tells a detailed story about your organisation
      </p>
    </>
  );
}

const MONEY = FINANCE_LINKS.map(([a, b]) => `#money-${a}-${b}`).join(', ');

const organisation: Scene = {
  id: 'meta-org',
  title: 'Metadata: what an observer sees, and what it means',
  notes: 'We have got a whole lot of users here in the system. Metadata can give away a lot of information.',
  View: OrganisationView,
  steps: [
    // ---- What an observer sees ----
    {
      notes: 'You might notice those two over there communicate each Sunday at 10pm.',
      build: (tl) => {
        swap(tl, '#c-open', '#c-pair');
        look(tl, { lit: PAIR }, 'dim', 0.1);
        show(tl, '#pair-link', 0.3);
        sundayExchange(tl, 0.6);
        send(tl, 2, who.ceo, who.cto, 2.2, 0.7, 26);
      },
    },
    {
      notes: 'A group of 14 out of the entire 18 people in the organisation went into a group chat immediately. They did not get added one by one.',
      build: (tl) => {
        swap(tl, '#c-pair', '#c-fourteen');
        hide(tl, '#pair-link', 0);
        look(tl, { lit: FOURTEEN }, 'dim', 0.2);
        burst(tl, 0.2);
      },
    },
    {
      notes: 'This person sends a large message to an external recipient every Friday at 4:55pm, but the recipient never replies.',
      build: (tl) => {
        swap(tl, '#c-fourteen', '#c-upload');
        look(tl, { lit: [who.spy] }, 'dim', 0.1);
        fridayUpload(tl, 0.4);
      },
    },
    {
      notes: 'A person in the organisation who is a member of 70% of the chats but hardly ever contributes to them.',
      build: (tl) => {
        swap(tl, '#c-upload', '#c-seventy');
        clearUpload(tl, 0);
        look(tl, { lit: [who.cto], idle: SHARED }, 'dim', 0.1);
        listenIn(tl, 0.3);
      },
    },
    {
      notes: 'A group of seven that has three active members, two occasional participants, and two silent observers.',
      build: (tl) => {
        swap(tl, '#c-seventy', '#c-seven');
        hide(tl, ids('spoke', SHARED), 0);
        groupOfSeven(tl, 0.1);
      },
    },
    {
      notes: 'This is all the information we can get from metadata, by looking at how the messages get sent and who pulls those messages down. You cannot see the message, but metadata gives away so much.',
      build: (tl) => {
        swap(tl, '#c-seven', '#c-unread');
        look(tl, {}, 'idle', 0.1);
      },
    },

    // ---- What we can infer ----
    {
      notes: 'Now we can use our imaginations to work out what is actually going on. Those two are probably the co-founders: chatting every Sunday night about what we are doing for the week.',
      build: (tl) => {
        swap(tl, '#title-issue', '#title-infer');
        swap(tl, '#c-unread', '#i-pair', 0);
        look(tl, { lit: PAIR }, 'dim', 0.1);
        show(tl, '#pair-link', 0.3);
        sundayExchange(tl, 0.6);
      },
    },
    {
      notes: 'It really hit the fan when this group was created. I do not know what happened; I would be very excited to be a fly on the wall.',
      build: (tl) => {
        swap(tl, '#i-pair', '#i-fourteen');
        hide(tl, '#pair-link', 0);
        look(tl, { lit: FOURTEEN }, 'dim', 0.2);
        burst(tl, 0.2);
      },
    },
    {
      notes: 'Why is this person sending data out every single week to some unknown external recipient who never replies?',
      build: (tl) => {
        swap(tl, '#i-fourteen', '#i-upload');
        look(tl, { lit: [who.spy] }, 'dim', 0.1);
        fridayUpload(tl, 0.4);
      },
    },
    {
      notes: 'We think this person is probably the CTO rather than the CEO, because they are part of 70% of the conversations. Maybe they are keeping more of an eye on it than the CEO would. Maybe.',
      build: (tl) => {
        swap(tl, '#i-upload', '#i-seventy');
        clearUpload(tl, 0);
        look(tl, { lit: [who.cto], idle: SHARED }, 'dim', 0.1);
        tl.to(ids('spoke', SHARED), { opacity: 0.75, duration: 0.3, stagger: 0.04 }, 0.3);
      },
    },
    {
      notes: 'So what is happening in this one?',
      build: (tl) => {
        swap(tl, '#i-seventy', '#i-seven');
        hide(tl, ids('spoke', SHARED), 0);
        groupOfSeven(tl, 0.1);
      },
    },
    {
      notes: 'We think that is the CTO, so that is probably the CEO.',
      build: (tl) => {
        swap(tl, '#i-seven', '#i-founders');
        pop(tl, '#tag-cto', 0.2);
        pop(tl, '#tag-ceo', 0.8);
      },
    },
    {
      notes: 'We think this one here might be a spy. They are talking a lot: these three are the active participants.',
      build: (tl) => {
        swap(tl, '#i-founders', '#i-spy');
        pop(tl, '#tag-spy', 0.2);
      },
    },
    {
      notes: 'There are two that hardly contribute much. Maybe the manager has been pulled in: "What are you doing?"',
      build: (tl) => {
        swap(tl, '#i-spy', '#i-manager');
        pop(tl, '#tag-manager', 0.2);
      },
    },
    {
      notes: 'And maybe the CFO, because it is financial data that is leaking.',
      build: (tl) => {
        swap(tl, '#i-manager', '#i-cfo');
        pop(tl, '#tag-cfo', 0.2);
      },
    },
    {
      notes: 'Which means we have got HR and Legal in there as well.',
      build: (tl) => {
        swap(tl, '#i-cfo', '#i-silent');
        pop(tl, '#tag-hr', 0.2);
        pop(tl, '#tag-legal', 0.6);
      },
    },
    {
      notes: 'I totally made it up, but we have got a very good inference of who each of these devices belongs to. Metadata gives away information: not the content, but patterns.',
      build: (tl) => {
        swap(tl, '#i-silent', '#i-made-up');
        look(tl, { lit: [...ACTIVE, ...OCCASIONAL, ...SILENT] }, 'idle', 0.1);
      },
    },

    // ---- Other things we might notice ----
    {
      notes: 'Other things we might notice. Message size: if messages are usually very short they are probably yes/no answers. If they are the same size at the same time of day, maybe it is a status report. You can start inferring what the content is.',
      build: (tl) => {
        swap(tl, '#i-made-up', '#s-size');
        look(tl, { lit: PAIR }, 'dim', 0.1);
        show(tl, '#pair-link', 0.3);
        show(tl, '#size-label', 0.5);
        sundayExchange(tl, 0.6);
      },
    },
    {
      notes: 'Message frequency: message frequency between finance team members increases by 300%. Maybe this is financial reporting season.',
      build: (tl) => {
        swap(tl, '#s-size', '#s-rate');
        hide(tl, '#pair-link, #size-label', 0);
        look(tl, { lit: FINANCE }, 'dim', 0.1);
        show(tl, MONEY, 0.3);
        const [cfo, a, b, c] = FINANCE;
        const flights: [number, number][] = [[cfo, a], [b, cfo], [cfo, c], [a, b], [c, cfo], [a, cfo], [cfo, b], [b, c], [cfo, a], [c, cfo], [b, cfo], [cfo, c]];
        // The gaps shrink: the same people, sending more and more often.
        let at = 0.4;
        flights.forEach(([from, to], n) => {
          send(tl, n % 8, from, to, at, 0.5, n % 2 ? 24 : -24);
          at += Math.max(0.09, 0.42 - n * 0.04);
        });
      },
    },
    {
      notes: 'Communication patterns: communication used to be hierarchical.',
      build: (tl) => {
        swap(tl, '#s-rate', '#s-tree');
        hide(tl, MONEY, 0);
        look(tl, {}, 'idle', 0.1);
        show(tl, '#tree', 0.3, 0.6);
        TREE.slice(0, 12).forEach(([from, to], n) => send(tl, n, from, to, n < 6 ? 0.7 : 1.5, 0.7, 0));
      },
    },
    {
      notes: 'But now there is a graph: something different is happening. You can detect that something in the organisation has changed. You might not know what, but you are still inferring things.',
      build: (tl) => {
        swap(tl, '#s-tree', '#s-mesh');
        tl.to(MESH.map(([a, b]) => `#mesh-${a}-${b}`).join(', '), { opacity: 1, duration: 0.25, stagger: 0.05 }, 0.2);
        [[0, 4], [2, 6], [12, 16], [11, 12], [9, 14], [3, 8], [14, 15], [5, 10], [7, 11], [16, 17]].forEach(([from, to], n) => send(tl, n, from, to, 0.5 + n * 0.2, 0.6));
      },
    },
    {
      notes: 'So metadata gives away a little bit of stuff that maybe we do not want. Even with perfect encryption, metadata tells a detailed story about your organisation.',
      build: (tl) => {
        hide(tl, '#s-mesh', 0);
        tl.to('#org', { opacity: 0.14, duration: 0.5, ease: 'power1.out' }, 0);
        pop(tl, '#punch', 0.3);
      },
    },
  ],
};

// ---------------------------------------------------------------------------------------------
// Scene: message size
// ---------------------------------------------------------------------------------------------

/** 512 bytes is drawn 620 pixels wide. The shortest message is drawn wider than it is, to fit its text. */
const BLOCK = 620;
const LEFT = 330;
const lanes = [
  { y: 356, message: 110, blocks: 1, text: 'Yes', size: '3 bytes', stored: '512 bytes' },
  { y: 546, message: 424, blocks: 1, text: 'status report', size: '350 bytes', stored: '512 bytes' },
  { y: 736, message: 727, blocks: 2, text: 'a much longer message', size: '600 bytes', stored: '1024 bytes' },
];
const hasPadWord = (n: number) => BLOCK * lanes[n].blocks - lanes[n].message > 260;

function Lane({ n }: { n: number }) {
  const { y, message, text, size, stored, blocks } = lanes[n];
  const full = BLOCK * blocks;
  return (
    <g id={`lane-${n}`} opacity={n === 2 ? 0 : 1}>
      <Label x={LEFT - 30} y={y + 58} text={size} anchor="end" weight={500} />
      {/* The plaintext: the message in white, then the padding. */}
      <rect id={`pad-${n}`} x={LEFT + message - 18} y={y} width={18} height="84" rx="16" fill="url(#meta-hatch)" stroke={color.muted} strokeWidth="3" opacity="0" />
      <rect x={LEFT} y={y} width={message} height="84" rx="16" fill={color.paper} />
      <text x={LEFT + message / 2} y={y + 58} textAnchor="middle" fontSize={type.label} fontWeight="700" fill={color.ink}>{text}</text>
      {hasPadWord(n) && (
        <text id={`pad-word-${n}`} x={LEFT + (message + full) / 2} y={y + 58} textAnchor="middle" fontSize={type.label} fontWeight="500" fill={color.text} opacity="0">padding</text>
      )}
      {/* What is stored: ciphertext exactly as long as what went in. */}
      <rect id={`cipher-${n}`} x={LEFT} y={y + 96} width={message} height="60" rx="16" fill={color.cipherGround} stroke={color.cipher} strokeWidth="4" />
      <g transform={`translate(${LEFT + 18} ${y + 103}) scale(.64)`}>
        <path d="M16 32V22a14 14 0 0 1 28 0v10" fill="none" stroke={color.cipher} strokeWidth="7" />
        <rect x="8" y="30" width="44" height="36" rx="8" fill={color.cipher} />
      </g>
      <Label id={`stored-${n}`} x={LEFT + full + 28} y={y + 142} text={stored} anchor="start" tint={color.cipher} hidden />
    </g>
  );
}

/** Grow a lane's padding out to the end of its last block, and the ciphertext with it. */
function padLane(tl: Timeline, n: number, at: number): void {
  const { message, blocks } = lanes[n];
  const full = BLOCK * blocks;
  tl.set(`#pad-${n}`, { opacity: 1 }, at + 0.05);
  tl.to(`#pad-${n}`, { attr: { width: full - message + 18 }, duration: 0.8, ease: 'power2.inOut' }, at + 0.1);
  tl.to(`#cipher-${n}`, { attr: { width: full }, duration: 0.8, ease: 'power2.inOut' }, at + 0.1);
  if (hasPadWord(n)) show(tl, `#pad-word-${n}`, at + 0.7);
  show(tl, `#stored-${n}`, at + 0.8);
}

function PaddingView() {
  return (
    <>
      <Svg>
        <defs>
          <pattern id="meta-hatch" width="18" height="18" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="18" height="18" fill={color.panel} />
            <rect width="6" height="18" fill={color.line} />
          </pattern>
        </defs>
        <g id="pad-diagram">
          <g id="guide-1" opacity="0">
            <line x1={LEFT + BLOCK} y1="336" x2={LEFT + BLOCK} y2="716" stroke={color.muted} strokeWidth="4" strokeDasharray="4 14" strokeLinecap="round" />
          </g>
          <g id="guide-2" opacity="0">
            <line x1={LEFT + BLOCK} y1="716" x2={LEFT + BLOCK} y2="912" stroke={color.muted} strokeWidth="4" strokeDasharray="4 14" strokeLinecap="round" />
            <line x1={LEFT + BLOCK * 2} y1="716" x2={LEFT + BLOCK * 2} y2="912" stroke={color.muted} strokeWidth="4" strokeDasharray="4 14" strokeLinecap="round" />
            <Label x={LEFT + BLOCK / 2} y={968} text="block 1" tint={color.muted} />
            <Label x={LEFT + BLOCK * 1.5} y={968} text="block 2" tint={color.muted} />
          </g>
          <Lane n={0} />
          <Lane n={1} />
          <Lane n={2} />
        </g>
      </Svg>

      <SceneTitle>Message size</SceneTitle>
      <Caption id="c-length" wide hidden={false}>Encryption hides the words, but not the length of the message</Caption>
      <Caption id="c-pad" wide>Pad every message to a fixed-size block, then encrypt<span className="meta-sub">A short &ldquo;Yes&rdquo; now looks exactly like a status report</span></Caption>
      <Caption id="c-code" wide>Mark where the message ends, fill the rest of the block with zeros</Caption>
      <Caption id="c-blocks" wide>A longer message still shows how many blocks it needed</Caption>

      <CodeCard id="pad-code" left={80} top={400} hidden>
        {'function '}<span className="hl">pad</span>{'(msg, block = 512) {\n'}
        {'  const size = Math.ceil((msg.length + 1) / block) * block;\n'}
        {'  const out = new Uint8Array(size);   '}<span className="dim">{'// all zeros\n'}</span>
        {'  out.set([...msg, '}<span className="hl">0x80</span>{']);            '}<span className="dim">{'// message, then a marker\n'}</span>
        {'  return out;                         '}<span className="dim">{'// encrypt this\n'}</span>
        {'}'}
      </CodeCard>
    </>
  );
}

const padding: Scene = {
  id: 'meta-padding',
  title: 'Protection: message size',
  notes: 'So what can we do to protect ourselves against this? Start with message size: ciphertext is as long as the message that went in, so a short reply looks short.',
  View: PaddingView,
  steps: [
    {
      notes: 'Standardise to fixed blocks: make sure every message that gets stored is a multiple of 512 bytes, for example. That way it is harder to infer what is actually in there.',
      build: (tl) => {
        swap(tl, '#c-length', '#c-pad');
        show(tl, '#guide-1', 0.2);
        padLane(tl, 0, 0.4);
        padLane(tl, 1, 0.7);
      },
    },
    {
      notes: 'The padding goes on before encryption. A marker byte says where the real message ends, so the receiver can strip the padding after decrypting.',
      build: (tl) => {
        swap(tl, '#c-pad', '#c-code');
        tl.to('#pad-diagram', { opacity: 0.07, duration: 0.3 }, 0);
        show(tl, '#pad-code', 0.2);
      },
    },
    {
      notes: 'Padding hides length only up to the block size: a message longer than one block still reveals how many blocks it took.',
      build: (tl) => {
        swap(tl, '#c-code', '#c-blocks');
        hide(tl, '#pad-code', 0);
        tl.to('#pad-diagram', { opacity: 1, duration: 0.3 }, 0.2);
        show(tl, '#lane-2', 0.4);
        show(tl, '#guide-2', 0.9);
        padLane(tl, 2, 1.1);
      },
    },
  ],
};

// ---------------------------------------------------------------------------------------------
// Scene: decoy traffic
// ---------------------------------------------------------------------------------------------

const DECOYS: [number, number][] = [
  [0, 4], [12, 17], [1, 2], [10, 14], [3, 8], [5, 9], [11, 15], [2, 7], [13, 14], [8, 12], [1, 5], [16, 11],
];
const DECOY_TIMES = [0.3, 0.5, 0.85, 1.0, 1.4, 1.5, 1.75, 2.1, 2.2, 2.5, 2.7, 2.8];

function DecoyView() {
  return (
    <>
      <Svg>
        <g id="decoy-diagram">
          <Walls />
          <Link id="pair-link" a={who.ceo} b={who.cto} hidden={false} />
          {DECOYS.map(([a, b], n) => <Link key={n} id={`decoy-${n}`} a={a} b={b} />)}
          {ALL.map((i) => <Device key={i} i={i} lit={PAIR.includes(i)} />)}
          <Packets count={12} />
        </g>
      </Svg>

      <SceneTitle>Decoy traffic</SceneTitle>
      <Caption id="c-shape" wide hidden={false}>Real traffic has a shape: an observer can see who talks to whom</Caption>
      <Caption id="c-fake" wide>Send convincing fake messages at random times, between random devices</Caption>
      <Caption id="c-key" wide>Each decoy is encrypted for a throwaway key pair: nobody can ever read it</Caption>
      <Caption id="c-noise" wide>Genuine messages hide in the noise: which exchange was real?<span className="meta-sub">The cost: extra bandwidth, storage and battery</span></Caption>

      <CodeCard id="decoy-code" left={80} top={420} hidden>
        <span className="dim">{'// a message that nobody can ever read\n'}</span>
        {'const throwaway = '}<span className="hl">generateKeyPair</span>{'();\n'}
        {'const noise = crypto.getRandomValues(new Uint8Array(512));\n'}
        {'send('}<span className="hl">encrypt</span>{'(noise, throwaway.publicKey), anyDevice);\n'}
        <span className="dim">{'// throwaway.privateKey is never stored'}</span>
      </CodeCard>
    </>
  );
}

const decoy: Scene = {
  id: 'meta-decoy',
  title: 'Protection: decoy traffic',
  notes: 'For working out who is communicating with whom: the same company, and the Sunday-night pair still stand out.',
  View: DecoyView,
  steps: [
    {
      notes: 'Create decoy traffic. Anybody looking at the traffic is now thinking: I wonder who is communicating over there.',
      build: (tl) => {
        swap(tl, '#c-shape', '#c-fake');
        look(tl, { lit: PAIR }, 'idle', 0.1);
        DECOYS.forEach(([a, b], n) => {
          send(tl, n, a, b, DECOY_TIMES[n], 0.6, n % 2 ? 26 : -26);
          show(tl, `#decoy-${n}`, DECOY_TIMES[n] + 0.45, 0.3);
        });
      },
    },
    {
      notes: 'Just make up some public/private key pairs, generate a random string, encrypt it, store it. Nobody will ever be able to decrypt it, because you forget the key pair straight away.',
      build: (tl) => {
        swap(tl, '#c-fake', '#c-key');
        tl.to('#decoy-diagram', { opacity: 0.1, duration: 0.3 }, 0);
        show(tl, '#decoy-code', 0.2);
      },
    },
    {
      notes: 'Now you have got noise in the machine, and that is really useful. It is not free: every decoy is sent, stored and fetched like a real message.',
      build: (tl) => {
        swap(tl, '#c-key', '#c-noise');
        hide(tl, '#decoy-code', 0);
        tl.to('#decoy-diagram', { opacity: 1, duration: 0.3 }, 0.2);
        look(tl, {}, 'idle', 0.5);
        send(tl, 0, 2, 1, 0.8, 0.6);
        send(tl, 1, who.ceo, who.cto, 1.0, 0.6);
        send(tl, 2, 14, 10, 1.2, 0.6);
        send(tl, 3, 17, 12, 1.4, 0.6);
      },
    },
  ],
};

// ---------------------------------------------------------------------------------------------
// Scene: key rotation as a metadata defence
// ---------------------------------------------------------------------------------------------

const CHIP = ['c26d74c865…', '9be1f04a7d…', '41aa0c93e2…', 'e07b5d21c8…', '6f3a9d0b17…'];
const logRows = [
  { y: 72, key: 'a1f3' }, { y: 156, key: '7c2e' }, { y: 240, key: 'a1f3' },
  { y: 372, key: 'e9b4' }, { y: 456, key: '30d8' },
];
/** The log is drawn in its own coordinates and enlarged. */
const LOG = { x: 80, y: 318, scale: 1.3 };
const logY = (y: number) => LOG.y + y * LOG.scale;

function Fingerprint({ x, y, text, fresh }: { x: number; y: number; text: string; fresh: boolean }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect width="250" height="64" rx="18" fill={color.panelRaised} stroke={fresh ? color.text : color.line} strokeWidth="3" />
      <g transform="translate(16 12) scale(.9)"><Art name="meta-key" tint={fresh ? color.text : color.muted} /></g>
      <text x="124" y="46" className="mono" fontSize={type.code} fill={color.text}>{text}</text>
    </g>
  );
}

function Hypothesis({ id, y, text }: { id: string; y: number; text: string }) {
  return (
    <Actor id={id} x={980} y={y} hidden>
      <rect width="830" height="84" rx="42" fill={color.panelRaised} stroke={color.muted} strokeWidth="3" strokeDasharray="14 10" />
      <text x="44" y="58" fontSize={type.body} fontWeight="700" fill={color.text}>{text}</text>
    </Actor>
  );
}

function RotationView() {
  return (
    <>
      <Svg>
        <g transform={`translate(${LOG.x} ${LOG.y}) scale(${LOG.scale})`}>
          <rect width="640" height="544" rx="28" fill={color.panel} stroke={color.line} strokeWidth="3" />
          <Label x={40} y={50} text="for key" anchor="start" tint={color.muted} size={type.min} weight={500} />
          <Label x={330} y={50} text="message" anchor="start" tint={color.muted} size={type.min} weight={500} />
          {logRows.map(({ y, key }, n) => (
            <g key={n} id={`row-${n}`} opacity={n > 2 ? 0 : 1}>
              <Fingerprint x={40} y={y} text={key} fresh={n > 2} />
              <CipherChip x={330} y={y + 2} text={CHIP[n]} />
            </g>
          ))}
          <rect x="20" y="60" width="600" height="256" rx="24" fill={BLUE} fillOpacity="0.07" stroke={BLUE} strokeWidth="4" />
          <g id="rotated" opacity="0">
            <line x1="20" y1="338" x2="620" y2="338" stroke={color.muted} strokeWidth="4" strokeDasharray="4 14" strokeLinecap="round" />
            <rect x="186" y="314" width="268" height="48" rx="12" fill={color.panel} />
            <Label x={320} y={352} text="keys rotated" tint={color.muted} size={type.min} weight={500} />
          </g>
        </g>
        <Label x={980} y={logY(170)} text="the same two keys:" anchor="start" tint={BLUE} size={type.body} />
        <Label x={980} y={logY(170) + 60} text="one conversation" anchor="start" tint={BLUE} size={type.body} />
        <Hypothesis id="guess-same" y={748} text="the same chat, with new keys?" />
        <Hypothesis id="guess-new" y={848} text="a brand-new chat?" />
        <Hypothesis id="guess-members" y={948} text="new members joining?" />
      </Svg>

      <SceneTitle>Key rotation</SceneTitle>
      <Caption id="c-linked" wide hidden={false}>The server sees which public key each message is encrypted for</Caption>
      <Caption id="c-fresh" wide>After a rotation, new messages carry new fingerprints: new &ldquo;identities&rdquo;</Caption>
      <Caption id="c-harder" wide>New keys make it harder to link messages to earlier ones<span className="meta-sub">Only if the server cannot tie new keys to old ones, for example by account</span></Caption>
    </>
  );
}

const rotation: Scene = {
  id: 'meta-rotation',
  title: 'Protection: key rotation',
  notes: '(Not spoken at NDC Melbourne; the slide was skipped for time.) Messages carry the fingerprints of the keys they are encrypted for, so the same fingerprints link messages into a conversation.',
  View: RotationView,
  steps: [
    {
      notes: 'Key rotation helps here too: new fingerprints mean new "identities".',
      build: (tl) => {
        swap(tl, '#c-linked', '#c-fresh');
        show(tl, '#rotated', 0.2);
        pop(tl, '#row-3', 0.6);
        pop(tl, '#row-4', 0.9);
      },
    },
    {
      notes: 'The new messages could belong to an existing chat, or be a new chat, or new members. This only helps if the server cannot link a new key to the old one.',
      build: (tl) => {
        swap(tl, '#c-fresh', '#c-harder');
        pop(tl, '#guess-same', 0.3);
        pop(tl, '#guess-new', 0.7);
        pop(tl, '#guess-members', 1.1);
      },
    },
  ],
};

// ---------------------------------------------------------------------------------------------
// Scene: retrieve all messages
// ---------------------------------------------------------------------------------------------

const KEY = 1.4;
const fetchAt = {
  store: [{ x: 485, y: 414 }, { x: 485, y: 494 }, { x: 485, y: 704 }, { x: 485, y: 784 }],
  inbox: [{ x: 930, y: 414 }, { x: 930, y: 494 }, { x: 930, y: 704 }, { x: 930, y: 784 }],
  screen: { x: 1305, y: 640 },
  privateKey: { x: 1530, y: 440 },
  keyOnScreen: { x: 1395, y: 616 },
};

function FetchView() {
  return (
    <>
      <Svg>
        <g transform="translate(0 44)">
        <Server x={90} y={470} scale={1.5} />
        <Label id="which" x={240} y={440} text="which chat?" tint={color.muted} hidden />

        <Frame x={440} y={330} width={360} height={250} tint={conversation.blue} label="private chat" />
        <Frame x={440} y={620} width={360} height={250} tint={conversation.green} label="group chat" />
        {fetchAt.store.map((p, n) => <CipherChip key={n} id={`stored-${n}`} text={CHIP[n]} {...p} />)}

        <Laptop x={1260} y={560} scale={1.5}>
          <ScreenMessage id="charlie-plain" text="Hi!" hidden />
        </Laptop>
        <Character who="charlie" x={1580} y={400} scale={1.5} />
        <Label x={1730} y={890} text="Charlie" tint={cast.charlie.color} />
        <PrivateKey id="charlie-private" owner="charlie" {...fetchAt.privateKey} scale={KEY} />

        {fetchAt.store.map((p, n) => <CipherChip key={n} id={`copy-${n}`} text={CHIP[n]} {...p} hidden />)}
        <Label id="sealed" x={1065} y={612} text="cannot decrypt" tint={color.muted} size={type.min} hidden />
        </g>
      </Svg>

      <SceneTitle>Retrieve all messages</SceneTitle>
      <Caption id="c-ask" wide hidden={false}>Fetch only your own conversations, and the server learns which ones are yours</Caption>
      <Caption id="c-batch" wide>Download a batch for many conversations at once, including messages not meant for you</Caption>
      <Caption id="c-open-own" wide>Your private key opens your own messages. The rest stay sealed and are ignored.</Caption>
      <Caption id="c-cannot-tell" wide>The server cannot tell which conversations you are reading<span className="meta-sub">It still sees that you are online and how much you send. The cost: bandwidth, storage and battery.</span></Caption>
    </>
  );
}

const fetchAll: Scene = {
  id: 'meta-fetch',
  title: 'Protection: retrieve all messages',
  notes: 'Retrieve all the messages. I mentioned this before.',
  View: FetchView,
  steps: [
    {
      notes: 'If everybody receives the messages...',
      build: (tl) => {
        swap(tl, '#c-ask', '#c-batch');
        fetchAt.store.forEach((from, n) => {
          fly(tl, `#copy-${n}`, from, fetchAt.inbox[n], { reveal: true, at: 0.3 + n * 0.15, duration: 0.8, bend: n < 2 ? -40 : 40 });
        });
      },
    },
    {
      notes: '...but can only decrypt the messages intended for them...',
      build: (tl) => {
        swap(tl, '#c-batch', '#c-open-own');
        fly(tl, '#charlie-private', fetchAt.privateKey, fetchAt.keyOnScreen, { bend: 50, duration: 0.7, at: 0.2 });
        fly(tl, '#copy-2', fetchAt.inbox[2], fetchAt.screen, { duration: 0.6, bend: -30, at: 0.5 });
        fly(tl, '#copy-3', fetchAt.inbox[3], fetchAt.screen, { duration: 0.6, bend: 30, at: 0.6 });
        hide(tl, '#copy-2, #copy-3', 1.15, 0.2);
        show(tl, '#charlie-plain', 1.25);
        fly(tl, '#charlie-private', fetchAt.keyOnScreen, fetchAt.privateKey, { bend: -50, duration: 0.6, at: 1.5 });
        tl.to('#copy-0, #copy-1', { opacity: 0.4, duration: 0.4 }, 1.5);
        show(tl, '#sealed', 1.7);
      },
    },
    {
      notes: '...then it is harder to do traffic analysis on who is receiving which messages. If everybody gets everything, it is really hard to work out who it is for.',
      build: (tl) => {
        swap(tl, '#c-open-own', '#c-cannot-tell');
        pop(tl, '#which', 0.3);
      },
    },
  ],
};

// ---------------------------------------------------------------------------------------------
// Scene: beyond chat apps
// ---------------------------------------------------------------------------------------------

function Card({ id, left, art, heading, what, how }: { id: string; left: number; art: string; heading: string; what: string; how: string }) {
  return (
    <div id={id} className="meta-card" style={{ left, opacity: 0 }}>
      <svg viewBox="0 0 120 120"><Art name={art} /></svg>
      <h2>{heading}</h2>
      <p>{what}</p>
      <p className="meta-how">{how}</p>
    </div>
  );
}

function BeyondView() {
  return (
    <>
      <SceneTitle>Beyond chat apps</SceneTitle>
      <p className="meta-lede">The same building blocks protect far more than messages</p>
      <Card id="card-health" left={80} art="meta-health" heading="Healthcare platforms" what="Patient records, test results, telehealth" how="Temporary access to imaging and referrals" />
      <Card id="card-finance" left={680} art="meta-finance" heading="Financial services" what="Transaction details, statements, portfolios" how="Forward secrecy for trading and banking sessions" />
      <Card id="card-legal" left={1280} art="meta-legal" heading="Legal and professional services" what="Client-attorney communications, case files, discovery" how="Time-limited document access for external reviewers" />
    </>
  );
}

const beyond: Scene = {
  id: 'meta-beyond',
  title: 'Beyond chat apps',
  notes: 'None of this is only about chat. (Skipped for time at NDC Melbourne.)',
  View: BeyondView,
  steps: [
    {
      notes: 'Healthcare: patient records, test results, telehealth. Ephemeral keys give temporary access to imaging and referrals.',
      build: (tl) => { pop(tl, '#card-health'); },
    },
    {
      notes: 'Finance: transaction details, statements, portfolios. Forward secrecy for trading and banking sessions.',
      build: (tl) => { pop(tl, '#card-finance'); },
    },
    {
      notes: 'Legal: client-attorney communications, case files, discovery. Time-limited document access for external reviewers.',
      build: (tl) => { pop(tl, '#card-legal'); },
    },
  ],
};

// ---------------------------------------------------------------------------------------------
// Scene: the spoken summary
// ---------------------------------------------------------------------------------------------

const ROW = (n: number) => 230 + n * 142;

function SummaryView() {
  return (
    <>
      <Svg>
        <g id="icon-0" opacity="0">
          <Lock x={151} y={ROW(0) - 46} scale={1.3} />
        </g>
        <g id="icon-1" opacity="0">
          <path transform={`translate(84 ${ROW(1) - 28}) scale(.84)`} d="M14 0h72a14 14 0 0 1 14 14v22a14 14 0 0 1-14 14H36L20 64V50h-6A14 14 0 0 1 0 36V14A14 14 0 0 1 14 0z" fill={color.paper} />
          <path d={`M176 ${ROW(1)}h22m-10-10l10 10l-10 10`} fill="none" stroke={color.muted} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
          <Actor x={212} y={ROW(1) - 33} scale={1.5}><Art name="meta-packet" /></Actor>
        </g>
        <g id="icon-2" opacity="0">
          <PublicKey owner="alice" x={92} y={ROW(2) - 56} scale={0.95} />
          <PublicKey owner="bob" x={196} y={ROW(2) - 21} scale={0.95} />
          <PublicKey owner="charlie" x={92} y={ROW(2) + 14} scale={0.95} ephemeral />
        </g>
        <g id="icon-3" opacity="0">
          <Laptop x={84} y={ROW(3) - 47} scale={0.55} />
          <Handset x={236} y={ROW(3) - 48} scale={0.5} />
        </g>
        <g id="icon-4" opacity="0">
          <PrivateKey owner="alice" x={96} y={ROW(4) - 38} />
          <PublicKey owner="bob" x={186} y={ROW(4) - 22} />
        </g>
        <g id="icon-5" opacity="0">
          <Actor x={84} y={ROW(5) - 36} scale={0.62}><g style={{ color: BLUE }}><Art name="meta-device" /></g></Actor>
          <Actor x={171} y={ROW(5) - 20} scale={0.7}><Art name="meta-packet" /></Actor>
          <Actor x={204} y={ROW(5) - 36} scale={0.62}><g style={{ color: BLUE }}><Art name="meta-device" /></g></Actor>
        </g>
      </Svg>

      <SceneTitle>In summary</SceneTitle>
      <p id="point-0" className="meta-point" style={{ top: ROW(0) - 60, opacity: 0 }}><span><b>Why</b> we need encryption</span></p>
      <p id="point-1" className="meta-point" style={{ top: ROW(1) - 60, opacity: 0 }}><span>From <b>plaintext</b>, through server-side encryption, to <b className="meta-nowrap">end-to-end</b></span></p>
      <p id="point-2" className="meta-point" style={{ top: ROW(2) - 60, opacity: 0 }}><span><b>Multi-recipient</b> encryption, <b>ephemeral keys</b> for forward secrecy, re-encrypting history</span></p>
      <p id="point-3" className="meta-point" style={{ top: ROW(3) - 60, opacity: 0 }}><span><b>Implementation challenges:</b> key rotation, many devices, scale</span></p>
      <p id="point-4" className="meta-point" style={{ top: ROW(4) - 60, opacity: 0 }}><span><b>Diffie-Hellman</b> key exchange</span></p>
      <p id="point-5" className="meta-point" style={{ top: ROW(5) - 60, opacity: 0 }}><span><b>Beyond encryption:</b> communication patterns and traffic analysis</span></p>
    </>
  );
}

/** A point of the summary arrives: its picture pops, its words slide in beside it. */
function point(n: number, notes: string) {
  return {
    notes,
    build: (tl: Timeline) => {
      pop(tl, `#icon-${n}`);
      tl.fromTo(`#point-${n}`, { opacity: 0, x: -40 }, { opacity: 1, x: 0, duration: 0.45, ease: 'power2.out', immediateRender: false }, 0.1);
    },
  };
}

const summary: Scene = {
  id: 'meta-summary',
  title: 'In summary',
  notes: 'So, in summary. I will go through this very quickly because I appreciate your time.',
  View: SummaryView,
  steps: [
    point(0, 'We have gone through why we need encryption...'),
    point(1, '...the evolution of secure messaging, from plain text all the way through to end-to-end encrypted.'),
    point(2, 'Key features like multi-recipient encryption, how ephemeral keys help with perfect forward secrecy, and how we re-encrypt messages.'),
    point(3, 'We have looked at implementation challenges.'),
    point(4, 'We have gone through some of the core technologies like Diffie-Hellman. That was a really fun one.'),
    point(5, 'And we have gone beyond encryption: communication patterns, traffic analysis. Things to take away and look into if you are implementing this in your own products.'),
  ],
};

// ---------------------------------------------------------------------------------------------
// Scene: thank you
// ---------------------------------------------------------------------------------------------

function ThanksView() {
  return (
    <>
      <Svg>
        <Character who="alice" x={470} y={640} scale={1.3} />
        <Character who="bob" x={740} y={640} scale={1.3} />
        <Character who="charlie" x={1010} y={640} scale={1.3} />
        <Character who="eve" x={1280} y={640} scale={1.3} />
      </Svg>
      <p className="meta-thanks meta-thanks-big">Thank you!</p>
      <p className="meta-thanks meta-thanks-handle">@bendechr.ai</p>
      <p className="meta-thanks meta-thanks-talk">Building Rock-Solid Encrypted Applications</p>
    </>
  );
}

const thanks: Scene = {
  id: 'meta-thanks',
  title: 'Thank you',
  notes: 'Thank you for your time. I have gone a little bit over. Have a great rest of your day.',
  View: ThanksView,
  steps: [],
};

export const metadataScenes: Scene[] = [
  sectionTitle(
    'meta-title',
    'Metadata attacks: title',
    <><em>Metadata</em> attacks</>,
    'All right, metadata attacks. I will rush through this; it will not take long.',
  ),
  organisation,
  sectionTitle(
    'meta-protect-title',
    'Metadata protection techniques: title',
    <>Metadata <em>protection</em> techniques</>,
    'So what can we do to protect ourselves against this?',
  ),
  padding,
  decoy,
  rotation,
  fetchAll,
  beyond,
  summary,
  thanks,
];
