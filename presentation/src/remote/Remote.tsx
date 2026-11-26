import { useEffect, useMemo, useState } from 'react';
import type { Scene } from '../engine/types.ts';
import { listen, sendCommand, type Presence, type RemotePosition } from './link.ts';
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

/** The presenter's phone: the note for what is on stage, what comes next, a timer, and two big buttons. */
export function Remote({ scenes, token }: { scenes: Scene[]; token: string }) {
  const [position, setPosition] = useState<RemotePosition | null>(null);
  const [presence, setPresence] = useState<Presence>({ stages: 0, remotes: 0 });
  const [connected, setConnected] = useState(false);
  const timer = useTimer();
  useAwake();

  useEffect(() => {
    document.title = 'Remote: Rock-Solid Encrypted Applications';
    return listen(token, 'remote', {
      onConnected: (value) => {
        setConnected(value);
        if (!value) setPresence({ stages: 0, remotes: 0 });
      },
      onPosition: setPosition,
      onPresence: setPresence,
    });
  }, [token]);

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
    ? { label: 'Next click', note: scene.steps[step]?.notes }
    : index < scenes.length - 1
      ? { label: `Next: ${scenes[index + 1].title}`, note: scenes[index + 1].notes }
      : undefined);
  const isDemo = scene?.id.startsWith('demo-') ?? false;
  const done = scene ? (clicks.before[index] + step + 1) / clicks.total : 0;

  const status = !connected ? 'Connecting' : !live ? 'Waiting for the stage' : 'Connected';

  return (
    <main className="remote">
      <header className="remote-top">
        <span className={live ? 'remote-status live' : 'remote-status'}>{status}</span>
        <button type="button" className="remote-timer" onClick={() => { if (timer.elapsed !== null && window.confirm('Reset the timer?')) timer.reset(); }}>
          {timer.elapsed === null ? '0:00' : clock(timer.elapsed)}
        </button>
      </header>
      <div className="remote-progress" aria-hidden="true"><div style={{ width: `${done * 100}%` }} /></div>

      <section className="remote-notes">
        {scene ? (
          <>
            <p className="remote-where">
              {scene.title}
              <span>{index + 1}/{scenes.length} - {step}/{scene.steps.length}</span>
            </p>
            {isDemo && <p className="remote-demo">Live demo: drive it on the laptop.</p>}
            <p className="remote-note">{note ?? 'No notes for this step.'}</p>
            {following && (
              <div className="remote-following">
                <h2>{following.label}</h2>
                <p>{following.note ?? 'No notes.'}</p>
              </div>
            )}
          </>
        ) : (
          <p className="remote-note">
            {live ? 'Waiting to hear where the talk is.' : 'Open the talk on the presenting computer and press R. If you made a new code there, scan it again.'}
          </p>
        )}
      </section>

      <footer className="remote-buttons">
        <button type="button" className="remote-back" disabled={!live} onClick={() => sendCommand(token, { action: 'previous' })}>
          Back
        </button>
        <button type="button" className="remote-next" disabled={!live} onClick={() => { timer.start(); sendCommand(token, { action: 'next' }); }}>
          Next
        </button>
      </footer>
    </main>
  );
}
