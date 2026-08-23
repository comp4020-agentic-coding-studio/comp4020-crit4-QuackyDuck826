// DSP for the 8 characters. Every voice is a short, self-enveloped note (the
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
