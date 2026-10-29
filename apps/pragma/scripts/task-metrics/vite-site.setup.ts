import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const PRAGMA_ROOT = fileURLToPath(new URL('../../', import.meta.url));
const DEFAULT_SITE_PORT = 5181;
const DEFAULT_API_PORT = 3181;

const sitePort = Number(process.argv[2] ?? DEFAULT_SITE_PORT);
const apiPort = Number(process.argv[3] ?? DEFAULT_API_PORT);

const server = await createServer({
  configFile: `${PRAGMA_ROOT}vite.config.ts`,
  server: {
    port: sitePort,
    strictPort: true,
    host: '127.0.0.1',
    proxy: { '/api': `http://127.0.0.1:${String(apiPort)}` },
  },
});
await server.listen();
server.printUrls();
