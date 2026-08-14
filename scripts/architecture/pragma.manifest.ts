/**
 * The hand-written half of pragma's architecture model.
 *
 * Everything a file path can carry is derived by `architecture-model.ts`. What
 * remains are the facts no single source file owns: who uses the system, which
 * runtime containers it deploys into, and what each external system actually
 * is. Those are declared here and cross-checked against the code, so a declared
 * external with no `@DependsOnExternal` referencing it, or a tag naming an
 * external that is not declared, fails the generator.
 */

export interface ManifestActor {
  readonly id: string;
  readonly name: string;
  readonly description: string;
}

export interface ManifestContainer {
  readonly id: string;
  readonly name: string;
  readonly technology: string;
  readonly description: string;
  /** The `container` value `architecture-model.ts` infers for this one's code. */
  readonly sourceContainer: string | null;
  readonly runtime: 'browser' | 'aws' | 'build';
}

export interface ManifestExternal {
  readonly id: string;
  readonly name: string;
  readonly technology: string;
  readonly description: string;
  readonly boundary: 'third-party' | 'aws' | 'browser-platform';
  /**
   * The container this external actually is, when the system owns it. Aurora
   * DSQL reached through the signer is the application database rather than a
   * third party, and the container diagram should draw it as one box.
   */
  readonly realisedBy?: string;
}

export interface ArchitectureManifest {
  readonly application: string;
  readonly name: string;
  readonly description: string;
  readonly actors: readonly ManifestActor[];
  readonly containers: readonly ManifestContainer[];
  readonly externals: readonly ManifestExternal[];
}

export const pragmaManifest: ArchitectureManifest = {
  application: 'pragma',
  name: 'Pragma',
  description:
    'Band enterprise resource planning: song catalogue, member instrument mastery, rehearsal and concert sessions, setlists, and a venue pipeline.',
  actors: [
    {
      id: 'band-member',
      name: 'Band member',
      description:
        'Signs in with the shared password and works the catalogue, the setlists and the sessions. Every human user holds this one role, because the application has no per-user accounts.',
    },
  ],
  containers: [
    {
      id: 'site',
      name: 'Single page application',
      technology: 'React 19, Vite, TanStack Query, Tailwind',
      description:
        'The whole user interface. Reads and writes through the typed Hono RPC client, and holds no server state of its own outside the query cache.',
      sourceContainer: 'site',
      runtime: 'browser',
    },
    {
      id: 'service-worker',
      name: 'Service worker',
      technology: 'Plain browser script, no bundler',
      description:
        'Caches the shell and the offline manifest so a rehearsal in a basement still renders. Ships as-is from site/public/sw.js.',
      sourceContainer: null,
      runtime: 'browser',
    },
    {
      id: 'api',
      name: 'HTTP API',
      technology: 'Hono on AWS Lambda',
      description:
        'Every domain endpoint, gated by a shared-password session cookie. Its inferred router type is the contract the single page application compiles against.',
      sourceContainer: 'api',
      runtime: 'aws',
    },
    {
      id: 'domain',
      name: 'Shared domain rules',
      technology: 'TypeScript module, no runtime of its own',
      description:
        'The rules both sides read, reachable through @domain/*. Compiled into each side rather than deployed, and carrying only rules with a real caller on both.',
      sourceContainer: 'domain',
      runtime: 'build',
    },
    {
      id: 'database',
      name: 'Application database',
      technology: 'Aurora DSQL, Postgres wire protocol, Drizzle',
      description:
        'One schema per stage inside a cluster shared across stages. Holds the catalogue, the mastery matrix, the sessions and the venue pipeline, plus the admin credentials row.',
      sourceContainer: null,
      runtime: 'aws',
    },
    {
      id: 'uploads-bucket',
      name: 'Chord chart bucket',
      technology: 'Amazon S3, presigned PUT and GET',
      description:
        'Holds uploaded chord charts. The browser transfers bytes directly against a presigned URL, so no chart passes through the API.',
      sourceContainer: null,
      runtime: 'aws',
    },
    {
      id: 'infrastructure',
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
      name: 'MusicBrainz',
      technology: 'HTTPS, public web service',
      description:
        'Song metadata lookup used to enrich a catalogue entry with recording id, album, duration, tags and ISRCs.',
      boundary: 'third-party',
    },
    {
      id: 'youtube',
      name: 'YouTube',
      technology: 'iframe embed',
      description: 'Renders a reference recording inside a song page.',
      boundary: 'third-party',
    },
    {
      id: 'spotify',
      name: 'Spotify',
      technology: 'iframe embed',
      description: 'Renders a reference recording inside a song page.',
      boundary: 'third-party',
    },
    {
      id: 'vimeo',
      name: 'Vimeo',
      technology: 'iframe embed',
      description: 'Renders a reference recording inside a song page.',
      boundary: 'third-party',
    },
    {
      id: 'soundcloud',
      name: 'SoundCloud',
      technology: 'iframe embed',
      description: 'Renders a reference recording inside a song page.',
      boundary: 'third-party',
    },
    {
      id: 'deezer',
      name: 'Deezer',
      technology: 'iframe embed',
      description: 'Renders a reference recording inside a song page.',
      boundary: 'third-party',
    },
    {
      id: 'soundslice',
      name: 'Soundslice',
      technology: 'iframe embed',
      description: 'Renders an interactive chord or tab chart inside a song page.',
      boundary: 'third-party',
    },
    {
      id: 'aws-dsql',
      name: 'Aurora DSQL',
      technology: 'AWS SDK signer plus Postgres wire protocol',
      description:
        'Connection tokens are minted per connection by the signer rather than held, so a warm Lambda never carries an expired password.',
      boundary: 'aws',
      realisedBy: 'database',
    },
    {
      id: 'aws-s3',
      name: 'Amazon S3',
      technology: 'AWS SDK, presigned URLs',
      description: 'Object storage for chord charts, reached only through presigned URLs.',
      boundary: 'aws',
      realisedBy: 'uploads-bucket',
    },
    {
      id: 'browser-local-storage',
      name: 'localStorage',
      technology: 'Browser storage API',
      description:
        'Holds the chosen locale and the marker saying this browser has signed in before. Never holds an authorisation.',
      boundary: 'browser-platform',
    },
    {
      id: 'browser-media-query',
      name: 'matchMedia',
      technology: 'Browser layout API',
      description:
        'Breakpoint reads, subscribed through useSyncExternalStore rather than copied into state.',
      boundary: 'browser-platform',
    },
    {
      id: 'browser-network-status',
      name: 'navigator.onLine',
      technology: 'Browser network API',
      description: 'Drives the offline banner.',
      boundary: 'browser-platform',
    },
    {
      id: 'browser-service-worker',
      name: 'Service worker registration',
      technology: 'Browser service worker API',
      description: 'Registers the offline cache at boot, and is skipped in development.',
      boundary: 'browser-platform',
      realisedBy: 'service-worker',
    },
    {
      id: 'browser-dialog',
      name: 'HTMLDialogElement',
      technology: 'Browser dialog API',
      description:
        'Opens a native modal where it is rendered, through a ref callback rather than an effect.',
      boundary: 'browser-platform',
    },
  ],
};
