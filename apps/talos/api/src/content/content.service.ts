import {
  listMemoryDirectory,
  readMemoryFile,
  readMemoryFiles,
} from '../memory/memory-files.service';

export type { FileEdit, FileEditor } from './content.types';

// @FollowsBlueprint service-passthrough
export async function readContentFile(path: string): Promise<string | null> {
  return await readMemoryFile(path);
}

export async function listContentDirectory(directory: string): Promise<string[]> {
  return await listMemoryDirectory(directory);
}

export async function readContentFiles(
  paths: readonly string[],
): Promise<ReadonlyMap<string, string>> {
  return await readMemoryFiles(paths);
}
