/**
 * The presenter's view of the server: what is stored, what the API returns, and which keys each
 * device holds. This is how the audience sees what an attacker with server access would see.
 */
import { useState } from 'react';
import { decryptSymmetric, isSymmetricBox, openEnvelope, parseEnvelope } from '@whisper/shared';
import { cast, castById, type Who } from '../theme.ts';
import { api } from './api.ts';
import { keystore, useIdentity } from './keystore.ts';
import { Badge } from './Phone.tsx';
import type { Protocol } from './protocols.ts';
import { usePolling } from './usePolling.ts';

type Tab = 'database' | 'api' | 'devices' | 'decrypt';

function pretty(content: string): string {
  try {
    return JSON.stringify(JSON.parse(content), null, 2);
  } catch {
    return content;
  }
}

function short(key: string): string {
  return `${key.slice(0, 10)}…${key.slice(-4)}`;
}

function MessageRow({ id, conversationId, sender, content }: { id: string; conversationId: string; sender: string; content: string }) {
  const [open, setOpen] = useState(false);
  return (
    <tr>
      <td>{id}</td>
      <td>{conversationId}</td>
      <td>{castById[sender]?.name ?? sender}</td>
      <td>
        <button type="button" className="cell-button" aria-expanded={open} onClick={() => setOpen(!open)} title="Show the whole value">
          <code className={open ? 'content open' : 'content'}>{open ? pretty(content) : content}</code>
        </button>
      </td>
      <td>
        <button type="button" className="ghost small" onClick={() => void navigator.clipboard?.writeText(content)}>Copy</button>
      </td>
    </tr>
  );
}

