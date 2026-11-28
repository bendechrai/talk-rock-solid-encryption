/** One character's phone, running the Whisper chat app. Everything is sized to be read from the back of a room. */
import { useCallback, useEffect, useRef, useState, type CSSProperties, type FormEvent } from 'react';
import type { Conversation } from '@whisper/shared';
import { cast, castById, type Shape, type Who } from '../theme.ts';
import { api } from './api.ts';
import { keystore, useEphemeral, useIdentity } from './keystore.ts';
import type { DisplayMessage, Protocol } from './protocols.ts';
import { useShared } from './shared.ts';
import { usePolling } from './usePolling.ts';

const SHAPES: Record<Shape, string> = {
  triangle: 'M11 4l8 14H3z',
  square: 'M5 3h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z',
  circle: 'M11 3a8 8 0 1 0 0 16a8 8 0 1 0 0-16z',
  diamond: 'M11 2l9 9-9 9-9-9z',
};

/** A character's shape on their colour: their avatar everywhere in the app. */
export function Badge({ userId, size = 56 }: { userId: string; size?: number }) {
  const member = castById[userId];
  return (
    <span className="badge" style={{ width: size, height: size, background: member?.color ?? '#93A1BA' }} role="img" aria-label={member?.name ?? userId}>
      <svg width={size * 0.46} height={size * 0.46} viewBox="0 0 22 22" aria-hidden="true">
        {member && <path d={SHAPES[member.shape]} fill="none" stroke="#0B1220" strokeWidth="3.5" strokeLinejoin="round" />}
      </svg>
    </span>
  );
}

export function LockGlyph({ size = 30 }: { size?: number }) {
  return (
    <svg width={size * 0.86} height={size} viewBox="0 0 60 70" aria-hidden="true">
      <path d="M16 32V22a14 14 0 0 1 28 0v10" fill="none" stroke="currentColor" strokeWidth="8" />
      <rect x="8" y="30" width="44" height="36" rx="8" fill="currentColor" />
    </svg>
  );
}

/** A small key. The dashed ring marks a short-lived conversation key. */
export function KeyGlyph({ ephemeral = false, size = 34 }: { ephemeral?: boolean; size?: number }) {
  return (
    <svg width={size * 1.7} height={size} viewBox="0 0 68 40" aria-hidden="true">
      {ephemeral && <circle cx="16" cy="20" r="17" fill="none" stroke="currentColor" strokeWidth="3" strokeDasharray="3 6" strokeLinecap="round" />}
      <circle cx="16" cy="20" r="8" fill="none" stroke="currentColor" strokeWidth="6" />
      <path d="M26 20h36M50 20v10M60 20v8" fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="round" />
    </svg>
  );
}

