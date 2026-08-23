// DSP for the 18 characters. Every voice is a short, self-enveloped note (the
// pad included — one long enveloped note per bar, not a drone), so a
// character that isn't active simply never has one of these called: no node
// is ever created, so there's no click risk and no gain-ramp bookkeeping to
// undo when it's switched off. Envelopes ramp to a small epsilon rather than
// literal 0 because exponentialRampToValueAtTime throws on 0.
const SILENCE = 0.0001;

let cachedNoiseBuffer: AudioBuffer | null = null;

export function getNoiseBuffer(ctx: AudioContext): AudioBuffer {
  if (!cachedNoiseBuffer) {
    const buffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    cachedNoiseBuffer = buffer;
  }
  return cachedNoiseBuffer;
}

export function playKick(ctx: AudioContext, destination: AudioNode, time: number): void {
  const osc = ctx.createOscillator();
  osc.type = "sine";
  osc.frequency.setValueAtTime(150, time);
  osc.frequency.exponentialRampToValueAtTime(40, time + 0.15);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.9, time);
  gain.gain.exponentialRampToValueAtTime(SILENCE, time + 0.18);

  osc.connect(gain).connect(destination);
  osc.start(time);
  osc.stop(time + 0.2);

  const noise = ctx.createBufferSource();
  noise.buffer = getNoiseBuffer(ctx);
  const noiseFilter = ctx.createBiquadFilter();
  noiseFilter.type = "lowpass";
  noiseFilter.frequency.setValueAtTime(1200, time);
  const noiseGain = ctx.createGain();
  noiseGain.gain.setValueAtTime(0.5, time);
  noiseGain.gain.exponentialRampToValueAtTime(SILENCE, time + 0.03);
  noise.connect(noiseFilter).connect(noiseGain).connect(destination);
  noise.start(time);
  noise.stop(time + 0.04);
}

export function playHat(ctx: AudioContext, destination: AudioNode, time: number): void {
  const noise = ctx.createBufferSource();
  noise.buffer = getNoiseBuffer(ctx);
  const filter = ctx.createBiquadFilter();
  filter.type = "highpass";
  filter.frequency.setValueAtTime(7000, time);
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.3, time);
  gain.gain.exponentialRampToValueAtTime(SILENCE, time + 0.05);
  noise.connect(filter).connect(gain).connect(destination);
  noise.start(time);
  noise.stop(time + 0.06);
}

export function playBass(
  ctx: AudioContext,
  destination: AudioNode,
  time: number,
  freq: number,
  type: OscillatorType,
): void {
  const osc = ctx.createOscillator();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, time);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(SILENCE, time);
  gain.gain.linearRampToValueAtTime(0.5, time + 0.01);
  gain.gain.exponentialRampToValueAtTime(SILENCE, time + 0.3);

  osc.connect(gain).connect(destination);
  osc.start(time);
  osc.stop(time + 0.32);
}

export function playPluck(ctx: AudioContext, destination: AudioNode, time: number, freq: number): void {
  const osc = ctx.createOscillator();
  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(freq, time);

  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.Q.setValueAtTime(4, time);
  filter.frequency.setValueAtTime(4000, time);
  filter.frequency.exponentialRampToValueAtTime(300, time + 0.25);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.4, time);
  gain.gain.exponentialRampToValueAtTime(SILENCE, time + 0.28);

  osc.connect(filter).connect(gain).connect(destination);
  osc.start(time);
  osc.stop(time + 0.3);
}

export function playArp(ctx: AudioContext, destination: AudioNode, time: number, freq: number): void {
  const osc = ctx.createOscillator();
  osc.type = "square";
  osc.frequency.setValueAtTime(freq, time);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.25, time);
  gain.gain.exponentialRampToValueAtTime(SILENCE, time + 0.12);

  osc.connect(gain).connect(destination);
  osc.start(time);
  osc.stop(time + 0.14);
}

export function playSparkle(ctx: AudioContext, destination: AudioNode, time: number, freq: number): void {
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.3, time);
  gain.gain.exponentialRampToValueAtTime(SILENCE, time + 0.6);

  const filter = ctx.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.setValueAtTime(freq, time);
  filter.Q.setValueAtTime(8, time);
  filter.connect(gain).connect(destination);

  for (const detune of [-8, 0, 8]) {
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, time);
    osc.detune.setValueAtTime(detune, time);
    osc.connect(filter);
    osc.start(time);
    osc.stop(time + 0.65);
  }
}

export function playPad(
  ctx: AudioContext,
  destination: AudioNode,
  time: number,
  freq: number,
  duration: number,
): void {
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(SILENCE, time);
  gain.gain.linearRampToValueAtTime(0.2, time + duration * 0.3);
  gain.gain.exponentialRampToValueAtTime(SILENCE, time + duration);

  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(800, time);
  filter.connect(gain).connect(destination);

  for (const [type, detune] of [
    ["sawtooth", -6],
    ["triangle", 6],
  ] as const) {
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, time);
    osc.detune.setValueAtTime(detune, time);
    osc.connect(filter);
    osc.start(time);
    osc.stop(time + duration + 0.05);
  }
}

