/**
 * This browser, as the server knows it. Every copy of the talk registers as it loads, before it
 * draws anything: the first stage to do so becomes the presenter's device, and only the
 * presenter's devices, and those the presenter lets in, may use the demos. See
 * `server/src/devices.ts`.
 */
import { useEffect, useState } from 'react';

export type Kind = 'stage' | 'presenter' | 'audience';

export interface Device {
  /** True on the presenter's own devices. */
  owner: boolean;
  /** True when this browser may use the demos. */
  demos: boolean;
}

export interface ListedDevice extends Device {
  id: string;
  kind: Kind;
  label: string;
  connected: string[];
  you: boolean;
}

const KEY = 'stage-key';
// If the server cannot be asked, show the demos and let them say what is wrong.
let known: Device = { owner: false, demos: true };

async function send<T>(path: string, body?: unknown): Promise<T | null> {
  try {
    const response = await fetch(`/api/device${path}`, body === undefined ? undefined : {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    return response.ok ? ((await response.json()) as T) : null;
  } catch {
    return null;
  }
}

/** Register this browser. Call once, as the page loads. */
export async function registerDevice(kind: Kind): Promise<void> {
  known = (await send<Device>('', { kind })) ?? known;

  // Opened with the stage key in the address: make this a presenter's device, and take the key
  // back out of the address bar.
  const url = new URL(window.location.href);
  const key = url.searchParams.get(KEY);
  if (key === null) return;
  known = (await send<Device>('/claim', { key })) ?? known;
  url.searchParams.delete(KEY);
  window.history.replaceState(null, '', url);
}

/** What this browser may do, kept up to date: the presenter can change it at any time. */
export function useDevice(): Device {
  const [device, setDevice] = useState(known);
  useEffect(() => {
    const check = async () => {
      const latest = await send<Device>('');
      if (!latest) return;
      known = latest;
      setDevice((current) => (current.owner === latest.owner && current.demos === latest.demos ? current : latest));
    };
    const timer = window.setInterval(check, 4000);
    return () => window.clearInterval(timer);
  }, []);
  return device;
}

export const devices = {
  list: () => send<{ open: boolean; devices: ListedDevice[] }>('/all'),
  allow: (id: string, demos: boolean) => send('/all/' + id, { demos }),
  open: (open: boolean) => send('/all/open', { open }),
};
