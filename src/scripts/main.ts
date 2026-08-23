import { Scheduler } from "./scheduler";
import { BAR_SECONDS, BPM, CHARACTERS, STEPS_PER_BAR, scaleFreq } from "./characters";
import { getNoiseBuffer, playArp, playBass, playHat, playKick, playPad, playPluck, playSparkle } from "./voices";

let audioCtx: AudioContext | null = null;
let masterGain: GainNode | null = null;

const activeFlags = new Map<string, boolean>();
const buttonsById = new Map<string, HTMLButtonElement>();
const pulseQueue: { id: string; time: number }[] = [];

function ensureAudio(): AudioContext {
  if (!audioCtx) {
    const AudioContextCtor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    audioCtx = new AudioContextCtor();

    masterGain = audioCtx.createGain();
    masterGain.gain.value = 0.7;
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
    case "bass-pulse":
      playBass(ctx, destination, time, scaleFreq(octave, degree), "triangle");
      break;
    case "bass-walk":
      playBass(ctx, destination, time, scaleFreq(octave, degree), "square");
      break;
    case "melody-pluck":
      playPluck(ctx, destination, time, scaleFreq(octave, degree));
      break;
    case "lead-arp":
      playArp(ctx, destination, time, scaleFreq(octave, degree));
      break;
    case "fx-sparkle":
      playSparkle(ctx, destination, time, scaleFreq(octave, degree));
      break;
    case "texture-pad":
      playPad(ctx, destination, time, scaleFreq(octave, degree), BAR_SECONDS);
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
  });
}

requestAnimationFrame(drawLoop);
