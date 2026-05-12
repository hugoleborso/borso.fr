export interface Runner {
  readonly editionSlug: string;
  readonly slug: string;
  readonly displayName: string;
  readonly photoKey: string | null;
  readonly bib: number | null;
}
