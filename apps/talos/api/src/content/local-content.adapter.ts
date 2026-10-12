import { readdir, readFile } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';
import { isSkippedLocalDirectory, selectDirectoryFiles } from './content.core';
import type { ContentStore, FileEditor } from './content.types';

export interface LocalContentOptions {
  readonly root: string;
  readonly overlay?: Map<string, string>;
}

async function readFromDisk(root: string, path: string): Promise<string | null> {
  try {
    return await readFile(join(root, path), 'utf8');
  } catch {
    return null;
  }
}

async function walkFiles(root: string, directory: string): Promise<string[]> {
  const visibleEntries = (await readdir(directory, { withFileTypes: true })).filter(
    (entry) => !isSkippedLocalDirectory(entry.name),
  );
  const files = visibleEntries
    .filter((entry) => entry.isFile())
    .map((entry) => relative(root, join(directory, entry.name)).split(sep).join('/'));
  const nested = await Promise.all(
    visibleEntries
      .filter((entry) => entry.isDirectory())
      .map(async (entry) => await walkFiles(root, join(directory, entry.name))),
  );
  return [...files, ...nested.flat()];
}

// @FollowsBlueprint adapter-chosen-by-the-composition-root
export function createLocalContentStore(options: LocalContentOptions): ContentStore {
  const overlay = options.overlay ?? new Map<string, string>();
  const readOne = async (path: string) =>
    overlay.get(path) ?? (await readFromDisk(options.root, path));
  const listFiles = async () =>
    [...new Set([...(await walkFiles(options.root, options.root)), ...overlay.keys()])].toSorted();
  return {
    readFile: readOne,
    listDirectory: async (directory) => selectDirectoryFiles(await listFiles(), directory),
    listFiles,
    readFiles: async (paths) => {
      const contents = await Promise.all(
        paths.map(async (path) => [path, await readOne(path)] as const),
      );
      return new Map(
        contents.filter((pair): pair is readonly [string, string] => pair[1] !== null),
      );
    },
    editFile: async <Outcome>(path: string, editor: FileEditor<Outcome>) => {
      const edit = editor(await readOne(path));
      if (edit.content !== null) overlay.set(path, edit.content);
      return edit.outcome;
    },
  };
}
