import { serve } from '@hono/node-server';
import { createApp } from './app';
import { type SecretName, useSecretReader } from './helpers/secrets/secrets.setup';

const DEFAULT_PORT = 3001;
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

// @FollowsBlueprint api-dev-entrypoint
const app = createApp();

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`talos api listening on http://localhost:${info.port}`);
  console.log(`bootstrap code: ${DEVELOPMENT_SECRETS['bootstrap-code'] ?? ''}`);
  console.log(`notify secret: ${DEVELOPMENT_SECRETS['notify-secret'] ?? ''}`);
});
