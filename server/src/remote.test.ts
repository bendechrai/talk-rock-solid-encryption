import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createApp } from './app.ts';
import { Database } from './db.ts';

const TOKEN = 'abcdefghijklmnopqrstuv';

function setup() {
  const app = createApp(new Database());
  const post = async (path: string, body: unknown) => {
    const response = await app.request(path, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    return response.status;
  };

  /** Open an event stream and return a way to read its next events. */
  const listen = async (token: string, role: string) => {
    const abort = new AbortController();
    const response = await app.request(`/api/remote/${token}/events?role=${role}`, { signal: abort.signal });
    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    let buffered = '';
    const next = async (wanted: string): Promise<unknown> => {
      assert.ok(reader, 'the stream has a body');
      for (;;) {
        const end = buffered.indexOf('\n\n');
        if (end !== -1) {
          const block = buffered.slice(0, end);
          buffered = buffered.slice(end + 2);
          const event = /^event: (.*)$/m.exec(block)?.[1];
          const data = /^data: (.*)$/m.exec(block)?.[1] ?? '';
          if (event === wanted) return JSON.parse(data);
          continue;
        }
        const { value, done } = await reader.read();
        assert.equal(done, false, `stream ended while waiting for ${wanted}`);
        buffered += decoder.decode(value, { stream: true });
      }
    };
    return { status: response.status, next, close: () => abort.abort() };
  };

  return { post, listen };
}

test('remote: the stage and a phone hear each other through the token', async () => {
  const { post, listen } = setup();
  const stage = await listen(TOKEN, 'stage');
  assert.equal(stage.status, 200);
  assert.deepEqual(await stage.next('presence'), { stages: 1, remotes: 0, audience: 0 });

  assert.equal(await post(`/api/remote/${TOKEN}/position`, { scene: 'e2e', step: 3 }), 200);

  // A phone that joins later is told where the stage already is.
  const phone = await listen(TOKEN, 'remote');
  assert.deepEqual(await phone.next('position'), { scene: 'e2e', step: 3, audienceCode: false });
  assert.deepEqual(await stage.next('presence'), { stages: 1, remotes: 1, audience: 0 });

  assert.equal(await post(`/api/remote/${TOKEN}/command`, { action: 'next' }), 200);
  assert.deepEqual(await stage.next('command'), { action: 'next' });

  assert.equal(await post(`/api/remote/${TOKEN}/command`, { action: 'goto', scene: 'demo-1', step: 0 }), 200);
  assert.deepEqual(await stage.next('command'), { action: 'goto', scene: 'demo-1', step: 0 });

  assert.equal(await post(`/api/remote/${TOKEN}/position`, { scene: 'e2e', step: 4 }), 200);
  assert.deepEqual(await phone.next('position'), { scene: 'e2e', step: 4, audienceCode: false });

  stage.close();
  phone.close();
});

test('remote: the audience can follow with its own token, and can do nothing else', async () => {
  const { post, listen } = setup();
  const stage = await listen(TOKEN, 'stage');
  const { token: follow } = (await stage.next('follow')) as { token: string };
  assert.notEqual(follow, TOKEN);
  await stage.next('presence');
  assert.equal(await post(`/api/remote/${TOKEN}/position`, { scene: 'e2e', step: 1, audienceCode: true }), 200);

  const follower = await listen(follow, 'audience');
  assert.equal(follower.status, 200);
  assert.deepEqual(await follower.next('position'), { scene: 'e2e', step: 1, audienceCode: true });
  assert.deepEqual(await stage.next('presence'), { stages: 1, remotes: 0, audience: 1 });

  // The follow token does not drive the talk, report a position, or open the presenter's stream.
  assert.equal(await post(`/api/remote/${follow}/command`, { action: 'next' }), 404);
  assert.equal(await post(`/api/remote/${follow}/position`, { scene: 'e2e', step: 9 }), 404);
  assert.equal((await listen(follow, 'remote')).status, 404);
  // Nor does the presenter's token work as a follow token.
  assert.equal((await listen(TOKEN, 'audience')).status, 404);

  assert.equal(await post(`/api/remote/${TOKEN}/command`, { action: 'audience-code' }), 200);
  assert.deepEqual(await stage.next('command'), { action: 'audience-code' });

  assert.equal(await post(`/api/remote/${TOKEN}/position`, { scene: 'e2e', step: 2 }), 200);
  assert.deepEqual(await follower.next('position'), { scene: 'e2e', step: 2, audienceCode: false });

  stage.close();
  follower.close();
});

test('remote: nothing works without a token a stage has opened', async () => {
  const { post, listen } = setup();
  assert.equal(await post(`/api/remote/${TOKEN}/command`, { action: 'next' }), 404);
  assert.equal(await post(`/api/remote/${TOKEN}/position`, { scene: 'e2e', step: 1 }), 404);
  assert.equal((await listen(TOKEN, 'remote')).status, 404);
  assert.equal((await listen('short', 'stage')).status, 400);
  assert.equal((await listen(TOKEN, 'audience')).status, 404);
  assert.equal((await listen(TOKEN, 'nobody')).status, 400);
});

test('remote: rejects malformed positions and commands', async () => {
  const { post, listen } = setup();
  const stage = await listen(TOKEN, 'stage');
  await stage.next('presence');
  assert.equal(await post(`/api/remote/${TOKEN}/command`, { action: 'reset' }), 400);
  assert.equal(await post(`/api/remote/${TOKEN}/command`, { action: 'goto', scene: 'e2e' }), 400);
  assert.equal(await post(`/api/remote/${TOKEN}/position`, { scene: 'e2e', step: -1 }), 400);
  assert.equal(await post(`/api/remote/${TOKEN}/position`, 'nonsense'), 400);
  stage.close();
});
