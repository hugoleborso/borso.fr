export type FileEdit<Outcome> =
  | { readonly content: string; readonly commitMessage: string; readonly outcome: Outcome }
  | { readonly content: null; readonly outcome: Outcome };

export type FileEditor<Outcome> = (current: string | null) => FileEdit<Outcome>;