export function playClap(ctx: AudioContext, destination: AudioNode, time: number): void {
  const filter = ctx.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.setValueAtTime(1500, time);
  filter.Q.setValueAtTime(1.2, time);
  filter.connect(destination);

  // A flam of 3 quick noise hits reads as a clap, not a single thin tick.
  for (const offset of [0, 0.01, 0.02]) {
    const noise = ctx.createBufferSource();
    noise.buffer = getNoiseBuffer(ctx);
    const gain = ctx.createGain();
    const hitTime = time + offset;
    gain.gain.setValueAtTime(0.4, hitTime);
    gain.gain.exponentialRampToValueAtTime(SILENCE, hitTime + 0.08);
    noise.connect(gain).connect(filter);
    noise.start(hitTime);
    noise.stop(hitTime + 0.09);
  }
}

export function playBell(ctx: AudioContext, destination: AudioNode, time: number, freq: number): void {
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.35, time);
  gain.gain.exponentialRampToValueAtTime(SILENCE, time + 0.9);
  gain.connect(destination);

  // Slightly inharmonic partials (not exact integer ratios) are what read as
  // "bell" rather than "flute" — a clean harmonic stack sounds too pure.
  for (const ratio of [1, 2.01, 3.98]) {
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq * ratio, time);
    const partialGain = ctx.createGain();
    partialGain.gain.setValueAtTime(1 / ratio, time);
    osc.connect(partialGain).connect(gain);
    osc.start(time);
    osc.stop(time + 1);
  }
}

export function playKoto(ctx: AudioContext, destination: AudioNode, time: number, freq: number): void {
  const osc = ctx.createOscillator();
  osc.type = "triangle";
  osc.frequency.setValueAtTime(freq * 1.02, time);
  osc.frequency.exponentialRampToValueAtTime(freq, time + 0.05);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.35, time);
  gain.gain.exponentialRampToValueAtTime(SILENCE, time + 0.35);

  osc.connect(gain).connect(destination);
  osc.start(time);
  osc.stop(time + 0.37);
}

export function playBrass(ctx: AudioContext, destination: AudioNode, time: number, freq: number): void {
  const osc = ctx.createOscillator();
  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(freq, time);

  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(2500, time);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(SILENCE, time);
  gain.gain.linearRampToValueAtTime(0.3, time + 0.03);
  gain.gain.exponentialRampToValueAtTime(SILENCE, time + 0.22);

  osc.connect(filter).connect(gain).connect(destination);
  osc.start(time);
  osc.stop(time + 0.24);
}

export function playSiren(ctx: AudioContext, destination: AudioNode, time: number, freq: number): void {
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.28, time);
  gain.gain.exponentialRampToValueAtTime(SILENCE, time + 0.4);
  gain.connect(destination);

  for (const type of ["sawtooth", "square"] as const) {
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(freq * 0.5, time);
    osc.frequency.exponentialRampToValueAtTime(freq * 2, time + 0.35);
    osc.connect(gain);
    osc.start(time);
    osc.stop(time + 0.4);
  }
}

export function playBlip(ctx: AudioContext, destination: AudioNode, time: number, freq: number): void {
  const osc = ctx.createOscillator();
  osc.type = "sine";
  osc.frequency.setValueAtTime(freq * 2, time);
  osc.frequency.exponentialRampToValueAtTime(freq, time + 0.06);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.3, time);
  gain.gain.exponentialRampToValueAtTime(SILENCE, time + 0.08);

  osc.connect(gain).connect(destination);
  osc.start(time);
  osc.stop(time + 0.1);
}

export function playZap(ctx: AudioContext, destination: AudioNode, time: number): void {
  const noise = ctx.createBufferSource();
  noise.buffer = getNoiseBuffer(ctx);

  const filter = ctx.createBiquadFilter();
  filter.type = "bandpass";
  filter.Q.setValueAtTime(6, time);
  filter.frequency.setValueAtTime(4000, time);
  filter.frequency.exponentialRampToValueAtTime(200, time + 0.3);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.35, time);
  gain.gain.exponentialRampToValueAtTime(SILENCE, time + 0.32);

  noise.connect(filter).connect(gain).connect(destination);
  noise.start(time);
  noise.stop(time + 0.34);
}

export function playShimmer(
  ctx: AudioContext,
  destination: AudioNode,
  time: number,
  freq: number,
  duration: number,
): void {
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(SILENCE, time);
  gain.gain.linearRampToValueAtTime(0.15, time + duration * 0.2);
  gain.gain.exponentialRampToValueAtTime(SILENCE, time + duration);

  const filter = ctx.createBiquadFilter();
  filter.type = "highpass";
  filter.frequency.setValueAtTime(600, time);
  filter.connect(gain).connect(destination);

  // A slow tremolo (an oscillator driving the gain param directly, at
  // audio rate) is what separates "shimmer" from "pad" — the same detuned
  // sines without it just sound like a quieter pad.
  const tremolo = ctx.createOscillator();
  tremolo.type = "sine";
  tremolo.frequency.setValueAtTime(5, time);
  const tremoloDepth = ctx.createGain();
  tremoloDepth.gain.setValueAtTime(0.06, time);
  tremolo.connect(tremoloDepth).connect(gain.gain);
  tremolo.start(time);
  tremolo.stop(time + duration);

  for (const detune of [-10, 0, 10]) {
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, time);
    osc.detune.setValueAtTime(detune, time);
    osc.connect(filter);
    osc.start(time);
    osc.stop(time + duration + 0.05);
  }
}
