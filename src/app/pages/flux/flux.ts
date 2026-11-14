import { AfterViewInit, Component, OnDestroy, ViewEncapsulation } from '@angular/core';
import anime from 'animejs';
import { gsap } from 'gsap';
import * as THREE from 'three';
import { $, $$, clamp, lerp } from '../../core/dom';
import { PAGE_PATH } from '../../core/page-links';
import { PageRuntime } from '../../core/page-runtime';

interface SwitchPage {
  t: string;
  f: string;
}

interface FluxUniforms {
  uTime: { value: number };
  uRes: { value: THREE.Vector2 };
  uMouse: { value: THREE.Vector2 };
  uProg: { value: number };
  uLight: { value: number };
  uPush: { value: number };
  uVel: { value: number };
}

@Component({
  selector: 'page-flux',
  templateUrl: './flux.html',
  styleUrl: './flux.css',
  encapsulation: ViewEncapsulation.None,
})
export class Flux implements AfterViewInit, OnDestroy {
  protected readonly here = PAGE_PATH.flux;
  protected readonly scenes = ['Início', 'Problema', 'Malha', 'Escala', 'Planos', 'Fim'];
  protected readonly pages: SwitchPage[] = [
    { t: '01 Orbit', f: PAGE_PATH.orbit },
    { t: '02 Paper', f: PAGE_PATH.paper },
    { t: '03 Flux', f: PAGE_PATH.flux },
    { t: '04 Grid', f: PAGE_PATH.grid },
    { t: '05 Echo', f: PAGE_PATH.echo },
  ];

  private readonly LIGHT = [false, false, true, true, false, true];

  private readonly rt = new PageRuntime({
    bodyClasses: ['light'],
    rootProps: ['--bg', '--fg', '--fg-2', '--fg-3', '--line', '--glass'],
  });

  private blob!: HTMLElement;
  private bx = innerWidth / 2;
  private by = innerHeight / 2;
  private tx = this.bx;
  private ty = this.by;

  private rnd!: THREE.WebGLRenderer;
  private sc!: THREE.Scene;
  private cam!: THREE.OrthographicCamera;
  private mat!: THREE.ShaderMaterial;
  private uni!: FluxUniforms;
  private glOk = false;
  private mouseN = { x: 0, y: 0 };
  private mouseT = { x: 0, y: 0 };
  private t0 = performance.now();
  private T = 0;

  private shell!: HTMLElement;
  private nav = { x: 0, target: 0, max: 0, vel: 0, idx: 0, locked: true };
  private down = false;
  private sx = 0;
  private st = 0;
  private snapTimer = 0;
  private seen = new Set<number>();

  private mdl!: HTMLElement;
  private mbg!: HTMLElement;
  private mcard!: HTMLElement;
  private mbody!: HTMLElement;

