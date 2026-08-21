import type { ArchitectureManifest } from '../architecture-manifest';

export const borsouverturesManifest: ArchitectureManifest = {
  application: 'borsouvertures',
  name: 'Borsouvertures',
  description:
    'Chess openings trainer: learn an opening or play within one, over a bundled book, with an offline-capable service worker.',
  actors: [
    {
      id: 'player',
      icon: '♟️',
      name: 'Player',
      description:
        'Trains an opening and plays lines inside it. Nothing here signs in, so every human user holds this one role.',
    },
  ],
  containers: [
    {
      id: 'site',
      icon: '🖥️',
      name: 'Single page application',
      technology: 'React 19, Vite, Tailwind',
      description:
        'The whole trainer. The openings book ships as a static JSON asset rather than coming from a server, so the application has no back end of its own.',
      sourceContainer: 'site',
      runtime: 'browser',
      hosting: 'CloudFront in front of an S3 origin, alias borsouvertures.borso.fr',
    },
    {
      id: 'infrastructure',
      icon: '🏗️',
      name: 'Infrastructure definition',
      technology: 'AWS CDK, the shared StaticSite construct',
      description:
        'One StaticSite from @borso/infra, in eu-west-3. Build-time only, never reached at runtime.',
      sourceContainer: 'cdk',
      runtime: 'build',
      hosting: 'Runs in CI, never at runtime',
    },
  ],
  externals: [],
};
