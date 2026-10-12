import { describe, expect, it } from 'vitest';
import {
  readDantotsuDocument,
  readField,
  readListValue,
  readNoneReason,
  stripQuotes,
} from './dantotsu-record.core';

const ENTRY = `---
date: 2026-10-10
severity: high   # how bad it was
tags: [gates, ci]
empty:
---

# A gate that measured nothing

prose
`;

describe('readDantotsuDocument', () => {
  it('reads every field of the front matter and drops a trailing comment', () => {
    const document = readDantotsuDocument('a-slug', ENTRY);
    expect(document.slug).toBe('a-slug');
    expect(document.fields?.get('date')).toBe('2026-10-10');
    expect(document.fields?.get('severity')).toBe('high');
    expect(document.fields?.get('tags')).toBe('[gates, ci]');
    expect(document.fields?.get('empty')).toBe('');
  });

  it('reads the title from the body and keeps the body without the front matter', () => {
    const document = readDantotsuDocument('a-slug', ENTRY);
    expect(document.title).toBe('A gate that measured nothing');
    expect(document.body).toBe('\n# A gate that measured nothing\n\nprose\n');
  });

  it('trims the spaces after a title', () => {
    expect(readDantotsuDocument('s', '# Spaced title   \n').title).toBe('Spaced title');
  });

  it('keeps a hash that is not a comment, such as a pull-request number', () => {
    const document = readDantotsuDocument('a-slug', "---\nfix-pr: '#62'\nrelated-pr: #6\n---\n");
    expect(document.fields?.get('fix-pr')).toBe("'#62'");
    expect(document.fields?.get('related-pr')).toBe('#6');
  });

  it('skips a line that is not a field', () => {
    const document = readDantotsuDocument('a-slug', '---\nnot a field\nzone: CLAUDE.md\n---\n');
    expect([...(document.fields ?? [])]).toEqual([['zone', 'CLAUDE.md']]);
  });

  it('reads a document with no front matter as having no fields and falls back to the slug', () => {
    const document = readDantotsuDocument('no-front-matter', 'prose only\n');
    expect(document.fields).toBeNull();
    expect(document.title).toBe('no-front-matter');
    expect(document.body).toBe('prose only\n');
  });
});

describe('readListValue', () => {
  it('reads a bracketed list, trimming entries and quotes', () => {
    expect(readListValue('[ a , \'b\', "c" ]')).toEqual(['a', 'b', 'c']);
  });

  it('reads a list written with spaces around it', () => {
    expect(readListValue('  [a]  ')).toEqual(['a']);
  });

  it('reads an empty list as no entries', () => {
    expect(readListValue('[]')).toEqual([]);
  });

  it('answers null for a value that is not a list, and for a missing value', () => {
    expect(readListValue('none (a reason)')).toBeNull();
    expect(readListValue(undefined)).toBeNull();
  });
});

describe('readNoneReason', () => {
  it('reads the reason of a none value, quoted or not', () => {
    expect(readNoneReason('none (never shipped)')).toBe('never shipped');
    expect(readNoneReason("'none (never shipped)'")).toBe('never shipped');
  });

  it('reads a none written with spaces around it', () => {
    expect(readNoneReason('  none (padded)  ')).toBe('padded');
  });

  it('answers null for anything else', () => {
    expect(readNoneReason('[abc1234]')).toBeNull();
    expect(readNoneReason('none')).toBeNull();
    expect(readNoneReason(' xnone (a)')).toBeNull();
    expect(readNoneReason(undefined)).toBeNull();
  });
});

describe('stripQuotes', () => {
  it('removes a quote only at either end', () => {
    expect(stripQuotes("'#6'")).toBe('#6');
    expect(stripQuotes('"#6"')).toBe('#6');
    expect(stripQuotes("a'b")).toBe("a'b");
  });
});

describe('readField', () => {
  it('answers a present, non-empty value', () => {
    expect(readField(readDantotsuDocument('s', ENTRY), 'date')).toBe('2026-10-10');
  });

  it('answers undefined for an empty or absent field, and for a document with no front matter', () => {
    const document = readDantotsuDocument('s', ENTRY);
    expect(readField(document, 'empty')).toBeUndefined();
    expect(readField(document, 'zone')).toBeUndefined();
    expect(readField(readDantotsuDocument('s', 'prose'), 'date')).toBeUndefined();
  });
});
