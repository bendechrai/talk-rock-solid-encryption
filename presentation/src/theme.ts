/** Colours and cast definitions. Every character owns one colour and one shape. */

export const color = {
  backdrop: '#05080F',
  ground: '#0B1220',
  panel: '#121B2E',
  panelRaised: '#18233C',
  line: '#1E2A44',
  text: '#E8EEF9',
  muted: '#93A1BA',
  paper: '#F2F4F8',
  ink: '#0B1220',
  cipher: '#4ADE80',
  cipherGround: '#0E2A1E',
} as const;

/**
 * Conversations get their own colours, separate from the cast. Ben calls them "the blue
 * conversation" (a private chat) and "the green conversation" (the group chat).
 */
export const conversation = {
  blue: '#4C9DFF',
  green: '#B5E853',
} as const;

export type Who = 'alice' | 'bob' | 'charlie' | 'eve';
export type Shape = 'triangle' | 'square' | 'circle' | 'diamond';

export interface CastMember {
  /** Matches the user id on the server. */
  id: string;
  name: string;
  color: string;
  shape: Shape;
}

export const cast: Record<Who, CastMember> = {
  alice: { id: '1', name: 'Alice', color: '#FFB627', shape: 'triangle' },
  bob: { id: '2', name: 'Bob', color: '#A78BFA', shape: 'square' },
  charlie: { id: '3', name: 'Charlie', color: '#22C7D6', shape: 'circle' },
  eve: { id: '4', name: 'Eve', color: '#FF6B5E', shape: 'diamond' },
};

export const castById: Record<string, CastMember & { who: Who }> = Object.fromEntries(
  (Object.entries(cast) as [Who, CastMember][]).map(([who, member]) => [member.id, { ...member, who }]),
);

/** The stage is authored at this size and scaled to fit whatever screen it is shown on. */
export const STAGE = { width: 1920, height: 1080 } as const;

/**
 * Text sizes in stage pixels. The stage is 1080 pixels tall, and someone at the back of a room
 * sits about six to eight screen-heights away, so anything the audience has to read needs to be
 * at least `min`. `texture` is for ciphertext, which only has to look scrambled.
 * `npm run audit:legibility` checks every step of every scene against these.
 */
export const type = {
  heading: 104,
  title: 76,
  body: 48,
  label: 44,
  code: 40,
  min: 40,
  texture: 28,
} as const;
