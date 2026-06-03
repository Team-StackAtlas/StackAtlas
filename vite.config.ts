import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    // NOTE: We intentionally do NOT inject GEMINI_API_KEY via `define` here.
    // Baking the key into the client bundle exposed it to anyone who downloaded
    // the JS. The key is now read at runtime from window.__APP_CONFIG__ (see
    // index.html), which the host can populate per-deployment.
    // TODO(security): The Gemini call still happens client-side in
    // src/pages/ToolAssistant.tsx, so the key remains reachable by the browser.
    // This must be moved behind a server-side proxy before production use.
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
