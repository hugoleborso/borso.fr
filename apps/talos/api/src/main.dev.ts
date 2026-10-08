import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '@hono/node-server';
import { createApp } from './app';
import { useContentStore } from './content/content-store.setup';
import { createLocalContentStore } from './content/local-content.adapter';
import { type SecretName, useSecretReader } from './helpers/secrets/secrets.setup';

const DEFAULT_PORT = 3001;
const HERE = dirname(fileURLToPath(import.meta.url));
const REPOSITORY_ROOT = process.env.TALOS_DEV_CONTENT_ROOT ?? resolve(HERE, '..', '..', '..', '..');
const DEVELOPMENT_SECRETS: Partial<Record<SecretName, string>> = {
  'session-hmac': 'talos-dev-session-hmac',
  'bootstrap-code': process.env.TALOS_DEV_BOOTSTRAP_CODE ?? 'talos-dev',
  'notify-secret': 'talos-dev-notify',
  'vapid-public':
    'BETuWdutrn7_RTt1NXs7g5lGCtPBs9g7cfeZlYtFmaSaDzDaWnPnBfWCZFxi8lBChY9S6kMLWGySeXdwmyv9LQ4',
  'vapid-private': '1QIrIuxi_wMMNHRAiyIY6XKW6UsnRDmf38w-yg13VxU',
};

process.env.TALOS_RP_ID ??= 'localhost';
const port = Number(process.env.PORT ?? DEFAULT_PORT);

useSecretReader(async (name) => await Promise.resolve(DEVELOPMENT_SECRETS[name]));
useContentStore(createLocalContentStore({ root: REPOSITORY_ROOT }));

// @FollowsBlueprint api-dev-entrypoint
const app = createApp();

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`talos api listening on http://localhost:${info.port}`);
  console.log(`reading ${REPOSITORY_ROOT} from disk, writes stay in memory`);
  console.log(`bootstrap code: ${DEVELOPMENT_SECRETS['bootstrap-code'] ?? ''}`);
  console.log(`notify secret: ${DEVELOPMENT_SECRETS['notify-secret'] ?? ''}`);
});
