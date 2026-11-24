import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Call `load` now and then every `interval` milliseconds. Returns the latest result and a
 * function to refresh immediately (after sending a message, say).
 */
export function usePolling<T>(load: () => Promise<T>, interval = 1000): { data: T | undefined; refresh: () => void } {
  const [data, setData] = useState<T>();
  const latest = useRef(load);
  latest.current = load;
  const last = useRef('');
  /** Bumped whenever `load` changes, so a slow response for the old question is ignored. */
  const generation = useRef(0);

  const refresh = useCallback(() => {
    const mine = generation.current;
    latest.current().then(
      (value) => {
        if (mine !== generation.current) return;
        // Skip the re-render when nothing changed.
        const serialised = JSON.stringify(value);
        if (serialised !== last.current) {
          last.current = serialised;
          setData(value);
        }
      },
      () => undefined, // The server may be restarting; keep showing what we have and try again.
    );
  }, []);

  useEffect(() => {
    generation.current += 1;
    last.current = '';
    setData(undefined);
    refresh();
    const timer = window.setInterval(refresh, interval);
    return () => window.clearInterval(timer);
    // `load` is expected to be wrapped in useCallback by the caller.
  }, [load, interval, refresh]);

  return { data, refresh };
}
