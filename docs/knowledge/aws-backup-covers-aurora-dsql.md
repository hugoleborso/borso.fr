---
summary: 'AWS Backup takes full daily snapshots of a DSQL cluster with the two AWS managed service policies; a restore always creates a new cluster.'
triggers:
  paths:
    - 'infra/cdk/src/constructs/dsql-cluster-backup*.ts'
    - 'apps/talos/cdk/lib/constructs/restore-drill.ts'
    - '.github/workflows/talos-restore-drill.yml'
  commands:
    - 'aws backup start-restore-job'
---

# AWS Backup covers Aurora DSQL

Checked on 2026-10-16.

- **Region.** `aws backup describe-region-settings` in eu-west-3 lists `"DSQL": true` under `ResourceTypeOptInPreference`, so a backup plan can select a DSQL cluster ARN without an opt-in step.
- **IAM.** No custom policy is needed. `AWSBackupServiceRolePolicyForBackup` (v30) has a `DSQLResourcePermissionsForBackup` statement (`dsql:StartBackupJob`, `GetBackupJob`, `StopBackupJob`, `GetCluster`, `ListClusters`, `ListTagsForResource`). `AWSBackupServiceRolePolicyForRestores` (v36) has `DSQLResourcePermissionsForRestore` (`dsql:StartRestoreJob`, `CreateCluster`, `TagResource`, and others). `DsqlClusterBackup` gives one role both policies, so the same role ARN is passed to a restore.
- **Shape.** Each recovery point is a full backup of the whole cluster, not incremental, and there is no per-table restore. A restore never overwrites the source: it creates a new cluster, with deletion protection on unless the metadata says otherwise.
- **Restore metadata.** A single-Region restore takes `--metadata '{"regionalConfig":"[{\"region\":\"eu-west-3\",\"isDeletionProtectionEnabled\":false}]"}'`. Leaving out `kmsKeyId` keeps the AWS managed key.
- **Starting a job needs `iam:PassRole`.** `StartBackupJob` and `StartRestoreJob` pass the backup service role, and `PowerUserAccess` (the GitHub deploy role) has no IAM actions. The talos drill therefore runs in a Lambda whose role may pass that one role to `backup.amazonaws.com`, and the workflow only invokes it and polls with `describe-*`, which `PowerUserAccess` allows.
- **Tags.** `StartRestoreJob` takes no tags, only `CopySourceTagsToRestoredResource`; a drill tag is added with `aws dsql tag-resource` once the cluster is `ACTIVE`.
- **Price in eu-west-3** (AWS Price List API, `AWSBackup`): warm storage costs $0.11 per GB-month (`EUW3-WarmStorage-ByteHrs-DSQL`), and a restore from warm storage costs $0.022 per GB (`EUW3-Restore-WarmBytes-DSQL`). Every point is a full copy, so stored size is about the number of retained points times the cluster size.

Sources: the managed policy reference pages for both policies, and the AWS Backup guide page `restore-auroradsql`.
