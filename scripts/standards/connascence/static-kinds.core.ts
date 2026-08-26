import {
  buildFinding,
  distinctPaths,
  localityOf,
  MINIMUM_FILES_FOR_SHARED_SUBJECT,
  scoreOf,
} from './scoring.core';
import type {
  BodySite,
  Finding,
  LiteralSite,
  Occurrence,
  RegexSite,
  SignatureSite,
  SourceFile,
  UnionSite,
} from './connascence.types';

export function listMeaningConnascence(
  literals: readonly LiteralSite[],
  index: ReadonlyMap<string, SourceFile>,
): readonly Finding[] {
  const byValue = new Map<string, Occurrence[]>();
  for (const literal of literals) {
    const bucket = byValue.get(literal.value) ?? [];
    bucket.push({
      path: literal.path,
      line: literal.line,
      detail: literal.named ? 'named constant' : 'inline literal',
    });
    byValue.set(literal.value, bucket);
  }
  const findings: Finding[] = [];
  for (const [value, occurrences] of byValue) {
    if (distinctPaths(occurrences) < MINIMUM_FILES_FOR_SHARED_SUBJECT) continue;
    findings.push(buildFinding('meaning', value, occurrences, index));
  }
  return findings;
}

interface SharedBody {
  readonly name: string;
  readonly occurrences: Occurrence[];
}

export function listAlgorithmConnascence(
  regexes: readonly RegexSite[],
  bodies: readonly BodySite[],
  index: ReadonlyMap<string, SourceFile>,
): readonly Finding[] {
  const byRegex = new Map<string, Occurrence[]>();
  for (const regex of regexes) {
    const bucket = byRegex.get(regex.source) ?? [];
    bucket.push({ path: regex.path, line: regex.line, detail: 'regular expression' });
    byRegex.set(regex.source, bucket);
  }
  const byDigest = new Map<string, SharedBody>();
  for (const body of bodies) {
    const bucket = byDigest.get(body.digest) ?? { name: body.name, occurrences: [] };
    bucket.occurrences.push({ path: body.path, line: body.line, detail: body.name });
    byDigest.set(body.digest, bucket);
  }
  const findings: Finding[] = [];
  for (const [source, occurrences] of byRegex) {
    if (distinctPaths(occurrences) < MINIMUM_FILES_FOR_SHARED_SUBJECT) continue;
    findings.push(buildFinding('algorithm', `/${source}/`, occurrences, index));
  }
  for (const shared of byDigest.values()) {
    if (distinctPaths(shared.occurrences) < MINIMUM_FILES_FOR_SHARED_SUBJECT) continue;
    findings.push(buildFinding('algorithm', `body of ${shared.name}`, shared.occurrences, index));
  }
  return findings;
}

export const POSITIONAL_ARITY_THRESHOLD = 3;

export function listPositionConnascence(
  signatures: readonly SignatureSite[],
  importersOf: ReadonlyMap<string, readonly string[]>,
  index: ReadonlyMap<string, SourceFile>,
): readonly Finding[] {
  const findings: Finding[] = [];
  for (const signature of signatures) {
    if (signature.arity < POSITIONAL_ARITY_THRESHOLD) continue;
    const callers = importersOf.get(signature.path) ?? [];
    const locality = localityOf([signature.path, ...callers], index);
    findings.push({
      kind: 'position',
      subject: `${signature.name}/${String(signature.arity)}`,
      occurrences: [
        {
          path: signature.path,
          line: signature.line,
          detail: `${String(signature.arity)} positional parameters, ${String(callers.length)} importing file(s)`,
        },
      ],
      degree: signature.arity,
      locality,
      score: scoreOf('position', signature.arity, locality),
    });
  }
  return findings;
}

export function listValueConnascence(
  unions: readonly UnionSite[],
  literalsByPath: ReadonlyMap<string, ReadonlySet<string>>,
  index: ReadonlyMap<string, SourceFile>,
): readonly Finding[] {
  const findings: Finding[] = [];
  for (const union of unions) {
    const echoes: Occurrence[] = [
      { path: union.path, line: union.line, detail: `type ${union.name}` },
    ];
    for (const [path, values] of literalsByPath) {
      if (path === union.path) continue;
      const file = index.get(path);
      if (file !== undefined && file.imports.includes(union.path)) continue;
      if (union.members.every((member) => values.has(member))) {
        echoes.push({ path, line: 0, detail: `re-enumerates every member of ${union.name}` });
      }
    }
    if (echoes.length < MINIMUM_FILES_FOR_SHARED_SUBJECT) continue;
    findings.push(
      buildFinding('value', `${union.name} = ${union.members.join(' | ')}`, echoes, index),
    );
  }
  return findings;
}
