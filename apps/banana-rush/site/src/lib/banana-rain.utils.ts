export interface BananaDrop {
  readonly leftPercent: number;
  readonly sizePixels: number;
  readonly fallSeconds: number;
  readonly fallDelaySeconds: number;
  readonly spinSeconds: number;
  readonly spinDirection: 'normal' | 'reverse';
}

const SEED_MULTIPLIER = 1_664_525;
const SEED_INCREMENT = 1_013_904_223;
const SEED_MODULUS = 4_294_967_296;

const COLUMN_SPAN_PERCENT = 88;
const SMALLEST_SIZE_PIXELS = 18;
const SIZE_SPREAD_PIXELS = 16;
const SHORTEST_FALL_SECONDS = 2.6;
const FALL_SPREAD_SECONDS = 2.4;
const LONGEST_FALL_DELAY_SECONDS = 2.8;
const SHORTEST_SPIN_SECONDS = 1.8;
const SPIN_SPREAD_SECONDS = 2.6;
const BACKWARD_SPIN_SHARE = 0.5;
const HUNDREDTHS_PER_UNIT = 100;

function roundToHundredths(value: number): number {
  return Math.round(value * HUNDREDTHS_PER_UNIT) / HUNDREDTHS_PER_UNIT;
}

// @FollowsBlueprint utils-pure-module
export function createSeededDraw(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * SEED_MULTIPLIER + SEED_INCREMENT) % SEED_MODULUS;
    return state / SEED_MODULUS;
  };
}

export function buildBananaRain(count: number, draw: () => number): readonly BananaDrop[] {
  const columnWidthPercent = COLUMN_SPAN_PERCENT / count;
  const drops: BananaDrop[] = [];
  for (let column = 0; column < count; column += 1) {
    drops.push({
      leftPercent: roundToHundredths(columnWidthPercent * (column + draw())),
      sizePixels: Math.round(SMALLEST_SIZE_PIXELS + draw() * SIZE_SPREAD_PIXELS),
      fallSeconds: roundToHundredths(SHORTEST_FALL_SECONDS + draw() * FALL_SPREAD_SECONDS),
      fallDelaySeconds: roundToHundredths(draw() * LONGEST_FALL_DELAY_SECONDS),
      spinSeconds: roundToHundredths(SHORTEST_SPIN_SECONDS + draw() * SPIN_SPREAD_SECONDS),
      spinDirection: draw() < BACKWARD_SPIN_SHARE ? 'reverse' : 'normal',
    });
  }
  return drops;
}
