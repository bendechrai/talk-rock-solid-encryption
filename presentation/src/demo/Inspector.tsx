/**
 * The presenter's view behind the scenes: what the server stores, what its API hands out, and
 * which keys each device holds. This is how the audience sees what someone with access to the
 * server would see.
 */
import { useEffect, useRef, useState } from 'react';
import {
  decryptSymmetric, isSymmetricBox, openEnvelope, parseEnvelope,
  type Conversation, type DatabaseSnapshot, type EphemeralKeyEntry, type StoredMessage,
} from '@whisper/shared';
import { cast, castById, type Who } from '../theme.ts';
import { api } from './api.ts';
import { keystore, useEphemeral, useIdentity } from './keystore.ts';
import { Badge, KeyGlyph, LockGlyph } from './Phone.tsx';
import type { Protocol } from './protocols.ts';
import { usePolling } from './usePolling.ts';

type Tab = 'messages' | 'chats' | 'keys' | 'api' | 'devices' | 'decrypt';

const WHO = Object.keys(cast) as Who[];

function pretty(content: string): string {
  try {
    return JSON.stringify(JSON.parse(content), null, 2);
  } catch {
    return content;
  }
}

/** Enough of a key to recognise it: the start and the last four characters. */
function fingerprint(key: string): string {
  return `${key.slice(0, 4)}…${key.slice(-4)}`;
}

function copy(text: string): void {
  void navigator.clipboard?.writeText(text);
}

/** Re-render every second, for countdowns. */
function useNow(): number {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  return now;
}

function Lifetime({ expiresAt, now }: { expiresAt: number; now: number }) {
  const seconds = Math.ceil((expiresAt - now) / 1000);
  return seconds > 0
    ? <span className="status active">active {seconds}s</span>
    : <span className="status expired">expired</span>;
}

// ---- Messages ---------------------------------------------------------------------------

function StoredContent({ content }: { content: string }) {
  const envelope = parseEnvelope(content);
  if (envelope) {
    return (
      <div className="copies">
        {envelope.recipients.map((recipient, index) => (
          <span key={index} className={recipient.keyType === 'ephemeral' ? 'copy-chip ephemeral' : 'copy-chip'}>
            <LockGlyph />
            <Badge userId={recipient.userId} size={44} />
            {castById[recipient.userId]?.name ?? recipient.userId}
            {recipient.keyId && <code>{recipient.keyId.slice(-4)}</code>}
          </span>
        ))}
      </div>
    );
  }
  let box: unknown;
  try {
    box = JSON.parse(content);
  } catch {
    box = undefined;
  }
  if (isSymmetricBox(box)) {
    return <code className="ciphertext" data-texture>{box.ciphertext}</code>;
  }
  return <span className="plaintext">{content}</span>;
}

function describe(content: string): { label: string; kind: 'plain' | 'cipher' } {
  const envelope = parseEnvelope(content);
  if (envelope) return { label: `sealed × ${envelope.recipients.length}`, kind: 'cipher' };
  try {
    if (isSymmetricBox(JSON.parse(content))) return { label: 'server key', kind: 'cipher' };
  } catch {
    // Not JSON, so it is plain text.
  }
  return { label: 'plaintext', kind: 'plain' };
}

function MessageCard({ message, conversations }: { message: StoredMessage; conversations: Conversation[] }) {
  const [raw, setRaw] = useState(false);
  const { label, kind } = describe(message.content);
  const chat = conversations.find((c) => c.id === message.conversationId);
  return (
    <li className="card">
      <div className="card-head">
        <code className="row-id">#{message.id}</code>
        <Badge userId={message.sender} size={48} />
        <span className="grow">{chat?.name ?? `chat ${message.conversationId}`}</span>
        <span className={`kind ${kind}`}>{label}</span>
      </div>
      {raw ? <pre className="raw" data-texture>{pretty(message.content)}</pre> : <StoredContent content={message.content} />}
      <div className="card-actions">
        <button type="button" className="ghost" aria-pressed={raw} onClick={() => setRaw(!raw)}>{raw ? 'Summary' : 'Raw'}</button>
        <button type="button" className="ghost" onClick={() => copy(message.content)}>Copy</button>
      </div>
    </li>
  );
}

