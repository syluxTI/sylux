export const $ = <T extends Element = HTMLElement>(sel: string, ctx: ParentNode = document): T =>
  ctx.querySelector(sel) as T;

export const $$ = <T extends Element = HTMLElement>(sel: string, ctx: ParentNode = document): T[] =>
  Array.from(ctx.querySelectorAll(sel)) as T[];

export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

export const clamp = (v: number, a: number, b: number): number => Math.max(a, Math.min(b, v));

export const rnd = (a: number, b: number): number => a + Math.random() * (b - a);

export const rndi = (a: number, b: number): number => Math.floor(a + Math.random() * (b - a));
