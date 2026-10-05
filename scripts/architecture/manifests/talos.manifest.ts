import type { ArchitectureManifest } from '../architecture-manifest';

export const talosManifest: ArchitectureManifest = {
  application: 'talos',
  name: 'Talos',
  urlOnlyScripts: ['apps/talos/site/public/sw.js'],
  description:
    "A personal assistant's phone interface: the owner's focus, todos, proposals, daily brief and notes graph, read from and written to a private Git repository that scheduled agent runs keep up to date.",
  actors: [
    {
      id: 'owner',
      icon: '🧑',
      name: 'Owner',
      description:
        'The one person the application serves. Signs in with a passkey, reads the day, checks todos, accepts or refuses proposals and writes messages to the assistant.',
    },
    {
      id: 'scheduled-run',
      icon: '⏰',
      name: 'Scheduled agent run',
      description:
        'Writes the private repository the application reads, and calls the notify endpoint with a bearer token when the owner needs a push notification.',
    },
  ],
  containers: [
    {
      id: 'site',
      hosting: 'CloudFront in front of an S3 origin, with /api/* routed to the API',
      icon: '🖥️',
      name: 'Single page application',
      technology: 'React 19, Vite, TanStack Query, Tailwind',
      description:
        'The whole interface, in French. Reads and writes through the typed Hono client and keeps the last loaded state readable offline.',
      sourceContainer: 'site',
      runtime: 'browser',
    },
    {
      id: 'service-worker',
      noScannedSourceNote:
        'Ships as apps/talos/site/public/sw.js, a plain script the scan does not read. Its registration under site/src/sw/ is counted with the single page application.',
      hosting: 'Served from the same origin as the site',
      icon: '📴',
      name: 'Service worker',
      technology: 'Plain browser script, no bundler',
      description: 'Caches the shell and shows push notifications while the application is closed.',
      sourceContainer: null,
      runtime: 'browser',
    },
    {
      id: 'api',
      hosting: 'Lambda behind an API Gateway HTTP API, eu-west-3',
      icon: '🔌',
      name: 'HTTP API',
      technology: 'Hono on AWS Lambda',
      description:
        'Every endpoint, behind a passkey session cookie except sign-in and the bearer-token notify route. Its inferred router type is the contract the single page application compiles against.',
      sourceContainer: 'api',
      runtime: 'aws',
    },
    {
      id: 'domain',
      hosting: 'Compiled into both sides, deployed on neither',
      icon: '🧩',
      name: 'Shared domain rules',
      technology: 'TypeScript module, no runtime of its own',
      description:
        'The pure parsing and writing rules for the private repository file formats, which the API and the editors both read.',
      sourceContainer: 'domain',
      runtime: 'build',
    },
    {
      id: 'database',
      icon: '🗄️',
      name: 'Application database',
      technology: 'Aurora DSQL, Postgres wire protocol, Drizzle',
      description:
        'Holds what is not content: passkeys, WebAuthn challenges, sessions, sign-in attempts and push subscriptions.',
      sourceContainer: null,
      runtime: 'aws',
      hosting: 'Aurora DSQL, eu-west-3, one cluster per application',
    },
    {
      id: 'infrastructure',
      icon: '🏗️',
      name: 'Infrastructure definition',
      technology: 'AWS CDK, PreviewableApp',
      description:
        'Composes the shared constructs into the prod stack. There is no preview stage. Build-time only, never reached at runtime.',
      sourceContainer: 'cdk',
      runtime: 'build',
      hosting: 'Runs in CI, never at runtime',
    },
  ],
  externals: [
    {
      id: 'github',
      icon: '🐙',
      name: 'GitHub contents API',
      technology: 'REST and GraphQL, fine-grained token',
      description:
        'The only store of content. Every read is a file or a tree of the private repository, and every write is a commit, so the scheduled runs and the application share one state.',
      boundary: 'third-party',
      access: 'credential',
    },
    {
      id: 'claude-routine',
      icon: '🤖',
      name: 'Agent routine trigger',
      technology: 'HTTPS POST with a bearer token',
      description:
        'Fired after a proposal decision or a message, so the assistant acts without waiting for its next scheduled run. Optional: without it the committed file waits for that run.',
      boundary: 'third-party',
      access: 'credential',
    },
    {
      id: 'web-push',
      icon: '🔔',
      name: 'Web push services',
      technology: 'VAPID-signed web push',
      description:
        "Delivers notifications to the owner's devices through each browser vendor's push service. A subscription answering 404 or 410 is deleted.",
      boundary: 'third-party',
      access: 'credential',
    },
    {
      id: 'webauthn',
      icon: '🔑',
      name: 'WebAuthn authenticator',
      technology: 'Browser credential API, verified server side by @simplewebauthn',
      description:
        "Holds the owner's passkey on their own device. The API verifies each assertion against the public key stored at registration.",
      boundary: 'third-party',
      access: 'open',
    },
    {
      id: 'aws-dsql',
      icon: '🗄️',
      name: 'Aurora DSQL',
      technology: 'AWS SDK signer plus Postgres wire protocol',
      description:
        'Connection tokens are minted per connection by the signer rather than held, so a warm Lambda never carries an expired password.',
      boundary: 'aws',
      access: 'credential',
      realisedBy: 'database',
    },
    {
      id: 'aws-ssm',
      icon: '🔐',
      name: 'SSM Parameter Store',
      technology: 'AWS SDK, GetParameter with decryption',
      description:
        'Holds every secret under /talos/ as a SecureString: the GitHub token, the VAPID keys, the session key, the bootstrap code and the notify secret.',
      boundary: 'aws',
      access: 'credential',
    },
    {
      id: 'browser-service-worker',
      icon: '📴',
      name: 'Service worker registration',
      technology: 'Browser service worker API',
      description: 'Registers the shell cache and the push handler at boot.',
      boundary: 'browser-platform',
      access: 'open',
    },
    {
      id: 'browser-cache-storage',
      icon: '💾',
      name: 'Cache storage',
      technology: 'Browser Cache API',
      description: 'Keeps the last loaded API answers so the screens read offline.',
      boundary: 'browser-platform',
      access: 'open',
    },
    {
      id: 'browser-push-manager',
      icon: '📬',
      name: 'Push manager',
      technology: 'Browser Push API',
      description:
        'Creates the push subscription the API stores, only after a tap, because iOS refuses otherwise.',
      boundary: 'browser-platform',
      access: 'open',
    },
    {
      id: 'browser-network-status',
      icon: '📶',
      name: 'Network status',
      technology: 'navigator.onLine and online/offline events',
      description: 'Drives the offline banner.',
      boundary: 'browser-platform',
      access: 'open',
    },
    {
      id: 'browser-display-mode',
      icon: '📱',
      name: 'Display mode',
      technology: 'display-mode media query',
      description:
        'Tells whether the application runs installed on the home screen, which iOS requires before it offers notifications.',
      boundary: 'browser-platform',
      access: 'open',
    },
  ],
};
