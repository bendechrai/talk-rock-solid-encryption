/**
 * Which browsers may use the demos.
 *
 * Every browser that opens the talk is given a device id, in a cookie, on its first page load.
 * The first one to open the stage itself becomes the presenter's device. From then on the demo
 * endpoints answer only the presenter's devices and any device the presenter has let in, so a
 * room full of people following along cannot write into the chat on stage.
 *
 * Until a stage has been opened nothing is locked: a fresh checkout behaves as it always did.
 *
 * This guards who may use the demo at all. It is deliberately not part of the demo: inside it,
 * the chat endpoints still answer whoever asks, which is the point they are there to make.
 *
 * The record is kept next to the database so a restart does not hand the stage to whoever
 * reloads first. Beside it is a stage key, made on first start. Anyone who can read that file
 * can make their browser a presenter's device as well: that is how the audit scripts get in,
 * and how to move to another laptop.
 */
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { Hono, type Context } from 'hono';
import { getCookie, setCookie } from 'hono/cookie';

const COOKIE = 'talk_device';
const ID = /^[A-Za-z0-9_-]{43}$/;
const KINDS = ['stage', 'presenter', 'audience'] as const;
type Kind = (typeof KINDS)[number];

interface Saved {
  key: string;
  /** Hashes of the presenter's device ids. The ids themselves are never written down. */
  owners: string[];
  /** Hashes of the devices the presenter has let into the demos. */
  allowed: string[];
  /** True when the presenter has opened the demos to everyone. */
  open: boolean;
}

interface Seen {
  kind: Kind;
  label: string;
  /** Open event streams, by role. */
  streams: Map<string, number>;
}

export interface DeviceInfo {
  id: string;
  kind: Kind;
  label: string;
  /** What it is connected as right now: stage, remote (a notes window or phone), audience. */
  connected: string[];
  owner: boolean;
  demos: boolean;
  you: boolean;
}

const hash = (id: string) => createHash('sha256').update(id).digest('base64url');
/** The short name the presenter's panel uses for a device. It cannot be turned back into the id. */
const publicId = (hashed: string) => hashed.slice(0, 16);

/** "Safari on iPhone", near enough, for telling devices apart in a list. */
function describe(userAgent: string): string {
  const system = /iPhone/.test(userAgent) ? 'iPhone' : /iPad/.test(userAgent) ? 'iPad' : /Android/.test(userAgent) ? 'Android'
    : /Mac OS X/.test(userAgent) ? 'Mac' : /Windows/.test(userAgent) ? 'Windows' : /Linux/.test(userAgent) ? 'Linux' : 'Unknown device';
  const browser = /Edg\//.test(userAgent) ? 'Edge' : /Firefox\//.test(userAgent) ? 'Firefox' : /Chrome\//.test(userAgent) ? 'Chrome'
    : /Safari\//.test(userAgent) ? 'Safari' : 'Browser';
  return `${browser} on ${system}`;
}

export class Devices {
  private saved: Saved;
  /** Devices met since this process started, by the hash of their id. */
  private readonly seen = new Map<string, Seen>();

  /** Pass no path for a record that lives only in memory (used by tests). */
  constructor(private readonly path?: string) {
    this.saved = this.load();
    this.persist();
  }

  private load(): Saved {
    const fresh: Saved = { key: randomBytes(32).toString('base64url'), owners: [], allowed: [], open: false };
    if (this.path && existsSync(this.path)) {
      try {
        return { ...fresh, ...(JSON.parse(readFileSync(this.path, 'utf8')) as Partial<Saved>) };
      } catch (error) {
        console.error(`Could not read ${this.path}; starting with no presenter's device.`, error);
      }
    }
    return fresh;
  }

  private persist(): void {
    if (!this.path) return;
    mkdirSync(dirname(this.path), { recursive: true });
    writeFileSync(this.path, JSON.stringify(this.saved, null, 2), { mode: 0o600 });
  }

  /** The hash of the caller's device id, if it has one. */
  private who(c: Context): string | null {
    const id = getCookie(c, COOKIE);
    return id && ID.test(id) ? hash(id) : null;
  }

  private meet(c: Context, hashed: string, kind?: Kind): Seen {
    let device = this.seen.get(hashed);
    if (!device) {
      device = { kind: kind ?? 'audience', label: describe(c.req.header('user-agent') ?? ''), streams: new Map() };
      this.seen.set(hashed, device);
    } else if (kind === 'stage' || (kind === 'presenter' && device.kind === 'audience')) {
      // One browser can be several things at once; show it as the most senior.
      device.kind = kind;
    }
    return device;
  }

  private isOwner(hashed: string | null): boolean {
    return hashed !== null && this.saved.owners.includes(hashed);
  }

