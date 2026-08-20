#!/usr/bin/env tsx

import { globSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  listCatalogProblems,
  type Catalogs,
  type Declaration,
  type WorkspaceManifest,
} from './catalog.core';

const REPOSITORY_ROOT = process.cwd();
const WORKSPACE_FILE = 'pnpm-workspace.yaml';
const MANIFEST_GLOBS = ['package.json', 'apps/*/package.json', 'infra/*/package.json'];
const DEPENDENCY_FIELDS = ['dependencies', 'devDependencies'] as const;
const DEFAULT_CATALOG = 'default';
const CATALOG_HEADING = /^catalog:\s*$/;
const CATALOGS_HEADING = /^catalogs:\s*$/;
const NAMED_CATALOG_HEADING = /^ {2}([\w-]+):\s*$/;
const ENTRY_PATTERN = /^ {2,4}'?([^':\s]+)'?:\s*'?([^'\s]+)'?\s*$/;

function readManifest(relativePath: string): WorkspaceManifest {
  const parsed: unknown = JSON.parse(readFileSync(join(REPOSITORY_ROOT, relativePath), 'utf8'));
  const declarations: Declaration[] = [];
  if (typeof parsed === 'object' && parsed !== null) {
    for (const field of DEPENDENCY_FIELDS) {
      const block: unknown = Reflect.get(parsed, field);
      if (typeof block !== 'object' || block === null) continue;
      for (const [name, range] of Object.entries(block)) {
        if (typeof range === 'string') declarations.push({ name, range });
      }
    }
  }
  return { workspace: relativePath, declarations };
}

function readCatalogs(): Catalogs {
  const catalogs = new Map<string, Map<string, string>>();
  let current: Map<string, string> | null = null;
  let isInNamedSection = false;

  for (const line of readFileSync(join(REPOSITORY_ROOT, WORKSPACE_FILE), 'utf8').split('\n')) {
    if (CATALOG_HEADING.test(line)) {
      current = new Map();
      catalogs.set(DEFAULT_CATALOG, current);
      isInNamedSection = false;
      continue;
    }
    if (CATALOGS_HEADING.test(line)) {
      current = null;
      isInNamedSection = true;
      continue;
    }
    const named = isInNamedSection ? NAMED_CATALOG_HEADING.exec(line) : null;
    if (named !== null) {
      current = new Map();
      catalogs.set(named[1] ?? '', current);
      continue;
    }
    const entry = current === null ? null : ENTRY_PATTERN.exec(line);
    if (entry !== null) current?.set(entry[1] ?? '', entry[2] ?? '');
  }
  return catalogs;
}

const manifests = MANIFEST_GLOBS.flatMap((pattern) =>
  globSync(pattern, { cwd: REPOSITORY_ROOT }).sort(),
).map(readManifest);

const problems = listCatalogProblems(manifests, readCatalogs());
if (problems.length > 0) {
  for (const problem of problems) console.error(`  ${problem.workspace}: ${problem.message}`);
  console.error(
    `\n${String(problems.length)} dependency problem(s). Move the version into \`${WORKSPACE_FILE}\` and write \`catalog:\` in the workspace.`,
  );
  process.exit(1);
}
console.log(
  `[check-dependency-catalog] every dependency ${String(manifests.length)} workspace(s) share resolves through a catalog`,
);
