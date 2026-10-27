import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

const PRAGMA = new URL('../../../../../../apps/pragma', import.meta.url).pathname;
const sitePort = Number(process.argv[2] ?? 5181);
const apiPort = Number(process.argv[3] ?? 3181);
const requireFromPragma = createRequire(`${PRAGMA}/package.json`);
const { createServer } = await import(pathToFileURL(requireFromPragma.resolve('vite')).href);

const server = await createServer({
  configFile: `${PRAGMA}/vite.config.ts`,
  server: {
    port: sitePort,
    strictPort: true,
    host: '127.0.0.1',
    proxy: { '/api': `http://127.0.0.1:${apiPort}` },
  },
});
await server.listen();
server.printUrls();
