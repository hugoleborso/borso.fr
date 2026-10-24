import { registerHooks } from 'node:module';

const RELATIVE_SPECIFIER = /^\.{1,2}\//;
const EXPLICIT_EXTENSION = /\.[cm]?[jt]sx?$/;
const EMITTED_EXTENSION = /\.js$/;

function listTypeScriptCandidates(specifier) {
  if (EMITTED_EXTENSION.test(specifier)) return [specifier.replace(EMITTED_EXTENSION, '.ts')];
  if (EXPLICIT_EXTENSION.test(specifier)) return [];
  return [`${specifier}.ts`, `${specifier}/index.ts`];
}

function resolveTypeScriptSource(specifier, context, nextResolve) {
  if (!RELATIVE_SPECIFIER.test(specifier)) return nextResolve(specifier, context);
  for (const candidate of listTypeScriptCandidates(specifier)) {
    try {
      return nextResolve(candidate, context);
    } catch {
      continue;
    }
  }
  return nextResolve(specifier, context);
}

registerHooks({ resolve: resolveTypeScriptSource });
