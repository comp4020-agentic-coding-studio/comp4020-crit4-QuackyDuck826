// One shared source of truth for both the DOM (index.astro maps this array
// into buttons) and the scheduling behavior (main.ts reads the same objects).

export type CharacterCategory = "beat" | "bass" | "melody" | "lead" | "fx" | "texture";
export type CharacterShape =
  | "circle"
  | "triangle"
  | "octagon"
  | "square"
  | "diamond"
  | "cross"
  | "hexagon"
  | "oval"
  | "trapezoid"
  | "star"
  | "parallelogram"
  | "chevron"
  | "pentagon"
  | "arrow"
  | "teardrop"
  | "ring"
  | "arch"
  | "semicircle";

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

// Defined grouped by category (easiest to author and compare within a
// family), then interleaved round-robin below for CHARACTERS itself, so the
// grid doesn't read as six same-category blocks in a row.
const BY_CATEGORY = {
  beat: [
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
      id: "beat-clap",
      label: "Clap",
      category: "beat",
      shape: "octagon",
      octave: 0,
      // The backbeat (2 and 4): steps 4 and 12 of 16.
      pattern: pattern([
        [4, 0],
        [12, 0],
      ]),
    },
  ],
  bass: [
    {
      id: "bass-pulse",
      label: "Pulse bass",
      category: "bass",
      shape: "square",
      // One octave higher than bass-walk: its triangle wave has no
      // harmonics to help it cut through a mix, and down at octave -1 it
      // collided with beat-kick's pitch-drop range and effectively
      // disappeared.
      octave: 0,
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
      id: "bass-skip",
      label: "Skip bass",
      category: "bass",
      shape: "cross",
      // Same reasoning as bass-pulse: a sine has only its fundamental, so
      // octave -1 put it below what most speakers reproduce at all.
      octave: 0,
      pattern: pattern([
        [0, 0],
        [3, 2],
        [6, 1],
        [10, 2],
        [13, 0],
      ]),
    },
  ],
  melody: [
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
      id: "melody-bell",
      label: "Bell",
      category: "melody",
      shape: "oval",
      octave: 2,
      // Three hits spaced 4 steps apart but wrapping the bar in 8 (11 back
      // to the next bar's 3) reads as a different meter than everything
      // else. A fourth hit at 15 locks it to the same 4-steps-per-beat grid
      // as the rest of the pattern.
      pattern: pattern([
        [3, 4],
        [7, 3],
        [11, 2],
        [15, 1],
      ]),
    },
    {
      id: "melody-koto",
      label: "Koto",
      category: "melody",
      shape: "trapezoid",
      octave: 1,
      pattern: pattern([
        [1, 2],
        [5, 0],
        [8, 3],
        [10, 1],
        [13, 4],
      ]),
    },
  ],
  lead: [
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
      id: "lead-brass",
      label: "Brass",
      category: "lead",
      shape: "parallelogram",
      octave: 2,
      pattern: pattern([
        [0, 0],
        [6, 2],
        [8, 3],
        [14, 2],
      ]),
    },
    {
      id: "lead-siren",
      label: "Siren",
      category: "lead",
      shape: "chevron",
      octave: 2,
      pattern: pattern([[10, 3]]),
    },
  ],
  fx: [
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
      id: "fx-blip",
      label: "Blip",
      category: "fx",
      shape: "arrow",
      octave: 3,
      pattern: pattern([
        [3, 4],
        [11, 2],
      ]),
    },
    {
      id: "fx-zap",
      label: "Zap",
      category: "fx",
      shape: "teardrop",
      octave: 0,
      pattern: pattern([[0, 0]]),
      everyNthBar: 2,
    },
  ],
  texture: [
    {
      id: "texture-pad",
      label: "Pad",
      category: "texture",
      shape: "ring",
      octave: 0,
      pattern: pattern([[0, 0]]),
    },
    {
      id: "texture-drone",
      label: "Drone",
      category: "texture",
      shape: "arch",
      octave: -2,
      pattern: pattern([[0, 0]]),
      everyNthBar: 2,
    },
    {
      id: "texture-shimmer",
      label: "Shimmer",
      category: "texture",
      shape: "semicircle",
      octave: 3,
      pattern: pattern([[8, 4]]),
    },
  ],
} as const satisfies Record<CharacterCategory, readonly CharacterDef[]>;

// A fixed shuffle (category, index-within-category) rather than a clean
// round-robin: a strict beat/bass/melody/lead/fx/texture cycle repeated
// three times is itself a visible pattern, just a different one than
// blocking by category. This ordering only guarantees no two same-category
// shapes sit next to each other.
const SHUFFLE: readonly [CharacterCategory, number][] = [
  ["beat", 0],
  ["lead", 0],
  ["texture", 0],
  ["bass", 1],
  ["melody", 2],
  ["fx", 1],
  ["beat", 2],
  ["bass", 0],
  ["lead", 2],
  ["texture", 2],
  ["melody", 0],
  ["fx", 2],
  ["bass", 2],
  ["beat", 1],
  ["lead", 1],
  ["texture", 1],
  ["fx", 0],
  ["melody", 1],
];

export const CHARACTERS: readonly CharacterDef[] = SHUFFLE.map(([category, index]) => BY_CATEGORY[category][index]);
