import type { Adr } from './types';

const NUMBER_PAD_WIDTH = 4;

export function padAdrNumber(value: number): string {
  return String(value).padStart(NUMBER_PAD_WIDTH, '0');
}

export function renderAdrFilename(adr: Pick<Adr, 'number' | 'slug'>): string {
  return `${padAdrNumber(adr.number)}-${adr.slug}.md`;
}

export function renderAdrMarkdown(adr: Adr): string {
  const headerLines: string[] = [
    `# ADR ${padAdrNumber(adr.number)} — ${adr.title}`,
    '',
    `**Status:** ${adr.status}`,
    `**Date:** ${adr.date}`,
  ];

  const supersedes = adr.supersedes ?? [];
  if (supersedes.length > 0) {
    headerLines.push(`**Supersedes:** ${supersedes.map(padAdrNumber).join(', ')}`);
  }
  if (adr.supersededBy !== undefined) {
    headerLines.push(`**Superseded by:** ${padAdrNumber(adr.supersededBy)}`);
  }

  return [
    headerLines.join('\n'),
    '',
    '## Context',
    '',
    adr.context,
    '',
    '## Decision',
    '',
    adr.decision,
    '',
    '## Consequences',
    '',
    adr.consequences,
    '',
  ].join('\n');
}
