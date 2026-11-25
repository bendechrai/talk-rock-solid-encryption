import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// The presentation talks to the Whisper server through this proxy, so the browser only ever
// sees one origin and the demos work without CORS configuration.
const server = process.env.WHISPER_SERVER ?? 'http://localhost:4000';

// Inside a container the dev server has to listen on every interface (VITE_HOST=0.0.0.0), and
// Vite refuses host names it has not been told about, such as a tunnel's (VITE_ALLOWED_HOSTS,
// comma-separated, or "all").
const host = process.env.VITE_HOST;
const allowed = process.env.VITE_ALLOWED_HOSTS;
const allowedHosts: true | string[] | undefined =
  allowed === 'all' ? true : allowed?.split(',').map((name) => name.trim()).filter(Boolean);

const options = { port: 5173, host, allowedHosts, proxy: { '/api': server } };

export default defineConfig({
  plugins: [react()],
  // A container runs as a user who cannot write next to the code (VITE_CACHE_DIR=/tmp/vite).
  cacheDir: process.env.VITE_CACHE_DIR,
  server: options,
  preview: options,
});
