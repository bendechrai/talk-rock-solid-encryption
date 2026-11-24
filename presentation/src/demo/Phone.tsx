/** One character's phone, running the Whisper chat app. */
import { useCallback, useEffect, useRef, useState, type CSSProperties, type FormEvent } from 'react';
import type { Conversation } from '@whisper/shared';
import { cast, castById, type Shape, type Who } from '../theme.ts';
import { api } from './api.ts';
import { keystore, useIdentity } from './keystore.ts';
import type { DisplayMessage, Protocol } from './protocols.ts';
import { usePolling } from './usePolling.ts';

const SHAPES: Record<Shape, string> = {
  triangle: 'M11 4l8 14H3z',
  square: 'M5 3h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z',
  circle: 'M11 3a8 8 0 1 0 0 16a8 8 0 1 0 0-16z',
  diamond: 'M11 2l9 9-9 9-9-9z',
};

/** A character's shape on their colour: their avatar everywhere in the app. */
export function Badge({ userId, size = 48 }: { userId: string; size?: number }) {
  const member = castById[userId];
  return (
    <span className="badge" style={{ width: size, height: size, background: member.color }} aria-hidden="true">
      <svg width={size * 0.46} height={size * 0.46} viewBox="0 0 22 22">
        <path d={SHAPES[member.shape]} fill="none" stroke="#0B1220" strokeWidth="3.5" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

function LockGlyph() {
  return (
    <svg width="14" height="16" viewBox="0 0 60 70" aria-hidden="true">
      <path d="M16 32V22a14 14 0 0 1 28 0v10" fill="none" stroke="currentColor" strokeWidth="8" />
      <rect x="8" y="30" width="44" height="36" rx="8" fill="currentColor" />
    </svg>
  );
}

function UserSwitcher({ userId, onChange }: { userId: string; onChange: (userId: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="switcher">
      <button type="button" className="switcher-button" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen(!open)}>
        <Badge userId={userId} size={40} />
        <span className="sr-only">Switch user, currently {castById[userId].name}</span>
      </button>
      {open && (
        <div className="switcher-menu" role="menu">
          {(Object.keys(cast) as Who[]).map((who) => (
            <button
              key={who}
              type="button"
              role="menuitem"
              className="switcher-item"
              onClick={() => { setOpen(false); onChange(cast[who].id); }}
            >
              <Badge userId={cast[who].id} size={32} />
              {cast[who].name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function KeySetup({ userId }: { userId: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const generate = async () => {
    setBusy(true);
    setError(undefined);
    try {
      await keystore.generateIdentity(userId);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not publish the public key');
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="phone-body key-setup">
      <p>
        To send and read encrypted messages, this device needs a key pair. The <strong>private key</strong> stays on
        this device. The <strong>public key</strong> is shared so others can encrypt messages for you.
      </p>
      <button type="button" className="primary" onClick={generate} disabled={busy}>
        {busy ? 'Generating…' : 'Generate key pair'}
      </button>
      {error && <p className="error" role="alert">{error}</p>}
    </div>
  );
}

function ConversationList({ conversations, onOpen }: { conversations: Conversation[]; onOpen: (id: string) => void }) {
  if (conversations.length === 0) return <div className="phone-body empty">No conversations yet.</div>;
  return (
    <ul className="phone-body conversation-list">
      {conversations.map((conversation) => (
        <li key={conversation.id}>
          <button type="button" className="conversation-row" onClick={() => onOpen(conversation.id)}>
            <span className="conversation-name">{conversation.name}</span>
            <span className="conversation-meta">{conversation.memberUserIds.length} members</span>
          </button>
        </li>
      ))}
    </ul>
  );
}

function Bubble({ message, me }: { message: DisplayMessage; me: string }) {
  const mine = message.sender === me;
  const sender = castById[message.sender];
  const readable = message.status === 'plain' || message.status === 'decrypted';
  return (
    <li className={`bubble-row ${mine ? 'mine' : 'theirs'}`}>
      {!mine && <span className="bubble-sender" style={{ color: sender?.color }}>{sender?.name ?? message.sender}</span>}
      <span className={`bubble ${readable ? '' : 'unreadable'}`}>{message.text}</span>
      {message.status === 'decrypted' && (
        <span className="bubble-meta"><LockGlyph /> opened with key …{message.keyHint}</span>
      )}
    </li>
  );
}

function Chat({ userId, conversationId, protocol, identityKey }: {
  userId: string; conversationId: string; protocol: Protocol; identityKey: string | undefined;
}) {
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string>();
  const end = useRef<HTMLLIElement>(null);

  const load = useCallback(async () => {
    const stored = await api.messages(protocol.version, conversationId);
    return Promise.all(stored.map((message) => protocol.incoming(message, userId)));
    // Re-read when this device's key changes, so messages that were unreadable can open.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [protocol, conversationId, userId, identityKey]);
  const { data: messages = [], refresh } = usePolling(load, 1000);

  useEffect(() => {
    end.current?.scrollIntoView({ block: 'end' });
  }, [messages.length]);

  const send = async (event: FormEvent) => {
    event.preventDefault();
    const text = draft.trim();
    if (!text) return;
    setError(undefined);
    try {
      const content = await protocol.outgoing(text, userId, conversationId);
      await api.send(protocol.version, conversationId, userId, content);
      setDraft('');
      refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not send');
    }
  };

  return (
    <>
      <ul className="phone-body messages">
        {messages.length === 0 && <li className="empty">No messages yet.</li>}
        {messages.map((message) => <Bubble key={message.id} message={message} me={userId} />)}
        <li ref={end} aria-hidden="true" />
      </ul>
      {error && <p className="error send-error" role="alert">{error}</p>}
      <form className="composer" onSubmit={send}>
        <label className="composer-field">
          <span className="sr-only">Message from {castById[userId].name}</span>
          <input type="text" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Type a message" autoComplete="off" />
        </label>
        <button type="submit" className="send" aria-label={`Send as ${castById[userId].name}`}>
          <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true">
            <path d="M4 11h13M12 5l6 6-6 6" fill="none" stroke="#0B1220" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </form>
    </>
  );
}

export function Phone({ protocol, initialUser }: { protocol: Protocol; initialUser: string }) {
  const [userId, setUserId] = useState(initialUser);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const member = castById[userId];
  const identity = useIdentity(userId);

  const loadConversations = useCallback(() => api.conversations(userId), [userId]);
  const { data: conversations = [] } = usePolling(loadConversations, 1000);
  const conversation = conversations.find((c) => c.id === conversationId);

  // Leaving a conversation you have been removed from, or switching user, returns to the list.
  useEffect(() => {
    if (conversationId && conversations.length > 0 && !conversation) setConversationId(null);
  }, [conversationId, conversations, conversation]);

  const needsKey = protocol.needsIdentity && !identity;

  return (
    <div className="phone" style={{ '--owner': member.color } as CSSProperties}>
      <div className="phone-screen">
        <header className="phone-header">
          {conversation && !needsKey ? (
            <button type="button" className="back" aria-label="Back to conversations" onClick={() => setConversationId(null)}>
              <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true">
                <path d="M14 4l-7 7 7 7" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          ) : null}
          <div className="phone-title">
            <span className="phone-name">{conversation && !needsKey ? conversation.name : member.name}</span>
            {protocol.needsIdentity && identity && (
              <span className="phone-status"><LockGlyph /> End-to-end encrypted</span>
            )}
          </div>
          <UserSwitcher userId={userId} onChange={(next) => { setUserId(next); setConversationId(null); }} />
        </header>
        {needsKey ? (
          <KeySetup userId={userId} />
        ) : conversation ? (
          <Chat userId={userId} conversationId={conversation.id} protocol={protocol} identityKey={identity?.privateKey} />
        ) : (
          <ConversationList conversations={conversations} onOpen={setConversationId} />
        )}
      </div>
    </div>
  );
}
