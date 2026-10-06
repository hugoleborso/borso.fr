export const KEYSTROKE_LEVEL_MODEL_SECONDS = {
  mentalPreparation: 1.35,
  pointing: 1.1,
  keystroke: 0.28,
} as const;

export const SWIPE_TRAVEL_SHARE_OF_VIEWPORT = 0.75;
export const STRETCH_ZONE_SHARE_OF_VIEWPORT = 0.25;
const ARRIVAL_SCREEN_COUNT = 1;
const SECONDS_DECIMALS = 1;
const DECIMAL_BASE = 10;

export type StepKind = 'tap' | 'type';

export interface StepObservation {
  readonly kind: StepKind;
  readonly label: string;
  readonly typedCharacters: number;
  readonly scrolledPixels: number;
  readonly targetCentreY: number;
  readonly hasChangedScreen: boolean;
}

export interface JourneyObservation {
  readonly viewportHeight: number;
  readonly steps: readonly StepObservation[];
}

export interface JourneyEffort {
  readonly taps: number;
  readonly typedCharacters: number;
  readonly swipes: number;
  readonly screens: number;
  readonly huntedTaps: number;
  readonly stretchTaps: number;
  readonly modelledSeconds: number;
}

export interface JourneyBudget {
  readonly taps: number;
  readonly huntedTaps: number;
  readonly modelledSeconds: number;
}

export interface JourneyResult {
  readonly id: string;
  readonly title: string;
  readonly budget: JourneyBudget;
  readonly effort: JourneyEffort | null;
  readonly failure: string | null;
}

export function countSwipes(scrolledPixels: number, viewportHeight: number): number {
  return Math.ceil(Math.max(0, scrolledPixels) / (viewportHeight * SWIPE_TRAVEL_SHARE_OF_VIEWPORT));
}

export function isStretchTap(targetCentreY: number, viewportHeight: number): boolean {
  return targetCentreY < viewportHeight * STRETCH_ZONE_SHARE_OF_VIEWPORT;
}

export function roundSeconds(seconds: number): number {
  const factor = DECIMAL_BASE ** SECONDS_DECIMALS;
  return Math.round(seconds * factor) / factor;
}

export function measureJourneyEffort(observation: JourneyObservation): JourneyEffort {
  const { steps, viewportHeight } = observation;
  const taps = steps.length;
  const typedCharacters = steps.reduce((total, step) => total + step.typedCharacters, 0);
  const swipes = steps.reduce(
    (total, step) => total + countSwipes(step.scrolledPixels, viewportHeight),
    0,
  );
  const screens = ARRIVAL_SCREEN_COUNT + steps.filter((step) => step.hasChangedScreen).length;
  const huntedTaps = steps.filter((step) => step.scrolledPixels > 0).length;
  const stretchTaps = steps.filter((step) =>
    isStretchTap(step.targetCentreY, viewportHeight),
  ).length;
  const modelledSeconds = roundSeconds(
    screens * KEYSTROKE_LEVEL_MODEL_SECONDS.mentalPreparation +
      (taps + swipes) * KEYSTROKE_LEVEL_MODEL_SECONDS.pointing +
      typedCharacters * KEYSTROKE_LEVEL_MODEL_SECONDS.keystroke,
  );
  return { taps, typedCharacters, swipes, screens, huntedTaps, stretchTaps, modelledSeconds };
}

export function listBudgetOverruns(effort: JourneyEffort, budget: JourneyBudget): string[] {
  const overruns: string[] = [];
  if (effort.taps > budget.taps) overruns.push(`taps ${effort.taps} > ${budget.taps}`);
  if (effort.huntedTaps > budget.huntedTaps) {
    overruns.push(`hunted ${effort.huntedTaps} > ${budget.huntedTaps}`);
  }
  if (effort.modelledSeconds > budget.modelledSeconds) {
    overruns.push(`${effort.modelledSeconds}s > ${budget.modelledSeconds}s`);
  }
  return overruns;
}

function describeVerdict(result: JourneyResult): string {
  if (result.effort === null) return `could not run: ${result.failure ?? 'unknown'}`;
  const overruns = listBudgetOverruns(result.effort, result.budget);
  return overruns.length === 0 ? 'within budget' : `over: ${overruns.join(', ')}`;
}

function describeSecondsChange(current: number, baseline: JourneyEffort | undefined): string {
  if (baseline === undefined) return `${current}s`;
  const change = roundSeconds(current - baseline.modelledSeconds);
  const sign = change > 0 ? '+' : '';
  return `${current}s (was ${baseline.modelledSeconds}s, ${sign}${change}s)`;
}

const REPORT_HEADER = [
  '| Job | Taps | Typed | Swipes | Screens | Hunted | Stretch | Modelled time | Verdict |',
  '| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |',
];

export function formatEffortTable(
  results: readonly JourneyResult[],
  baselineById: Readonly<Record<string, JourneyEffort>>,
): string {
  const rows = results.map((result) => {
    const { effort } = result;
    if (effort === null) {
      return `| ${result.title} | – | – | – | – | – | – | – | ${describeVerdict(result)} |`;
    }
    const cells = [
      result.title,
      String(effort.taps),
      String(effort.typedCharacters),
      String(effort.swipes),
      String(effort.screens),
      String(effort.huntedTaps),
      String(effort.stretchTaps),
      describeSecondsChange(effort.modelledSeconds, baselineById[result.id]),
      describeVerdict(result),
    ];
    return `| ${cells.join(' | ')} |`;
  });
  return [...REPORT_HEADER, ...rows].join('\n');
}

export function indexEffortById(
  results: readonly JourneyResult[],
): Readonly<Record<string, JourneyEffort>> {
  const index: Record<string, JourneyEffort> = {};
  for (const result of results) {
    if (result.effort !== null) index[result.id] = result.effort;
  }
  return index;
}