function UserSwitcher({ userId, onChange }: { userId: string; onChange: (userId: string) => void }) {
  const [open, setOpen] = useShared('switcher', false);
  return (
    <div className="switcher">
      <button type="button" className="switcher-button" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen(!open)}>
        <Badge userId={userId} />
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
              <Badge userId={cast[who].id} size={48} />
              {cast[who].name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** A screen that stands between the user and chatting until a key exists. */
function KeySetup({ lead, detail, action, onGenerate }: { lead: string; detail: string; action: string; onGenerate: () => Promise<unknown> }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const generate = async () => {
    setBusy(true);
    setError(undefined);
    try {
      await onGenerate();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not publish the key');
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="phone-body key-setup">
      <p className="key-setup-lead">{lead}</p>
      <p>{detail}</p>
      <button type="button" className="primary" onClick={generate} disabled={busy}>{busy ? 'Generating…' : action}</button>
      {error && <p className="error" role="alert">{error}</p>}
    </div>
  );
}

function ConversationList({ conversations, onOpen }: { conversations: Conversation[]; onOpen: (id: string) => void }) {
  if (conversations.length === 0) return <div className="phone-body empty">No conversations.</div>;
  return (
    <ul className="phone-body conversation-list">
      {conversations.map((conversation) => (
        <li key={conversation.id}>
          <button type="button" className="conversation-row" onClick={() => onOpen(conversation.id)}>
            <span className="conversation-name">{conversation.name}</span>
            <span className="conversation-members">
              {conversation.memberUserIds.map((id) => <Badge key={id} userId={id} size={40} />)}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}

function Bubble({ message, me }: { message: DisplayMessage; me: string }) {
  const mine = message.sender === me;
  const readable = message.status === 'plain' || message.status === 'decrypted';
  return (
    <li className={`bubble-row ${mine ? 'mine' : 'theirs'}`}>
      {!mine && <Badge userId={message.sender} size={48} />}
      <span className={`bubble ${readable ? '' : 'unreadable'}`}>
        {message.text}
        {message.status === 'decrypted' && (
          <span className={message.keyExpired ? 'key-tag expired' : 'key-tag'}>
            <KeyGlyph ephemeral={message.keyKind === 'ephemeral'} />
            {message.keyExpired ? 'expired' : message.keyHint}
          </span>
        )}
      </span>
    </li>
  );
}

function Chat({ userId, conversationId, protocol, keyVersion }: {
  userId: string; conversationId: string; protocol: Protocol; keyVersion: string;
}) {
  const [draft, setDraft] = useShared(`draft:${userId}:${conversationId}`, '');
  const [notice, setNotice] = useShared<string | undefined>(`notice:${userId}:${conversationId}`, undefined);
  const end = useRef<HTMLLIElement>(null);

  const load = useCallback(async () => {
    const stored = await api.messages(protocol.version, conversationId);
    return Promise.all(stored.map((message) => protocol.incoming(message, userId)));
    // `keyVersion` changes whenever this device's keys do, so unreadable messages get another try.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [protocol, conversationId, userId, keyVersion]);
  const { data: messages = [], refresh } = usePolling(load, 1000);

  useEffect(() => {
    end.current?.scrollIntoView({ block: 'end' });
  }, [messages.length]);

  const send = async (event: FormEvent) => {
    event.preventDefault();
    const text = draft.trim();
    if (!text) return;
    setNotice(undefined);
    try {
      const { content, warning } = await protocol.outgoing(text, userId, conversationId);
      await api.send(protocol.version, conversationId, userId, content);
      setDraft('');
      setNotice(warning);
      refresh();
    } catch (e) {
      setNotice(e instanceof Error ? e.message : 'Could not send');
    }
  };

  return (
    <>
      <ul className="phone-body messages">
        {messages.length === 0 && <li className="empty">No messages yet.</li>}
        {messages.map((message) => <Bubble key={message.id} message={message} me={userId} />)}
        <li ref={end} aria-hidden="true" />
      </ul>
      {notice && <p className="notice" role="status">{notice}</p>}
      <form className="composer" onSubmit={send}>
        <label className="composer-field">
          <span className="sr-only">Message from {castById[userId].name}</span>
          <input type="text" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Message" autoComplete="off" />
        </label>
        <button type="submit" className="send" aria-label={`Send as ${castById[userId].name}`}>
          <svg width="34" height="34" viewBox="0 0 22 22" aria-hidden="true">
            <path d="M4 11h13M12 5l6 6-6 6" fill="none" stroke="#0B1220" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </form>
    </>
  );
}

export function Phone({ protocol, userId, onUserChange, hidden = false }: {
  protocol: Protocol; userId: string; onUserChange: (userId: string) => void; hidden?: boolean;
}) {
  const [conversationId, setConversationId] = useShared<string | null>('conversation', null);
  const member = castById[userId];
  const identity = useIdentity(userId);
  const ephemeralKeys = useEphemeral(userId);

  const loadConversations = useCallback(() => api.conversations(userId), [userId]);
  const { data: conversations = [] } = usePolling(loadConversations, 1000);
  const conversation = conversations.find((c) => c.id === conversationId);

  // Switching user, or being removed from a conversation, returns to the list. A window that has
  // only just opened this demo has not switched anything, and must not close the chat for the others.
  const shownUser = useRef(userId);
  useEffect(() => {
    if (shownUser.current === userId) return;
    shownUser.current = userId;
    setConversationId(null);
  }, [userId, setConversationId]);
  useEffect(() => {
    if (conversationId && conversations.length > 0 && !conversation) setConversationId(null);
  }, [conversationId, conversations, conversation, setConversationId]);

  const needsIdentity = protocol.needsIdentity && !identity;
  // A conversation key is asked for once. After that the phone rotates it by itself when it sends.
  const needsConversationKey =
    !needsIdentity && protocol.needsConversationKey && conversation !== undefined &&
    !ephemeralKeys.some((key) => key.conversationId === conversation.id);
  const inChat = conversation !== undefined && !needsIdentity;
  const keyVersion = `${identity?.publicKey ?? ''}:${ephemeralKeys.map((k) => `${k.id}@${k.expiresAt}`).join(',')}`;

  return (
    <div className="phone" style={{ '--owner': member.color } as CSSProperties} hidden={hidden}>
      <div className="phone-screen">
        <header className="phone-header">
          {inChat && (
            <button type="button" className="back" aria-label="Back to conversations" onClick={() => setConversationId(null)}>
              <svg width="32" height="32" viewBox="0 0 22 22" aria-hidden="true">
                <path d="M14 4l-7 7 7 7" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          )}
          <span className="phone-name">{inChat ? conversation.name : member.name}</span>
          {protocol.needsIdentity && identity && (
            <span className="phone-secure" role="img" aria-label="End-to-end encrypted"><LockGlyph /></span>
          )}
          <UserSwitcher userId={userId} onChange={onUserChange} />
        </header>
        {needsIdentity ? (
          <KeySetup
            lead="This device needs a key pair."
            detail="The private key stays here. The public key is shared."
            action="Generate key pair"
            onGenerate={() => keystore.generateIdentity(userId)}
          />
        ) : needsConversationKey ? (
          <KeySetup
            lead="This chat needs its own key."
            detail="It is short-lived and only used here."
            action="Generate chat key"
            onGenerate={() => keystore.generateEphemeral(userId, conversation.id)}
          />
        ) : conversation ? (
          <Chat userId={userId} conversationId={conversation.id} protocol={protocol} keyVersion={keyVersion} />
        ) : (
          <ConversationList conversations={conversations} onOpen={setConversationId} />
        )}
      </div>
    </div>
  );
}
