import { serve } from '@hono/node-server';
import { fileURLToPath } from 'node:url';
import { createApp } from './app.ts';
import { Database } from './db.ts';

const port = Number(process.env.PORT ?? 4000);
const dataFile = process.env.WHISPER_DB ?? fileURLToPath(new URL('../data/db.json', import.meta.url));

const app = createApp(new Database(dataFile));

serve({ fetch: app.fetch, port }, () => {
  console.log(`Whisper server listening on http://localhost:${port}`);
  console.log(`Database file: ${dataFile}`);
});