function DatabaseTab({ protocol }: { protocol: Protocol }) {
  const { data, refresh } = usePolling(api.database, 1000);
  if (!data) return <p className="muted">Waiting for the server…</p>;

  const toggleMember = async (conversationId: string, members: string[], userId: string) => {
    const next = members.includes(userId) ? members.filter((m) => m !== userId) : [...members, userId].sort();
    await api.setMembers(conversationId, next);
    refresh();
  };

  return (
    <div className="tables">
      <section>
        <h3>conversations</h3>
        <table>
          <thead><tr><th>id</th><th>name</th><th>members (click to change)</th></tr></thead>
          <tbody>
            {data.conversations.map((conversation) => (
              <tr key={conversation.id}>
                <td>{conversation.id}</td>
                <td>{conversation.name}</td>
                <td className="members">
                  {(Object.keys(cast) as Who[]).map((who) => {
                    const member = cast[who];
                    const isMember = conversation.memberUserIds.includes(member.id);
                    return (
                      <button
                        key={who}
                        type="button"
                        className={isMember ? 'member in' : 'member'}
                        aria-pressed={isMember}
                        style={isMember ? { borderColor: member.color, color: member.color } : undefined}
                        onClick={() => void toggleMember(conversation.id, conversation.memberUserIds, member.id)}
                      >
                        {member.name}
                      </button>
                    );
                  })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section>
        <h3>messages</h3>
        {data.messages.length === 0 ? <p className="muted">No rows.</p> : (
          <table>
            <thead><tr><th>id</th><th>conv</th><th>sender</th><th>content</th><th></th></tr></thead>
            <tbody>
              {data.messages.map((message) => <MessageRow key={message.id} {...message} />)}
            </tbody>
          </table>
        )}
      </section>

      {protocol.needsIdentity && (
        <section>
          <h3>public_keys</h3>
          {data.publicKeys.length === 0 ? <p className="muted">No rows.</p> : (
            <table>
              <thead><tr><th>user</th><th>public key</th></tr></thead>
              <tbody>
                {data.publicKeys.map((entry) => (
                  <tr key={entry.userId}>
                    <td>{castById[entry.userId]?.name ?? entry.userId}</td>
                    <td><code className="content open">{entry.publicKey}</code></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      )}

      <section>
        <h3>users</h3>
        <table>
          <thead><tr><th>id</th><th>name</th></tr></thead>
          <tbody>{data.users.map((user) => <tr key={user.id}><td>{user.id}</td><td>{user.name}</td></tr>)}</tbody>
        </table>
      </section>
    </div>
  );
}

function ApiTab({ protocol }: { protocol: Protocol }) {
  const [path, setPath] = useState(`/api/${protocol.version}/conversations/1/messages`);
  const [result, setResult] = useState('');
  const run = async () => setResult(await api.raw(path).catch((e) => String(e)));
  return (
    <form className="tool" onSubmit={(e) => { e.preventDefault(); void run(); }}>
      <p className="muted">No login, no token. Change the conversation number and ask again.</p>
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

function DeviceRow({ who }: { who: Who }) {
  const member = cast[who];
  const identity = useIdentity(member.id);
  const [reveal, setReveal] = useState(false);
  return (
    <li className="device">
      <Badge userId={member.id} size={40} />
      <div className="device-keys">
        <strong style={{ color: member.color }}>{member.name}’s device</strong>
        {identity ? (
          <>
            <span>public <code>{short(identity.publicKey)}</code></span>
            <span>
              private <code>{reveal ? identity.privateKey : '••••••••••••••••'}</code>{' '}
              <button type="button" className="ghost small" onClick={() => setReveal(!reveal)}>{reveal ? 'Hide' : 'Show'}</button>{' '}
              <button type="button" className="ghost small" onClick={() => void navigator.clipboard?.writeText(identity.privateKey)}>Copy</button>
            </span>
          </>
        ) : <span className="muted">No key pair on this device.</span>}
      </div>
      <div className="device-actions">
        <button type="button" className="ghost" onClick={() => void keystore.generateIdentity(member.id)}>
          {identity ? 'Regenerate' : 'Generate'}
        </button>
        {identity && <button type="button" className="ghost" onClick={() => void keystore.deleteIdentity(member.id)}>Delete</button>}
      </div>
    </li>
  );
}

function DecryptTab({ protocol }: { protocol: Protocol }) {
  const serverSide = protocol.version === 'v2';
  const [key, setKey] = useState(serverSide ? 'super-secret-encryption-key' : '');
  const [content, setContent] = useState('');
  const [result, setResult] = useState<{ ok: boolean; text: string }>();

  const attempt = async () => {
    try {
      if (serverSide) {
        const box = JSON.parse(content);
        if (!isSymmetricBox(box)) throw new Error('That is not a message this server encrypted.');
        const text = await decryptSymmetric(box, key);
        setResult(text === null ? { ok: false, text: 'Wrong key.' } : { ok: true, text });
      } else {
        const envelope = parseEnvelope(content);
        if (!envelope) throw new Error('That is not an end-to-end encrypted message.');
        const text = await openEnvelope(envelope, key.trim());
        setResult(text === null ? { ok: false, text: 'This private key opens none of the copies.' } : { ok: true, text });
      }
    } catch (e) {
      setResult({ ok: false, text: e instanceof Error ? e.message : 'Could not decrypt.' });
    }
  };

  return (
    <form className="tool" onSubmit={(e) => { e.preventDefault(); void attempt(); }}>
      <p className="muted">
        {serverSide
          ? 'One key encrypts every message. Anyone who gets it can read everything.'
          : 'Each copy opens with exactly one private key. Paste a key and a stored message to try.'}
      </p>
      <label>
        <span className="field-label">{serverSide ? 'Server key' : 'Private key'}</span>
        <input type="text" className="mono" value={key} onChange={(e) => setKey(e.target.value)} spellCheck={false} />
      </label>
      <label>
        <span className="field-label">Stored message</span>
        <textarea className="mono" rows={5} value={content} onChange={(e) => setContent(e.target.value)} spellCheck={false} />
      </label>
      <div className="tool-row">
        <button type="submit" className="primary">Decrypt</button>
        {result && <output className={result.ok ? 'plain-result' : 'error'}>{result.text}</output>}
      </div>
    </form>
  );
}

export function Inspector({ protocol }: { protocol: Protocol }) {
  const [tab, setTab] = useState<Tab>('database');
  const tabs: [Tab, string][] = [
    ['database', 'Database'],
    ['api', 'API'],
    ...(protocol.needsIdentity ? [['devices', 'Devices'] as [Tab, string]] : []),
    ...(protocol.version !== 'v1' ? [['decrypt', 'Decrypt'] as [Tab, string]] : []),
  ];

  const reset = async () => {
    await api.reset();
    keystore.clearAll();
  };

  return (
    <section className="inspector" aria-label="Server inspector">
      <header className="inspector-header">
        <div className="tabs" role="tablist">
          {tabs.map(([id, label]) => (
            <button key={id} type="button" role="tab" aria-selected={tab === id} className={tab === id ? 'tab active' : 'tab'} onClick={() => setTab(id)}>
              {label}
            </button>
          ))}
        </div>
        <button type="button" className="ghost" onClick={() => void reset()}>Reset everything</button>
      </header>
      <div className="inspector-body">
        {tab === 'database' && <DatabaseTab protocol={protocol} />}
        {tab === 'api' && <ApiTab protocol={protocol} />}
        {tab === 'devices' && <ul className="devices">{(Object.keys(cast) as Who[]).map((who) => <DeviceRow key={who} who={who} />)}</ul>}
        {tab === 'decrypt' && <DecryptTab protocol={protocol} />}
      </div>
    </section>
  );
}
