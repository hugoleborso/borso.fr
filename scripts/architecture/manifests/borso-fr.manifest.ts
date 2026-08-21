import type { ArchitectureManifest } from '../architecture-manifest';

export const borsoFrManifest: ArchitectureManifest = {
  application: 'borso-fr',
  name: 'borso.fr',
  description:
    'The apex landing site, plus two self-contained mini applications served from it: the twelve labours tracker and the Mondrian composition generator.',
  actors: [
    {
      id: 'visitor',
      icon: '🚶',
      name: 'Visitor',
      description:
        'Reads the landing page and opens the mini applications. Nothing here signs in, so every human user holds this one role.',
    },
  ],
  containers: [
    {
      id: 'site',
      icon: '🖥️',
      name: 'Static site',
      technology: 'React 19, Vite, Tailwind',
      description:
        'The landing page and the mini applications, built to static assets. No back end of its own: nothing here talks to a server the repository owns.',
      sourceContainer: 'site',
      runtime: 'browser',
      hosting: 'CloudFront in front of an S3 origin, alias borso.fr',
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
