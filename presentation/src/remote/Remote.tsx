import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Deck } from '../engine/Deck.tsx';
import type { Scene } from '../engine/types.ts';
import { listen, onlyLocal, sendCommand, type Presence, type RemotePosition } from './link.ts';
import { QrCode } from './QrCode.tsx';
import { withoutDemos } from '../scenes/watchDemo.tsx';
import { useDevice } from './device.ts';
import { Devices } from './Devices.tsx';
import './remote.css';

const TIMER = 'talk:remote-timer';

function storedStart(): number | null {
  try {
    const value = Number(sessionStorage.getItem(TIMER));
    return value > 0 ? value : null;
  } catch {
    return null;
  }
}

function clock(milliseconds: number): string {
  const total = Math.max(0, Math.floor(milliseconds / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = String(total % 60).padStart(2, '0');
  return hours > 0 ? `${hours}:${String(minutes).padStart(2, '0')}:${seconds}` : `${minutes}:${seconds}`;
}

/** A phone left on a lectern should not go dark between clicks. */
function useAwake(): void {
  useEffect(() => {
    if (!('wakeLock' in navigator)) return;
    let lock: WakeLockSentinel | undefined;
    const request = () => {
      if (document.visibilityState !== 'visible') return;
      navigator.wakeLock.request('screen').then((sentinel) => { lock = sentinel; }, () => undefined);
    };
    request();
    document.addEventListener('visibilitychange', request);
    return () => {
      document.removeEventListener('visibilitychange', request);
      void lock?.release().catch(() => undefined);
    };
  }, []);
}

/** Time since the first "Next", so the clock starts with the talk and not with the pairing. */
function useTimer(): { elapsed: number | null; start: () => void; reset: () => void } {
  const [startedAt, setStartedAt] = useState(storedStart);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (startedAt === null) return;
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [startedAt]);

  const set = (value: number | null) => {
    try {
      if (value === null) sessionStorage.removeItem(TIMER);
      else sessionStorage.setItem(TIMER, String(value));
    } catch {
      // Without storage the timer simply restarts if the page is reloaded.
    }
    setStartedAt(value);
  };

  return {
    elapsed: startedAt === null ? null : now - startedAt,
    start: () => { if (startedAt === null) set(Date.now()); },
    reset: () => set(null),
  };
}

/** The presenter's phone, or a notes window on the presenting computer: the note for what is on stage, what comes next, a timer, and two big buttons. */
export function Remote({ scenes, token }: { scenes: Scene[]; token: string }) {
  const [position, setPosition] = useState<RemotePosition | null>(null);
  const [presence, setPresence] = useState<Presence>({ stages: 0, remotes: 0, audience: 0 });
  const [connected, setConnected] = useState(false);
  const [pairing, setPairing] = useState(false);
  const [listing, setListing] = useState(false);
  const device = useDevice();
  /** Showing the slide itself, filling the window, in place of the notes. */
  const [maximised, setMaximised] = useState(false);
  const restore = useRef<{ width: number; height: number; left: number; top: number } | null>(null);

  // The notes window opens small. Showing the slide takes the whole screen, and gives it back after.
  // Only a window the stage opened may be resized; a phone, or a tab, is left alone.
  const maximise = useCallback((on: boolean) => {
    setMaximised(on);
    if (!window.opener) return;
    try {
      if (on) {
        restore.current = { width: window.outerWidth, height: window.outerHeight, left: window.screenX, top: window.screenY };
        // Where this screen starts, so the window stays on the laptop and does not jump to the
        // projector. Not every browser says; one that does not is resized where it stands.
        const { availLeft, availTop } = window.screen as Screen & { availLeft?: number; availTop?: number };
        if (availLeft !== undefined && availTop !== undefined) window.moveTo(availLeft, availTop);
        window.resizeTo(window.screen.availWidth, window.screen.availHeight);
      } else if (restore.current) {
        window.resizeTo(restore.current.width, restore.current.height);
        window.moveTo(restore.current.left, restore.current.top);
        restore.current = null;
      }
    } catch {
      // A browser that refuses leaves the window as it is; it can be resized by hand.
    }
  }, []);
  const timer = useTimer();
  const { start } = timer;
  useAwake();

  useEffect(() => {
    document.title = 'Remote: Rock-Solid Encrypted Applications';
    return listen(token, 'remote', {
      onConnected: (value) => {
        setConnected(value);
        if (!value) setPresence({ stages: 0, remotes: 0, audience: 0 });
      },
      onPosition: setPosition,
      onPresence: setPresence,
    });
  }, [token]);

  // Opened as a notes window on the presenting computer, it has the keyboard, and a clicker's
  // presses land here rather than on the stage. Pass them on. While the slide fills the window
  // the keyboard belongs to the demo: only a clicker's own keys still turn the page, and Escape
  // brings the notes back.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (maximised) {
        if (event.key === 'Escape') maximise(false);
        else if (event.key === 'PageDown') sendCommand(token, { action: 'next' });
        else if (event.key === 'PageUp') sendCommand(token, { action: 'previous' });
        else return;
        event.preventDefault();
        return;
      }
      const onButton = event.target instanceof HTMLButtonElement;
      // Typing into the demo on the current slide: only a clicker's own keys turn the page.
      const typing = event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement;
      if (typing && event.key !== 'PageDown' && event.key !== 'PageUp') return;
      switch (event.key) {
        case 'PageDown': case 'ArrowRight': start(); sendCommand(token, { action: 'next' }); break;
        case 'PageUp': case 'ArrowLeft': case 'Backspace': sendCommand(token, { action: 'previous' }); break;
        case ' ': case 'Enter': if (onButton) return; start(); sendCommand(token, { action: 'next' }); break;
        default: return;
      }
      event.preventDefault();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [token, start, maximised, maximise]);

  /** How many clicks come before each scene, and how many the whole talk has. */
  const clicks = useMemo(() => {
    const before: number[] = [];
    let total = 0;
    for (const scene of scenes) {
      before.push(total);
      total += scene.steps.length + 1;
    }
    return { before, total };
  }, [scenes]);

  const live = connected && presence.stages > 0;
  const index = position ? scenes.findIndex((scene) => scene.id === position.scene) : -1;
  const scene = index === -1 ? undefined : scenes[index];
  const step = position?.step ?? 0;

  const note = scene && (step === 0 ? scene.notes : scene.steps[step - 1]?.notes);
  const following = scene && (step < scene.steps.length
    ? { label: 'Next click', note: scene.steps[step]?.notes, position: { scene: scene.id, step: step + 1 } }
    : index < scenes.length - 1
      ? { label: `Next: ${scenes[index + 1].title}`, note: scenes[index + 1].notes, position: { scene: scenes[index + 1].id, step: 0 } }
      : undefined);
  // The demos are live where the presenter allows them: always in the presenter's own browser,
  // and on a paired phone once it is switched on in "Screens". Only a window the stage opened
  // shares what its demo shows with the stage; a phone's copy is its own.
  const local = window.opener !== null;
  const shown = useMemo(() => (device.demos ? scenes : withoutDemos(scenes)), [device.demos, scenes]);
  const isDemo = scene?.id.startsWith('demo-') ?? false;
  const done = scene ? (clicks.before[index] + step + 1) / clicks.total : 0;

  const status = !connected ? 'Connecting' : !live ? 'Waiting for the stage' : 'Connected';

  return (
    <main className={maximised ? 'remote maximised' : 'remote'}>
      <header className="remote-top">
        <span className={live ? 'remote-status live' : 'remote-status'}>{status}</span>
        <button type="button" className="remote-timer" onClick={() => { if (timer.elapsed !== null && window.confirm('Reset the timer?')) timer.reset(); }}>
          {timer.elapsed === null ? '0:00' : clock(timer.elapsed)}
        </button>
      </header>
      <div className="remote-progress" aria-hidden="true"><div style={{ width: `${done * 100}%` }} /></div>
      <div className="remote-tools">
        <button type="button" disabled={!scene} onClick={() => maximise(true)}>Maximise slide</button>
        <button type="button" onClick={() => setPairing(true)}>Pair a phone</button>
        {device.owner && <button type="button" onClick={() => setListing(true)}>Screens</button>}
        <button
          type="button"
          className={position?.audienceCode ? 'on' : undefined}
          aria-pressed={position?.audienceCode ?? false}
          disabled={!live}
          onClick={() => sendCommand(token, { action: 'audience-code' })}
        >
          {position?.audienceCode ? 'Hide audience code' : 'Show audience code'}
        </button>
        {presence.audience > 0 && <span>{presence.audience} following</span>}
      </div>

      {scene ? (
        <div className="remote-view">
          <figure className="remote-slide remote-current">
            <Deck scenes={shown} mirror={position} />
          </figure>
          <section className="remote-notes">
            <p className="remote-where">
              {scene.title}
              <span>{index + 1}/{scenes.length} - {step}/{scene.steps.length}</span>
            </p>
            {isDemo && <p className="remote-demo">{local && device.demos ? 'Live demo: maximise the slide to drive it from here.' : 'Live demo: drive it on the laptop.'}</p>}
            <p className="remote-note">{note ?? 'No notes for this step.'}</p>
          </section>
          {following && (
            <section className="remote-following">
              <figure className="remote-slide remote-next" aria-hidden="true">
                <Deck scenes={shown} mirror={following.position} still />
              </figure>
              <div>
                <h2>{following.label}</h2>
                <p>{following.note ?? 'No notes.'}</p>
              </div>
            </section>
          )}
        </div>
      ) : (
        <div className="remote-view">
          <section className="remote-notes">
            <p className="remote-note">
              {live ? 'Waiting to hear where the talk is.' : 'Open the talk on the presenting computer and press S for the notes window. If the stage was opened afresh, pair this phone again from there.'}
            </p>
          </section>
        </div>
      )}

      {maximised && (
        <button type="button" className="remote-restore" onClick={() => maximise(false)}>Notes (Esc)</button>
      )}

      <footer className="remote-buttons">
        <button type="button" className="remote-back" disabled={!live} onClick={() => sendCommand(token, { action: 'previous' })}>
          Back
        </button>
        <button type="button" className="remote-next" disabled={!live} onClick={() => { timer.start(); sendCommand(token, { action: 'next' }); }}>
          Next
        </button>
      </footer>

      {listing && <Devices onClose={() => setListing(false)} />}
      {pairing && (
        <aside className="remote-pairing">
          <QrCode text={window.location.href} />
          <p>Scan this with your phone for the same notes, timer and buttons.</p>
          {onlyLocal() && <p className="warning">This address only works on this computer. Open the talk by a name or address your phone can reach.</p>}
          <p className="warning">Anyone who scans this can drive the slides. Keep this window off the projector.</p>
          <button type="button" onClick={() => setPairing(false)}>Close</button>
        </aside>
      )}
    </main>
  );
}
