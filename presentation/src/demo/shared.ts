/**
 * What a demo is showing, shared between every window of the talk open in this browser.
 *
 * The presenter can drive a demo from the notes window on the laptop while the room watches the
 * stage on the projector. Messages and keys already agree between the two (the server holds one,
 * local storage the other); this carries the rest: which user each phone is, which chat is open,
 * what has been typed, which tab of the server view is showing and how far it is scrolled.
 *
 * `useShared` is `useState` whose value every window sees. Values live for as long as any window
 * is open, so a demo also keeps its place when the talk moves away and comes back.
 */
import { createContext, useCallback, useContext, useEffect, useRef, useSyncExternalStore } from 'react';

type Message =
  | { type: 'set'; key: string; value: unknown }
  | { type: 'scroll'; key: string; top: number }
  | { type: 'hello' }
  | { type: 'all'; values: [string, unknown][] };

const values = new Map<string, unknown>();
const listeners = new Set<() => void>();
const scrollers = new Map<string, (top: number) => void>();
const channel = typeof BroadcastChannel === 'undefined' ? null : new BroadcastChannel('whisper:demo-view');

const changed = () => listeners.forEach((listener) => listener());
const post = (message: Message) => channel?.postMessage(message);

channel?.addEventListener('message', (event: MessageEvent<Message>) => {
  const message = event.data;
  if (message.type === 'set') {
    values.set(message.key, message.value);
    changed();
  } else if (message.type === 'scroll') {
    scrollers.get(message.key)?.(message.top);
  } else if (message.type === 'hello') {
    // A window that has just opened asks what the others are showing.
    if (values.size > 0) post({ type: 'all', values: [...values] });
  } else {
    message.values.forEach(([key, value]) => values.set(key, value));
    changed();
  }
});
post({ type: 'hello' });

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Names what a piece of shared state belongs to: a demo, then a phone or the server view in it. */
export const Scope = createContext('demo');

export function useShared<T>(name: string, initial: T): [T, (next: T | ((current: T) => T)) => void] {
  const key = `${useContext(Scope)}/${name}`;
  const first = useRef(initial).current;
  const read = useCallback(() => (values.has(key) ? (values.get(key) as T) : first), [key, first]);
  const value = useSyncExternalStore(subscribe, read);
  const set = useCallback((next: T | ((current: T) => T)) => {
    const resolved = typeof next === 'function' ? (next as (current: T) => T)(read()) : next;
    values.set(key, resolved);
    changed();
    post({ type: 'set', key, value: resolved });
  }, [key, read]);
  return [value, set];
}

/**
 * Keep a scrolling element at the same place in every window. Positions are in stage pixels,
 * which are the same in each window however large it is drawn.
 */
export function useSharedScroll<E extends HTMLElement>(name: string): (element: E | null) => void {
  const key = `${useContext(Scope)}/${name}`;
  const detach = useRef<() => void>(undefined);
  useEffect(() => () => detach.current?.(), []);

  return useCallback((element: E | null) => {
    detach.current?.();
    detach.current = undefined;
    if (!element) return;
    /** Where another window last put this element, so that move is not sent straight back. */
    let applied = -1;
    const onScroll = () => {
      if (Math.abs(element.scrollTop - applied) < 2) return;
      applied = -1;
      post({ type: 'scroll', key, top: element.scrollTop });
    };
    scrollers.set(key, (top) => {
      applied = top;
      element.scrollTop = top;
    });
    element.addEventListener('scroll', onScroll, { passive: true });
    detach.current = () => {
      element.removeEventListener('scroll', onScroll);
      scrollers.delete(key);
    };
  }, [key]);
}
