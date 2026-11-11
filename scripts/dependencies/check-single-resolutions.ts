#!/usr/bin/env tsx

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { listDuplicatedResolutions } from './single-resolution.core';

const LOCKFILE = 'pnpm-lock.yaml';
const BUNDLED_ONCE = ['@smithy/core', '@aws-sdk/core', '@aws-sdk/nested-clients'];

const duplicated = listDuplicatedResolutions(
  readFileSync(join(process.cwd(), LOCKFILE), 'utf8'),
  BUNDLED_ONCE,
);
if (duplicated.length > 0) {
  for (const { name, versions } of duplicated) {
    console.error(`  ${name} resolves to ${versions.join(' and ')}`);
  }
  console.error(
    `\n${String(duplicated.length)} package(s) resolve to more than one version in \`${LOCKFILE}\`, so every Lambda bundle carries each copy and evaluates it at every cold start. Run \`pnpm dedupe\` and commit the lockfile.`,
  );
  process.exit(1);
}
console.log(
  `[check-single-resolutions] ${String(BUNDLED_ONCE.length)} package(s) every Lambda bundles resolve to one version each`,
);
