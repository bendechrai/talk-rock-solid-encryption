/**
 * The actors a scene can put on stage.
 *
 * Every actor is an SVG group with an `id`, positioned by its top-left corner in stage pixels.
 * Scenes animate actors by id, so an actor's markup never needs to change between steps.
 */
import type { ReactNode } from 'react';
import { cast, color, type as typeScale, type Who } from '../theme.ts';
import { asset } from './assets.ts';

export interface ActorProps {
  id?: string;
  x: number;
  y: number;
  scale?: number;
  /** Hidden actors are on stage from the start and wait for a step to reveal them. */
  hidden?: boolean;
}

export function Actor({ id, x, y, scale = 1, hidden = false, children }: ActorProps & { children: ReactNode }) {
  return (
    <g id={id} transform={`translate(${x} ${y})`} opacity={hidden ? 0 : 1}>
      {scale === 1 ? children : <g transform={`scale(${scale})`}>{children}</g>}
    </g>
  );
}

/** Inline one of the drawings from ./svg. `tint` sets `currentColor` for drawings that use it. */
export function Art({ name, tint }: { name: string; tint?: string }) {
  const { fill, markup } = asset(name);
  return <g fill={fill} style={tint ? { color: tint } : undefined} dangerouslySetInnerHTML={{ __html: markup }} />;
}

export function Character({ who, ...actor }: ActorProps & { who: Who }) {
  return (
    <Actor {...actor}>
      <Art name={who} />
    </Actor>
  );
}

/** A laptop. Children are drawn on its screen, in the laptop's own 240x170 coordinates. */
export function Laptop({ children, ...actor }: ActorProps & { children?: ReactNode }) {
  return (
    <Actor {...actor}>
      <Art name="laptop" />
      {children}
    </Actor>
  );
}

export function Server(actor: ActorProps) {
  return (
    <Actor {...actor}>
      <Art name="server" />
    </Actor>
  );
}

/** A public key: a bare key that can travel anywhere. The head shape and colour say whose it is. */
export function PublicKey({ owner, ephemeral = false, ...actor }: ActorProps & { owner: Who; ephemeral?: boolean }) {
  const member = cast[owner];
  return (
    <Actor {...actor}>
      {ephemeral && (
        <circle cx="21" cy="22" r="25" fill="none" stroke={member.color} strokeWidth="3" strokeDasharray="3 7" strokeLinecap="round" />
      )}
      <Art name={`key-${member.shape}`} tint={member.color} />
    </Actor>
  );
}

/** A private key: the same key inside a shield. It never leaves its owner's device. */
export function PrivateKey({ owner, ...actor }: ActorProps & { owner: Who }) {
  const member = cast[owner];
  return (
    <Actor {...actor}>
      <Art name="shield" tint={member.color} />
      <g transform="translate(43 14) scale(.5) rotate(90)">
        <Art name={`key-${member.shape}`} tint={member.color} />
      </g>
    </Actor>
  );
}

export function Lock({ open = false, ...actor }: ActorProps & { open?: boolean }) {
  return (
    <Actor {...actor}>
      <Art name={open ? 'lock-open' : 'lock'} />
    </Actor>
  );
}

/** Ciphertext in transit or at rest: a green chip with a padlock. 60 pixels tall at scale 1. */
export function CipherChip({ text, width = 270, ...actor }: ActorProps & { text: string; width?: number }) {
  return (
    <Actor {...actor}>
      <rect x="2" y="2" width={width - 4} height="56" rx="16" fill={color.cipherGround} stroke={color.cipher} strokeWidth="4" />
      <g transform="translate(12 8) scale(.62)">
        <path d="M16 32V22a14 14 0 0 1 28 0v10" fill="none" stroke={color.cipher} strokeWidth="7" />
        <rect x="8" y="30" width="44" height="36" rx="8" fill={color.cipher} />
      </g>
      <text x="58" y="40" className="mono" data-texture fontSize={typeScale.texture} fill={color.cipher}>{text}</text>
    </Actor>
  );
}

/** Plaintext: a white speech bubble. 150 pixels wide at scale 1. */
export function PlainChip({ text, ...actor }: ActorProps & { text: string }) {
  return (
    <Actor {...actor}>
      <g transform="scale(1.5)">
        <path d="M14 0h72a14 14 0 0 1 14 14v22a14 14 0 0 1-14 14H36L20 64V50h-6A14 14 0 0 1 0 36V14A14 14 0 0 1 14 0z" fill={color.paper} />
        <text x="50" y="35" textAnchor="middle" fontSize="28" fontWeight="700" fill={color.ink}>{text}</text>
      </g>
    </Actor>
  );
}

