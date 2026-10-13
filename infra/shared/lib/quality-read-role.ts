import { githubActionsPrincipal, type SubjectFormat } from '@borso/infra';
import { Duration } from 'aws-cdk-lib';
import { Effect, PolicyStatement, Role } from 'aws-cdk-lib/aws-iam';
import type { Construct } from 'constructs';

const CONSUMER_REPO = 'hugoleborso/borso.fr';
const CONSUMER_SUBJECT_FORMAT: SubjectFormat = { kind: 'name' };
const PAGES_ENVIRONMENT = 'github-pages';
export const QUALITY_READ_ROLE_NAME = 'QualityReadRole';
const QUALITY_READ_ROLE_MAX_SESSION_HOURS = 1;
const RESOURCES_NOT_SCOPABLE_BY_ARN = ['*'];

const QUALITY_METRIC_READ_ACTIONS = ['cloudwatch:GetMetricData', 'cloudwatch:ListMetrics'];
const QUALITY_API_LIST_ACTIONS = ['apigateway:GET'];
const QUALITY_DATABASE_CONNECT_ACTIONS = ['dsql:DbConnect'];

interface QualityReadRoleProps {
  readonly oidcProviderArn: string;
  readonly account: string;
  readonly region: string;
}

export function createQualityReadRole(scope: Construct, props: QualityReadRoleProps): Role {
  const role = new Role(scope, QUALITY_READ_ROLE_NAME, {
    roleName: QUALITY_READ_ROLE_NAME,
    assumedBy: githubActionsPrincipal(props.oidcProviderArn, {
      repo: CONSUMER_REPO,
      subjectFormat: CONSUMER_SUBJECT_FORMAT,
      subjects: [{ kind: 'environment', environment: PAGES_ENVIRONMENT }],
    }),
    maxSessionDuration: Duration.hours(QUALITY_READ_ROLE_MAX_SESSION_HOURS),
    description:
      'Used by pages.yml to build the quality dashboard. Reads CloudWatch metrics, lists HTTP APIs to name them, and connects to DSQL as a non-admin database role; the database grant to quality_reader is the data boundary.',
  });
  role.addToPolicy(
    new PolicyStatement({
      effect: Effect.ALLOW,
      actions: QUALITY_METRIC_READ_ACTIONS,
      resources: RESOURCES_NOT_SCOPABLE_BY_ARN,
    }),
  );
  role.addToPolicy(
    new PolicyStatement({
      effect: Effect.ALLOW,
      actions: QUALITY_API_LIST_ACTIONS,
      resources: [`arn:aws:apigateway:${props.region}::/apis`],
    }),
  );
  role.addToPolicy(
    new PolicyStatement({
      effect: Effect.ALLOW,
      actions: QUALITY_DATABASE_CONNECT_ACTIONS,
      resources: [`arn:aws:dsql:${props.region}:${props.account}:cluster/*`],
    }),
  );
  return role;
}
