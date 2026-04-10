import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Dev-only middleware: legacy URLs at /Kalgoh/* (from the GitHub Pages era)
// should bounce to /* so auth callbacks in the old format still work.
function legacyRedirect() {
  return {
    name: 'kalgoh-legacy-redirect',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url && req.url.startsWith('/Kalgoh')) {
          const rest = req.url.slice('/Kalgoh'.length) || '/';
          res.writeHead(302, { Location: rest });
          res.end();
          return;
        }
        next();
      });
    },
  };
}

export default defineConfig({
  base: '/',
  plugins: [legacyRedirect(), react(), tailwindcss()],
})
