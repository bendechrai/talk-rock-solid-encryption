import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// The presentation talks to the Whisper server through this proxy, so the browser only ever
// sees one origin and the demos work without CORS configuration.
const server = process.env.WHISPER_SERVER ?? 'http://localhost:4000';

export default defineConfig({
  plugins: [react()],
  server: { port: 5173, proxy: { '/api': server } },
  preview: { port: 5173, proxy: { '/api': server } },
});
