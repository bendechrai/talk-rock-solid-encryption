/**
 * A relay between the stage and a presenter's phone.
 *
 * The stage invents a random token and shows it as a QR code. Both sides open an event stream
 * named after that token; the stage posts where it is, the phone posts "next" or "back", and
 * this relay passes each on to the other side. The token is the only credential: without it
 * there is no stream to listen to and nowhere to send a command. Nothing here is stored, and
 * none of it touches the chat database.
 *
 * The audience can follow along too. Each channel has a second, "follow" token, worked out from
 * the first by a one-way hash, which the stage may show the room. It opens a stream that hears
 * where the stage is and nothing else, and it is not accepted anywhere a command is.
 */
import { createHash } from 'node:crypto';
import { Hono, type Context } from 'hono';
import { streamSSE } from 'hono/streaming';

type Role = 'stage' | 'remote' | 'audience';
type Send = (event: string, data: string) => void;

interface Listener {
  role: Role;
  send: Send;
}

interface Channel {
  /** The last position the stage reported, as JSON, for a phone that joins part-way through. */
  position: string | null;
  /** The token that lets the audience listen to this channel. */
  follow: string;
  listeners: Set<Listener>;
}

const TOKEN = /^[A-Za-z0-9_-]{22,64}$/;
const MAX_CHANNELS = 50;
const MAX_LISTENERS = 6;
/** A full room following along, with headroom. */
const MAX_AUDIENCE = 1000;

/** The follow token for a channel. It cannot be turned back into the token that controls the talk. */
function followToken(token: string): string {
  return createHash('sha256').update(`follow:${token}`).digest('base64url');
}
/** Proxies drop a stream that stays silent, so say something this often. */
const HEARTBEAT_MS = 20_000;

const ACTIONS = ['next', 'previous', 'goto', 'audience-code'] as const;

interface Place {
  scene: string;
  step: number;
}

function parsePlace(body: unknown): Place | null {
  if (typeof body !== 'object' || body === null) return null;
  const { scene, step } = body as { scene?: unknown; step?: unknown };
  if (typeof scene !== 'string' || scene.length === 0 || scene.length > 64) return null;
  if (typeof step !== 'number' || !Number.isInteger(step) || step < 0 || step > 10_000) return null;
  return { scene, step };
}

/** Where the stage is, and whether it is showing the room the code for following along. */
function parsePosition(body: unknown): (Place & { audienceCode: boolean }) | null {
  const place = parsePlace(body);
  if (!place) return null;
  return { ...place, audienceCode: (body as { audienceCode?: unknown }).audienceCode === true };
}

/** Told when a stream opens; returns what to call when it closes. */
type OnListener = (c: Context, role: Role) => () => void;

export function createRemote(onListener?: OnListener): Hono {
  const channels = new Map<string, Channel>();
  /** The same channels, by their follow token. */
  const followed = new Map<string, Channel>();
  const remote = new Hono();

  const broadcast = (channel: Channel, event: string, data: string, to: Role[]) => {
    for (const listener of channel.listeners) {
      if (to.includes(listener.role)) listener.send(event, data);
    }
  };

  const count = (channel: Channel, role: Role) => [...channel.listeners].filter((l) => l.role === role).length;

  /** The presenter's devices hear who is connected. The audience is not told. */
  const presence = (channel: Channel) => {
    const data = { stages: count(channel, 'stage'), remotes: count(channel, 'remote'), audience: count(channel, 'audience') };
    broadcast(channel, 'presence', JSON.stringify(data), ['stage', 'remote']);
  };

  /** A channel exists only while someone is listening to it. */
  const existing = (c: Context): Channel | undefined => channels.get(c.req.param('token') ?? '');

  remote.get('/:token/events', (c) => {
    const token = c.req.param('token');
    const role = c.req.query('role');
    if (!TOKEN.test(token)) return c.json({ error: 'Invalid token' }, 400);
    if (role !== 'stage' && role !== 'remote' && role !== 'audience') {
      return c.json({ error: 'role must be stage, remote or audience' }, 400);
    }

    // The audience comes in by the follow token, which reaches a channel only for listening.
    let channel = role === 'audience' ? followed.get(token) : channels.get(token);
    if (!channel) {
      // Only a stage opens a channel, so a phone with a stale or guessed token gets nowhere.
      if (role !== 'stage') return c.json({ error: 'No stage is using this token' }, 404);
      if (channels.size >= MAX_CHANNELS) return c.json({ error: 'Too many remotes in use' }, 503);
      channel = { position: null, follow: followToken(token), listeners: new Set() };
      channels.set(token, channel);
      followed.set(channel.follow, channel);
    }
    const joined = channel;
    if (role === 'audience') {
      if (count(joined, 'audience') >= MAX_AUDIENCE) return c.json({ error: 'Too many people following' }, 503);
    } else if (joined.listeners.size - count(joined, 'audience') >= MAX_LISTENERS) {
      return c.json({ error: 'Too many devices on this token' }, 503);
    }

    const gone = onListener?.(c, role);
    c.header('X-Accel-Buffering', 'no');
    return streamSSE(c, async (stream) => {
      const listener: Listener = {
        role,
        send: (event, data) => void stream.writeSSE({ event, data }).catch(() => undefined),
      };
      const leave = () => {
        if (!joined.listeners.delete(listener)) return;
        gone?.();
        if (joined.listeners.size === 0) {
          // Compare before deleting: a stage may have opened this token again since.
          for (const [key, value] of channels) if (value === joined) channels.delete(key);
          if (followed.get(joined.follow) === joined) followed.delete(joined.follow);
        } else presence(joined);
      };
      stream.onAbort(leave);

      joined.listeners.add(listener);
      if (role === 'stage') listener.send('follow', JSON.stringify({ token: joined.follow }));
      if (joined.position) listener.send('position', joined.position);
      presence(joined);

      try {
        while (!stream.aborted && !stream.closed) {
          await stream.sleep(HEARTBEAT_MS);
          await stream.writeSSE({ event: 'ping', data: '' });
        }
      } finally {
        leave();
      }
    });
  });

  remote.post('/:token/position', async (c) => {
    const channel = existing(c);
    if (!channel) return c.json({ error: 'Unknown token' }, 404);
    const position = parsePosition(await c.req.json().catch(() => null));
    if (!position) return c.json({ error: 'position must be { scene, step }' }, 400);
    channel.position = JSON.stringify(position);
    broadcast(channel, 'position', channel.position, ['remote', 'audience']);
    return c.json({ ok: true });
  });

  remote.post('/:token/command', async (c) => {
    const channel = existing(c);
    if (!channel) return c.json({ error: 'Unknown token' }, 404);
    const body: unknown = await c.req.json().catch(() => null);
    const action = (body as { action?: unknown } | null)?.action;
    if (typeof action !== 'string' || !(ACTIONS as readonly string[]).includes(action)) {
      return c.json({ error: 'action must be next, previous, goto or audience-code' }, 400);
    }
    if (action === 'goto') {
      const place = parsePlace(body);
      if (!place) return c.json({ error: 'goto needs { scene, step }' }, 400);
      broadcast(channel, 'command', JSON.stringify({ action, ...place }), ['stage']);
    } else {
      broadcast(channel, 'command', JSON.stringify({ action }), ['stage']);
    }
    return c.json({ ok: true });
  });

  return remote;
}
