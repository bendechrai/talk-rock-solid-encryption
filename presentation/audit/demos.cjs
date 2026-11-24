/**
 * Play the four phone demos the way Ben presents them (docs/transcript-ndc-melbourne-2025.md,
 * from 5:14, 10:25, 16:23 and 35:31) and check that each one does what he says it does. Also
 * checks, at each stopping point, that everything on screen is large enough to read.
 *
 * Needs the server and the presentation running (npm run dev). It resets the database.
 *
 *   node audit/demos.cjs [screenshot-dir]
 */
const fs = require('node:fs');
const path = require('node:path');
const { BASE, openDeck, goTo, smallText } = require('./lib.cjs');

const shots = process.argv[2];
let failures = 0;

function check(what, ok, detail = '') {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}${!ok && detail ? `\n       ${detail}` : ''}`);
  if (!ok) failures++;
}

(async () => {
  const { browser, page, problems } = await openDeck();
  if (shots) fs.mkdirSync(shots, { recursive: true });

  const database = async () => (await page.request.get(`${BASE}/api/admin/database`)).json();
  const phone = (index) => page.locator('.phone').nth(index);
  const settle = (ms = 1300) => page.waitForTimeout(ms);
  const bubbles = async (index) => (await phone(index).locator('.bubble').allInnerTexts()).map((t) => t.replace(/\s+/g, ' ').trim());
  const say = async (index, text) => {
    await phone(index).locator('.composer input').fill(text);
    await phone(index).locator('.composer input').press('Enter');
    await settle(900);
  };
  const openChat = async (index, name) => { await phone(index).getByRole('button', { name }).first().click(); await settle(900); };
  const switchUser = async (index, name) => {
    await phone(index).locator('.switcher-button').click();
    await phone(index).getByRole('menuitem', { name }).click();
    await settle(900);
  };
  const behindTheScenes = async (front = 0) => {
    await page.getByRole('button', { name: 'Behind the scenes' }).click();
    await page.locator('.phone-picker .pick').nth(front).click();
    await settle();
  };
  const backToPhones = async () => { await page.getByRole('button', { name: 'Phones', exact: true }).click(); await settle(600); };
  const tab = async (name) => { await page.getByRole('tab', { name }).click(); await settle(900); };
  const inspectorText = async () => (await page.locator('.inspector-body').innerText()).replace(/\s+/g, ' ');
  const stored = async (index) => (await database()).messages.at(index);
  const sealedFor = (message) => JSON.parse(message.content).recipients.map((r) => r.userId).join(',');
  const snap = async (name) => { if (shots) await page.screenshot({ path: path.join(shots, `${name}.png`) }); };
  const legible = async (where) => {
    const small = await smallText(page);
    check(`${where}: everything on screen is readable from the back`, small.length === 0,
      small.slice(0, 6).map((s) => `"${s.text}" is ${s.size}px (needs ${s.limit})`).join('; '));
  };
  const localKeys = (userId) => page.evaluate((id) => ({
    identity: JSON.parse(localStorage.getItem(`whisper:identity:${id}`) ?? 'null'),
    ephemeral: JSON.parse(localStorage.getItem(`whisper:ephemeral:${id}`) ?? '[]'),
  }), userId);

  await page.request.post(`${BASE}/api/admin/reset`);
  await page.evaluate(() => localStorage.clear());

  // ---------------------------------------------------------------------------------------
  console.log('\nDemo 1: a simple chat app (transcript 5:14)');
  await goTo(page, 'demo-1', 0);
  await page.reload();
  await settle();

  check('two phones, starting as Alice and Bob', (await phone(0).locator('.phone-name').innerText()) === 'Alice' && (await phone(1).locator('.phone-name').innerText()) === 'Bob');
  await phone(0).locator('.switcher-button').click();
  const people = await phone(0).getByRole('menuitem').allInnerTexts();
  check('any phone can switch between Alice, Bob, Charlie and Eve', people.join(',') === 'Alice,Bob,Charlie,Eve', people.join(','));
  await phone(0).locator('.switcher-button').click();
  await legible('Demo 1, conversation lists');

  await openChat(0, 'Alice & Bob');
  await say(0, 'Hello');
  await openChat(1, 'Alice & Bob');
  check('Alice says "Hello" and it is on Bob\'s phone', (await bubbles(1)).join('|') === 'Hello', (await bubbles(1)).join('|'));
  await say(1, 'Yo');
  await settle();
  check('Bob replies "Yo" and it arrives on Alice\'s phone', (await bubbles(0)).join('|') === 'Hello|Yo', (await bubbles(0)).join('|'));
  await legible('Demo 1, chatting');
  await snap('demo1-phones');

  await behindTheScenes(0);
  let text = await inspectorText();
  check('behind the scenes: messages are stored in plain text', text.includes('Hello') && text.includes('Yo') && text.includes('plaintext'));
  await legible('Demo 1, messages table');
  await snap('demo1-messages');
  await tab('Chats');
  text = await inspectorText();
  check('conversations table lists the four chats', ['Alice & Bob', 'Alice & Charlie', 'Bob & Charlie', 'Group Chat'].every((n) => text.includes(n)));
  check('users table lists Alice, Bob, Charlie and Eve', (await page.locator('.users .user').count()) === 4);
  const eveIn = await page.locator('.member.in', { hasText: 'Eve' }).count();
  check('Eve is not a member of any chat', eveIn === 0);
  await legible('Demo 1, chats table');
  await tab('API');
  await page.getByRole('button', { name: 'GET' }).click();
  await settle(700);
  check('the API hands the conversation to anyone who asks', (await page.locator('.result').innerText()).includes('"Hello"'));
  await legible('Demo 1, API');
  await snap('demo1-api');

  // ---------------------------------------------------------------------------------------
  console.log('\nDemo 2: encrypted on the server (transcript 10:25)');
  await goTo(page, 'demo-2', 0);
  await settle();
  await openChat(0, 'Alice & Bob');
  await openChat(1, 'Alice & Bob');
  check('the earlier "Hello" and "Yo" are still readable', (await bubbles(0)).join('|') === 'Hello|Yo', (await bubbles(0)).join('|'));
  await say(0, 'How are you doing?');
  await say(1, 'Not bad');
  await settle();
  check('both phones show the new conversation in the clear', (await bubbles(1)).join('|') === 'Hello|Yo|How are you doing?|Not bad', (await bubbles(1)).join('|'));
  let row = await stored(2);
  check('the database no longer holds readable text for the new message', !row.content.includes('How are you doing?') && row.content.includes('ciphertext'), row.content.slice(0, 80));
  await legible('Demo 2, chatting');

  await behindTheScenes(0);
  text = await inspectorText();
  check('behind the scenes: new rows are marked as encrypted with the server key', (text.match(/server key/g) ?? []).length === 2);
  await legible('Demo 2, messages table');
  await snap('demo2-messages');
  await tab('Decrypt');
  check('the decrypt tool starts with the one server key', (await page.locator('.tool input').inputValue()) === 'super-secret-encryption-key');
  await page.locator('.tool textarea').fill(row.content);
  await page.getByRole('button', { name: 'Decrypt' }).click();
  await settle(900);
  check('with that key, the stored message decrypts', (await page.locator('.tool output').innerText()) === 'How are you doing?');
  await legible('Demo 2, decrypt tool');
  await snap('demo2-decrypt');
  await tab('API');
  await page.getByRole('button', { name: 'GET' }).click();
  await settle(700);
  text = await page.locator('.result').innerText();
  check('the API still answers in plaintext, because the server decrypts for anyone', text.includes('How are you doing?') && text.includes('Not bad'));
  await snap('demo2-api');

  // ---------------------------------------------------------------------------------------
  console.log('\nDemo 3: end-to-end encryption (transcript 16:23)');
  await goTo(page, 'demo-3', 0);
  await settle();
  check('both phones ask for a key pair first', (await page.getByRole('button', { name: 'Generate key pair' }).count()) === 2);
  await legible('Demo 3, key setup');
  await snap('demo3-setup');
  await phone(0).getByRole('button', { name: 'Generate key pair' }).click();
  await settle();
  await openChat(0, 'Alice & Bob');
  let seen = await bubbles(0);
  check('Alice sees the plaintext messages, and cannot read the two the server encrypted',
    seen.join('|') === 'Hello|Yo|Server-encrypted|Server-encrypted', seen.join('|'));

  await behindTheScenes(0);
  await tab('Keys');
  check('the server holds one public key: Alice\'s', (await page.locator('.rows .row').count()) === 1 && (await inspectorText()).includes('Alice'));
  await tab('Devices');
  const device = async (name) => (await page.locator('.card', { hasText: `${name}’s device` }).innerText()).replace(/\s+/g, ' ');
  check('devices: Alice has a key pair, Bob has none', (await device('Alice')).includes('private') && (await device('Bob')).includes('No key pair'), await device('Bob'));
  await legible('Demo 3, devices');
  await tab('Messages');
  await say(0, 'Hey Bob');
  row = await stored(-1);
  check('"Hey Bob" is sealed for Alice only, because Bob has no key yet', sealedFor(row) === '1', sealedFor(row));
  check('the new row appears in the messages table as it is sent', (await inspectorText()).includes('sealed × 1'));
  await legible('Demo 3, messages table');
  await snap('demo3-sealed-for-alice');

  await backToPhones();
  await phone(1).getByRole('button', { name: 'Generate key pair' }).click();
  await settle();
  await behindTheScenes(1);
  await tab('Devices');
  check('devices view updates at once when Bob generates a pair', (await device('Bob')).includes('private'), await device('Bob'));
  await tab('Keys');
  check('the server now holds two public keys', (await page.locator('.rows .row').count()) === 2);
  await legible('Demo 3, keys');
  await backToPhones();
  await openChat(1, 'Alice & Bob');
  seen = await bubbles(1);
  check('Bob sees "Hey Bob" as not meant for him', seen.at(-1) === 'Not for you', seen.join('|'));
  await say(1, 'eh');
  await settle();
  row = await stored(-1);
  check('Bob\'s reply is sealed twice: once for Alice, once for Bob', sealedFor(row) === '1,2', sealedFor(row));
  check('Alice reads Bob\'s reply', (await bubbles(0)).at(-1).startsWith('eh'), (await bubbles(0)).at(-1));
  await legible('Demo 3, chatting');
  await snap('demo3-phones');

  await behindTheScenes(1);
  await tab('Chats');
  await page.locator('.card', { hasText: 'Alice & Bob' }).getByRole('button', { name: 'Charlie' }).click();
  await settle();
  await backToPhones();
  await switchUser(1, 'Charlie');
  await phone(1).getByRole('button', { name: 'Generate key pair' }).click();
  await settle();
  await openChat(1, 'Alice & Bob');
  seen = await bubbles(1);
  check('Charlie joins and can read none of the earlier end-to-end messages', seen.slice(-2).join('|') === 'Not for you|Not for you', seen.join('|'));
  await say(1, 'I am here');
  await settle();
  row = await stored(-1);
  check('Charlie\'s message is sealed three times', sealedFor(row) === '1,2,3', sealedFor(row));
  check('Alice reads Charlie\'s message', (await bubbles(0)).at(-1).startsWith('I am here'));
  await snap('demo3-charlie');
  await switchUser(1, 'Bob');
  await openChat(1, 'Alice & Bob');
  check('Bob reads Charlie\'s message too', (await bubbles(1)).at(-1).startsWith('I am here'));

  await behindTheScenes(0);
  await tab('Decrypt');
  await page.locator('.tool input').fill((await localKeys('2')).identity.privateKey);
  await page.locator('.tool textarea').fill(row.content);
  await page.getByRole('button', { name: 'Decrypt' }).click();
  await settle(900);
  check('any one of the three private keys opens its own copy', (await page.locator('.tool output').innerText()) === 'I am here');
  await page.locator('.tool input').fill('00'.repeat(32));
  await page.getByRole('button', { name: 'Decrypt' }).click();
  await settle(900);
  check('a key that is not one of the three opens nothing', (await page.locator('.tool output').innerText()).includes('none'));
  await legible('Demo 3, decrypt tool');
  await tab('Messages');
  await page.locator('.card').last().getByRole('button', { name: 'Raw' }).click();
  await settle(500);
  check('the raw stored value can be shown, with one entry per recipient', (await page.locator('.raw').innerText()).includes('"recipients"'));
  await legible('Demo 3, raw message');
  await snap('demo3-raw');

  // ---------------------------------------------------------------------------------------
  console.log('\nDemo 4: short-lived chat keys (transcript 35:31)');
  await goTo(page, 'demo-4', 0);
  await settle();
  await openChat(0, 'Alice & Bob');
  check('Alice already has an identity key, and is asked for a key for this chat', (await phone(0).getByRole('button', { name: 'Generate chat key' }).count()) === 1);
  await legible('Demo 4, chat key setup');
  await snap('demo4-setup');
  await phone(0).getByRole('button', { name: 'Generate chat key' }).click();
  await settle();
  seen = await bubbles(0);
  check('earlier messages still open with her identity key', seen.some((t) => t.startsWith('Hey Bob')), seen.join('|'));
  await say(0, 'hello again');
  await settle();
  row = await stored(-1);
  let copies = JSON.parse(row.content).recipients;
  check('the new message is sealed with a chat key, for Alice only so far', copies.length === 1 && copies[0].keyType === 'ephemeral' && copies[0].userId === '1', JSON.stringify(copies.map((c) => [c.userId, c.keyType])));
  check('the phone marks it as opened with a chat key (dashed ring)', (await phone(0).locator('.bubble-row').last().locator('.key-tag circle[stroke-dasharray]').count()) === 1);
  check('Alice is told who cannot read it yet', (await phone(0).locator('.notice').innerText()).includes('no key for this chat'), await phone(0).locator('.notice').innerText().catch(() => ''));

  await openChat(1, 'Alice & Bob');
  check('Bob is asked to generate his chat key', (await phone(1).getByRole('button', { name: 'Generate chat key' }).count()) === 1);
  await phone(1).getByRole('button', { name: 'Generate chat key' }).click();
  await settle();
  check('Bob cannot read the message sent before his key existed', (await bubbles(1)).at(-1) === 'Not for you', (await bubbles(1)).at(-1));
  await say(1, '??');
  await say(0, 'Where have you been?');
  await settle();
  check('from here both read each other', (await bubbles(1)).at(-1).startsWith('Where have you been?') && (await bubbles(0)).at(-2).startsWith('??'));
  await legible('Demo 4, chatting');
  await snap('demo4-phones');

  await behindTheScenes(1);
  await tab('Keys');
  text = await inspectorText();
  check('the server lists one active chat key each for Alice and Bob', (text.match(/active \d+s/g) ?? []).length === 2, text);
  await legible('Demo 4, keys');
  await snap('demo4-keys');
  await tab('Devices');
  await legible('Demo 4, devices');
  await snap('demo4-devices');

  // On stage Ben waits out the minute. The Expire button does the same thing at once.
  const bobFirst = (await localKeys('2')).ephemeral[0];
  await page.locator('.card', { hasText: 'Bob’s device' }).getByRole('button', { name: 'Expire' }).click();
  await settle();
  check('Bob\'s chat key now shows as expired on his device', (await page.locator('.card', { hasText: 'Bob’s device' }).innerText()).includes('expired'));
  check('messages opened with it are flagged as expired on his phone', (await phone(1).locator('.key-tag.expired').count()) > 0);
  await say(1, 'hi');
  await settle();
  let bobKeys = (await localKeys('2')).ephemeral;
  check('sending again makes Bob a new chat key, and his device keeps the old one', bobKeys.length === 2 && bobKeys[1].expiresAt > Date.now());
  let serverKeys = (await database()).ephemeralKeys.filter((k) => k.userId === '2');
  check('the server keeps only Bob\'s newest public key', serverKeys.length === 1 && serverKeys[0].id === bobKeys[1].id && serverKeys[0].id !== bobFirst.id);
  await snap('demo4-rotated');

  // Alice's key expires while she is idle: Bob can only seal to her old key, and she can still read it.
  const aliceFirst = (await localKeys('1')).ephemeral[0];
  await page.locator('.card', { hasText: 'Alice’s device' }).getByRole('button', { name: 'Expire' }).click();
  await settle();
  await say(1, 'still there?');
  await settle();
  row = await stored(-1);
  copies = JSON.parse(row.content).recipients;
  check('with nothing newer on the server, Bob seals to Alice\'s expired key', copies.find((c) => c.userId === '1').keyId === aliceFirst.id);
  check('Alice has not made a new key, since she has not sent anything', (await localKeys('1')).ephemeral.length === 1);
  await page.locator('.phone-picker .pick').nth(0).click();
  await settle();
  seen = await bubbles(0);
  check('Alice can still read it, because her device kept the old private key', seen.at(-1).startsWith('still there?') && seen.at(-1).includes('expired'), seen.at(-1));
  await say(0, 'yes');
  await settle();
  check('when Alice next sends, she gets a new chat key', (await localKeys('1')).ephemeral.length === 2);

  // The retention choice: delete the old private key and its messages are gone for good.
  await tab('Decrypt');
  await page.locator('.tool textarea').fill(row.content);
  await page.locator('.tool input').fill((await localKeys('2')).identity.privateKey);
  await page.getByRole('button', { name: 'Decrypt' }).click();
  await settle(900);
  check('Bob\'s identity key opens no chat-key message: stealing it reveals nothing', (await page.locator('.tool output').innerText()).includes('none'));
  await page.locator('.tool input').fill(aliceFirst.privateKey);
  await page.getByRole('button', { name: 'Decrypt' }).click();
  await settle(900);
  check('the matching chat key does open it', (await page.locator('.tool output').innerText()) === 'still there?');
  await legible('Demo 4, decrypt tool');

  await tab('Devices');
  await page.locator('.card', { hasText: 'Alice’s device' }).locator('.chat-key').first().getByRole('button', { name: 'Delete' }).click();
  await settle(1600);
  seen = await bubbles(0);
  check('deleting Alice\'s old private key makes its messages unreadable on her phone', seen.includes('Key is gone') && !seen.some((t) => t.startsWith('still there?')), seen.join('|'));
  await legible('Demo 4, after deleting a key');
  await snap('demo4-deleted');

  // ---------------------------------------------------------------------------------------
  console.log('\nReset');
  await page.getByRole('button', { name: 'Reset' }).click();
  await page.getByRole('button', { name: 'Sure?' }).click();
  await settle();
  const after = await database();
  check('"Reset" empties the database and the devices', after.messages.length === 0 && after.publicKeys.length === 0 && (await localKeys('1')).identity === null);

  problems.forEach((problem) => console.log(problem));
  console.log(`\n${failures} check(s) failed, ${problems.length} browser error(s).`);
  await browser.close();
  process.exit(failures || problems.length ? 1 : 0);
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
