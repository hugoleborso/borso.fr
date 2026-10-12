type Sha1State = readonly [number, number, number, number, number];

const BLOCK_BYTES = 64;
const LENGTH_FIELD_BYTES = 8;
const WORD_BYTES = 4;
const WORD_BITS = 32;
const SCHEDULE_WORDS = 80;
const BLOCK_WORDS = 16;
const ROUNDS_PER_STAGE = 20;
const BITS_PER_BYTE = 8;
const PADDING_MARKER = 0x80;
const HEX_RADIX = 16;
const HEX_DIGITS_PER_WORD = 8;
const TODO_ID_LENGTH = 10;
const STAGE_CONSTANTS_HEX = '5a8279996ed9eba18f1bbcdcca62c1d6';
const STAGES = { choice: 0, majority: 2 } as const;
const SCHEDULE_TAPS = { third: 3, eighth: 8, fourteenth: 14, sixteenth: 16 } as const;
const LEFT_ROTATION_OF_FIRST = 5;
const LEFT_ROTATION_OF_SECOND = 30;
const INITIAL_STATE_HEX = '67452301efcdab8998badcfe10325476c3d2e1f0';
const STATE_WORDS = { first: 0, second: 1, third: 2, fourth: 3, fifth: 4 } as const;

function readHexWord(hex: string, wordIndex: number): number {
  const start = wordIndex * HEX_DIGITS_PER_WORD;
  return Number.parseInt(hex.slice(start, start + HEX_DIGITS_PER_WORD), HEX_RADIX);
}

function rotateLeft(value: number, shift: number): number {
  return (value << shift) | (value >>> (WORD_BITS - shift));
}

function readWord(view: DataView, wordIndex: number): number {
  return view.getUint32(wordIndex * WORD_BYTES);
}

function readInitialState(): Sha1State {
  return [
    readHexWord(INITIAL_STATE_HEX, STATE_WORDS.first),
    readHexWord(INITIAL_STATE_HEX, STATE_WORDS.second),
    readHexWord(INITIAL_STATE_HEX, STATE_WORDS.third),
    readHexWord(INITIAL_STATE_HEX, STATE_WORDS.fourth),
    readHexWord(INITIAL_STATE_HEX, STATE_WORDS.fifth),
  ];
}

function padMessage(message: Uint8Array): DataView {
  const paddedLength =
    Math.ceil((message.length + 1 + LENGTH_FIELD_BYTES) / BLOCK_BYTES) * BLOCK_BYTES;
  const padded = new Uint8Array(paddedLength);
  padded.set(message);
  padded.set([PADDING_MARKER], message.length);
  const view = new DataView(padded.buffer);
  view.setUint32(paddedLength - WORD_BYTES, message.length * BITS_PER_BYTE);
  return view;
}

function mixStage(stage: number, second: number, third: number, fourth: number): number {
  if (stage === STAGES.choice) return (second & third) | (~second & fourth);
  if (stage === STAGES.majority) return (second & third) | (second & fourth) | (third & fourth);
  return second ^ third ^ fourth;
}

function expandScheduleWord(schedule: DataView, index: number): number {
  return rotateLeft(
    readWord(schedule, index - SCHEDULE_TAPS.third) ^
      readWord(schedule, index - SCHEDULE_TAPS.eighth) ^
      readWord(schedule, index - SCHEDULE_TAPS.fourteenth) ^
      readWord(schedule, index - SCHEDULE_TAPS.sixteenth),
    1,
  );
}

function buildSchedule(message: DataView, blockOffset: number): DataView {
  const schedule = new DataView(new ArrayBuffer(SCHEDULE_WORDS * WORD_BYTES));
  for (let index = 0; index < SCHEDULE_WORDS; index += 1) {
    const word =
      index < BLOCK_WORDS
        ? message.getUint32(blockOffset + index * WORD_BYTES)
        : expandScheduleWord(schedule, index);
    schedule.setUint32(index * WORD_BYTES, word);
  }
  return schedule;
}

function compressBlock(state: Sha1State, schedule: DataView): Sha1State {
  let [first, second, third, fourth, fifth] = state;
  for (let index = 0; index < SCHEDULE_WORDS; index += 1) {
    const stage = Math.floor(index / ROUNDS_PER_STAGE);
    const mixed =
      rotateLeft(first, LEFT_ROTATION_OF_FIRST) +
      mixStage(stage, second, third, fourth) +
      fifth +
      readHexWord(STAGE_CONSTANTS_HEX, stage) +
      readWord(schedule, index);
    fifth = fourth;
    fourth = third;
    third = rotateLeft(second, LEFT_ROTATION_OF_SECOND);
    second = first;
    first = mixed;
  }
  return [
    state[0] + first,
    state[1] + second,
    state[2] + third,
    state[3] + fourth,
    state[4] + fifth,
  ];
}

function formatWord(word: number): string {
  return (word >>> 0).toString(HEX_RADIX).padStart(HEX_DIGITS_PER_WORD, '0');
}

export function digestSha1Hex(text: string): string {
  const message = padMessage(new TextEncoder().encode(text));
  let state = readInitialState();
  for (let offset = 0; offset < message.byteLength; offset += BLOCK_BYTES) {
    state = compressBlock(state, buildSchedule(message, offset));
  }
  return state.map(formatWord).join('');
}

// @FollowsBlueprint core-decision
export function buildTodoId(text: string, addedOn: string | undefined): string {
  return digestSha1Hex(`${text}|${addedOn ?? ''}`).slice(0, TODO_ID_LENGTH);
}
