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
  /** How many phones and notes windows are listening. */
  remotes: number;
  /** The token the audience follows on. Null until the stage is connected. */
  follow: string | null;
  /** How many people are following along. */
  audience: number;
  /** Make a token if there is none, and return the one in use. */
  pair: () => string;
  /** Throw the token away and make a new one, cutting off any phone that had the old one. */
  renew: () => string;
}

/**
 * The stage's end of the remote. It reports where the talk is and obeys commands from a phone.
 * Nothing is opened until `pair` is called, so a talk given without a phone never connects.
 * A copy of the talk that is not the stage (a follower's, or the one inside the notes window)
 * passes `enabled: false` and never connects at all.
 */
export function useStageRemote(position: RemotePosition, onCommand: (command: RemoteCommand) => void, enabled = true): StageRemote {
  const [token, setToken] = useState(stored);
  const [remotes, setRemotes] = useState(0);
  const [audience, setAudience] = useState(0);
  const [follow, setFollow] = useState<string | null>(null);
  const latest = useRef({ position, onCommand });
  latest.current = { position, onCommand };
  /** The channel is made when the stream opens; a report sent before that has nowhere to go. */
  const connected = useRef(false);
  /** The token in use, readable in the same keypress that made it. */
  const inUse = useRef(token);

  useEffect(() => {
    if (!token || !enabled) return;
    const stop = listen(token, 'stage', {
      onConnected: (value) => {
        connected.current = value;
        if (value) sendPosition(token, latest.current.position);
        else setRemotes(0);
      },
      onPresence: (presence) => {
        setRemotes(presence.remotes);
        setAudience(presence.audience);
      },
      onFollow: setFollow,
      onCommand: (command) => latest.current.onCommand(command),
    });
    return () => {
      stop();
      connected.current = false;
      setRemotes(0);
      setAudience(0);
      setFollow(null);
    };
  }, [token, enabled]);

  useEffect(() => {
    if (token && connected.current) sendPosition(token, latest.current.position);
  }, [token, position.scene, position.step, position.audienceCode]);

  const renew = useCallback(() => {
    const next = newToken();
    store(next);
    inUse.current = next;
    setToken(next);
    return next;
  }, []);

  const pair = useCallback(() => inUse.current ?? renew(), [renew]);

  return { token, remotes, follow, audience, pair, renew };
}
