import { Match } from 'aws-cdk-lib/assertions';
import { describe, expect, it } from 'vitest';
import { DsqlClusterBackup } from '../../src/constructs/dsql-cluster-backup.js';
import { synthTemplate } from './helpers/template.js';

const CLUSTER_ARN = 'arn:aws:dsql:eu-west-3:123456789012:cluster/abc';

// @FollowsBlueprint test-cdk-synth
describe('DsqlClusterBackup', () => {
  it('keeps a daily recovery point of the one cluster for 35 days by default', () => {
    const template = synthTemplate((stack) => {
      new DsqlClusterBackup(stack, 'Backup', {
        app: 'test-app',
        stage: 'prod',
        clusterArn: CLUSTER_ARN,
      });
    });
    template.hasResourceProperties('AWS::Backup::BackupPlan', {
      BackupPlan: {
        BackupPlanName: 'test-app-dsql-backups',
        BackupPlanRule: [
          Match.objectLike({
            RuleName: 'daily',
            ScheduleExpression: 'cron(0 3 * * ? *)',
            Lifecycle: { DeleteAfterDays: 35 },
          }),
        ],
      },
    });
    template.hasResourceProperties('AWS::Backup::BackupSelection', {
      BackupSelection: Match.objectLike({ Resources: [CLUSTER_ARN] }),
    });
  });

  it('encrypts the vault with the AWS managed key, which carries no monthly fee', () => {
    const template = synthTemplate((stack) => {
      new DsqlClusterBackup(stack, 'Backup', {
        app: 'test-app',
        stage: 'prod',
        clusterArn: CLUSTER_ARN,
      });
    });
    template.hasResourceProperties('AWS::Backup::BackupVault', {
      BackupVaultName: 'test-app-dsql-backups',
      EncryptionKeyArn: Match.absent(),
    });
    template.resourceCountIs('AWS::KMS::Key', 0);
  });

  it('gives AWS Backup one role that can both back up and restore', () => {
    const template = synthTemplate((stack) => {
      new DsqlClusterBackup(stack, 'Backup', {
        app: 'test-app',
        stage: 'prod',
        clusterArn: CLUSTER_ARN,
      });
    });
    template.hasResourceProperties('AWS::IAM::Role', {
      AssumeRolePolicyDocument: Match.objectLike({
        Statement: [Match.objectLike({ Principal: { Service: 'backup.amazonaws.com' } })],
      }),
      ManagedPolicyArns: [
        Match.objectLike({
          'Fn::Join': Match.arrayWith([
            Match.arrayWith([':iam::aws:policy/service-role/AWSBackupServiceRolePolicyForBackup']),
          ]),
        }),
        Match.objectLike({
          'Fn::Join': Match.arrayWith([
            Match.arrayWith([
              ':iam::aws:policy/service-role/AWSBackupServiceRolePolicyForRestores',
            ]),
          ]),
        }),
      ],
    });
  });

  it('honours an explicit retention', () => {
    const template = synthTemplate((stack) => {
      new DsqlClusterBackup(stack, 'Backup', {
        app: 'test-app',
        stage: 'prod',
        clusterArn: CLUSTER_ARN,
        retentionDays: 7,
      });
    });
    template.hasResourceProperties('AWS::Backup::BackupPlan', {
      BackupPlan: Match.objectLike({
        BackupPlanRule: [Match.objectLike({ Lifecycle: { DeleteAfterDays: 7 } })],
      }),
    });
  });

  it('refuses the development stage', () => {
    expect(() =>
      synthTemplate((stack) => {
        new DsqlClusterBackup(stack, 'Backup', {
          app: 'test-app',
          stage: 'dev',
          clusterArn: CLUSTER_ARN,
        });
      }),
    ).toThrow();
  });
});
