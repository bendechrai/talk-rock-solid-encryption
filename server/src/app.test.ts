import assert from 'node:assert/strict';
import { test } from 'node:test';
import { generateKeyPair, openEnvelope, parseEnvelope, sealEnvelope } from '@whisper/shared';
import { createApp } from './app.ts';
import { Database } from './db.ts';

function setup() {
  const db = new Database();
  const app = createApp(db);
  const json = async (path: string, init?: RequestInit) => {
    const response = await app.request(path, {
      ...init,
      headers: { 'content-type': 'application/json', ...init?.headers },
    });
    return { status: response.status, body: await response.json() };
  };
  const send = (version: string, content: string, sender = '1') =>
    json(`/api/${version}/conversations/1/messages`, { method: 'POST', body: JSON.stringify({ sender, content }) });
  return { db, json, send };
}

test('v1 stores plaintext', async () => {
  const { db, json, send } = setup();
  assert.equal((await send('v1', 'Hello')).status, 201);
  assert.equal(db.messages('1')[0].content, 'Hello');
  assert.equal((await json('/api/v1/conversations/1/messages')).body.messages[0].content, 'Hello');
});

test('v2 stores ciphertext, yet hands plaintext to anyone who asks', async () => {
  const { db, json, send } = setup();
  await send('v2', 'How are you doing?');
  const stored = db.messages('1')[0].content;
  assert.ok(!stored.includes('How are you doing?'));
  assert.deepEqual(Object.keys(JSON.parse(stored)).sort(), ['ciphertext', 'iv']);
  assert.equal((await json('/api/v2/conversations/1/messages')).body.messages[0].content, 'How are you doing?');
  // The v3 endpoint does not decrypt: it returns exactly what is stored.
  assert.equal((await json('/api/v3/conversations/1/messages')).body.messages[0].content, stored);
});

test('v3 relays an envelope the server cannot open', async () => {
  const { db, json, send } = setup();
  const alice = generateKeyPair();
  const bob = generateKeyPair();
  assert.equal((await json('/api/users/1/key', { method: 'PUT', body: JSON.stringify({ publicKey: alice.publicKey }) })).status, 200);
  await json('/api/users/2/key', { method: 'PUT', body: JSON.stringify({ publicKey: bob.publicKey }) });

  const { body } = await json('/api/conversations/1/keys');
  assert.deepEqual(body.keys.map((k: { userId: string }) => k.userId).sort(), ['1', '2']);

  const envelope = await sealEnvelope(
    'Hey Bob',
    '1',
    body.keys.map((k: { userId: string; publicKey: string }) => ({ ...k, keyType: 'identity' as const })),
  );
  await send('v3', JSON.stringify(envelope));

  assert.ok(!db.messages('1')[0].content.includes('Hey Bob'));
  const relayed = (await json('/api/v3/conversations/1/messages')).body.messages[0].content;
  const parsed = parseEnvelope(relayed);
  assert.ok(parsed);
  assert.equal(await openEnvelope(parsed, bob.privateKey), 'Hey Bob');
});

test('rejects bad input', async () => {
  const { json, send } = setup();
  assert.equal((await send('v1', '')).status, 400);
  assert.equal((await send('v1', 'Hi', 'nobody')).status, 400);
  assert.equal((await json('/api/v1/conversations/99/messages')).status, 404);
  assert.equal((await json('/api/users/1/key', { method: 'PUT', body: JSON.stringify({ publicKey: 'nope' }) })).status, 400);
});

test('admin can change membership and reset', async () => {
  const { db, json, send } = setup();
  await send('v1', 'Hello');
  const changed = await json('/api/admin/conversations/1/members', {
    method: 'PUT',
    body: JSON.stringify({ memberUserIds: ['1', '2', '3'] }),
  });
  assert.deepEqual(changed.body.conversation.memberUserIds, ['1', '2', '3']);
  await json('/api/admin/reset', { method: 'POST' });
  assert.equal(db.messages('1').length, 0);
  assert.deepEqual(db.conversation('1')?.memberUserIds, ['1', '2']);
});

test('the server keeps only the newest ephemeral key per user and conversation', async () => {
  const { json } = setup();
  const put = (publicKey: string) =>
    json('/api/conversations/1/ephemeral-keys/2', {
      method: 'PUT',
      body: JSON.stringify({ publicKey, expiresAt: new Date(Date.now() + 60_000).toISOString() }),
    });
  await put(generateKeyPair().publicKey);
  const second = generateKeyPair().publicKey;
  await put(second);
  const { body } = await json('/api/conversations/1/ephemeral-keys');
  assert.equal(body.keys.length, 1);
  assert.equal(body.keys[0].publicKey, second);
});
