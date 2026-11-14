import type { ArchitectureManifest } from '../architecture-manifest';

export const borsouverturesManifest: ArchitectureManifest = {
  application: 'borsouvertures',
  name: 'Borsouvertures',
  description:
    'Chess openings trainer: a daily trainer over hand-written decks and an explorer over a bundled book, offline-capable, with progress synced for one account.',
  actors: [
    {
      id: 'player',
      icon: '♟️',
      name: 'Player',
      description:
        'Trains decks and explores openings. The one account that syncs progress is the operator, so every human user holds this one role.',
    },
  ],
  containers: [
    {
      id: 'site',
      icon: '🖥️',
      name: 'Single page application',
      technology: 'React 19, Vite, Tailwind',
      description:
        'The whole trainer. The openings book ships as a static JSON asset. Progress and the personal deck are event logs in IndexedDB, synced through the API.',
      sourceContainer: 'site',
      runtime: 'browser',
      hosting: 'CloudFront in front of an S3 origin, alias borsouvertures.borso.fr',
    },
    {
      id: 'api',
      icon: '🔌',
      name: 'HTTP API',
      technology: 'Hono on AWS Lambda, Drizzle',
      description:
        'Signs the operator in and stores the review and deck line events the site syncs, so progress follows one account across devices.',
      sourceContainer: 'api',
      runtime: 'aws',
      hosting: 'Lambda behind an API Gateway HTTP API, eu-west-3',
    },
    {
      id: 'database',
      icon: '🗄️',
      name: 'Application database',
      technology: 'Aurora DSQL, Postgres wire protocol, Drizzle',
      description:
        'One schema per stage inside a cluster shared across stages. Holds the operator credential, the sign-in attempts and the synced review and deck line events.',
      sourceContainer: null,
      runtime: 'aws',
      hosting: 'Aurora DSQL, eu-west-3, one cluster per application',
    },
    {
      id: 'infrastructure',
      icon: '🏗️',
      name: 'Infrastructure definition',
      technology: 'AWS CDK, PreviewableApp plus DsqlClusterStack',
      description:
        'Composes the shared constructs into this application stack and its cluster stack. Build-time only, never reached at runtime.',
      sourceContainer: 'cdk',
      runtime: 'build',
      hosting: 'Runs in CI, never at runtime',
    },
  ],
  externals: [
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
      id: 'sentry',
      icon: '🚨',
      name: 'Sentry',
      technology: 'Error monitoring SaaS, @sentry/react in the browser',
      description:
        'Receives the errors nobody saw and one trace per page load. The site sends no trace header to any host, because it has no API. Personal data collection stays off.',
      boundary: 'third-party',
      access: 'account',
    },
  ],
};
