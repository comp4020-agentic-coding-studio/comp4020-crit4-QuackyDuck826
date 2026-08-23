// Chris Wilson's canonical lookahead-scheduling pattern: a fast setInterval
// poll schedules audio events into the near future against the audio clock,
// so timing survives the timer's own jitter (setInterval alone drifts too
// much for anything musical). This class knows nothing about characters or
// voices — it only ever calls back with a step index and the exact
// AudioContext time that step should sound at.
const LOOKAHEAD_MS = 25;
const SCHEDULE_AHEAD_SECONDS = 0.1;

export class Scheduler {
  private readonly ctx: AudioContext;
  private readonly secondsPerStep: number;
  private readonly onStep: (step: number, time: number) => void;
  private nextStepTime = 0;
  private step = 0;
  private timerId: number | null = null;

  constructor(ctx: AudioContext, bpm: number, onStep: (step: number, time: number) => void) {
    this.ctx = ctx;
    this.secondsPerStep = 60 / bpm / 4; // 16th notes
    this.onStep = onStep;
  }

  start(): void {
    if (this.timerId !== null) return;
    this.nextStepTime = this.ctx.currentTime;
    this.timerId = window.setInterval(() => this.tick(), LOOKAHEAD_MS);
  }

  private tick(): void {
    while (this.nextStepTime < this.ctx.currentTime + SCHEDULE_AHEAD_SECONDS) {
      this.onStep(this.step, this.nextStepTime);
      this.nextStepTime += this.secondsPerStep;
      this.step += 1;
    }
  }
}
