import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  decryptSymmetric, encryptSymmetric, generateKeyPair, openEnvelope, openWithPrivateKey,
  parseEnvelope, sealEnvelope, sealForPublicKey,
} from './index.ts';

test('symmetric: the same passphrase decrypts, a different one does not', async () => {
  const box = await encryptSymmetric('Hi!', 'super-secret-encryption-key');
  assert.equal(await decryptSymmetric(box, 'super-secret-encryption-key'), 'Hi!');
  assert.equal(await decryptSymmetric(box, 'wrong-key'), null);
});

test('asymmetric: only the recipient private key opens a sealed box', async () => {
  const alice = generateKeyPair();
  const bob = generateKeyPair();
  const box = await sealForPublicKey('Hi Bob!', bob.publicKey);
  assert.equal(await openWithPrivateKey(box, bob.privateKey), 'Hi Bob!');
  assert.equal(await openWithPrivateKey(box, alice.privateKey), null);
});

test('envelope: every recipient opens their own copy, outsiders open none', async () => {
  const alice = generateKeyPair();
  const bob = generateKeyPair();
  const eve = generateKeyPair();
  const envelope = await sealEnvelope('Hi all', '1', [
    { userId: '1', publicKey: alice.publicKey, keyType: 'identity' },
    { userId: '2', publicKey: bob.publicKey, keyType: 'identity' },
  ]);
  const stored = parseEnvelope(JSON.stringify(envelope));
  assert.ok(stored);
  assert.equal(stored.recipients.length, 2);
  assert.equal(await openEnvelope(stored, alice.privateKey), 'Hi all');
  assert.equal(await openEnvelope(stored, bob.privateKey), 'Hi all');
  assert.equal(await openEnvelope(stored, eve.privateKey), null);
  assert.equal(parseEnvelope('Hello'), null);
});