function MessagesTab({ data }: { data: DatabaseSnapshot }) {
  const end = useRef<HTMLLIElement>(null);
  useEffect(() => {
    end.current?.scrollIntoView({ block: 'end' });
  }, [data.messages.length]);
  if (data.messages.length === 0) return <p className="muted">The messages table is empty.</p>;
  return (
    <ul className="cards">
      {data.messages.map((message) => <MessageCard key={message.id} message={message} conversations={data.conversations} />)}
      <li ref={end} aria-hidden="true" />
    </ul>
  );
}

// ---- Chats and users ----------------------------------------------------------------------

function ChatsTab({ data, refresh }: { data: DatabaseSnapshot; refresh: () => void }) {
  const toggle = async (conversation: Conversation, userId: string) => {
    const members = conversation.memberUserIds;
    const next = members.includes(userId) ? members.filter((m) => m !== userId) : [...members, userId].sort();
    await api.setMembers(conversation.id, next);
    refresh();
  };
  return (
    <>
      <ul className="cards">
        {data.conversations.map((conversation) => (
          <li key={conversation.id} className="card">
            <div className="card-head">
              <code className="row-id">#{conversation.id}</code>
              <strong className="grow">{conversation.name}</strong>
            </div>
            <div className="members">
              {WHO.map((who) => {
                const member = cast[who];
                const isMember = conversation.memberUserIds.includes(member.id);
                return (
                  <button
                    key={who}
                    type="button"
                    className={isMember ? 'member in' : 'member'}
                    aria-pressed={isMember}
                    style={isMember ? { borderColor: member.color, color: member.color } : undefined}
                    onClick={() => void toggle(conversation, member.id)}
                  >
                    {member.name}
                  </button>
                );
              })}
            </div>
          </li>
        ))}
      </ul>
      <h3>users</h3>
      <div className="users">
        {data.users.map((user) => (
          <span key={user.id} className="user"><code className="row-id">#{user.id}</code><Badge userId={user.id} size={44} />{user.name}</span>
        ))}
      </div>
    </>
  );
}

// ---- Keys held by the server -----------------------------------------------------------------

function KeysTab({ data, protocol }: { data: DatabaseSnapshot; protocol: Protocol }) {
  const now = useNow();
  const chatName = (key: EphemeralKeyEntry) => data.conversations.find((c) => c.id === key.conversationId)?.name ?? key.conversationId;
  return (
    <>
      <h3>public_keys</h3>
      {data.publicKeys.length === 0 ? <p className="muted">No rows.</p> : (
        <ul className="rows">
          {data.publicKeys.map((entry) => (
            <li key={entry.userId} className="row">
              <Badge userId={entry.userId} size={48} />
              <span className="grow">{castById[entry.userId]?.name ?? entry.userId}</span>
              <code>{fingerprint(entry.publicKey)}</code>
            </li>
          ))}
        </ul>
      )}
      {protocol.needsConversationKey && (
        <>
          <h3>chat_keys</h3>
          {data.ephemeralKeys.length === 0 ? <p className="muted">No rows.</p> : (
            <ul className="rows">
              {data.ephemeralKeys.map((key) => (
                <li key={key.id} className="row">
                  <Badge userId={key.userId} size={48} />
                  <span className="grow">{chatName(key)}</span>
                  <code>{key.id.slice(-4)}</code>
                  <Lifetime expiresAt={Date.parse(key.expiresAt)} now={now} />
                </li>
              ))}
            </ul>
          )}
        </>
      )}
      <p className="muted">Public halves only. The server never sees a private key.</p>
    </>
  );
}

// ---- API ----------------------------------------------------------------------------------

