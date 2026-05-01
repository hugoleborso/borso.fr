import { App } from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { describe, expect, it } from 'vitest';
import { CertsStack, HOSTED_ZONE_NAME } from '../../lib/certs-stack.js';

function synth(): Template {
  const app = new App();
  app.node.setContext(`hosted-zone:account=123456789012:domainName=${HOSTED_ZONE_NAME}:region=us-east-1`, {
    Id: '/hostedzone/Z1FAKE',
    Name: `${HOSTED_ZONE_NAME}.`,
  });
  const stack = new CertsStack(app, 'C', {
    env: { account: '123456789012', region: 'us-east-1' },
  });
  return Template.fromStack(stack);
}

describe('CertsStack', () => {
  it('hosted-zone constant is borso.fr', () => {
    expect(HOSTED_ZONE_NAME).toBe('borso.fr');
  });

  it('issues two ACM certificates', () => {
    synth().resourceCountIs('AWS::CertificateManager::Certificate', 2);
  });

  it('issues a wildcard cert covering borso.fr + *.borso.fr', () => {
    synth().hasResourceProperties('AWS::CertificateManager::Certificate', {
      DomainName: 'borso.fr',
      SubjectAlternativeNames: Match.arrayWith(['*.borso.fr']),
    });
  });

  it('issues a separate cert for *.preview.borso.fr', () => {
    synth().hasResourceProperties('AWS::CertificateManager::Certificate', {
      DomainName: '*.preview.borso.fr',
    });
  });
});
