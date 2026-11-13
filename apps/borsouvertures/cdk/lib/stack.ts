import {
  agentReaderPrincipalArn,
  type IDsqlCluster,
  isProductionStage,
  PreviewableApp,
  type Stage,
} from '@borso/infra';
import type { Construct } from 'constructs';

const APP_SLUG = 'borsouvertures';
const APP_CONSTRUCT_ID_THAT_KEEPS_THE_STATIC_SITE_LOGICAL_IDS = 'Default';
const ERROR_REPORTING_DSN_VARIABLE = 'SENTRY_DSN';
const ERROR_REPORTING_RELEASE_VARIABLE = 'SENTRY_RELEASE';

const READER_TABLE_BLOCKLIST: readonly string[] = [
  'operator_credential',
  'app_config',
  'sign_in_attempt',
];

export interface ErrorReportingProject {
  readonly dsn: string;
  readonly release?: string;
}

export interface BuildBorsouverturesAppStackProps {
  readonly scope: Construct;
  readonly stage: Stage;
  readonly prNumber?: number;
  readonly domainName: string | undefined;
  readonly assetsPath: string;
  readonly apiEntry: string;
  readonly migrationsPath: string;
  readonly cluster: IDsqlCluster;
  readonly errorReporting?: ErrorReportingProject;
}

function buildErrorReportingEnvironment(
  project: ErrorReportingProject | undefined,
): Record<string, string> {
  if (project === undefined) return {};
  return {
    [ERROR_REPORTING_DSN_VARIABLE]: project.dsn,
    ...(project.release === undefined
      ? {}
      : { [ERROR_REPORTING_RELEASE_VARIABLE]: project.release }),
  };
}

// @FollowsBlueprint app-cdk-stack
export function buildBorsouverturesAppStack(props: BuildBorsouverturesAppStackProps): void {
  const isProduction = isProductionStage(props.stage);
  new PreviewableApp(props.scope, APP_CONSTRUCT_ID_THAT_KEEPS_THE_STATIC_SITE_LOGICAL_IDS, {
    app: APP_SLUG,
    stage: props.stage,
    ...(props.prNumber === undefined ? {} : { prNumber: props.prNumber }),
    ...(props.domainName === undefined ? {} : { domainName: props.domainName }),
    frontend: { distPath: props.assetsPath },
    api: {
      entry: props.apiEntry,
      environment: buildErrorReportingEnvironment(props.errorReporting),
    },
    database: {
      migrationsPath: props.migrationsPath,
      cluster: props.cluster,
      ...(isProduction
        ? {
            readerPrincipalArns: [agentReaderPrincipalArn(props.scope)],
            readerTableBlocklist: READER_TABLE_BLOCKLIST,
          }
        : {}),
    },
  });
}
