import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { createApp } from './app.ts';
import { Database } from './db.ts';
import { Devices } from './devices.ts';

/** A browser: it keeps the cookie it is given and sends it back. */
function browser(app: ReturnType<typeof createApp>) {
  let cookie = '';
  const call = async (method: string, path: string, body?: unknown) => {
    const response = await app.request(path, {
      method,
      headers: { ...(cookie ? { cookie } : {}), ...(body === undefined ? {} : { 'content-type': 'application/json' }) },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const set = response.headers.get('set-cookie');
    if (set) cookie = set.split(';')[0];
    return { status: response.status, body: (await response.json().catch(() => null)) as Record<string, unknown> | null };
  };
  return { call, load: (kind: string) => call('POST', '/api/device', { kind }) };
}

test('devices: nothing is locked until a stage has been opened', async () => {
  const app = createApp(new Database());
  assert.equal((await browser(app).call('GET', '/api/users')).status, 200);
  // Someone following along does not become the presenter by arriving first.
  const early = browser(app);
  assert.equal((await early.load('audience')).body?.owner, false);
  assert.equal((await early.call('GET', '/api/users')).status, 200);
});

test('devices: the first stage owns the demos, and decides who else may use them', async () => {
  const app = createApp(new Database());
  const stage = browser(app);
  const guest = browser(app);

  assert.deepEqual((await stage.load('stage')).body && { owner: true, demos: true }, { owner: true, demos: true });
  const arrived = (await guest.load('audience')).body;
  assert.equal(arrived?.owner, false);
  assert.equal(arrived?.demos, false);

  // A second browser opening the stage later does not take it over, and a reload keeps it.
  assert.equal((await browser(app).load('stage')).body?.owner, false);
  assert.equal((await stage.load('stage')).body?.owner, true);

  assert.equal((await stage.call('GET', '/api/admin/database')).status, 200);
  assert.equal((await guest.call('GET', '/api/users')).status, 403);
  assert.equal((await guest.call('POST', '/api/v1/conversations/1/messages', { sender: '1', content: 'hi' })).status, 403);
  assert.equal((await browser(app).call('POST', '/api/admin/reset')).status, 403);
  // The rest of the talk stays open to them.
  assert.equal((await guest.call('GET', '/api/health')).status, 200);

  // Only the presenter sees the list or changes it.
  assert.equal((await guest.call('GET', '/api/device/all')).status, 403);
  assert.equal((await guest.call('POST', '/api/device/all/open', { open: true })).status, 403);
  assert.equal((await guest.call('POST', `/api/device/all/${arrived?.id}`, { demos: true })).status, 403);

  // The guest is listed once the presenter has let it in.
  assert.equal((await stage.call('POST', `/api/device/all/${arrived?.id}`, { demos: true })).status, 200);
  assert.equal((await guest.call('GET', '/api/users')).status, 200);
  const listed = (await stage.call('GET', '/api/device/all')).body?.devices as { id: string; owner: boolean; demos: boolean; you: boolean }[];
  assert.deepEqual(listed.find((d) => d.id === arrived?.id), { ...listed.find((d) => d.id === arrived?.id), owner: false, demos: true, you: false });
  assert.equal(listed.find((d) => d.you)?.owner, true);

  assert.equal((await stage.call('POST', `/api/device/all/${arrived?.id}`, { demos: false })).status, 200);
  assert.equal((await guest.call('GET', '/api/users')).status, 403);

  assert.equal((await stage.call('POST', '/api/device/all/open', { open: true })).status, 200);
  assert.equal((await browser(app).call('GET', '/api/users')).status, 200);
});

test('devices: the record survives a restart, and the stage key adds a presenter', async () => {
  const file = join(mkdtempSync(join(tmpdir(), 'talk-devices-')), 'stage.json');
  const first = createApp(new Database(), new Devices(file));
  const stage = browser(first);
  await stage.load('stage');

  // A new process reading the same file: the stage is still taken.
  const second = createApp(new Database(), new Devices(file));
  const guest = browser(second);
  assert.equal((await guest.load('stage')).body?.owner, false);
  assert.equal((await guest.call('GET', '/api/users')).status, 403);

  assert.equal((await guest.call('POST', '/api/device/claim', { key: 'guess' })).status, 403);
  const { key } = JSON.parse(readFileSync(file, 'utf8')) as { key: string };
  assert.equal((await guest.call('POST', '/api/device/claim', { key })).body?.owner, true);
  assert.equal((await guest.call('GET', '/api/users')).status, 200);
});
