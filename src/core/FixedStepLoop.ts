type UpdateCallback = (deltaSeconds: number) => void;
type RenderCallback = () => void;

export class FixedStepLoop {
  private accumulator = 0;
  private lastFrameTime = 0;
  private frameHandle = 0;
  private readonly fixedDeltaSeconds: number;
  private readonly update: UpdateCallback;
  private readonly render: RenderCallback;

  constructor(fixedDeltaSeconds: number, update: UpdateCallback, render: RenderCallback) {
    this.fixedDeltaSeconds = fixedDeltaSeconds;
    this.update = update;
    this.render = render;
  }

  start(): void {
    this.lastFrameTime = performance.now();
    this.frameHandle = requestAnimationFrame(this.onAnimationFrame);
  }

  stop(): void {
    cancelAnimationFrame(this.frameHandle);
  }

  advanceSeconds(seconds: number): void {
    this.step(Math.max(0, seconds));
    this.render();
  }

  private readonly onAnimationFrame = (timestamp: number): void => {
    const frameDeltaSeconds = Math.min((timestamp - this.lastFrameTime) / 1000, 0.1);
    this.lastFrameTime = timestamp;

    this.step(frameDeltaSeconds);
    this.render();

    this.frameHandle = requestAnimationFrame(this.onAnimationFrame);
  };

  private step(frameDeltaSeconds: number): void {
    this.accumulator += frameDeltaSeconds;

    let safetyCounter = 0;
    while (this.accumulator >= this.fixedDeltaSeconds && safetyCounter < 8) {
      this.update(this.fixedDeltaSeconds);
      this.accumulator -= this.fixedDeltaSeconds;
      safetyCounter += 1;
    }
  }
}
