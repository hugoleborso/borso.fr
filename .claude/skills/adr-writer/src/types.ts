export type Adr = {
  number: number;
  slug: string;
  title: string;
  status: 'proposed' | 'accepted' | 'superseded';
  date: string;
  context: string;
  decision: string;
  consequences: string;
  supersedes?: ReadonlyArray<number>;
  supersededBy?: number;
};
