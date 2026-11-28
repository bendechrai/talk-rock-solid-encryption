import { useCallback, useEffect, useState } from 'react';
import { devices, type ListedDevice } from './device.ts';

const ROLE: Record<string, string> = { stage: 'stage', remote: 'notes', audience: 'following' };

/** What a device is doing right now, in a few words. */
function doing(device: ListedDevice): string {
  if (device.connected.length === 0) return 'not connected';
  return device.connected.map((role) => ROLE[role] ?? role).join(', ');
}

/**
 * The presenter's list of every screen connected to the talk, with a switch for each: a
 * placeholder in place of the demos, or the demos themselves. The presenter's own devices always
 * have them.
 */
export function Devices({ onClose }: { onClose: () => void }) {
  const [list, setList] = useState<{ open: boolean; devices: ListedDevice[] } | null>(null);

  const refresh = useCallback(async () => {
    const latest = await devices.list();
    if (latest) setList(latest);
  }, []);
  useEffect(() => {
    void refresh();
    const timer = window.setInterval(refresh, 2000);
    return () => window.clearInterval(timer);
  }, [refresh]);

  // Show a switch as flipped at once; the server's answer follows within a moment.
  const setOpen = (open: boolean) => {
    setList((current) => current && { ...current, open });
    void devices.open(open).then(refresh);
  };
  const allow = (id: string, demos: boolean) => {
    setList((current) => current && { ...current, devices: current.devices.map((d) => (d.id === id ? { ...d, demos } : d)) });
    void devices.allow(id, demos).then(refresh);
  };

  const order = (device: ListedDevice) => (device.owner ? 0 : device.kind === 'presenter' ? 1 : 2);
  const shown = [...(list?.devices ?? [])].sort((a, b) => order(a) - order(b) || a.label.localeCompare(b.label));

  return (
    <aside className="remote-devices" role="dialog" aria-label="Connected screens">
      <header>
        <h2>Connected screens</h2>
        <button type="button" onClick={onClose}>Close</button>
      </header>
      {!list ? <p>Asking the server...</p> : (
        <>
          <label className="remote-device everyone">
            <span><strong>Everyone</strong><small>Open the demos to every screen, listed or not</small></span>
            <input type="checkbox" checked={list.open} onChange={(event) => setOpen(event.target.checked)} />
          </label>
          <ul>
            {shown.map((device) => (
              <li key={device.id}>
                <label className="remote-device">
                  <span>
                    <strong>{device.label}{device.you ? ' (this one)' : ''}</strong>
                    <small>{device.owner ? 'yours' : device.kind === 'presenter' ? 'paired' : 'audience'} - {doing(device)}</small>
                  </span>
                  <input
                    type="checkbox"
                    aria-label={`Demos on ${device.label}`}
                    checked={device.demos}
                    disabled={device.owner || list.open}
                    onChange={(event) => allow(device.id, event.target.checked)}
                  />
                </label>
              </li>
            ))}
          </ul>
          <p>On: the live demos. Off: a "Live demo" placeholder, and the server refuses that screen's demo requests.</p>
        </>
      )}
    </aside>
  );
}
