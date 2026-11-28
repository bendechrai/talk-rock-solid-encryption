/**
 * The line between the stage and a presenter's phone. Both sides open an event stream on the
 * server named after a random token; see `server/src/remote.ts` for the relay. The audience can
 * follow on a second token that only listens.
 */

export interface RemotePosition {
  /** A scene id, as in the address bar. */
  scene: string;
  step: number;
  /** True while the stage is showing the room the code for following along. */
  audienceCode?: boolean;
}

export type RemoteCommand =
  | { action: 'next' }
  | { action: 'previous' }
  | { action: 'goto'; scene: string; step: number }
  /** Show or hide the code the audience scans to follow along. */
  | { action: 'audience-code' };

export interface Presence {
  stages: number;
  /** Phones and notes windows. */
  remotes: number;
  /** People following along. */
  audience: number;
}

export type Role = 'stage' | 'remote' | 'audience';

const PARAM = 'remote';
const FOLLOW = 'follow';

/** 192 random bits, written so they survive a URL. */
export function newToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  return btoa(String.fromCharCode(...bytes)).replaceAll('+', '-').replaceAll('/', '_');
}

/** The address a phone opens to become the remote for this token. */
export function remoteUrl(token: string): string {
  return `${window.location.origin}${window.location.pathname}?${PARAM}=${token}`;
}

export function tokenFromUrl(): string | null {
  return new URLSearchParams(window.location.search).get(PARAM);
}

/** The address the audience opens to follow the talk on their own screen. */
export function followUrl(follow: string): string {
  return `${window.location.origin}${window.location.pathname}?${FOLLOW}=${follow}`;
}

export function followFromUrl(): string | null {
  return new URLSearchParams(window.location.search).get(FOLLOW);
}

/** True when this page was opened by an address no other device can use. */
export function onlyLocal(): boolean {
  return ['localhost', '127.0.0.1', '[::1]'].includes(window.location.hostname);
}

function parse<T>(event: Event): T | null {
  try {
    return JSON.parse((event as MessageEvent<string>).data) as T;
  } catch {
    return null;
  }
}

export interface Handlers {
  onConnected?: (connected: boolean) => void;
  onPosition?: (position: RemotePosition) => void;
  onCommand?: (command: RemoteCommand) => void;
  onPresence?: (presence: Presence) => void;
  /** The stage is told the token its audience can follow on. */
  onFollow?: (follow: string) => void;
}

/**
 * Listen on a token until the returned function is called. The browser reconnects a dropped
 * stream by itself; a refused one (no stage has opened this token yet) is retried here.
 */
export function listen(token: string, role: Role, handlers: Handlers): () => void {
  let source: EventSource | undefined;
  let retry: number | undefined;
  let stopped = false;

  const open = () => {
    source = new EventSource(`/api/remote/${token}/events?role=${role}`);
    source.addEventListener('open', () => handlers.onConnected?.(true));
    source.addEventListener('position', (event) => {
      const position = parse<RemotePosition>(event);
      if (position) handlers.onPosition?.(position);
    });
    source.addEventListener('command', (event) => {
      const command = parse<RemoteCommand>(event);
      if (command) handlers.onCommand?.(command);
    });
    source.addEventListener('presence', (event) => {
      const presence = parse<Presence>(event);
      if (presence) handlers.onPresence?.(presence);
    });
    source.addEventListener('follow', (event) => {
      const follow = parse<{ token: string }>(event);
      if (follow) handlers.onFollow?.(follow.token);
    });
    source.addEventListener('error', () => {
      handlers.onConnected?.(false);
      if (stopped || source?.readyState !== EventSource.CLOSED) return;
      retry = window.setTimeout(open, 2000);
    });
  };
  open();

  return () => {
    stopped = true;
    window.clearTimeout(retry);
    source?.close();
  };
}

function post(token: string, what: 'position' | 'command', body: RemotePosition | RemoteCommand): void {
  // A lost message is not worth an error on stage: the next one carries the full state anyway.
  void fetch(`/api/remote/${token}/${what}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  }).catch(() => undefined);
}

export const sendPosition = (token: string, position: RemotePosition) => post(token, 'position', position);
export const sendCommand = (token: string, command: RemoteCommand) => post(token, 'command', command);
