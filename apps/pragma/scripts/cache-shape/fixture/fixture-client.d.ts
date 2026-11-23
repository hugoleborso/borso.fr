interface Answer<Body> {
  readonly status: number;
  json(): Promise<Body>;
}

interface Chain {
  readonly label: string;
  readonly next: Chain | null;
}

interface Point {
  readonly x: number;
}

interface Read<Body> {
  $get(): Promise<Answer<Body>>;
  $post(): Promise<Answer<{ readonly written: true }>>;
  readonly $meta: { $get(): Promise<Answer<{ readonly hidden: true }>> };
}

export declare const firstExport: {
  $get(): Promise<Answer<{ readonly wrong: string }>>;
};

export declare const api: {
  readonly songs: Read<{
    readonly title: string;
    readonly note?: string;
    readonly plays: number;
    readonly size: bigint;
    readonly tags: readonly string[];
    readonly pair: readonly [number, string];
    readonly mood: 'loud' | 'calm';
    readonly from: Point;
    readonly to: Point;
    readonly anything: unknown;
    readonly gone: undefined;
    readonly empty: null;
    readonly impossible: never;
    readonly chain: Chain;
  }>;
  readonly members: {
    readonly ':id': {
      $get(): Promise<Answer<{ readonly id: string }> | Answer<{ readonly error: boolean }>>;
    };
  };
};
