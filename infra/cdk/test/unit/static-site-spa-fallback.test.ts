import { Match } from 'aws-cdk-lib/assertions';
import { describe, expect, it } from 'vitest';
import { StaticSite } from '../../src/constructs/static-site.js';
import { synthTemplate } from './helpers/template.js';

// @FollowsBlueprint test-cdk-synth
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
    expect(JSON.stringify(tpl.toJSON())).not.toContain('/404.jpeg');
  });
});