function ApiTab({ protocol }: { protocol: Protocol }) {
  const [path, setPath] = useState(`/api/${protocol.version}/conversations/1/messages`);
  const [result, setResult] = useState('');
  const run = async () => setResult(await api.raw(path).catch((e) => String(e)));
  return (
    <form className="tool" onSubmit={(e) => { e.preventDefault(); void run(); }}>
      <p className="muted">No login and no token. Change the number and ask again.</p>
      <div className="tool-row">
        <button type="button" className="ghost" onClick={() => setPath(`/api/${protocol.version}/conversations/1/messages`)}>Messages</button>
        <button type="button" className="ghost" onClick={() => setPath('/api/conversations/1')}>Conversation</button>
        <button type="button" className="ghost" onClick={() => setPath('/api/users')}>Users</button>
      </div>
      <div className="tool-row">
        <label className="grow">
          <span className="sr-only">Request path</span>
          <input type="text" className="mono" value={path} onChange={(e) => setPath(e.target.value)} spellCheck={false} />
        </label>
        <button type="submit" className="primary">GET</button>
      </div>
      <pre className="result" aria-live="polite">{result}</pre>
    </form>
  );
}

// ---- Keys held by each device ---------------------------------------------------------------

function DeviceCard({ who, protocol, conversations }: { who: Who; protocol: Protocol; conversations: Conversation[] }) {
  const member = cast[who];
  const identity = useIdentity(member.id);
  const ephemeralKeys = useEphemeral(member.id);
  const [reveal, setReveal] = useState(false);
  const now = useNow();
  return (
    <li className="card">
      <div className="card-head">
        <Badge userId={member.id} size={48} />
        <strong className="grow" style={{ color: member.color }}>{member.name}’s device</strong>
        <button type="button" className="ghost" onClick={() => void keystore.generateIdentity(member.id)}>
          {identity ? 'New pair' : 'Generate'}
        </button>
        {identity && <button type="button" className="ghost" onClick={() => void keystore.deleteIdentity(member.id)}>Delete</button>}
      </div>
      {identity ? (
        <>
          <div className="row"><span className="grow">public</span><code>{fingerprint(identity.publicKey)}</code></div>
          <div className="row">
            <span className="grow">private</span>
            <code>{reveal ? fingerprint(identity.privateKey) : '••••••••'}</code>
            <button type="button" className="ghost" onClick={() => setReveal(!reveal)}>{reveal ? 'Hide' : 'Show'}</button>
            <button type="button" className="ghost" onClick={() => copy(identity.privateKey)}>Copy</button>
          </div>
        </>
      ) : <p className="muted">No key pair on this device.</p>}
      {protocol.needsConversationKey && ephemeralKeys.map((key) => (
        <div key={key.id} className="chat-key">
          <div className="row">
            <KeyGlyph ephemeral />
            <span className="grow nowrap">{conversations.find((c) => c.id === key.conversationId)?.name ?? key.conversationId}</span>
            <code>{key.id.slice(-4)}</code>
            <Lifetime expiresAt={key.expiresAt} now={now} />
          </div>
          <div className="card-actions">
            <button type="button" className="ghost" onClick={() => copy(key.privateKey)}>Copy</button>
            {key.expiresAt > now && <button type="button" className="ghost" onClick={() => void keystore.expireEphemeral(member.id, key.id)}>Expire</button>}
            <button type="button" className="ghost" onClick={() => void keystore.deleteEphemeral(member.id, key.id)}>Delete</button>
          </div>
        </div>
      ))}
    </li>
  );
}

// ---- Decrypt ---------------------------------------------------------------------------------

