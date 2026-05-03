import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * Source-level invariants that backstop our Dantotsu eradications.
 * Each test corresponds to a documented dantotsu under
 * `docs/dantotsus/`; the test failing tells you a regression is
 * about to ship.
 *
 * Strip comments before matching so the lesson description in the
 * source can mention the banned token without triggering the rule.
 */

const HERE = path.dirname(fileURLToPath(import.meta.url));
const CONSTRUCTS_DIR = path.resolve(HERE, '../../src/constructs');
const INTERNAL_DIR = path.resolve(HERE, '../../src/internal');

function readStripped(filePath: string): string {
  const source = fs.readFileSync(filePath, 'utf-8');
  return source
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/\/\/.*$/gm, ' ');
}

describe('eradication: no `bundling.nodeModules` in CDK constructs', () => {
  // docs/dantotsus/cdk-nodejsfunction-bundling.md — pure-JS deps belong
  // in esbuild's inline bundle (externalModules: ['@aws-sdk/client-*'],
  // no nodeModules). nodeModules triggers a transient pnpm install on
  // every synth and balloons test wall-clock + risks IPC timeouts.
  const files = fs.readdirSync(CONSTRUCTS_DIR).filter((name) => name.endsWith('.ts'));
  it.each(files)('%s', (file) => {
    const stripped = readStripped(path.join(CONSTRUCTS_DIR, file));
    expect(stripped).not.toMatch(/\bnodeModules\s*:/);
  });
});

describe('eradication: cf-host-routing-function uses ES5-only syntax', () => {
  // docs/dantotsus/cloudfront-function-runtime-es5.md — CloudFront
  // Functions runtime 2.0 advertises ES2020 but is unreliable. Stay on
  // var / string concat / no optional chaining / no template literals
  // so deploys don't surface FunctionExecutionError on the edge.
  const sourcePath = path.join(INTERNAL_DIR, 'cf-host-routing-function.code.js');
  const stripped = readStripped(sourcePath);

  it('uses var, not let or const, for variable declarations', () => {
    expect(stripped).not.toMatch(/\b(let|const)\s+\w+\s*=/);
  });

  it('does not use optional chaining (`?.`)', () => {
    expect(stripped).not.toMatch(/\?\./);
  });

  it('does not use template literals', () => {
    expect(stripped).not.toMatch(/`[^`]*\$\{/);
  });
});
