import { Match } from 'aws-cdk-lib/assertions';
import { describe, expect, it } from 'vitest';
import { StaticSite } from '../../src/constructs/static-site.js';
import { synthTemplate } from './helpers/template.js';

describe('StaticSite (prod, spaFallback)', () => {
  const tpl = synthTemplate((stack) => {
    new StaticSite(stack, 'Site', {
      app: 'last-loop-lepin',
      stage: 'prod',
      domainName: 'last-loop-lepin.borso.fr',
      assetsPath: '.',
      spaFallback: true,
    });
  });

  it('serves /index.html with status 200 on 404 so the SPA bundle handles routing', () => {
    // Regression for SPA-routes-return-JPEG-on-direct-nav: without this
    // rewrite, direct navigation to a client-side route (`/r/alice`) is
    // served the catch-all JPEG, the React bundle never loads, and the
    // in-app router never sees the URL.
    tpl.hasResourceProperties('AWS::CloudFront::Distribution', {
      DistributionConfig: Match.objectLike({
        CustomErrorResponses: Match.arrayWith([
          Match.objectLike({
            ErrorCode: 404,
            ResponsePagePath: '/index.html',
            ResponseCode: 200,
          }),
        ]),
      }),
    });
    // Belt-and-braces: the JPEG mapping is gone here, so a future edit
    // re-introducing it (and breaking direct nav) is caught.
    expect(JSON.stringify(tpl.toJSON())).not.toContain('/404.jpeg');
  });
});
