import { useCallback, useEffect, useRef, useState } from 'react';
import { listen, newToken, sendPosition, type RemoteCommand, type RemotePosition } from './link.ts';

/** Kept for the life of the tab, so reloading the stage does not unpair the phone. */
const STORED = 'talk:remote-token';

function stored(): string | null {
  try {
    return sessionStorage.getItem(STORED);
  } catch {
    return null;
  }
}

function store(token: string | null): void {
  try {
    if (token) sessionStorage.setItem(STORED, token);
    else sessionStorage.removeItem(STORED);
  } catch {
    // Without storage the pairing simply does not survive a reload.
  }
}

export interface StageRemote {
  /** Null until the presenter asks for a remote. */
  token: string | null;
  /** How many phones are listening. */
  remotes: number;
  /** Make a token if there is none. */
  pair: () => void;
  /** Throw the token away and make a new one, cutting off any phone that had the old one. */
  renew: () => void;
}

/**
 * The stage's end of the remote. It reports where the talk is and obeys commands from a phone.
 * Nothing is opened until `pair` is called, so a talk given without a phone never connects.
 */
export function useStageRemote(position: RemotePosition, onCommand: (command: RemoteCommand) => void): StageRemote {
  const [token, setToken] = useState(stored);
  const [remotes, setRemotes] = useState(0);
  const latest = useRef({ position, onCommand });
  latest.current = { position, onCommand };
  /** The channel is made when the stream opens; a report sent before that has nowhere to go. */
  const connected = useRef(false);

  useEffect(() => {
    if (!token) return;
    const stop = listen(token, 'stage', {
      onConnected: (value) => {
        connected.current = value;
        if (value) sendPosition(token, latest.current.position);
        else setRemotes(0);
      },
      onPresence: (presence) => setRemotes(presence.remotes),
      onCommand: (command) => latest.current.onCommand(command),
    });
    return () => {
      stop();
      connected.current = false;
      setRemotes(0);
    };
  }, [token]);

  useEffect(() => {
    if (token && connected.current) sendPosition(token, { scene: position.scene, step: position.step });
  }, [token, position.scene, position.step]);

  const renew = useCallback(() => {
    const next = newToken();
    store(next);
    setToken(next);
  }, []);

  const pair = useCallback(() => {
    if (!stored()) renew();
  }, [renew]);

  return { token, remotes, pair, renew };
}