  ngAfterViewInit(): void {
    this.blob = $('#blob');
    this.rt.td.on<MouseEvent>(window, 'mousemove', (e) => {
      this.tx = e.clientX;
      this.ty = e.clientY;
    });
    this.blobLoop();

    this.rt.td.on<MouseEvent>(window, 'mousemove', (e) => {
      this.mouseT.x = (e.clientX - innerWidth / 2) / innerHeight;
      this.mouseT.y = -(e.clientY - innerHeight / 2) / innerHeight;
    });
    this.rt.td.on(window, 'resize', () => {
      if (this.glOk) {
        this.rnd.setSize(innerWidth, innerHeight);
        this.uni.uRes.value.set(innerWidth, innerHeight);
      }
      this.nav.max = (this.scenes.length - 1) * innerWidth;
      this.nav.target = clamp(this.nav.target, 0, this.nav.max);
    });

    this.shell = $('#shell');
    this.nav.max = (this.scenes.length - 1) * innerWidth;

    this.rt.td.on<WheelEvent>(
      window,
      'wheel',
      (e) => {
        if (this.nav.locked || $('#mdl').classList.contains('open')) return;
        this.nav.target = clamp(
          this.nav.target + (Math.abs(e.deltaY) > Math.abs(e.deltaX) ? e.deltaY : e.deltaX) * 1.15,
          0,
          this.nav.max,
        );
      },
      { passive: true },
    );
    this.rt.td.on<PointerEvent>(window, 'pointerdown', (e) => {
      if ((e.target as HTMLElement).closest('button,a,input,textarea')) return;
      this.down = true;
      this.sx = e.clientX;
      this.st = this.nav.target;
      this.blob.classList.add('on');
    });
    this.rt.td.on(window, 'pointerup', () => {
      if (!this.down) return;
      this.down = false;
      this.blob.classList.remove('on');
      this.nav.target = Math.round(this.nav.target / innerWidth) * innerWidth;
    });
    this.rt.td.on<PointerEvent>(window, 'pointermove', (e) => {
      if (this.down) this.nav.target = clamp(this.st - (e.clientX - this.sx) * 1.6, 0, this.nav.max);
    });
    this.rt.td.on<KeyboardEvent>(window, 'keydown', (e) => {
      if ($('#mdl').classList.contains('open')) return;
      if (e.key === 'ArrowRight') this.goTo(this.nav.idx + 1);
      if (e.key === 'ArrowLeft') this.goTo(this.nav.idx - 1);
    });

    this.mdl = $('#mdl');
    this.mbg = $('.mdl-bg', this.mdl);
    this.mcard = $('.mdl-card', this.mdl);
    this.mbody = $('#mdlBody');
    $$('[data-modal]').forEach((b) => this.rt.td.on(b, 'click', () => this.openM()));
    this.rt.td.on<MouseEvent>(this.mdl, 'click', (e) => {
      if ((e.target as HTMLElement).closest('[data-close]')) this.closeM();
    });
    this.rt.td.on<KeyboardEvent>(window, 'keydown', (e) => {
      if (e.key === 'Escape' && this.mdl.classList.contains('open')) this.closeM();
    });
    this.rt.td.on<MouseEvent>(document, 'click', (e) => {
      const g = (e.target as HTMLElement).closest<HTMLElement>('[data-goto]');
      if (g && !g.classList.contains('rad-i')) this.goTo(+g.dataset.goto!);
    });

    this.prepScenes();
    this.rt.whenLoaded(() => {
      this.initFX();
      this.navLoop();
      this.liquid();
      this.radial();
      this.trans();
      this.bindBlob();
      gsap.set('.top,.rail,.bar,.hintdrag,#radial', { opacity: 0 });
      this.boot();
    });
  }

  ngOnDestroy(): void {
    this.rt.destroy();
    anime.remove('*');
    if (this.rnd) {
      this.rnd.dispose();
      this.rnd.forceContextLoss();
    }
  }

  private blobLoop(): void {
    this.bx = lerp(this.bx, this.tx, 0.15);
    this.by = lerp(this.by, this.ty, 0.15);
    this.blob.style.transform = `translate(${this.bx}px,${this.by}px)`;
    this.rt.td.raf(() => this.blobLoop());
  }

  private bindBlob(): void {
    $$('a,button,.cd,.liq,input,textarea').forEach((el) => {
      this.rt.td.on(el, 'mouseenter', () => this.blob.classList.add('on'));
      this.rt.td.on(el, 'mouseleave', () => this.blob.classList.remove('on'));
    });
  }

