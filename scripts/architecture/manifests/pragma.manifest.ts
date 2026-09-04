import type { ArchitectureManifest } from '../architecture-manifest';

export const pragmaManifest: ArchitectureManifest = {
  application: 'pragma',
  name: 'Pragma',
  urlOnlyScripts: ['apps/pragma/site/public/sw.js'],
  description:
    'Band enterprise resource planning: song catalogue, member instrument mastery, rehearsal and concert sessions, setlists, and a venue pipeline.',
  actors: [
    {
      id: 'band-member',
      icon: '🧑‍🎤',
      name: 'Band member',
      description:
        'Signs in with the shared password and works the catalogue, the setlists and the sessions. Every human user holds this one role, because the application has no per-user accounts.',
    },
  ],
  containers: [
    {
      id: 'site',
      hosting: 'CloudFront in front of an S3 origin, with /api/* routed to the API in prod',
      icon: '🖥️',
      name: 'Single page application',
      technology: 'React 19, Vite, TanStack Query, Tailwind',
      description:
        'The whole user interface. Reads and writes through the typed Hono RPC client, and holds no server state of its own outside the query cache.',
      sourceContainer: 'site',
      runtime: 'browser',
    },
    {
      id: 'service-worker',
      noScannedSourceNote:
        'Ships as apps/pragma/site/public/sw.js, a plain script the scan does not read. Its helpers under site/src/sw/ are counted with the single page application.',
      hosting: 'Served from the same origin as the site',
      icon: '📴',
      name: 'Service worker',
      technology: 'Plain browser script, no bundler',
      description:
        'Caches the shell and the offline manifest so a rehearsal in a basement still renders. Ships as-is from site/public/sw.js.',
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
        'Every domain endpoint, gated by a shared-password session cookie. Its inferred router type is the contract the single page application compiles against.',
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
        'The rules both sides read, reachable through @domain/*. Compiled into each side rather than deployed, and carrying only rules with a real caller on both.',
      sourceContainer: 'domain',
      runtime: 'build',
    },
    {
      id: 'database',
      noScannedSourceNote:
        'Declared by the CDK stack and filled by the migrations under api/src/database/migrations/. No application source of its own.',
      hosting: 'Aurora DSQL, eu-west-3, one cluster per application',
      icon: '🗄️',
      name: 'Application database',
      technology: 'Aurora DSQL, Postgres wire protocol, Drizzle',
      description:
        'One schema per stage inside a cluster shared across stages. Holds the catalogue, the mastery matrix, the sessions and the venue pipeline, plus the admin credentials row.',
      sourceContainer: null,
      runtime: 'aws',
    },
    {
      id: 'uploads-bucket',
      noScannedSourceNote: 'Declared by the CDK stack. No application source of its own.',
      hosting: 'S3, eu-west-3',
      icon: '🪣',
      name: 'Chord chart bucket',
      technology: 'Amazon S3, presigned PUT and GET',
      description:
        'Holds uploaded chord charts. The browser transfers bytes directly against a presigned URL, so no chart passes through the API.',
      sourceContainer: null,
      runtime: 'aws',
    },
    {
      id: 'infrastructure',
      hosting: 'Runs in CI, never at runtime',
      icon: '🏗️',
      name: 'Infrastructure definition',
      technology: 'AWS CDK',
      description:
        'Composes the shared constructs into this application stack. Build-time only, never reached at runtime.',
      sourceContainer: 'cdk',
      runtime: 'build',
    },
  ],
  externals: [
    {
      id: 'musicbrainz',
      icon: '🎼',
      name: 'MusicBrainz',
      technology: 'HTTPS, public web service',
      description:
        'Song metadata lookup used to enrich a catalogue entry with recording id, album, duration, tags and ISRCs.',
      boundary: 'third-party',
    },
    {
      id: 'youtube',
      icon: '▶️',
      name: 'YouTube',
      technology: 'iframe embed',
      description: 'Renders a reference recording inside a song page.',
      boundary: 'third-party',
    },
    {
      id: 'spotify',
      icon: '🎧',
      name: 'Spotify',
      technology: 'iframe embed',
      description: 'Renders a reference recording inside a song page.',
      boundary: 'third-party',
    },
    {
      id: 'vimeo',
      icon: '🎬',
      name: 'Vimeo',
      technology: 'iframe embed',
      description: 'Renders a reference recording inside a song page.',
      boundary: 'third-party',
    },
    {
      id: 'soundcloud',
      icon: '☁️',
      name: 'SoundCloud',
      technology: 'iframe embed',
      description: 'Renders a reference recording inside a song page.',
      boundary: 'third-party',
    },
    {
      id: 'deezer',
      icon: '🎵',
      name: 'Deezer',
      technology: 'iframe embed and unauthenticated search API',
      description:
        'Renders a reference recording inside a song page, and answers the audience search on every keystroke. It needs no key and publishes no per-second limit, which is why the room types against it rather than against MusicBrainz. It reports a refused request inside a 200 body, so the adapter reads the payload as well as the status.',
      boundary: 'third-party',
    },
    {
      id: 'soundslice',
      icon: '🎸',
      name: 'Soundslice',
      technology: 'iframe embed',
      description: 'Renders an interactive chord or tab chart inside a song page.',
      boundary: 'third-party',
    },
    {
      id: 'aws-dsql',
      icon: '🗄️',
      name: 'Aurora DSQL',
      technology: 'AWS SDK signer plus Postgres wire protocol',
      description:
        'Connection tokens are minted per connection by the signer rather than held, so a warm Lambda never carries an expired password.',
      boundary: 'aws',
      realisedBy: 'database',
    },
    {
      id: 'aws-s3',
      icon: '🪣',
      name: 'Amazon S3',
      technology: 'AWS SDK, presigned URLs',
      description: 'Object storage for chord charts, reached only through presigned URLs.',
      boundary: 'aws',
      realisedBy: 'uploads-bucket',
    },
    {
      id: 'browser-local-storage',
      icon: '💾',
      name: 'localStorage',
      technology: 'Browser storage API',
      description:
        'Holds the chosen locale and the marker saying this browser has signed in before. Never holds an authorisation.',
      boundary: 'browser-platform',
    },
    {
      id: 'browser-media-query',
      icon: '📐',
      name: 'matchMedia',
      technology: 'Browser layout API',
      description:
        'Breakpoint reads, subscribed through useSyncExternalStore rather than copied into state.',
      boundary: 'browser-platform',
    },
    {
      id: 'browser-network-status',
      icon: '📶',
      name: 'navigator.onLine',
      technology: 'Browser network API',
      description: 'Drives the offline banner.',
      boundary: 'browser-platform',
    },
    {
      id: 'browser-service-worker',
      icon: '📴',
      name: 'Service worker registration',
      technology: 'Browser service worker API',
      description: 'Registers the offline cache at boot, and is skipped in development.',
      boundary: 'browser-platform',
      realisedBy: 'service-worker',
    },
    {
      id: 'browser-dialog',
      icon: '🪟',
      name: 'HTMLDialogElement',
      technology: 'Browser dialog API',
      description:
        'Opens a native modal where it is rendered, through a ref callback rather than an effect.',
      boundary: 'browser-platform',
    },
    {
      id: 'browser-scroll',
      icon: '📜',
      name: 'Element scrolling',
      technology: 'Browser scroll API',
      description:
        'Drives the scene chart down the screen while a song is played, and brings the current setlist pill into view. Held by a ref callback, so the timer stops when the scene unmounts.',
      boundary: 'browser-platform',
    },
    {
      id: 'browser-wake-lock',
      icon: '🔦',
      name: 'Screen Wake Lock',
      technology: 'Browser wake lock API',
      description:
        'Keeps the screen lit while the scene is open, so a phone on a music stand does not sleep between two songs. Absent on some browsers, where the scene simply runs without it.',
      boundary: 'browser-platform',
    },
  ],
};