  private mayDemo(hashed: string | null): boolean {
    if (this.saved.owners.length === 0 || this.saved.open) return true;
    return hashed !== null && (this.saved.owners.includes(hashed) || this.saved.allowed.includes(hashed));
  }

  /** Whether the caller may use the demo endpoints. */
  allows(c: Context): boolean {
    return this.mayDemo(this.who(c));
  }

  /** Note that the caller has an event stream open, for the presenter's list. Returns the undo. */
  connect(c: Context, role: string): () => void {
    const hashed = this.who(c);
    if (!hashed) return () => undefined;
    const { streams } = this.meet(c, hashed);
    streams.set(role, (streams.get(role) ?? 0) + 1);
    return () => {
      const left = (streams.get(role) ?? 1) - 1;
      if (left > 0) streams.set(role, left);
      else streams.delete(role);
    };
  }

  private status(hashed: string) {
    return { id: publicId(hashed), owner: this.isOwner(hashed), demos: this.mayDemo(hashed) };
  }

  routes(): Hono {
    const routes = new Hono();

    // Called by every copy of the talk as it loads, before anything else.
    routes.post('/', async (c) => {
      const body: unknown = await c.req.json().catch(() => null);
      const asked = (body as { kind?: unknown } | null)?.kind;
      const kind = KINDS.find((k) => k === asked) ?? 'audience';

      let hashed = this.who(c);
      if (!hashed) {
        const id = randomBytes(32).toString('base64url');
        // Not readable by the page's own scripts, and sent only to this site.
        setCookie(c, COOKIE, id, { httpOnly: true, sameSite: 'Lax', path: '/', maxAge: 60 * 60 * 24 * 365 });
        hashed = hash(id);
      }
      this.meet(c, hashed, kind);
      // The first browser to open the stage is the presenter's.
      if (kind === 'stage' && this.saved.owners.length === 0) {
        this.saved.owners.push(hashed);
        this.persist();
      }
      return c.json(this.status(hashed));
    });

    routes.get('/', (c) => {
      const hashed = this.who(c);
      return c.json(hashed ? this.status(hashed) : { id: null, owner: false, demos: this.mayDemo(null) });
    });

    // Whoever holds the stage key makes this browser a presenter's device too.
    routes.post('/claim', async (c) => {
      const hashed = this.who(c);
      const body: unknown = await c.req.json().catch(() => null);
      const key = (body as { key?: unknown } | null)?.key;
      const given = Buffer.from(typeof key === 'string' ? key : '');
      const wanted = Buffer.from(this.saved.key);
      if (!hashed || given.length !== wanted.length || !timingSafeEqual(given, wanted)) return c.json({ error: 'Not accepted' }, 403);
      if (!this.saved.owners.includes(hashed)) {
        this.saved.owners.push(hashed);
        this.persist();
      }
      return c.json(this.status(hashed));
    });

    // Everything below is for the presenter's devices only.
    routes.use('/all/*', async (c, next) => (this.isOwner(this.who(c)) ? next() : c.json({ error: 'Presenter only' }, 403)));
    routes.use('/all', async (c, next) => (this.isOwner(this.who(c)) ? next() : c.json({ error: 'Presenter only' }, 403)));

    routes.get('/all', (c) => {
      const me = this.who(c);
      const devices: DeviceInfo[] = [];
      for (const [hashed, device] of this.seen) {
        const connected = [...device.streams.keys()];
        const owner = this.isOwner(hashed);
        const chosen = this.saved.allowed.includes(hashed);
        // Devices that have gone away drop off the list, unless they have been given something.
        if (connected.length === 0 && !owner && !chosen) continue;
        devices.push({ id: publicId(hashed), kind: device.kind, label: device.label, connected, owner, demos: this.mayDemo(hashed), you: hashed === me });
      }
      return c.json({ open: this.saved.open, devices });
    });

    routes.post('/all/open', async (c) => {
      const body: unknown = await c.req.json().catch(() => null);
      this.saved.open = (body as { open?: unknown } | null)?.open === true;
      this.persist();
      return c.json({ ok: true });
    });

    routes.post('/all/:id', async (c) => {
      const hashed = [...this.seen.keys()].find((h) => publicId(h) === c.req.param('id'));
      if (!hashed) return c.json({ error: 'No such device' }, 404);
      const body: unknown = await c.req.json().catch(() => null);
      const demos = (body as { demos?: unknown } | null)?.demos === true;
      this.saved.allowed = this.saved.allowed.filter((h) => h !== hashed);
      if (demos) this.saved.allowed.push(hashed);
      this.persist();
      return c.json({ ok: true });
    });

    return routes;
  }
}
