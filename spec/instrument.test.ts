import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

// Tests for this week's published spec (crits/04-instrument), not the
// shipped invariants — see spec/README.md for the split. These check the
// contract ("the browser makes the sound live", "more than one input works"),
// not how it's built, so a change of approach or stack shouldn't break them.
//
// What's left for the crit, because no test can hold it: is it expressive
// (two players sound different), does the opening screen invite the first
// sound uninstructed, and is there really no way to play it wrong.

const html = readFileSync(resolve("dist/index.html"), "utf8");

describe("an instrument: live synthesis, not playback", () => {
  it("has no pre-recorded audio or video element as the sound source", () => {
    // A <audio>/<video src="..."> plays back a fixed recording; the spec
    // asks for sound made live, in the page, by the player.
    expect(/<(audio|video)[^>]*\ssrc=/i.test(html)).toBe(false);
  });

  it("uses the Web Audio API to synthesise sound", () => {
    expect(
      /\b(AudioContext|webkitAudioContext)\b/.test(html),
      "no AudioContext found — sound needs to be generated live via the Web Audio API, not played from a file",
    ).toBe(true);
  });
});

describe("an instrument: playable with whatever is at hand", () => {
  it("wires up at least one of mouse, keyboard or touch", () => {
    // "whatever is at hand" — any one modality satisfies the spec; it
    // doesn't ask for all three.
    expect(
      /\b(pointerdown|mousedown|touchstart|click|keydown|keyup|keypress)\b/.test(html),
      "no input handler found — the spec asks the page to respond to mouse, keyboard or touch",
    ).toBe(true);
  });
});
