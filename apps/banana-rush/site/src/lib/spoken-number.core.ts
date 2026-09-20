const SMALL_WORDS: Readonly<Record<string, number>> = {
  zero: 0,
  un: 1,
  une: 1,
  one: 1,
  deux: 2,
  two: 2,
  trois: 3,
  three: 3,
  quatre: 4,
  four: 4,
  cinq: 5,
  five: 5,
  six: 6,
  sept: 7,
  seven: 7,
  huit: 8,
  eight: 8,
  neuf: 9,
  nine: 9,
  dix: 10,
  ten: 10,
  onze: 11,
  eleven: 11,
  douze: 12,
  twelve: 12,
  treize: 13,
  thirteen: 13,
  quatorze: 14,
  fourteen: 14,
  quinze: 15,
  fifteen: 15,
  seize: 16,
  sixteen: 16,
  seventeen: 17,
  eighteen: 18,
  nineteen: 19,
};

const TENS_WORDS: Readonly<Record<string, number>> = {
  trente: 30,
  thirty: 30,
  quarante: 40,
  forty: 40,
  cinquante: 50,
  fifty: 50,
  soixante: 60,
  sixty: 60,
  seventy: 70,
  eighty: 80,
  ninety: 90,
};

const SCORE_WORDS = new Set(['vingt', 'vingts', 'twenty']);
const HUNDRED_WORDS = new Set(['cent', 'cents', 'hundred']);
const THOUSAND_WORDS = new Set(['mille', 'milles', 'thousand']);

const SCORE = 20;
const HUNDRED = 100;
const THOUSAND = 1_000;
const FOUR_SCORES = 4;

const DIGITS_ONLY = /^\d+$/u;
const ACCENTS = /\p{Diacritic}/gu;
const SEPARATORS = /[\s-]+/u;

interface Heard {
  readonly total: number;
  readonly hundreds: number;
  readonly current: number;
  readonly sawNumber: boolean;
}

const NOTHING_HEARD: Heard = { total: 0, hundreds: 0, current: 0, sawNumber: false };

function normalize(spoken: string): readonly string[] {
  return spoken.normalize('NFD').replaceAll(ACCENTS, '').toLowerCase().split(SEPARATORS);
}

function scored(current: number): number {
  return current === FOUR_SCORES ? current * SCORE : current + SCORE;
}

function added(heard: Heard, value: number): Heard {
  return { ...heard, current: heard.current + value, sawNumber: true };
}

function applyToken(heard: Heard, token: string): Heard {
  if (DIGITS_ONLY.test(token)) return added(heard, Number(token));

  const small = SMALL_WORDS[token];
  if (small !== undefined) return added(heard, small);

  const tens = TENS_WORDS[token];
  if (tens !== undefined) return added(heard, tens);

  if (SCORE_WORDS.has(token)) {
    return { ...heard, current: scored(heard.current), sawNumber: true };
  }
  if (HUNDRED_WORDS.has(token)) {
    return {
      ...heard,
      hundreds: heard.hundreds + Math.max(heard.current, 1) * HUNDRED,
      current: 0,
      sawNumber: true,
    };
  }
  if (THOUSAND_WORDS.has(token)) {
    return {
      total: heard.total + Math.max(heard.hundreds + heard.current, 1) * THOUSAND,
      hundreds: 0,
      current: 0,
      sawNumber: true,
    };
  }
  return heard;
}

/**
 * @Blueprint core-spoken-number-parser
 * @BlueprintName Core Spoken Number Parser
 * @BlueprintUsage Use for turning what a speech recogniser heard into the number a person meant, in a language whose numbers are not a plain sum of their words.
 * @BlueprintDescription Accumulates in three registers rather than one, because the languages it reads disagree about what a word does to what came before it. In French only `quatre` multiplies the `vingt` that follows it, so `quatre vingt dix` is ninety rather than thirty four, while `vingt` after anything else merely adds; hundreds are held apart from the running tens so `cent quatre vingt` is a hundred and eighty rather than a hundred and twenty four. Words it does not know are skipped instead of refused, because a recogniser hands back a whole sentence and the number is usually inside one; an answer comes only when a number word was actually seen, so a sentence holding none is refused rather than read as zero. It takes text and nothing else, which is what lets every one of these cases be a test rather than something learned from a microphone.
 */
export function parseSpokenNumber(spoken: string): number | null {
  const heard = normalize(spoken).reduce(applyToken, NOTHING_HEARD);
  if (!heard.sawNumber) return null;
  return heard.total + heard.hundreds + heard.current;
}
