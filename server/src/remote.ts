/**
 * A relay between the stage and a presenter's phone.
 *
 * The stage invents a random token and shows it as a QR code. Both sides open an event stream
 * named after that token; the stage posts where it is, the phone posts "next" or "back", and
 * this relay passes each on to the other side. The token is the only credential: without it
 * there is no stream to listen to and nowhere to send a command. Nothing here is stored, and
 * none of it touches the chat database.
 */
import { Hono, type Context } from 'hono';
import { streamSSE } from 'hono/streaming';

type Role = 'stage' | 'remote';
type Send = (event: string, data: string) => void;

interface Listener {
  role: Role;
  send: Send;
}

interface Channel {
  /** The last position the stage reported, as JSON, for a phone that joins part-way through. */
  position: string | null;
  listeners: Set<Listener>;
}

const TOKEN = /^[A-Za-z0-9_-]{22,64}$/;
const MAX_CHANNELS = 50;
const MAX_LISTENERS = 6;
/** Proxies drop a stream that stays silent, so say something this often. */
const HEARTBEAT_MS = 20_000;

const ACTIONS = ['next', 'previous', 'goto'] as const;

function parsePosition(body: unknown): { scene: string; step: number } | null {
  if (typeof body !== 'object' || body === null) return null;
  const { scene, step } = body as { scene?: unknown; step?: unknown };
  if (typeof scene !== 'string' || scene.length === 0 || scene.length > 64) return null;
  if (typeof step !== 'number' || !Number.isInteger(step) || step < 0 || step > 10_000) return null;
  return { scene, step };
}

export function createRemote(): Hono {
  const channels = new Map<string, Channel>();
  const remote = new Hono();

  const broadcast = (channel: Channel, event: string, data: string, to?: Role) => {
    for (const listener of channel.listeners) {
      if (!to || listener.role === to) listener.send(event, data);
    }
  };

  const presence = (channel: Channel) => {
    const count = (role: Role) => [...channel.listeners].filter((l) => l.role === role).length;
    broadcast(channel, 'presence', JSON.stringify({ stages: count('stage'), remotes: count('remote') }));
  };

  /** A channel exists only while someone is listening to it. */
  const existing = (c: Context): Channel | undefined => channels.get(c.req.param('token') ?? '');

  remote.get('/:token/events', (c) => {
    const token = c.req.param('token');
    const role = c.req.query('role');
    if (!TOKEN.test(token)) return c.json({ error: 'Invalid token' }, 400);
    if (role !== 'stage' && role !== 'remote') return c.json({ error: 'role must be stage or remote' }, 400);

    let channel = channels.get(token);
    if (!channel) {
      // Only a stage opens a channel, so a phone with a stale or guessed token gets nowhere.
      if (role !== 'stage') return c.json({ error: 'No stage is using this token' }, 404);
      if (channels.size >= MAX_CHANNELS) return c.json({ error: 'Too many remotes in use' }, 503);
      channel = { position: null, listeners: new Set() };
      channels.set(token, channel);
    }
    if (channel.listeners.size >= MAX_LISTENERS) return c.json({ error: 'Too many devices on this token' }, 503);
    const joined = channel;

    c.header('X-Accel-Buffering', 'no');
    return streamSSE(c, async (stream) => {
      const listener: Listener = {
        role,
        send: (event, data) => void stream.writeSSE({ event, data }).catch(() => undefined),
      };
      const leave = () => {
        if (!joined.listeners.delete(listener)) return;
        if (joined.listeners.size === 0) channels.delete(token);
        else presence(joined);
      };
      stream.onAbort(leave);

      joined.listeners.add(listener);
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
    broadcast(channel, 'position', channel.position, 'remote');
    return c.json({ ok: true });
  });

  remote.post('/:token/command', async (c) => {
    const channel = existing(c);
    if (!channel) return c.json({ error: 'Unknown token' }, 404);
    const body: unknown = await c.req.json().catch(() => null);
    const action = (body as { action?: unknown } | null)?.action;
    if (typeof action !== 'string' || !(ACTIONS as readonly string[]).includes(action)) {
      return c.json({ error: 'action must be next, previous or goto' }, 400);
    }
    if (action === 'goto') {
      const position = parsePosition(body);
      if (!position) return c.json({ error: 'goto needs { scene, step }' }, 400);
      broadcast(channel, 'command', JSON.stringify({ action, ...position }), 'stage');
    } else {
      broadcast(channel, 'command', JSON.stringify({ action }), 'stage');
    }
    return c.json({ ok: true });
  });

  return remote;
}
