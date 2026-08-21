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
  readonly readRequired: () => Promise<GpxReadResult>;
  readonly readOptional: () => Promise<GpxReadResult>;
}

/**
 * @Blueprint hook-stateful-helper
 * @BlueprintName Hook Owning State And Returning Callbacks
 * @BlueprintUsage Use for a piece of component state with its own small workflow, shared by more than one component.
 * @BlueprintDescription Owns two `useState` values and returns them beside the callbacks that write them, with no effect anywhere: the file is read inside `readRequired` and `readOptional`, which run from the submit handler rather than from a subscription to the picked file. Every decision about what a read means is delegated to `gpx-file.utils.ts`, so the hook itself holds no rule and the rules stay testable without React.
 */
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
