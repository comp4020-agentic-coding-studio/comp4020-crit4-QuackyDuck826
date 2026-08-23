import { Scheduler } from "./scheduler";
import { BAR_SECONDS, BPM, CHARACTERS, STEPS_PER_BAR, scaleFreq } from "./characters";
import {
  getNoiseBuffer,
  playArp,
  playBass,
  playBell,
  playBlip,
  playBrass,
  playClap,
  playHat,
  playKick,
  playKoto,
  playPad,
  playPluck,
  playShimmer,
  playSiren,
  playSparkle,
  playZap,
} from "./voices";

let audioCtx: AudioContext | null = null;
let masterGain: GainNode | null = null;

const activeFlags = new Map<string, boolean>();
const buttonsById = new Map<string, HTMLButtonElement>();
const pulseQueue: { id: string; time: number }[] = [];
const hint = document.getElementById("hint");

function updateHint(): void {
  if (!hint) return;
  hint.hidden = [...activeFlags.values()].some(Boolean);
}

function ensureAudio(): AudioContext {
  if (!audioCtx) {
    const AudioContextCtor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    audioCtx = new AudioContextCtor();

    masterGain = audioCtx.createGain();
    // Lower than a single-layer instrument would need: up to 18 characters
    // can now be active at once, and the compressor alone isn't enough
    // headroom for that many additive voices.
    masterGain.gain.value = 0.5;
    const compressor = audioCtx.createDynamicsCompressor();
    masterGain.connect(compressor).connect(audioCtx.destination);

    // Warms the noise buffer once, up front, rather than on the first kick
    // or hat hit.
    getNoiseBuffer(audioCtx);

    const scheduler = new Scheduler(audioCtx, BPM, onStep);
    scheduler.start();

    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible" && audioCtx?.state === "suspended") {
        void audioCtx.resume();
      }
    });
  }
  if (audioCtx.state === "suspended") void audioCtx.resume();
  return audioCtx;
}

function trigger(characterId: string, octave: number, degree: number, time: number): void {
  const ctx = audioCtx;
  const destination = masterGain;
  if (!ctx || !destination) return;

  switch (characterId) {
    case "beat-kick":
      playKick(ctx, destination, time);
      break;
    case "beat-hat":
      playHat(ctx, destination, time);
      break;
    case "beat-clap":
      playClap(ctx, destination, time);
      break;
    case "bass-pulse":
      // Triangle and sine read quieter than square at the same peak gain
      // (less harmonic content), so pulse and skip get a boost square
      // doesn't need - and get pushed to octave 0 (see characters.ts) so
      // they're not buried in a mix with beat-kick.
      playBass(ctx, destination, time, scaleFreq(octave, degree), "triangle", 0.9);
      break;
    case "bass-walk":
      playBass(ctx, destination, time, scaleFreq(octave, degree), "square");
      break;
    case "bass-skip":
      playBass(ctx, destination, time, scaleFreq(octave, degree), "sine", 1);
      break;
    case "melody-pluck":
      playPluck(ctx, destination, time, scaleFreq(octave, degree));
      break;
    case "melody-bell":
      playBell(ctx, destination, time, scaleFreq(octave, degree));
      break;
    case "melody-koto":
      playKoto(ctx, destination, time, scaleFreq(octave, degree));
      break;
    case "lead-arp":
      playArp(ctx, destination, time, scaleFreq(octave, degree));
      break;
    case "lead-brass":
      playBrass(ctx, destination, time, scaleFreq(octave, degree));
      break;
    case "lead-siren":
      playSiren(ctx, destination, time, scaleFreq(octave, degree));
      break;
    case "fx-sparkle":
      playSparkle(ctx, destination, time, scaleFreq(octave, degree));
      break;
    case "fx-blip":
      playBlip(ctx, destination, time, scaleFreq(octave, degree));
      break;
    case "fx-zap":
      playZap(ctx, destination, time);
      break;
    case "texture-pad":
      playPad(ctx, destination, time, scaleFreq(octave, degree), BAR_SECONDS);
      break;
    case "texture-drone":
      playPad(ctx, destination, time, scaleFreq(octave, degree), BAR_SECONDS * 2);
      break;
    case "texture-shimmer":
      playShimmer(ctx, destination, time, scaleFreq(octave, degree), BAR_SECONDS);
      break;
  }
}

function onStep(step: number, time: number): void {
  const stepInBar = step % STEPS_PER_BAR;
  const bar = Math.floor(step / STEPS_PER_BAR);

  for (const character of CHARACTERS) {
    if (!activeFlags.get(character.id)) continue;

    const degree = character.pattern[stepInBar];
    if (degree === null) continue;
    if (character.everyNthBar && bar % character.everyNthBar !== 0) continue;

    trigger(character.id, character.octave, degree, time);
    pulseQueue.push({ id: character.id, time });
  }
}

function drawLoop(): void {
  const ctx = audioCtx;
  if (ctx) {
    while (pulseQueue.length > 0 && pulseQueue[0].time <= ctx.currentTime) {
      const event = pulseQueue.shift();
      const button = event && buttonsById.get(event.id);
      if (button) {
        button.classList.remove("pulse");
        void button.offsetWidth; // restart the CSS animation
        button.classList.add("pulse");
      }
    }
  }
  requestAnimationFrame(drawLoop);
}

for (const button of document.querySelectorAll<HTMLButtonElement>("[data-character-id]")) {
  const id = button.dataset.characterId;
  if (!id) continue;

  buttonsById.set(id, button);
  activeFlags.set(id, false);

  button.addEventListener("click", () => {
    ensureAudio();
    const next = !activeFlags.get(id);
    activeFlags.set(id, next);
    button.classList.toggle("is-active", next);
    button.setAttribute("aria-pressed", String(next));
    updateHint();
  });
}

function setAllActive(active: boolean): void {
  for (const [id, button] of buttonsById) {
    activeFlags.set(id, active);
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", String(active));
  }
  updateHint();
}

document.querySelector<HTMLButtonElement>('[data-all-action="off"]')?.addEventListener("click", () => {
  setAllActive(false);
});

requestAnimationFrame(drawLoop);
