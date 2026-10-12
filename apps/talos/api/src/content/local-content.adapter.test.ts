/**
 * @vitest-environment node
 */

import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { createLocalContentStore } from './local-content.adapter';

function buildRepository(): string {
  const root = mkdtempSync(join(tmpdir(), 'talos-local-'));
  mkdirSync(join(root, 'second-brain', 'personnes'), { recursive: true });
  mkdirSync(join(root, 'node_modules', 'paquet'), { recursive: true });
  mkdirSync(join(root, 'etat', 'propositions', 'archives'), { recursive: true });
  writeFileSync(join(root, 'todo.md'), '# Todo\n');
  writeFileSync(join(root, 'second-brain', 'personnes', 'nina.md'), '# Nina\n');
  writeFileSync(join(root, 'node_modules', 'paquet', 'index.js'), '');
  writeFileSync(join(root, 'etat', 'propositions', 'a.md'), 'a');
  writeFileSync(join(root, 'etat', 'propositions', 'archives', 'b.md'), 'b');
  return root;
}

describe('createLocalContentStore', () => {
  it('reads a file from disk and answers null for a missing one', async () => {
    const store = createLocalContentStore({ root: buildRepository() });
    expect(await store.readFile('todo.md')).toBe('# Todo\n');
    expect(await store.readFile('absent.md')).toBeNull();
  });

  it('lists every file with forward slashes, without the skipped folders', async () => {
    const store = createLocalContentStore({ root: buildRepository() });
    expect(await store.listFiles()).toEqual([
      'etat/propositions/a.md',
      'etat/propositions/archives/b.md',
      'second-brain/personnes/nina.md',
      'todo.md',
    ]);
  });

  it('lists the files directly inside a directory', async () => {
    const store = createLocalContentStore({ root: buildRepository() });
    expect(await store.listDirectory('etat/propositions')).toEqual(['etat/propositions/a.md']);
  });

  it('reads several files and leaves out the missing ones', async () => {
    const store = createLocalContentStore({ root: buildRepository() });
    expect([...(await store.readFiles(['todo.md', 'absent.md']))]).toEqual([
      ['todo.md', '# Todo\n'],
    ]);
  });

  it('keeps writes in memory, reads them back and lists them, without touching the disk', async () => {
    const root = buildRepository();
    const overlay = new Map<string, string>();
    const store = createLocalContentStore({ root, overlay });
    const outcome = await store.editFile('boite/messages/m.md', (current) => ({
      content: `${current ?? 'nouveau'}\n`,
      commitMessage: 'pwa : message',
      outcome: 'écrit',
    }));
    expect(outcome).toBe('écrit');
    expect(overlay.get('boite/messages/m.md')).toBe('nouveau\n');
    expect(await store.readFile('boite/messages/m.md')).toBe('nouveau\n');
    expect(await store.listFiles()).toContain('boite/messages/m.md');
    expect(await createLocalContentStore({ root }).readFile('boite/messages/m.md')).toBeNull();
  });

  it('writes nothing when the edit declines', async () => {
    const overlay = new Map<string, string>();
    const store = createLocalContentStore({ root: buildRepository(), overlay });
    expect(await store.editFile('todo.md', () => ({ content: null, outcome: 'non' }))).toBe('non');
    expect(overlay.size).toBe(0);
  });
});
