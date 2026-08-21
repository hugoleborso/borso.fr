export const SHARED_SSM_PARAMETERS = {
  oidcProviderArn: '/borso/shared/oidc-provider-arn',
  hostedZoneId: '/borso/shared/hosted-zone-id',
  hostedZoneName: '/borso/shared/hosted-zone-name',
  certBorsoFrArn: '/borso/shared/cert-borso-fr-arn',
  certPreviewArn: '/borso/shared/cert-preview-borso-fr-arn',
  certPreviewRegionalArn: '/borso/shared/cert-preview-borso-fr-regional-arn',
  previewsBucketName: '/borso/shared/previews-bucket-name',
  previewsDistributionId: '/borso/shared/previews-distribution-id',
  previewsDistributionDomain: '/borso/shared/previews-distribution-domain',
  prodDeployRoleArn: '/borso/shared/prod-deploy-role-arn',
  previewDeployRoleArn: '/borso/shared/preview-deploy-role-arn',
  sharedDeployRoleArn: '/borso/shared/shared-deploy-role-arn',
} as const;