/** A phone. Children are drawn on its screen, in the phone's own 100x190 coordinates (screen: x 14-86, y 10-180). */
export function Handset({ children, ...actor }: ActorProps & { children?: ReactNode }) {
  return (
    <Actor {...actor}>
      <Art name="phone" />
      {children}
    </Actor>
  );
}

/** A labelled outline around a group of actors, such as the members of one conversation. */
export function Frame({
  id, x, y, width, height, tint, label, hidden = false,
}: {
  id?: string; x: number; y: number; width: number; height: number; tint: string; label?: string; hidden?: boolean;
}) {
  return (
    <g id={id} opacity={hidden ? 0 : 1}>
      <rect x={x} y={y} width={width} height={height} rx="36" fill={tint} fillOpacity="0.07" stroke={tint} strokeWidth="4" />
      {label && (
        <text x={x + 32} y={y + 58} fontSize={typeScale.label} fontWeight="700" fill={tint}>{label}</text>
      )}
    </g>
  );
}

// ---- Things that appear on a laptop screen (laptop coordinates: the screen is x 32-208, y 16-130) ----

export function ScreenMessage({ id, text, hidden = false }: { id?: string; text: string; hidden?: boolean }) {
  return (
    <g id={id} opacity={hidden ? 0 : 1}>
      <path d="M78 42h84a12 12 0 0 1 12 12v24a12 12 0 0 1-12 12h-62l-14 12V90h-8a12 12 0 0 1-12-12V54a12 12 0 0 1 12-12z" fill={color.paper} />
      <text x="120" y="77" textAnchor="middle" fontSize="30" fontWeight="700" fill={color.ink}>{text}</text>
    </g>
  );
}

export function ScreenCipher({ id, lines, hidden = false }: { id?: string; lines: string[]; hidden?: boolean }) {
  return (
    <g id={id} opacity={hidden ? 0 : 1}>
      <rect x="40" y="36" width="160" height="74" rx="10" fill={color.cipherGround} stroke={color.cipher} strokeWidth="3" />
      {lines.slice(0, 2).map((line, i) => (
        <text key={i} x="120" y={66 + i * 27} textAnchor="middle" className="mono" data-texture fontSize="19" fill={color.cipher}>{line.slice(0, 12)}</text>
      ))}
    </g>
  );
}

/** A short warning on a screen. Use "\n" for a second line; keep each line under ten characters. */
export function ScreenNote({ id, text, hidden = false }: { id?: string; text: string; hidden?: boolean }) {
  const lines = text.split('\n');
  return (
    <g id={id} opacity={hidden ? 0 : 1}>
      <rect x="40" y="30" width="160" height="86" rx="10" fill="#2A1416" stroke={cast.eve.color} strokeWidth="3" />
      {lines.map((line, i) => (
        <text key={i} x="120" y={(lines.length === 1 ? 83 : 66) + i * 32} textAnchor="middle" fontSize="27" fontWeight="700" fill={cast.eve.color}>{line}</text>
      ))}
    </g>
  );
}

/** A dotted route between two points. Packets travel along it; see `along()` in engine/motion. */
export function Flow({ id, d, tint = color.cipher, hidden = false }: { id: string; d: string; tint?: string; hidden?: boolean }) {
  return (
    <g opacity={hidden ? 0 : 1} id={`${id}-line`}>
      <defs>
        <marker id={`${id}-head`} viewBox="0 0 12 12" refX="7" refY="6" markerWidth="5.5" markerHeight="5.5" orient="auto-start-reverse">
          <path d="M1.5 1.5L10.5 6L1.5 10.5z" fill={tint} stroke={tint} strokeWidth="2" strokeLinejoin="round" />
        </marker>
      </defs>
      <path id={id} className="flow" d={d} fill="none" stroke={tint} strokeWidth="7" strokeLinecap="round" strokeDasharray="1 18" markerEnd={`url(#${id}-head)`} />
    </g>
  );
}

export function Label({
  id, x, y, text, tint = color.text, size = typeScale.label, weight = 700, anchor = 'middle', hidden = false,
}: {
  id?: string; x: number; y: number; text: string; tint?: string; size?: number; weight?: number;
  anchor?: 'start' | 'middle' | 'end'; hidden?: boolean;
}) {
  return (
    <text id={id} x={x} y={y} textAnchor={anchor} fontSize={size} fontWeight={weight} fill={tint} opacity={hidden ? 0 : 1}>
      {text}
    </text>
  );
}
