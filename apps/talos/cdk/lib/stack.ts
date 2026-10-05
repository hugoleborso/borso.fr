import { type IDsqlCluster, PreviewableApp } from '@borso/infra';
import { Stack } from 'aws-cdk-lib';
import { Effect, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import type { Construct } from 'constructs';

const APP_SLUG = 'talos';
const GITHUB_REPOSITORY = 'hugoleborso/talos';
const SECRETS_PARAMETER_PREFIX = '/talos/';
const SECRETS_PARAMETER_ACTIONS = ['ssm:GetParameter', 'ssm:GetParameters'];
const API_TIMEOUT_SECONDS = 29;

export interface BuildTalosAppStackProps {
  readonly scope: Construct;
  readonly domainName: string;
  readonly assetsPath: string;
  readonly apiEntry: string;
  readonly migrationsPath: string;
  readonly cluster: IDsqlCluster;
}

// @FollowsBlueprint app-cdk-stack
export function buildTalosAppStack(props: BuildTalosAppStackProps): void {
  const talosApp = new PreviewableApp(props.scope, 'App', {
    app: APP_SLUG,
    stage: 'prod',
    domainName: props.domainName,
    frontend: { distPath: props.assetsPath, bucketNameSuffix: 'account' },
    api: {
      entry: props.apiEntry,
      timeoutSeconds: API_TIMEOUT_SECONDS,
      environment: {
        GITHUB_REPO: GITHUB_REPOSITORY,
        TALOS_SSM_PREFIX: SECRETS_PARAMETER_PREFIX,
        TALOS_RP_ID: props.domainName,
      },
    },
    database: { migrationsPath: props.migrationsPath, cluster: props.cluster },
  });

  talosApp.api?.handler.addToRolePolicy(
    new PolicyStatement({
      effect: Effect.ALLOW,
      actions: SECRETS_PARAMETER_ACTIONS,
      resources: [
        Stack.of(props.scope).formatArn({
          service: 'ssm',
          resource: 'parameter',
          resourceName: `${SECRETS_PARAMETER_PREFIX.slice(1)}*`,
        }),
      ],
    }),
  );
}
