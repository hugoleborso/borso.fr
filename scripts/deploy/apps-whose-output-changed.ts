#!/usr/bin/env tsx

import { listAppsWhoseOutputChanged } from './synthesized-output';

const USAGE = `usage:
  apps-whose-output-changed.ts <base-revision> <app>...
      synthesizes each <app> in this checkout and at <base-revision>, and prints, as a JSON
      array, the apps whose CloudFormation templates or asset manifests differ. An app that
      fails to synthesize on either side counts as changed.`;

const [base, ...apps] = process.argv.slice(2);

if (base === undefined || apps.length === 0) {
  console.error(USAGE);
  process.exit(2);
}

console.log(JSON.stringify(listAppsWhoseOutputChanged(base, null, apps)));
