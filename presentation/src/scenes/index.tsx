import { demoScene } from '../demo/Demo.tsx';
import { endToEnd as endToEndProtocol, plaintext, serverSide } from '../demo/protocols.ts';
import type { Scene } from '../engine/types.ts';
import { endToEnd } from './endToEnd.tsx';
import { sectionTitle } from './sectionTitle.tsx';

/** The talk, in order. */
export const scenes: Scene[] = [
  demoScene(
    'demo-1',
    'Demo 1: a simple chat app',
    plaintext,
    'Send a message each way. Open the server: users, conversations, and the messages in plain text. Change the conversation number in the API tab to read anyone\u2019s chat.',
  ),
  demoScene(
    'demo-2',
    'Demo 2: encrypted on the server',
    serverSide,
    'Send messages. The database now holds ciphertext, but the API still answers in plaintext. Decrypt tab: with the one server key, every message opens.',
  ),
  sectionTitle(
    'e2e-title',
    'End-to-end encryption: title',
    <>Let&rsquo;s build an <em>end-to-end encrypted</em> chat app</>,
    'So far: plaintext at both ends, encrypted only in the middle. Now encrypt at the ends.',
  ),
  endToEnd,
  demoScene(
    'demo-3',
    'Demo 3: end-to-end encryption',
    endToEndProtocol,
    'Generate a key pair for Alice only, send a message: it is sealed for Alice but not Bob. Generate Bob\u2019s, reply: two copies. Add Charlie to the conversation: no history, but new messages get three copies.',
  ),
];
