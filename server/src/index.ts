import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApp } from './app.ts';
import { Database } from './db.ts';

const port = Number(process.env.PORT ?? 4000);
const dataFile = process.env.WHISPER_DB ?? fileURLToPath(new URL('../data/db.json', import.meta.url));
/** The built presentation (`npm run build`). When it exists, this one process serves the whole talk. */
const staticDir = process.env.WHISPER_STATIC ?? fileURLToPath(new URL('../../presentation/dist', import.meta.url));

const app = createApp(new Database(dataFile));

const servesTalk = existsSync(join(staticDir, 'index.html'));
if (servesTalk) app.use('*', serveStatic({ root: staticDir }));

serve({ fetch: app.fetch, port }, () => {
  console.log(`Whisper server listening on http://localhost:${port}`);
  console.log(`Database file: ${dataFile}`);
  console.log(servesTalk ? `Serving the built presentation from ${staticDir}` : 'API only: no built presentation found');
});
