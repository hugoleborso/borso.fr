export type ConnascenceKind =
  'meaning' | 'position' | 'algorithm' | 'execution' | 'timing' | 'cache' | 'value';

export interface SourceFile {
  readonly path: string;
  readonly workspace: string;
  readonly container: string;
  readonly context: string | null;
  readonly imports: readonly string[];
}

export interface LiteralSite {
  readonly path: string;
  readonly value: string;
  readonly line: number;
  readonly named: boolean;
}

export interface RegexSite {
  readonly path: string;
  readonly source: string;
  readonly line: number;
}

export interface BodySite {
  readonly path: string;
  readonly name: string;
  readonly digest: string;
  readonly tokens: number;
  readonly lines: number;
  readonly line: number;
}

export interface TemporalSite {
  readonly path: string;
  readonly line: number;
  readonly milliseconds: number;
  readonly expression: string;
}

export interface CacheTouchSite {
  readonly path: string;
  readonly line: number;
  readonly owner: string;
  readonly root: string;
  readonly method: string;
}

export interface QueryReadSite {
  readonly path: string;
  readonly root: string;
}

export interface SignatureSite {
  readonly path: string;
  readonly name: string;
  readonly arity: number;
  readonly line: number;
}

export interface UnionSite {
  readonly path: string;
  readonly name: string;
  readonly members: readonly string[];
  readonly line: number;
}

export interface MutableStateSite {
  readonly path: string;
  readonly name: string;
  readonly writers: readonly string[];
  readonly readers: readonly string[];
  readonly line: number;
}

export interface Occurrence {
  readonly path: string;
  readonly line: number;
  readonly detail: string;
}

export interface Finding {
  readonly kind: ConnascenceKind;
  readonly subject: string;
  readonly occurrences: readonly Occurrence[];
  readonly degree: number;
  readonly locality: number;
  readonly score: number;
}

export interface KindSummary {
  readonly kind: ConnascenceKind;
  readonly findings: number;
  readonly sites: number;
  readonly score: number;
}

export interface OrphanCacheKey {
  readonly root: string;
  readonly path: string;
  readonly line: number;
  readonly method: string;
}

export interface Metrics {
  readonly duplicatedLinePercent: number;
  readonly maximumArity: number;
  readonly maximumCacheFanOut: number;
  readonly orphanCacheKeys: number;
  readonly maximumTimingDegree: number;
}

export interface Ceiling {
  readonly limit: number;
  readonly anchor: string;
}

export type Ceilings = Readonly<Record<string, Ceiling>>;

export interface CeilingFailure {
  readonly metric: string;
  readonly measured: number;
  readonly limit: number;
  readonly anchor: string;
}

export type Baseline = Readonly<Record<string, number>>;

export interface RatchetFailure {
  readonly key: string;
  readonly was: number;
  readonly now: number;
}
