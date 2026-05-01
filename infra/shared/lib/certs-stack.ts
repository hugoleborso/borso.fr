import { Stack, type StackProps } from 'aws-cdk-lib';
import {
  Certificate,
  CertificateValidation,
  type ICertificate,
} from 'aws-cdk-lib/aws-certificatemanager';
import { HostedZone } from 'aws-cdk-lib/aws-route53';
import type { Construct } from 'constructs';

export const HOSTED_ZONE_NAME = 'borso.fr';

/**
 * us-east-1-only stack: wildcard certs that CloudFront requires in this
 * region. Looks up the existing borso.fr hosted zone for DNS validation.
 */
export class CertsStack extends Stack {
  public readonly borsoFrCert: ICertificate;
  public readonly previewCert: ICertificate;

  constructor(scope: Construct, id: string, props: StackProps) {
    super(scope, id, props);
    const zone = HostedZone.fromLookup(this, 'Zone', {
      domainName: HOSTED_ZONE_NAME,
    });
    this.borsoFrCert = new Certificate(this, 'BorsoFrCert', {
      domainName: HOSTED_ZONE_NAME,
      subjectAlternativeNames: [`*.${HOSTED_ZONE_NAME}`],
      validation: CertificateValidation.fromDns(zone),
    });
    this.previewCert = new Certificate(this, 'PreviewCert', {
      domainName: `*.preview.${HOSTED_ZONE_NAME}`,
      validation: CertificateValidation.fromDns(zone),
    });
  }
}
