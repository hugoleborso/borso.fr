export type FileEdit<Outcome> =
  | { readonly content: string; readonly commitMessage: string; readonly outcome: Outcome }
  | { readonly content: null; readonly outcome: Outcome };

export type FileEditor<Outcome> = (current: string | null) => FileEdit<Outcome>;

export interface ContentStore {
  readonly readFile: (path: string) => Promise<string | null>;
  readonly listDirectory: (directory: string) => Promise<string[]>;
  readonly listFiles: () => Promise<string[]>;
  readonly readFiles: (paths: readonly string[]) => Promise<ReadonlyMap<string, string>>;
  readonly editFile: <Outcome>(path: string, editor: FileEditor<Outcome>) => Promise<Outcome>;
}
