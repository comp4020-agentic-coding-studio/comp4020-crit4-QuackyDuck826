// One shared source of truth for both the DOM (index.astro maps this array
// into buttons) and the scheduling behavior (main.ts reads the same objects).

export type CharacterCategory = "beat" | "bass" | "melody" | "lead" | "fx" | "texture";
export type CharacterShape =
  | "circle"
  | "triangle"
  | "square"
  | "diamond"
  | "hexagon"
  | "star"
  | "pentagon"
  | "ring";

export interface CharacterDef {
  id: string;
  label: string;
  category: CharacterCategory;
  shape: CharacterShape;
  /** Octave passed to scaleFreq; unused by unpitched (beat) characters. */
  octave: number;
  /** 16 steps per bar; null is a rest, a number is a scale degree. */
  pattern: ReadonlyArray<number | null>;
  /** fx-sparkle only: only fires on bars divisible by this. */
  everyNthBar?: number;
}

// A minor pentatonic, semitones from the root — the reason no combination of
// the 8 layers can ever sound wrong: every pitched voice below only ever
// indexes into this table, never a raw frequency.
const PENTATONIC_STEPS = [0, 3, 5, 7, 10] as const;
const ROOT_FREQ = 110; // A2

export function scaleFreq(octave: number, degree: number): number {
  const index = ((degree % PENTATONIC_STEPS.length) + PENTATONIC_STEPS.length) % PENTATONIC_STEPS.length;
  const semitone = octave * 12 + PENTATONIC_STEPS[index];
  return ROOT_FREQ * 2 ** (semitone / 12);
}

export const BPM = 92;
export const STEPS_PER_BAR = 16;
export const BAR_SECONDS = (60 / BPM) * 4;

function pattern(hits: ReadonlyArray<readonly [step: number, degree: number]>): (number | null)[] {
  const steps = new Array<number | null>(STEPS_PER_BAR).fill(null);
  for (const [step, degree] of hits) steps[step] = degree;
  return steps;
}

export const CHARACTERS: readonly CharacterDef[] = [
  {
    id: "beat-kick",
    label: "Kick",
    category: "beat",
    shape: "circle",
    octave: 0,
    pattern: pattern([
      [0, 0],
      [4, 0],
      [8, 0],
      [12, 0],
    ]),
  },
  {
    id: "beat-hat",
    label: "Hat",
    category: "beat",
    shape: "triangle",
    octave: 0,
    pattern: pattern([
      [0, 0],
      [2, 0],
      [4, 0],
      [6, 0],
      [8, 0],
      [10, 0],
      [12, 0],
      [14, 0],
    ]),
  },
  {
    id: "bass-pulse",
    label: "Pulse bass",
    category: "bass",
    shape: "square",
    octave: -1,
    pattern: pattern([
      [0, 0],
      [4, 0],
      [8, 0],
      [12, 0],
    ]),
  },
  {
    id: "bass-walk",
    label: "Walking bass",
    category: "bass",
    shape: "diamond",
    octave: -1,
    pattern: pattern([
      [0, 0],
      [4, 1],
      [8, 2],
      [12, 1],
    ]),
  },
  {
    id: "melody-pluck",
    label: "Pluck",
    category: "melody",
    shape: "hexagon",
    octave: 1,
    pattern: pattern([
      [2, 2],
      [6, 1],
      [9, 3],
      [12, 0],
      [14, 2],
    ]),
  },
  {
    id: "lead-arp",
    label: "Arp",
    category: "lead",
    shape: "star",
    octave: 2,
    pattern: pattern([
      [0, 0],
      [2, 2],
      [4, 4],
      [6, 2],
      [8, 0],
      [10, 2],
      [12, 4],
      [14, 2],
    ]),
  },
  {
    id: "fx-sparkle",
    label: "Sparkle",
    category: "fx",
    shape: "pentagon",
    octave: 3,
    pattern: pattern([[14, 4]]),
    everyNthBar: 2,
  },
  {
    id: "texture-pad",
    label: "Pad",
    category: "texture",
    shape: "ring",
    octave: 0,
    pattern: pattern([[0, 0]]),
  },
] as const;
