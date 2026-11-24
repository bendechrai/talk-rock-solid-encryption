import { demoScene } from '../demo/Demo.tsx';
import { endToEnd as endToEndProtocol, plaintext, serverSide } from '../demo/protocols.ts';
import type { Scene } from '../engine/types.ts';
import { deviceScenes } from './devices.tsx';
import { endToEnd } from './endToEnd.tsx';
import { afterDemo4, beforeDemo4 } from './ephemeral.tsx';
import { metadataScenes } from './metadata.tsx';
import { afterDemo3 } from './multiRecipient.tsx';
import { afterDemo2, beforeDemo1, betweenDemo1And2 } from './opening.tsx';
import { rotationScenes } from './rotation.tsx';
import { scalingScenes } from './scaling.tsx';
import { sectionTitle } from './sectionTitle.tsx';

/** The talk, in order. */
export const scenes: Scene[] = [
  ...beforeDemo1,
  demoScene(
    'demo-1',
    'Demo 1: a simple chat app',
    plaintext,
    'Send a message each way. Open the server: users, conversations, and the messages in plain text. Change the conversation number in the API tab to read anyone\u2019s chat.',
  ),
  ...betweenDemo1And2,
  demoScene(
    'demo-2',
    'Demo 2: encrypted on the server',
    serverSide,
    'Send messages. The database now holds ciphertext, but the API still answers in plaintext. Decrypt tab: with the one server key, every message opens.',
  ),
  ...afterDemo2,
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
  ...afterDemo3,
  ...beforeDemo4,
  ...afterDemo4,
  ...rotationScenes,
  ...deviceScenes,
  ...scalingScenes,
  ...metadataScenes,
];