function DecryptTab({ protocol }: { protocol: Protocol }) {
  const serverSide = protocol.version === 'v2';
  const [key, setKey] = useState(serverSide ? 'super-secret-encryption-key' : '');
  const [content, setContent] = useState('');
  const [result, setResult] = useState<{ ok: boolean; text: string }>();

  const attempt = async () => {
    try {
      if (serverSide) {
        const box = JSON.parse(content);
        if (!isSymmetricBox(box)) throw new Error('Not a message this server encrypted.');
        const text = await decryptSymmetric(box, key);
        setResult(text === null ? { ok: false, text: 'Wrong key.' } : { ok: true, text });
      } else {
        const envelope = parseEnvelope(content);
        if (!envelope) throw new Error('Not an end-to-end encrypted message.');
        const text = await openEnvelope(envelope, key.trim());
        setResult(text === null ? { ok: false, text: 'This key opens none of the copies.' } : { ok: true, text });
      }
    } catch (e) {
      setResult({ ok: false, text: e instanceof Error ? e.message : 'Could not decrypt.' });
    }
  };

  return (
    <form className="tool" onSubmit={(e) => { e.preventDefault(); void attempt(); }}>
      <p className="muted">
        {serverSide ? 'One key encrypts every message.' : 'Each copy opens with exactly one private key.'}
      </p>
      <label>
        <span className="field-label">{serverSide ? 'Server key' : 'Private key'}</span>
        <input type="text" className="mono" value={key} onChange={(e) => setKey(e.target.value)} spellCheck={false} data-texture={serverSide ? undefined : ''} />
      </label>
      <label>
        <span className="field-label">Stored message</span>
        <textarea className="mono" rows={4} value={content} onChange={(e) => setContent(e.target.value)} spellCheck={false} data-texture />
      </label>
      <div className="tool-row">
        <button type="submit" className="primary">Decrypt</button>
        {result && <output className={result.ok ? 'plaintext' : 'error'}>{result.text}</output>}
      </div>
    </form>
  );
}

// ---- The inspector itself ----------------------------------------------------------------------

export function Inspector({ protocol }: { protocol: Protocol }) {
  const [tab, setTab] = useState<Tab>('messages');
  const { data, refresh } = usePolling(api.database, 1000);

  const tabs: [Tab, string][] = [
    ['messages', 'Messages'],
    ['chats', 'Chats'],
    ...(protocol.needsIdentity ? [['keys', 'Keys'] as [Tab, string]] : []),
    ['api', 'API'],
    ...(protocol.needsIdentity ? [['devices', 'Devices'] as [Tab, string]] : []),
    ...(protocol.version !== 'v1' ? [['decrypt', 'Decrypt'] as [Tab, string]] : []),
  ];

  return (
    <section className="inspector" aria-label="Behind the scenes">
      <div className="tabs" role="tablist">
        {tabs.map(([id, label]) => (
          <button key={id} type="button" role="tab" aria-selected={tab === id} className={tab === id ? 'tab active' : 'tab'} onClick={() => setTab(id)}>
            {label}
          </button>
        ))}
      </div>
      <div className="inspector-body">
        {!data ? <p className="muted">Waiting for the server…</p> : (
          <>
            {tab === 'messages' && <MessagesTab data={data} />}
            {tab === 'chats' && <ChatsTab data={data} refresh={refresh} />}
            {tab === 'keys' && <KeysTab data={data} protocol={protocol} />}
            {tab === 'api' && <ApiTab protocol={protocol} />}
            {tab === 'devices' && (
              <ul className="cards">
                {WHO.map((who) => <DeviceCard key={who} who={who} protocol={protocol} conversations={data.conversations} />)}
              </ul>
            )}
            {tab === 'decrypt' && <DecryptTab protocol={protocol} />}
          </>
        )}
      </div>
    </section>
  );
}

/** Empty the database and every device's keys. Asks twice, because it cannot be undone mid-talk. */
export function ResetButton() {
  const [confirming, setConfirming] = useState(false);
  const reset = async () => {
    if (!confirming) {
      setConfirming(true);
      window.setTimeout(() => setConfirming(false), 3000);
      return;
    }
    setConfirming(false);
    await api.reset();
    keystore.clearAll();
  };
  return (
    <button type="button" className={confirming ? 'ghost danger' : 'ghost'} onClick={() => void reset()}>
      {confirming ? 'Sure?' : 'Reset'}
    </button>
  );
}
