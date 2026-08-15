/**
 * The hand-written half of last-loop-lepin's architecture model. Types and the
 * register of applications live in `../architecture-manifest.ts`.
 *
 * Only the S3 photo upload carries a `@DependsOnExternal` tag so far, so level 1
 * draws that one edge and nothing else. Tagging is what puts an external on the
 * map; see `docs/architecture/install.md`.
 */

import type { ArchitectureManifest } from '../architecture-manifest';

export const lastLoopLepinManifest: ArchitectureManifest = {
  application: 'last-loop-lepin',
  name: 'Last Loop Lépin',
  description:
    'Race-day live dashboard for a backyard ultra: runners, loops punched at the line, the ranking that falls out of them, and the photo wall.',
  actors: [
    {
      id: 'spectator',
      icon: '👀',
      name: 'Spectator',
      description: 'Follows the live ranking and the photo wall. Signs in to nothing.',
    },
    {
      id: 'race-official',
      icon: '⏱️',
      name: 'Race official',
      description:
        'Signs in with the admin PIN and punches each loop, edits runners, and uploads photos.',
    },
  ],
  containers: [
    {
      id: 'site',
      icon: '🖥️',
      name: 'Single page application',
      technology: 'React, Vite, TanStack Query',
      description:
        'The public dashboard and the admin screens behind the PIN. Reads and writes through the API.',
      sourceContainer: 'site',
      runtime: 'browser',
      hosting: 'CloudFront in front of an S3 origin, alias last-loop-lepin.borso.fr',
    },
    {
      id: 'api',
      icon: '🔌',
      name: 'HTTP API',
      technology: 'Hono on AWS Lambda, Drizzle',
      description:
        'Every endpoint, with the admin ones gated by a session row rather than a secret. Its inferred router type is the contract the single page application compiles against.',
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
        'One schema per stage inside a cluster shared across stages. Holds the runners, the punches, the editions, and the admin credentials and session rows.',
      sourceContainer: null,
      runtime: 'aws',
      hosting: 'Aurora DSQL, eu-west-3, one cluster per application',
    },
    {
      id: 'photos-bucket',
      icon: '🪣',
      name: 'Photo bucket',
      technology: 'Amazon S3 behind its own CloudFront distribution',
      description:
        'Holds the runner photos the official uploads. Served through PhotosCdn rather than from the API.',
      sourceContainer: null,
      runtime: 'aws',
      hosting: 'S3 in eu-west-3, fronted by photos-cdn.borso.fr in prod',
    },
    {
      id: 'infrastructure',
      icon: '🏗️',
      name: 'Infrastructure definition',
      technology: 'AWS CDK, PreviewableApp plus PhotosCdn',
      description:
        'Composes the shared constructs into this application stack. Build-time only, never reached at runtime.',
      sourceContainer: 'cdk',
      runtime: 'build',
      hosting: 'Runs in CI, never at runtime',
    },
  ],
  externals: [
    {
      id: 'aws-s3',
      icon: '\u{1FAA3}',
      name: 'Amazon S3',
      technology: 'AWS SDK, presigned PUT',
      description:
        'Object storage for the runner photos the official uploads, reached only through a presigned URL so no image passes through the API.',
      boundary: 'aws',
      realisedBy: 'photos-bucket',
    },
  ],
};
