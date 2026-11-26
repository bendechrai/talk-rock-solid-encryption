/**
 * The line between the stage and a presenter's phone. Both sides open an event stream on the
 * server named after a random token; see `server/src/remote.ts` for the relay.
 */

export interface RemotePosition {
  /** A scene id, as in the address bar. */
  scene: string;
  step: number;
}

export type RemoteCommand = { action: 'next' } | { action: 'previous' } | { action: 'goto'; scene: string; step: number };

export interface Presence {
  stages: number;
  remotes: number;
}

export type Role = 'stage' | 'remote';

const PARAM = 'remote';

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
