import type { ArchitectureManifest } from '../architecture-manifest';

export const bananaRushManifest: ArchitectureManifest = {
  application: 'banana-rush',
  name: 'Banana Rush',
  description:
    'A party game of secret bids on a crate of bananas, played from a phone. A lobby behind a four letter code, a secret number per round, and a bust cascade that decides who pays whom.',
  actors: [
    {
      id: 'host',
      icon: '🦍',
      name: 'Host',
      description:
        'Creates the game, picks the seats, the timer and the winning score, and starts the first round. Plays like everybody else afterwards.',
    },
    {
      id: 'player',
      icon: '🐒',
      name: 'Player',
      description:
        'Joins with the code, picks a nickname and a monkey, and writes one secret number per round. Signs in to nothing.',
    },
  ],
  containers: [
    {
      id: 'site',
      icon: '🖥️',
      name: 'Single page application',
      technology: 'React, Vite, TanStack Query, Tailwind',
      description:
        'The home screen, the lobby and the game board. Writes through the HTTP API and listens on the WebSocket channel for everything the other players do.',
      sourceContainer: 'site',
      runtime: 'browser',
      hosting: 'CloudFront in front of an S3 origin, alias banana-rush.borso.fr',
    },
    {
      id: 'api',
      icon: '🔌',
      name: 'HTTP API',
      technology: 'Hono on AWS Lambda, Drizzle',
      description:
        'Every write in the game: create, join, start, bid and resolve. Broadcasts the result itself rather than letting the phones ask for it. Its inferred router type is the contract the single page application compiles against.',
      sourceContainer: 'api',
      runtime: 'aws',
      hosting: 'Lambda behind an API Gateway HTTP API, eu-west-3',
    },
    {
      id: 'socket',
      icon: '📡',
      name: 'WebSocket channel',
      technology: 'API Gateway WebSocket API, Lambda',
      description:
        'Holds one connection per open phone and records it against a game. Carries no commands: it only delivers what the HTTP API decided.',
      sourceContainer: null,
      runtime: 'aws',
      hosting: 'API Gateway WebSocket API, eu-west-3',
    },
    {
      id: 'database',
      icon: '🗄️',
      name: 'Application database',
      technology: 'Aurora DSQL, Postgres wire protocol, Drizzle',
      description:
        'One schema per stage inside a cluster shared across stages. Holds the games, the players, the secret bids and the resolved rounds.',
      sourceContainer: null,
      runtime: 'aws',
      hosting: 'Aurora DSQL, eu-west-3, one cluster per application',
    },
    {
      id: 'infrastructure',
      icon: '🏗️',
      name: 'Infrastructure definition',
      technology: 'AWS CDK, PreviewableApp plus WebSocketChannel',
      description:
        'Composes the shared constructs into this application stack. Build-time only, never reached at runtime.',
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
      id: 'browser-local-storage',
      icon: '💾',
      name: 'localStorage',
      technology: 'Browser storage API',
      description:
        'Holds the chosen language and, per game code, the token that identifies this phone as a player. Losing it means being offered a seat again rather than being locked out.',
      boundary: 'browser-platform',
      access: 'open',
    },
    {
      id: 'aws-apigateway-management',
      icon: '📡',
      name: 'API Gateway management API',
      technology: 'AWS SDK, PostToConnection',
      description:
        'The only way a Lambda reaches an open WebSocket connection. A connection that has gone away answers with a gone status, which is the signal to forget it rather than an error to report.',
      boundary: 'aws',
      access: 'credential',
      realisedBy: 'socket',
    },
  ],
};
