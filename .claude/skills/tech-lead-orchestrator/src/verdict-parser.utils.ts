import { parse as parseYaml } from 'yaml';
import type { SubAgentVerdict, SubAgentVerdictStatus, VerdictNext } from './types';

const FRONT_MATTER_PATTERN = /^---\n([\s\S]*?)\n---/;

export function extractFrontMatter(markdown: string): string | null {
  const match = FRONT_MATTER_PATTERN.exec(markdown);
  return match?.[1] ?? null;
}

function blockedVerdict(reason: string): SubAgentVerdict {
  return {
    status: 'blocked',
    summary: `Verdict unparseable: ${reason}`,
    next: { kind: 'escalate', reason: `unparseable-verdict: ${reason}` },
    artifacts: [],
  };
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === 'string');
}

function isVerdictStatus(value: unknown): value is SubAgentVerdictStatus {
  return value === 'done' || value === 'question' || value === 'blocked' || value === 'failed';
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function asObject(value: unknown): Record<string, unknown> | null {
  return isObjectRecord(value) ? value : null;
}

function parseNext(raw: unknown): VerdictNext | null {
  const next = asObject(raw);
  if (next === null) return null;
  const { kind } = next;
  if (kind === 'validate') return { kind: 'validate' };
  if (kind === 'answer-needed') {
    if (typeof next.question !== 'string') return null;
    if (next.options !== undefined && !isStringArray(next.options)) return null;
    return {
      kind: 'answer-needed',
      question: next.question,
      ...(next.options !== undefined ? { options: next.options } : {}),
    };
  }
  if (kind === 'replan') {
    if (typeof next.scope !== 'string') return null;
    return { kind: 'replan', scope: next.scope };
  }
  if (kind === 'escalate') {
    if (typeof next.reason !== 'string') return null;
    return { kind: 'escalate', reason: next.reason };
  }
  return null;
}

export function parseVerdictFromMarkdown(markdown: string): SubAgentVerdict {
  const frontMatter = extractFrontMatter(markdown);
  if (frontMatter === null) return blockedVerdict('missing-front-matter');

  let parsed: unknown;
  try {
    parsed = parseYaml(frontMatter);
  } catch {
    return blockedVerdict('malformed-yaml');
  }

  const obj = asObject(parsed);
  if (obj === null) return blockedVerdict('front-matter-not-object');

  if (!isVerdictStatus(obj.status)) return blockedVerdict('invalid-status');
  if (typeof obj.summary !== 'string') return blockedVerdict('missing-summary');
  if (!isStringArray(obj.artifacts ?? [])) return blockedVerdict('invalid-artifacts');

  const next = obj.next !== undefined ? parseNext(obj.next) : null;
  if (obj.next !== undefined && next === null) return blockedVerdict('invalid-next');

  return {
    status: obj.status,
    summary: obj.summary,
    artifacts: isStringArray(obj.artifacts) ? obj.artifacts : [],
    ...(next !== null ? { next } : {}),
  };
}
