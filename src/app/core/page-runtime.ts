import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Teardown } from './teardown';

export interface PageRuntimeOptions {
  bodyClasses?: string[];
  rootProps?: string[];
}

export class PageRuntime {
  readonly td = new Teardown();

  constructor(private readonly opts: PageRuntimeOptions = {}) {}

  whenLoaded(fn: () => void): void {
    if (document.readyState === 'complete') this.td.timeout(fn, 0);
    else this.td.on(window, 'load', fn);
  }

  go(href: string): void {
    location.href = href;
  }

  destroy(): void {
    this.td.dispose();
    ScrollTrigger.getAll().forEach((t) => t.kill());
    gsap.globalTimeline.clear();
    for (const cls of this.opts.bodyClasses ?? []) document.body.classList.remove(cls);
    for (const prop of this.opts.rootProps ?? []) document.documentElement.style.removeProperty(prop);
  }
}
