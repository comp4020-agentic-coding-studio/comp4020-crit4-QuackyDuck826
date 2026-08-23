# Incredibox-style instrument for crit 04 (An instrument)

## Context

This week's crit asks for a browser page that is itself a musical instrument:
sound made live by the Web Audio API (not played back), expressive, playable
uninstructed with whatever's at hand, and impossible to "play wrong". Two spec
tests already exist and must keep passing (`spec/instrument.test.ts`: no
`<audio>/<video src>`, must contain `AudioContext`/`webkitAudioContext`, must
contain at least one of `pointerdown|mousedown|touchstart|click|keydown|keyup|
keypress`; `spec/invariants.test.ts`: one `<h1>`, one `<nav>`, lang/title/
description/viewport/og:image, alt text on images).

The build is Incredibox-style: click a "character" to toggle its loop on, and
toggled-on loops layer together into a fuller arrangement. Decisions already
made: vanilla Web Audio API only (no Tone.js or other library), 8 toggleable
characters (a couple of categories get two alternative variants), abstract
CSS-shape icons (no illustrated art) with a beat-synced pulse when active.

## Approach

**Shared musical grid** — the mechanism that makes "no way to play it wrong"
literally true, not just a UI claim: 92 BPM, one bar = 16 steps
(`secondsPerStep = 60/92/4`), and every pitched voice indexes into one shared
A-minor-pentatonic frequency table. No voice ever uses a raw/free frequency,
so no combination of the 8 layers can be dissonant.

**Scheduler** — a small `Scheduler` class doing standard lookahead scheduling
(25ms poll interval, ~100ms schedule-ahead window against
`AudioContext.currentTime`), Chris Wilson's canonical pattern. It knows nothing
about characters — it just calls back with `(step, audioTime)`.

**8 characters** (2 beat + 2 bass + 1 melody + 1 lead + 1 fx + 1 texture):
`beat-kick` (sine pitch-drop + noise snare), `beat-hat` (filtered noise
bursts), `bass-pulse`/`bass-walk` (triangle/square, low octave of the scale),
`melody-pluck` (sawtooth + closing lowpass), `lead-arp` (bright square/saw,
high octave), `fx-sparkle` (detuned sines → bandpass, sparse one-shot every
2nd bar), `texture-pad` (detuned saw/triangle → lowpass, one long note per
bar). All noise hits share one cached `AudioBuffer`, fresh
`AudioBufferSourceNode` per hit.

**On/off gating: active-flag checked at scheduling time**, not per-layer
`GainNode` ramps. Every voice here is a short, self-enveloped note (even the
pad is one long enveloped note per bar, not a persistent drone), so an
inactive character simply never gets `trigger()` called — no node is ever
created, no click risk, no ramp bookkeeping. A toggle takes effect on the next
16th-note step (~163ms worst case), which reads as instant. Per-note attack/
decay still use `linearRampToValueAtTime`/`exponentialRampToValueAtTime`
(ramp to a small epsilon, never literal 0 — `exponentialRamp` throws on 0). A
`DynamicsCompressorNode` + master gain (~0.7) sit before `ctx.destination` so
up to 8 additive voices never clip.

**AudioContext lifecycle** — created lazily inside `ensureAudio()`, called at
the top of every character button's click handler, before flipping its active
flag. The very first click on any character both unlocks audio and starts
that loop in one action — that's what makes the opening screen "invite the
first sound" with no separate start button. Real `<button type="button">`
elements for characters: native button semantics mean Enter/Space already
fire `click`, and so does a touch tap, so one `click` listener genuinely
covers mouse, keyboard and touch (not just satisfies the regex).

**Visual sync** — `onStep` pushes `{time, hits}` onto a small queue; a
`requestAnimationFrame` loop compares `ctx.currentTime` to the queue head and
only pulses a character's shape (CSS `.pulse` keyframe, restarted via
`classList` toggle) the instant its audio actually plays — beat-synced, not
click-synced.

## File layout

New:
- `src/scripts/scheduler.ts` — `Scheduler` class only, no DOM/character knowledge.
- `src/scripts/characters.ts` — `CharacterDef` type, the shared `SCALE` table, the 8 character definitions (id/label/category/shape/pattern).
- `src/scripts/voices.ts` — the DSP helpers (`playKick`, `playHat`, `playBass`, `playPluck`, `playArp`, `playSparkle`, `playPad`, `getNoiseBuffer`).
- `src/styles/instrument.css` — grid layout, CSS-shape classes per category, `.is-active`, `.pulse` keyframes (wrapped in `prefers-reduced-motion`).

Rewritten:
- `src/scripts/main.ts` — the sole entry point: `ensureAudio()`, click wiring for all 8 buttons, the `onStep` callback, the `drawLoop` visual-sync loop. Only static imports (no dynamic `import()`), so Rollup keeps it one chunk.
- `src/pages/index.astro` — new title/description, new `<h1>` (instrument name), character grid mapped from `characters.ts` (one shared source of truth for the DOM and the behavior), remove the `data-testid="intro"` paragraph, one short optional discoverability line ("Tap a shape to start.") rather than instructions.

Deleted:
- `spec/starter.test.ts` — its own README calls it a worked example to replace once the starter page's shape is gone.

Untouched: `src/layouts/Layout.astro`, `src/styles/global.css`, `spec/instrument.test.ts`, `spec/invariants.test.ts`.

## Risk to check early: Astro's script inlining

`spec/instrument.test.ts` currently passes because Astro inlines the trivial
`main.ts` directly into `dist/index.html`'s `<script type="module">`. Once
`main.ts` pulls in 3 more modules, it's plausible (not certain) Astro emits an
external hashed `_astro/*.js` file instead — which would make the
`AudioContext`/`click` string checks fail even though behavior is correct.
**Checkpoint after the first minimal increment** (one placeholder oscillator +
one click listener, before all 8 voices exist): `pnpm build && grep -o
AudioContext dist/index.html` and same for `click`. Repeat once everything is
wired in. Catches a build-format regression before time is sunk into voices.

Other edge cases: `visibilitychange` → `ctx.resume()` so a backgrounded tab
doesn't stay silent after returning (matters for a live crit demo).

## Verification

- `pnpm check` (typecheck → build → vitest) green, including the two
  previously-red `spec/instrument.test.ts` cases and all `invariants.test.ts`
  checks (one `<h1>`, one `<nav>`, alt text if any `<img>` is added).
- The build-format checkpoint above, run twice (early and after full wiring).
- `pnpm dev`, open under the base path (`/comp4020-crit4-QuackyDuck826/`):
  click through all 8 characters solo and in combination, listen for clicks/
  pops and for clipping in the fullest combination.
- Keyboard-only pass: Tab through all 8 in document order, Enter/Space to
  toggle each, confirm both sound and pulse fire — verify this by hand, not
  just by the regex passing.
- Switch tabs away and back while characters are active; confirm sound
  resumes rather than staying silent.
- Touch check if a touch-capable device/emulator is available.