  private initFX(): void {
    this.rnd = new THREE.WebGLRenderer({ canvas: $<HTMLCanvasElement>('#fx'), antialias: false });
    this.rnd.setPixelRatio(Math.min(devicePixelRatio, 1.6));
    this.rnd.setSize(innerWidth, innerHeight);
    this.sc = new THREE.Scene();
    this.cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.uni = {
      uTime: { value: 0 },
      uRes: { value: new THREE.Vector2(innerWidth, innerHeight) },
      uMouse: { value: new THREE.Vector2(0, 0) },
      uProg: { value: 0 },
      uLight: { value: 0 },
      uPush: { value: 0 },
      uVel: { value: 0 },
    };
    const frag = `
  precision highp float;
  uniform float uTime;uniform vec2 uRes;uniform vec2 uMouse;uniform float uProg;
  uniform float uLight;uniform float uPush;uniform float uVel;
  float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453123);}
  float noise(vec2 p){
    vec2 i=floor(p),f=fract(p);
    vec2 u=f*f*(3.0-2.0*f);
    return mix(mix(hash(i),hash(i+vec2(1.0,0.0)),u.x),
               mix(hash(i+vec2(0.0,1.0)),hash(i+vec2(1.0,1.0)),u.x),u.y);
  }
  float fbm(vec2 p){
    float v=0.0,a=0.5;
    mat2 m=mat2(1.6,1.2,-1.2,1.6);
    for(int i=0;i<6;i++){v+=a*noise(p);p=m*p;a*=0.5;}
    return v;
  }
  void main(){
    vec2 uv=(gl_FragCoord.xy-0.5*uRes)/uRes.y;
    vec2 p=uv*1.55;
    float t=uTime*0.085;
    p.x+=uProg*1.4;
    vec2 q=vec2(fbm(p+vec2(0.0,t)),fbm(p+vec2(5.2,1.3)-t*0.8));
    vec2 r=vec2(fbm(p+3.2*q+vec2(1.7,9.2)+t*0.5),fbm(p+3.2*q+vec2(8.3,2.8)-t*0.35));
    float f=fbm(p+3.4*r+uPush*0.6);
    float md=length(uv-uMouse);
    float ball=0.085/(md*md+0.05);
    f+=ball*0.18;
    f+=uVel*0.12;
    float g=clamp(f*1.25-0.12,0.0,1.4);
    vec3 dark=mix(vec3(0.016,0.016,0.02),vec3(0.17,0.17,0.185),pow(g,1.25));
    dark+=vec3(0.26,0.27,0.3)*pow(clamp(g-0.62,0.0,1.0),2.2)*1.5;
    vec3 light=mix(vec3(0.945,0.935,0.905),vec3(0.70,0.695,0.665),pow(g,1.15));
    light-=vec3(0.22)*pow(clamp(g-0.66,0.0,1.0),2.0)*1.4;
    vec3 col=mix(dark,light,uLight);
    float iso=abs(fract(f*8.0)-0.5);
    float lines=smoothstep(0.035,0.0,iso-0.455);
    col+=mix(vec3(0.16),vec3(-0.12),uLight)*lines*(0.5+ball*0.6);
    float rim=smoothstep(0.55,0.0,md)*0.06;
    col+=mix(vec3(rim),vec3(-rim*0.7),uLight);
    float vg=1.0-0.42*dot(uv*0.78,uv*0.78);
    col*=mix(vg,1.0-(1.0-vg)*0.35,uLight);
    col+=(hash(gl_FragCoord.xy+uTime)-0.5)*0.016;
    gl_FragColor=vec4(col,1.0);
  }`;
    this.mat = new THREE.ShaderMaterial({
      uniforms: this.uni as unknown as Record<string, THREE.IUniform>,
      vertexShader: 'void main(){gl_Position=vec4(position.xy,0.0,1.0);}',
      fragmentShader: frag,
    });
    this.sc.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.mat));
    this.glOk = true;
    this.tick();
  }

  private tick(): void {
    this.rt.td.raf(() => this.tick());
    if (!this.glOk) return;
    const now = performance.now(),
      dt = Math.min((now - this.t0) / 1000, 0.05);
    this.t0 = now;
    this.T += dt;
    this.mouseN.x = lerp(this.mouseN.x, this.mouseT.x, 0.06);
    this.mouseN.y = lerp(this.mouseN.y, this.mouseT.y, 0.06);
    this.uni.uTime.value = this.T;
    this.uni.uMouse.value.set(this.mouseN.x, this.mouseN.y);
    this.uni.uVel.value = lerp(this.uni.uVel.value, Math.min(Math.abs(this.nav.vel) * 0.045, 0.6), 0.08);
    this.rnd.render(this.sc, this.cam);
  }

  private goTo(i: number): void {
    this.nav.target = clamp(i, 0, this.scenes.length - 1) * innerWidth;
  }

  private navLoop(): void {
    this.rt.td.raf(() => this.navLoop());
    const prev = this.nav.x;
    this.nav.x = lerp(this.nav.x, this.nav.target, 0.075);
    this.nav.vel = this.nav.x - prev;
    this.shell.style.transform = `translate3d(${-this.nav.x}px,0,0)`;
    const p = this.nav.x / Math.max(this.nav.max, 1);
    $('#barFill').style.transform = `scaleX(${p})`;
    if (this.glOk) {
      this.uni.uProg.value = p * 2.2;
      this.uni.uPush.value = Math.sin(p * Math.PI * 2) * 0.5;
    }
    const i = Math.round(this.nav.x / innerWidth);
    if (i !== this.nav.idx && i >= 0 && i < this.scenes.length) {
      this.nav.idx = i;
      this.onScene(i);
    }
    if (!this.down) {
      clearTimeout(this.snapTimer);
      this.snapTimer = this.rt.td.timeout(() => {
        if (this.down) return;
        const s = Math.round(this.nav.target / innerWidth) * innerWidth;
        if (Math.abs(s - this.nav.target) > 2) this.nav.target = s;
      }, 180);
    }
  }

  private onScene(i: number): void {
    $('#sceneName').textContent = this.scenes[i];
    $('#sceneIx').textContent = String(i + 1).padStart(2, '0');
    $$('#rail button').forEach((b, k) => b.classList.toggle('on', k === i));
    this.setTheme(this.LIGHT[i]);
    if (!this.seen.has(i)) {
      this.seen.add(i);
      this.animateScene(i);
    }
  }

  private setTheme(light: boolean): void {
    if (document.body.classList.contains('light') === light) return;
    document.body.classList.toggle('light', light);
    const root = document.documentElement.style;
    const from = light ? { bg: '#060607', fg: '#F0EEE6' } : { bg: '#EFEDE4', fg: '#0D0D0C' };
    const to = light ? { bg: '#EFEDE4', fg: '#0D0D0C' } : { bg: '#060607', fg: '#F0EEE6' };
    const o = { t: 0 };
    gsap.to(o, {
      t: 1,
      duration: 0.9,
      ease: 'power2.inOut',
      onUpdate: () => {
        root.setProperty('--bg', this.mixHex(from.bg, to.bg, o.t));
        const fg = this.mixHex(from.fg, to.fg, o.t);
        root.setProperty('--fg', fg);
        root.setProperty('--fg-2', this.hexA(fg, 0.6));
        root.setProperty('--fg-3', this.hexA(fg, 0.32));
        root.setProperty('--line', this.hexA(fg, 0.14));
        root.setProperty('--glass', this.hexA(fg, 0.06));
      },
    });
    if (this.glOk) gsap.to(this.uni.uLight, { value: light ? 1 : 0, duration: 1.1, ease: 'power2.inOut' });
  }

  private hex2rgb(h: string): number[] {
    return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  }

  private mixHex(a: string, b: string, t: number): string {
    const A = this.hex2rgb(a),
      B = this.hex2rgb(b);
    return `rgb(${Math.round(lerp(A[0], B[0], t))},${Math.round(lerp(A[1], B[1], t))},${Math.round(lerp(A[2], B[2], t))})`;
  }

  private hexA(c: string, a: number): string {
    const m = c.match(/\d+/g)!;
    return `rgba(${m[0]},${m[1]},${m[2]},${a})`;
  }

  private splitChars(el: HTMLElement): HTMLElement[] {
    const html = el.innerHTML;
    const parts = html.split(/(<br\s*\/?>|<\/?b>)/i);
    let out = '';
    parts.forEach((p) => {
      if (/^<br|^<\/?b>/i.test(p)) {
        out += p;
        return;
      }
      out += [...p].map((c) => (c === ' ' ? ' ' : `<span class="c">${c}</span>`)).join('');
    });
    el.innerHTML = out;
    return $$('.c', el);
  }

  private animateScene(i: number): void {
    const sc = $$('.scene')[i];
    if (!sc) return;
    const head = $('[data-anim="chars"]', sc);
    if (head && !head.dataset.done) {
      head.dataset.done = '1';
      const cs = this.splitChars(head);
      anime({
        targets: cs,
        opacity: [0, 1],
        translateY: [46, 0],
        rotateX: [-78, 0],
        duration: 1100,
        delay: anime.stagger(16),
        easing: 'easeOutExpo',
      });
    }
    anime({
      targets: $$('[data-anim="fade"]', sc),
      opacity: [0, 1],
      translateY: [26, 0],
      duration: 900,
      delay: anime.stagger(70, { start: 220 }),
      easing: 'easeOutExpo',
    });
    $$('.meter i,.track i', sc).forEach((m, k) => {
      anime({
        targets: m,
        scaleX: [0, parseFloat(m.dataset.w!)],
        duration: 1300,
        delay: 420 + k * 110,
        easing: 'easeOutExpo',
      });
    });
    $$('[data-n]', sc).forEach((el, k) => {
      const o = { v: 0 },
        tg = parseFloat(el.dataset.n!),
        d = parseInt(el.dataset.d || '0'),
        suf = el.dataset.suf || '';
      anime({
        targets: o,
        v: tg,
        duration: 1900,
        delay: 300 + k * 90,
        easing: 'easeOutExpo',
        update: () =>
          (el.textContent =
            o.v.toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d }) + suf),
      });
    });
  }

  private prepScenes(): void {
    gsap.set('[data-anim="fade"]', { opacity: 0 });
  }

  private liquid(): void {
    $$('.liq,.cd,.tier').forEach((el) => {
      this.rt.td.on<MouseEvent>(el, 'mousemove', (e) => {
        const r = el.getBoundingClientRect();
        el.style.setProperty('--px', e.clientX - r.left + 'px');
        el.style.setProperty('--py', e.clientY - r.top + 'px');
      });
    });
  }

  private radial(): void {
    const rad = $('#radial'),
      core = $('#radCore'),
      items = $$('.rad-i', rad);
    let open = false;
    this.rt.td.on(core, 'click', () => {
      open = !open;
      rad.classList.toggle('open', open);
      anime.remove(items);
      if (open) {
        const R = 92,
          start = -200,
          span = 110;
        anime({
          targets: items,
          opacity: [0, 1],
          scale: [0.3, 1],
          translateX: (el: HTMLElement, i: number) =>
            R * Math.cos(((start + (span * i) / (items.length - 1)) * Math.PI) / 180),
          translateY: (el: HTMLElement, i: number) =>
            R * Math.sin(((start + (span * i) / (items.length - 1)) * Math.PI) / 180),
          duration: 800,
          delay: anime.stagger(55),
          easing: 'spring(1,80,11,0)',
        });
        anime({ targets: '.rad-halo', scale: [0.8, 3.1], opacity: [0.6, 0], duration: 1100, easing: 'easeOutExpo' });
      } else {
        anime({
          targets: items,
          opacity: 0,
          scale: 0.3,
          translateX: 0,
          translateY: 0,
          duration: 380,
          delay: anime.stagger(35, { from: 'last' }),
          easing: 'easeInBack',
        });
      }
    });
    items.forEach((it) =>
      this.rt.td.on(it, 'click', () => {
        if (it.dataset.goto !== undefined) this.goTo(+it.dataset.goto);
        if (it.hasAttribute('data-theme')) {
          const now = document.body.classList.contains('light');
          this.setTheme(!now);
        }
        if (!it.hasAttribute('data-modal')) core.click();
      }),
    );
  }

  private openM(): void {
    this.mbody.innerHTML = `
    <div class="kick" style="margin-bottom:12px">Acesso</div>
    <h3>Entre na malha.</h3>
    <p>Credenciais em 48h. Comece pelo plano Drop e suba quando o fluxo exigir.</p>
    <form id="fm">
      <div class="in"><input id="a1" type="text" required><label for="a1">Nome</label></div>
      <div class="in"><input id="a2" type="email" required><label for="a2">E-mail corporativo</label></div>
      <div class="in"><textarea id="a3"></textarea><label for="a3">O que você quer orquestrar?</label></div>
      <button class="send" type="submit">Solicitar</button>
    </form>`;
    this.mdl.classList.add('open');
    gsap.fromTo(this.mbg, { opacity: 0 }, { opacity: 1, duration: 0.4 });
    gsap.fromTo(
      this.mcard,
      { opacity: 0, y: 40, scale: 0.95 },
      { opacity: 1, y: 0, scale: 1, duration: 0.85, ease: 'expo.out' },
    );
    anime({
      targets: this.mcard.querySelectorAll('.in,.send,h3,p'),
      opacity: [0, 1],
      translateY: [18, 0],
      duration: 700,
      delay: anime.stagger(55, { start: 120 }),
      easing: 'easeOutExpo',
    });
    this.bindIn();
    this.bindBlob();
  }

  private closeM(): void {
    gsap.to(this.mbg, { opacity: 0, duration: 0.3 });
    gsap.to(this.mcard, {
      opacity: 0,
      y: 30,
      scale: 0.96,
      duration: 0.35,
      ease: 'power2.in',
      onComplete: () => this.mdl.classList.remove('open'),
    });
  }

  private bindIn(): void {
    $$<HTMLInputElement>('.in input,.in textarea').forEach((i) => {
      const f = i.closest('.in')!;
      const u = () => f.classList.toggle('fill', i.value.length > 0);
      this.rt.td.on(i, 'input', u);
      this.rt.td.on(i, 'blur', u);
    });
    const fm = $('#fm');
    if (fm)
      this.rt.td.on(fm, 'submit', (e) => {
        e.preventDefault();
        const b = $('.send', fm);
        b.textContent = 'Enviando…';
        this.rt.td.timeout(() => {
          this.mbody.innerHTML = `<div style="text-align:center;padding:14px 0">
        <div style="width:66px;height:66px;border-radius:50%;border:1px solid var(--line);display:grid;place-items:center;margin:0 auto 20px">
        <svg id="ok" viewBox="0 0 24 24" style="width:26px;height:26px;stroke:var(--fg);fill:none;stroke-width:1.4;stroke-dasharray:40;stroke-dashoffset:40"><path d="M5 13l4 4L19 7"/></svg></div>
        <h3>Recebido.</h3><p style="color:var(--fg-2);margin-top:10px">Seu acesso entra na próxima leva. Fique de olho no e-mail.</p></div>`;
          anime({ targets: '#ok', strokeDashoffset: [40, 0], duration: 900, easing: 'easeOutExpo' });
          if (this.glOk) gsap.fromTo(this.uni.uPush, { value: 2.4 }, { value: 0, duration: 2.2, ease: 'expo.out' });
        }, 800);
      });
  }

  private trans(): void {
    $$('[data-trans]').forEach((a) =>
      this.rt.td.on(a, 'click', (e) => {
        const href = a.getAttribute('href');
        if (!href) return;
        e.preventDefault();
        const ptc = $('#ptc'),
          t = $('#ptcT');
        gsap
          .timeline({ onComplete: () => this.rt.go(href) })
          .fromTo(
            ptc,
            { clipPath: 'circle(0% at 50% 50%)' },
            { clipPath: 'circle(140% at 50% 50%)', duration: 0.95, ease: 'expo.inOut' },
          )
          .to(t, { opacity: 1, duration: 0.4 }, '-=.4')
          .fromTo(t, { letterSpacing: '0em' }, { letterSpacing: '.3em', duration: 0.8, ease: 'power2.out' }, '<');
      }),
    );
  }

  private boot(): void {
    const txt = $('#bootTxt');
    const cs = [...txt.textContent!].map((c) => {
      const s = document.createElement('span');
      s.textContent = c;
      return s;
    });
    txt.textContent = '';
    cs.forEach((c) => txt.appendChild(c));
    const o = { v: 0 };
    anime({
      targets: cs,
      opacity: [0, 1],
      translateY: [60, 0],
      rotateX: [-70, 0],
      duration: 1300,
      delay: anime.stagger(80),
      easing: 'easeOutExpo',
    });
    anime({ targets: '#bootBar', scaleX: [0, 1], duration: 2000, easing: 'easeInOutQuad' });
    anime({
      targets: o,
      v: 100,
      duration: 2000,
      easing: 'easeInOutQuad',
      round: 1,
      update: () => ($('#bootPct').textContent = o.v + '%'),
      complete: () => {
        anime({
          targets: cs,
          opacity: 0,
          translateY: -50,
          duration: 600,
          delay: anime.stagger(40),
          easing: 'easeInExpo',
        });
        anime({ targets: '.boot-sub', opacity: 0, duration: 400 });
        this.rt.td.timeout(() => {
          const w = $('#wipe');
          gsap
            .timeline()
            .to(w, { clipPath: 'circle(140% at 50% 50%)', duration: 0.85, ease: 'expo.inOut' })
            .set('#boot', { display: 'none' })
            .to(w, { clipPath: 'circle(0% at 50% 50%)', duration: 1, ease: 'expo.inOut' }, '+=.05')
            .add(() => {
              this.nav.locked = false;
              this.seen.add(0);
              this.animateScene(0);
              anime({
                targets: '.top,.rail,.bar,.hintdrag,#radial',
                opacity: [0, 1],
                translateY: [12, 0],
                duration: 900,
                delay: anime.stagger(80),
                easing: 'easeOutExpo',
              });
            }, '-=.7');
        }, 620);
      },
    });
  }
}
