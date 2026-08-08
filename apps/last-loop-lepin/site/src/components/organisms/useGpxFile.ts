/**
 * Holds the GPX file the operator picked and reads it on demand.
 *
 * The read happens at submit time, not at pick time, because `File.text` is
 * asynchronous and a quick submit would otherwise race it and post an empty
 * track. The decisions live in `gpx-file.utils.ts`.
 */

import { useState } from 'react';
import type { GpxErrorKey } from '../molecules/GpxFileField';
import {
  type GpxReadResult,
  selectOptionalGpxResult,
  selectRequiredGpxResult,
} from './gpx-file.utils';

export interface GpxFileState {
  readonly file: File | null;
  readonly errorKey: GpxErrorKey | null;
  readonly pickFile: (file: File | null) => void;
  readonly reportError: (errorKey: GpxErrorKey | null) => void;
  /** Read for a create, where a missing file is an error. */
  readonly readRequired: () => Promise<GpxReadResult>;
  /** Read for an edit, where a missing file keeps the persisted track. */
  readonly readOptional: () => Promise<GpxReadResult>;
}

export function useGpxFile(): GpxFileState {
  const [file, setFile] = useState<File | null>(null);
  const [errorKey, setErrorKey] = useState<GpxErrorKey | null>(null);

  function pickFile(picked: File | null): void {
    setFile(picked);
    setErrorKey(null);
  }

  async function readText(): Promise<string | null> {
    return file?.text().catch(() => null) ?? null;
  }

  async function readRequired(): Promise<GpxReadResult> {
    return selectRequiredGpxResult(file !== null, await readText());
  }

  async function readOptional(): Promise<GpxReadResult> {
    return selectOptionalGpxResult(file !== null, await readText());
  }

  return { file, errorKey, pickFile, reportError: setErrorKey, readRequired, readOptional };
}
