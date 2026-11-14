export class Teardown {
  private removers: Array<() => void> = [];
  private frames = new Set<number>();
  private timeouts = new Set<number>();
  private intervals = new Set<number>();
  private jobs: Array<() => void> = [];
  private dead = false;

  get destroyed(): boolean {
    return this.dead;
  }

  on<E extends Event = Event>(
    target: EventTarget,
    type: string,
    handler: (ev: E) => void,
    opts?: boolean | AddEventListenerOptions,
  ): void {
    const fn = handler as EventListener;
    target.addEventListener(type, fn, opts);
    this.removers.push(() => target.removeEventListener(type, fn, opts as EventListenerOptions));
  }

  raf(fn: () => void): void {
    if (this.dead) return;
    const id = requestAnimationFrame(() => {
      this.frames.delete(id);
      if (!this.dead) fn();
    });
    this.frames.add(id);
  }

  timeout(fn: () => void, ms: number): number {
    if (this.dead) return 0;
    const id = window.setTimeout(() => {
      this.timeouts.delete(id);
      if (!this.dead) fn();
    }, ms);
    this.timeouts.add(id);
    return id;
  }

  interval(fn: () => void, ms: number): number {
    if (this.dead) return 0;
    const id = window.setInterval(() => {
      if (!this.dead) fn();
    }, ms);
    this.intervals.add(id);
    return id;
  }

  onDispose(job: () => void): void {
    this.jobs.push(job);
  }

  dispose(): void {
    if (this.dead) return;
    this.dead = true;
    this.frames.forEach((id) => cancelAnimationFrame(id));
    this.timeouts.forEach((id) => window.clearTimeout(id));
    this.intervals.forEach((id) => window.clearInterval(id));
    this.removers.forEach((off) => off());
    this.jobs.forEach((job) => job());
    this.frames.clear();
    this.timeouts.clear();
    this.intervals.clear();
    this.removers = [];
    this.jobs = [];
  }
}
