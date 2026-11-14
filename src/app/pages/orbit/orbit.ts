import { AfterViewInit, Component, OnDestroy, ViewEncapsulation } from '@angular/core';
import anime from 'animejs';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import * as THREE from 'three';
import { $, $$, lerp } from '../../core/dom';
import { PAGE_PATH } from '../../core/page-links';
import { PageRuntime } from '../../core/page-runtime';

gsap.registerPlugin(ScrollTrigger);

interface SwitchPage {
  n: string;
  t: string;
  d: string;
  f: string;
}

interface OrbUniforms {
  uTime: { value: number };
  uProg: { value: number };
  uMouse: { value: THREE.Vector2 };
  uSize: { value: number };
  uOpacity: { value: number };
  uBurst: { value: number };
}

@Component({
  selector: 'page-orbit',
  templateUrl: './orbit.html',
  styleUrl: './orbit.css',
  encapsulation: ViewEncapsulation.None,
})
export class Orbit implements AfterViewInit, OnDestroy {
  protected readonly here = PAGE_PATH.orbit;
  protected readonly pages: SwitchPage[] = [
    { n: '01', t: 'Orbit', d: 'Orbe de partículas · scroll horizontal', f: PAGE_PATH.orbit },
    { n: '02', t: 'Paper', d: 'Editorial claro · câmera 3D por scroll', f: PAGE_PATH.paper },
    { n: '03', t: 'Flux', d: 'Shader fluido · menu radial', f: PAGE_PATH.flux },
    { n: '04', t: 'Grid', d: 'Console OaaS · malha arrastável', f: PAGE_PATH.grid },
    { n: '05', t: 'Echo', d: 'Vidro refrativo · slides verticais', f: PAGE_PATH.echo },
  ];

  private readonly rt = new PageRuntime({ bodyClasses: ['is-locked'] });

  private cur!: HTMLElement;
  private curDot!: HTMLElement;
  private curLabel!: HTMLElement;
  private mx = innerWidth / 2;
  private my = innerHeight / 2;
  private cx = this.mx;
  private cy = this.my;
  private dx = this.mx;
  private dy = this.my;

  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private points!: THREE.Points;
  private uni!: OrbUniforms;
  private glReady = false;
  private glMouse = { x: 0, y: 0 };
  private glMouseT = { x: 0, y: 0 };
  private clock = { t: 0, last: performance.now() };

  private countersDone = new WeakSet<HTMLElement>();

  ngAfterViewInit(): void {
    gsap.set('#nav', { xPercent: -50, y: -140 });

    this.cur = $('#cur');
    this.curDot = $('#curDot');
    this.curLabel = $('#curLabel');
    this.rt.td.on<MouseEvent>(window, 'mousemove', (e) => {
      this.mx = e.clientX;
      this.my = e.clientY;
    });
    this.curLoop();

    this.rt.td.on<MouseEvent>(window, 'mousemove', (e) => {
      this.glMouseT.x = (e.clientX / innerWidth - 0.5) * 2;
      this.glMouseT.y = -(e.clientY / innerHeight - 0.5) * 2;
    });
    this.rt.td.on(window, 'resize', () => {
      if (!this.glReady) return;
      this.camera.aspect = innerWidth / innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(innerWidth, innerHeight);
    });

    document.body.classList.add('is-locked');
    this.rt.whenLoaded(() => {
      this.initGL();
      this.setupReveals();
      this.setupManifesto();
      this.setupOrbScroll();
      this.setupHorizontal();
      this.setupTilt();
      this.setupMarquee();
      this.setupNav();
      this.setupToggle();
      this.setupFab();
      this.setupModal();
      this.setupPageTrans();
      this.bindCursor();
      this.runLoader();
      ScrollTrigger.refresh();
    });
  }

  ngOnDestroy(): void {
    this.rt.destroy();
    anime.remove('*');
    if (this.renderer) {
      this.renderer.dispose();
      this.renderer.forceContextLoss();
    }
  }

  private splitWords(el: HTMLElement): HTMLElement[] {
    const txt = el.textContent!.trim();
    el.textContent = '';
    txt.split(/\s+/).forEach((w) => {
      const s = document.createElement('span');
      s.className = 'w';
      s.textContent = w;
      el.appendChild(s);
      el.appendChild(document.createTextNode(' '));
    });
    return $$('.w', el);
  }

  private curLoop(): void {
    this.cx = lerp(this.cx, this.mx, 0.13);
    this.cy = lerp(this.cy, this.my, 0.13);
    this.dx = lerp(this.dx, this.mx, 0.42);
    this.dy = lerp(this.dy, this.my, 0.42);
    this.cur.style.transform = `translate(${this.cx}px,${this.cy}px)`;
    this.curDot.style.transform = `translate(${this.dx}px,${this.dy}px)`;
    this.curLabel.style.transform = `translate(${this.cx}px,${this.cy}px) translate(-50%,-50%)`;
    this.rt.td.raf(() => this.curLoop());
  }

  private bindCursor(): void {
    $$('a,button,.card,input,select,textarea').forEach((el) => {
      this.rt.td.on(el, 'mouseenter', () => {
        this.cur.classList.add('grow');
        const l = el.dataset.cur;
        if (l) {
          this.curLabel.textContent = l;
          gsap.to(this.curLabel, { opacity: 1, duration: 0.3 });
        }
      });
      this.rt.td.on(el, 'mouseleave', () => {
        this.cur.classList.remove('grow');
        gsap.to(this.curLabel, { opacity: 0, duration: 0.2 });
      });
    });
  }

  private initGL(): void {
    const cv = $<HTMLCanvasElement>('#gl');
    this.renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.renderer.setSize(innerWidth, innerHeight);
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.1, 100);
    this.camera.position.z = 6.2;

    const COUNT = window.innerWidth < 700 ? 9000 : 17000;
    const pos = new Float32Array(COUNT * 3);
    const alt = new Float32Array(COUNT * 3);
    const rndA = new Float32Array(COUNT);
    const sc = new Float32Array(COUNT);
    const gold = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < COUNT; i++) {
      const y = 1 - (i / (COUNT - 1)) * 2;
      const r = Math.sqrt(1 - y * y);
      const th = gold * i;
      const R = 1.95 + Math.random() * 0.12;
      pos[i * 3] = Math.cos(th) * r * R;
      pos[i * 3 + 1] = y * R;
      pos[i * 3 + 2] = Math.sin(th) * r * R;
      const ar = 0.6 + Math.pow(Math.random(), 0.6) * 3.4;
      const aa = Math.random() * Math.PI * 2;
      const arm = Math.floor(Math.random() * 3) * ((Math.PI * 2) / 3);
      alt[i * 3] = Math.cos(aa + arm + ar * 1.1) * ar;
      alt[i * 3 + 1] = (Math.random() - 0.5) * 0.34;
      alt[i * 3 + 2] = Math.sin(aa + arm + ar * 1.1) * ar;
      rndA[i] = Math.random();
      sc[i] = 0.5 + Math.random() * 1.6;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('aAlt', new THREE.BufferAttribute(alt, 3));
    geo.setAttribute('aRnd', new THREE.BufferAttribute(rndA, 1));
    geo.setAttribute('aScale', new THREE.BufferAttribute(sc, 1));

    this.uni = {
      uTime: { value: 0 },
      uProg: { value: 0 },
      uMouse: { value: new THREE.Vector2(0, 0) },
      uSize: { value: this.renderer.getPixelRatio() },
      uOpacity: { value: 0 },
      uBurst: { value: 0 },
    };

    const vert = `
  uniform float uTime;uniform float uProg;uniform vec2 uMouse;uniform float uSize;uniform float uBurst;
  attribute vec3 aAlt;attribute float aRnd;attribute float aScale;
  varying float vA;varying float vR;
  vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
  vec4 mod289(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}
  vec4 permute(vec4 x){return mod289(((x*34.0)+1.0)*x);}
  vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
  float snoise(vec3 v){
    const vec2 C=vec2(1.0/6.0,1.0/3.0);const vec4 D=vec4(0.0,0.5,1.0,2.0);
    vec3 i=floor(v+dot(v,C.yyy));vec3 x0=v-i+dot(i,C.xxx);
    vec3 g=step(x0.yzx,x0.xyz);vec3 l=1.0-g;vec3 i1=min(g.xyz,l.zxy);vec3 i2=max(g.xyz,l.zxy);
    vec3 x1=x0-i1+C.xxx;vec3 x2=x0-i2+C.yyy;vec3 x3=x0-D.yyy;
    i=mod289(i);
    vec4 p=permute(permute(permute(i.z+vec4(0.0,i1.z,i2.z,1.0))+i.y+vec4(0.0,i1.y,i2.y,1.0))+i.x+vec4(0.0,i1.x,i2.x,1.0));
    float n_=0.142857142857;vec3 ns=n_*D.wyz-D.xzx;
    vec4 j=p-49.0*floor(p*ns.z*ns.z);
    vec4 x_=floor(j*ns.z);vec4 y_=floor(j-7.0*x_);
    vec4 x=x_*ns.x+ns.yyyy;vec4 y=y_*ns.x+ns.yyyy;vec4 h=1.0-abs(x)-abs(y);
    vec4 b0=vec4(x.xy,y.xy);vec4 b1=vec4(x.zw,y.zw);
    vec4 s0=floor(b0)*2.0+1.0;vec4 s1=floor(b1)*2.0+1.0;vec4 sh=-step(h,vec4(0.0));
    vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
    vec3 p0=vec3(a0.xy,h.x);vec3 p1=vec3(a0.zw,h.y);vec3 p2=vec3(a1.xy,h.z);vec3 p3=vec3(a1.zw,h.w);
    vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
    p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;
    vec4 m=max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0);m=m*m;
    return 42.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
  }
  void main(){
    vec3 sph=position;
    float n=snoise(normalize(sph)*1.5+vec3(0.0,0.0,uTime*0.18));
    sph+=normalize(sph)*n*0.34;
    float wob=snoise(aAlt*0.5+uTime*0.12)*0.3;
    vec3 gal=aAlt+vec3(0.0,wob,0.0);
    float t=smoothstep(0.0,1.0,uProg);
    vec3 p=mix(sph,gal,t);
    float ang=uTime*0.055+t*1.2;
    float ca=cos(ang),sa=sin(ang);
    p=vec3(p.x*ca-p.z*sa,p.y,p.x*sa+p.z*ca);
    p.xy+=uMouse*0.42*(0.4+aRnd*0.8);
    p+=normalize(p)*uBurst*(0.4+aRnd);
    vec4 mv=modelViewMatrix*vec4(p,1.0);
    gl_Position=projectionMatrix*mv;
    float d=length(mv.xyz);
    gl_PointSize=aScale*uSize*(118.0/d)*(0.5+aRnd*0.8)*0.26;
    vR=aRnd;
    vA=smoothstep(10.0,2.0,d)*(0.35+aRnd*0.65);
  }`;
    const frag = `
  precision highp float;uniform float uOpacity;varying float vA;varying float vR;
  void main(){
    vec2 c=gl_PointCoord-0.5;
    float d=length(c);
    if(d>0.5)discard;
    float a=smoothstep(0.5,0.05,d);
    vec3 col=mix(vec3(0.94,0.93,0.90),vec3(0.55,0.57,0.62),vR*0.55);
    gl_FragColor=vec4(col,a*vA*uOpacity);
  }`;

    const mat = new THREE.ShaderMaterial({
      uniforms: this.uni as unknown as Record<string, THREE.IUniform>,
      vertexShader: vert,
      fragmentShader: frag,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.points = new THREE.Points(geo, mat);
    this.scene.add(this.points);
    this.glReady = true;
    this.renderGL();
  }

  private renderGL(): void {
    this.rt.td.raf(() => this.renderGL());
    if (!this.glReady) return;
    const now = performance.now();
    const dt = Math.min((now - this.clock.last) / 1000, 0.05);
    this.clock.last = now;
    this.clock.t += dt;
    this.glMouse.x = lerp(this.glMouse.x, this.glMouseT.x, 0.045);
    this.glMouse.y = lerp(this.glMouse.y, this.glMouseT.y, 0.045);
    this.uni.uTime.value = this.clock.t;
    this.uni.uMouse.value.set(this.glMouse.x, this.glMouse.y);
    this.points.rotation.y += dt * 0.02;
    this.points.rotation.x = lerp(this.points.rotation.x, this.glMouse.y * 0.22, 0.05);
    this.renderer.render(this.scene, this.camera);
  }

  private runLoader(): void {
    const mark = $('#ldMark');
    const chars = [...mark.textContent!].map((c) => {
      const s = document.createElement('span');
      s.textContent = c;
      return s;
    });
    mark.textContent = '';
    chars.forEach((c) => mark.appendChild(c));
    const pct = $('#ldPct'),
      bar = $('#ldBar');
    const state = { v: 0 };
    const tl = gsap.timeline();
    tl.to(chars, { y: 0, duration: 1.1, stagger: 0.055, ease: 'expo.out' })
      .to(bar, { scaleX: 1, duration: 2.1, ease: 'power2.inOut' }, 0.15)
      .to(
        state,
        {
          v: 100,
          duration: 2.1,
          ease: 'power2.inOut',
          onUpdate: () => {
            pct.textContent = String(Math.round(state.v)).padStart(3, '0');
          },
        },
        0.15,
      )
      .to(chars, { y: -120, duration: 0.8, stagger: 0.03, ease: 'expo.inOut' }, '+=.12')
      .to('.ld-bar,.ld-meta', { opacity: 0, duration: 0.4 }, '<')
      .to($$('#ldCurtain i'), { scaleY: 1, duration: 0.75, stagger: 0.06, ease: 'expo.inOut' }, '-=.35')
      .set('#loader', { display: 'none' })
      .to(
        $$('#ldCurtain i'),
        { scaleY: 0, transformOrigin: 'top', duration: 0.85, stagger: 0.06, ease: 'expo.inOut' },
        '+=.05',
      )
      .add(() => this.intro(), '-=.5');
  }

  private intro(): void {
    document.body.classList.remove('is-locked');
    gsap.to('#gl', { opacity: 1, duration: 2.2, ease: 'power2.out' });
    gsap.to(this.uni.uOpacity, { value: 1, duration: 2.6, ease: 'power2.out' });
    gsap.fromTo(this.camera.position, { z: 13 }, { z: 6.2, duration: 3, ease: 'expo.out' });
    gsap.to('#nav', { y: 0, duration: 1.2, ease: 'expo.out', delay: 0.5 });
    const tl = gsap.timeline();
    tl.to('.hero .ln i', { y: 0, duration: 1.35, stagger: 0.1, ease: 'expo.out' })
      .to('.hero .reveal-up', { y: 0, opacity: 1, duration: 1, stagger: 0.07, ease: 'expo.out' }, '-=.95')
      .to('.scroll-hint', { opacity: 1, duration: 0.8 }, '-=.6')
      .from('#fab', { scale: 0, opacity: 0, duration: 0.9, ease: 'back.out(1.8)' }, '-=.6');
    this.startCounters();
  }

  private setupReveals(): void {
    gsap.set('.reveal-up', { y: 26, opacity: 0 });
    gsap.set('.scroll-hint', { opacity: 0 });
    $$('.reveal-up').forEach((el) => {
      if (el.closest('.hero')) return;
      ScrollTrigger.create({
        trigger: el,
        start: 'top 88%',
        once: true,
        onEnter: () => gsap.to(el, { y: 0, opacity: 1, duration: 1.1, ease: 'expo.out' }),
      });
    });
    ScrollTrigger.create({
      trigger: '.cta',
      start: 'top 75%',
      once: true,
      onEnter: () => gsap.to('.cta .ln i', { y: 0, duration: 1.3, stagger: 0.1, ease: 'expo.out' }),
    });
    gsap.set('.cta-btn', { opacity: 0, y: 20 });
    ScrollTrigger.create({
      trigger: '.cta',
      start: 'top 65%',
      once: true,
      onEnter: () => gsap.to('.cta-btn', { opacity: 1, y: 0, duration: 1, ease: 'expo.out' }),
    });
  }

  private setupManifesto(): void {
    const el = $('#manifestoText');
    const words = this.splitWords(el);
    ScrollTrigger.create({
      trigger: el,
      start: 'top 78%',
      end: 'bottom 45%',
      scrub: true,
      onUpdate: (s) => {
        const n = Math.round(s.progress * words.length);
        words.forEach((w, i) => w.classList.toggle('lit', i < n));
      },
    });
  }

  private setupOrbScroll(): void {
    ScrollTrigger.create({
      trigger: '.manifesto',
      start: 'top bottom',
      end: 'bottom top',
      scrub: 1.2,
      onUpdate: (s) => {
        if (this.uni) this.uni.uProg.value = s.progress;
      },
    });
    ScrollTrigger.create({
      trigger: '.metrics',
      start: 'top center',
      end: 'bottom top',
      scrub: 1.4,
      onUpdate: (s) => {
        if (this.camera) this.camera.position.z = 6.2 + s.progress * 3.4;
      },
    });
  }

  private setupHorizontal(): void {
    const track = $('#hzTrack');
    const dist = () => track.scrollWidth - innerWidth;
    gsap.to(track, {
      x: () => -dist(),
      ease: 'none',
      scrollTrigger: {
        trigger: '.hz',
        start: 'top top',
        end: () => '+=' + dist(),
        pin: true,
        scrub: 1,
        invalidateOnRefresh: true,
        onUpdate: (s) => {
          if (this.uni) this.uni.uBurst.value = Math.sin(s.progress * Math.PI) * 0.45;
        },
      },
    });
    gsap.from('.hz-head h2', {
      y: 50,
      opacity: 0,
      duration: 1.2,
      ease: 'expo.out',
      scrollTrigger: { trigger: '.hz', start: 'top 70%' },
    });
  }

  private setupTilt(): void {
    $$('.tilt').forEach((card) => {
      let rx = 0,
        ry = 0,
        trx = 0,
        try_ = 0,
        raf = false;
      const tick = () => {
        rx = lerp(rx, trx, 0.1);
        ry = lerp(ry, try_, 0.1);
        card.style.transform = `perspective(900px) rotateX(${rx}deg) rotateY(${ry}deg) translateZ(0)`;
        if (Math.abs(rx - trx) > 0.01 || Math.abs(ry - try_) > 0.01) {
          raf = true;
          this.rt.td.raf(tick);
        } else raf = false;
      };
      this.rt.td.on<MouseEvent>(card, 'mousemove', (e) => {
        const r = card.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width,
          py = (e.clientY - r.top) / r.height;
        card.style.setProperty('--mx', px * 100 + '%');
        card.style.setProperty('--my', py * 100 + '%');
        try_ = (px - 0.5) * 13;
        trx = -(py - 0.5) * 13;
        if (!raf) {
          raf = true;
          this.rt.td.raf(tick);
        }
      });
      this.rt.td.on(card, 'mouseleave', () => {
        trx = 0;
        try_ = 0;
      });
    });
  }

  private startCounters(): void {
    $$('[data-count]').forEach((el) => {
      ScrollTrigger.create({
        trigger: el,
        start: 'top 92%',
        once: true,
        onEnter: () => {
          if (this.countersDone.has(el)) return;
          this.countersDone.add(el);
          const target = parseFloat(el.dataset.count!),
            dec = parseInt(el.dataset.dec || '0');
          const o = { v: 0 };
          gsap.to(o, {
            v: target,
            duration: 2.2,
            ease: 'power3.out',
            onUpdate: () => {
              el.textContent = o.v.toLocaleString('pt-BR', {
                minimumFractionDigits: dec,
                maximumFractionDigits: dec,
              });
            },
          });
        },
      });
    });
  }

  private setupMarquee(): void {
    const rows = $$('.mq-row');
    const w = rows[0].offsetWidth;
    rows.forEach((r) => gsap.set(r, { x: 0 }));
    const tween = gsap.to(rows, {
      x: -w,
      duration: 22,
      ease: 'none',
      repeat: -1,
      modifiers: { x: gsap.utils.unitize((x: string) => parseFloat(x) % w) },
    });
    ScrollTrigger.create({
      trigger: '.mq',
      start: 'top bottom',
      end: 'bottom top',
      onUpdate: (s) => {
        tween.timeScale(1 + Math.abs(s.getVelocity() / 900));
      },
    });
  }

  private setupNav(): void {
    const links = $$('#navLinks a'),
      pill = $('#navPill');
    const move = (el: HTMLElement) => {
      pill.style.width = el.offsetWidth + 'px';
      pill.style.transform = `translateX(${el.offsetLeft}px)`;
    };
    const active = () => links.find((l) => l.classList.contains('on')) || links[0];
    this.rt.td.raf(() => move(active()));
    links.forEach((l) => {
      this.rt.td.on(l, 'mouseenter', () => move(l));
      this.rt.td.on(l, 'click', (e) => {
        e.preventDefault();
        links.forEach((x) => x.classList.remove('on'));
        l.classList.add('on');
        this.smoothTo($(l.getAttribute('href')!));
      });
    });
    this.rt.td.on($('#navLinks'), 'mouseleave', () => move(active()));
    this.rt.td.on(window, 'resize', () => move(active()));
    ['camadas', 'malha', 'escala', 'planos'].forEach((id) => {
      const sec = document.getElementById(id);
      if (!sec) return;
      ScrollTrigger.create({
        trigger: sec,
        start: 'top 50%',
        end: 'bottom 50%',
        onToggle: (s) => {
          if (s.isActive) {
            links.forEach((x) => x.classList.toggle('on', x.getAttribute('href') === '#' + id));
            move(active());
          }
        },
      });
    });
    let last = 0;
    ScrollTrigger.create({
      start: 0,
      end: 'max',
      onUpdate: (s) => {
        const y = s.scroll();
        gsap.to('#nav', { xPercent: -50, y: y > last && y > 400 ? -130 : 0, duration: 0.6, ease: 'power3.out' });
        last = y;
      },
    });
  }

  private smoothTo(el: HTMLElement): void {
    if (!el) return;
    const top = el.getBoundingClientRect().top + scrollY - 20;
    window.scrollTo({ top, behavior: 'smooth' });
  }

  private setupToggle(): void {
    const t = $('#toggle'),
      btns = $$('button', t),
      ind = $('i', t);
    const move = (b: HTMLElement) => {
      ind.style.width = b.offsetWidth + 'px';
      ind.style.transform = `translateX(${b.offsetLeft - 5}px)`;
    };
    this.rt.td.raf(() => move(btns[0]));
    btns.forEach((b) =>
      this.rt.td.on(b, 'click', () => {
        btns.forEach((x) => x.classList.remove('on'));
        b.classList.add('on');
        move(b);
        const mode = b.dataset.mode!;
        $$('.pl-price span').forEach((s) => {
          const val = s.dataset[mode];
          anime({
            targets: s,
            opacity: [1, 0],
            translateY: [0, -10],
            duration: 180,
            easing: 'easeInQuad',
            complete: () => {
              s.textContent = val ?? '';
              anime({
                targets: s,
                opacity: [0, 1],
                translateY: [10, 0],
                duration: 380,
                easing: 'easeOutExpo',
              });
            },
          });
        });
      }),
    );
    this.rt.td.on(window, 'resize', () => move(btns.find((b) => b.classList.contains('on'))!));
  }

  private setupFab(): void {
    const fab = $('#fab'),
      main = $('#fabMain'),
      items = $$('.fab-item', fab);
    let open = false;
    this.rt.td.on(main, 'click', () => {
      open = !open;
      fab.classList.toggle('open', open);
      anime.remove(items);
      if (open) {
        anime({
          targets: items,
          opacity: [0, 1],
          scale: [0.4, 1],
          translateY: (el: HTMLElement, i: number) => [-10, -(68 + i * 52)],
          duration: 720,
          delay: anime.stagger(60),
          easing: 'spring(1,80,11,0)',
        });
      } else {
        anime({
          targets: items,
          opacity: 0,
          scale: 0.4,
          translateY: 0,
          duration: 360,
          delay: anime.stagger(40, { from: 'last' }),
          easing: 'easeInBack',
        });
      }
    });
    items.forEach((it) =>
      this.rt.td.on(it, 'click', () => {
        if (it.dataset.top) window.scrollTo({ top: 0, behavior: 'smooth' });
        if (it.dataset.scroll) this.smoothTo($(it.dataset.scroll));
        main.click();
      }),
    );
    gsap.to(main, { y: -5, duration: 2.4, repeat: -1, yoyo: true, ease: 'sine.inOut' });
  }

  private setupModal(): void {
    const m = $('#modal'),
      bg = $('.modal-bg', m),
      box = $('.modal-box', m);
    gsap.set(m, { display: 'none' });
    const open = () => {
      gsap.set(m, { display: 'grid' });
      m.classList.add('on');
      document.body.classList.add('is-locked');
      gsap.to(bg, { opacity: 1, duration: 0.5, ease: 'power2.out' });
      gsap.to(box, { opacity: 1, y: 0, scale: 1, duration: 0.85, ease: 'expo.out' });
      anime({
        targets: box.querySelectorAll('.field,.modal-submit,.modal-note'),
        opacity: [0, 1],
        translateY: [18, 0],
        duration: 700,
        delay: anime.stagger(55, { start: 160 }),
        easing: 'easeOutExpo',
      });
    };
    const close = () => {
      m.classList.remove('on');
      document.body.classList.remove('is-locked');
      gsap.to(bg, { opacity: 0, duration: 0.4 });
      gsap.to(box, {
        opacity: 0,
        y: 28,
        scale: 0.97,
        duration: 0.45,
        ease: 'power2.in',
        onComplete: () => {
          gsap.set(m, { display: 'none' });
          $('#modalForm').style.display = '';
          $('#modalOk').style.display = 'none';
        },
      });
    };
    $$('[data-modal]').forEach((b) => this.rt.td.on(b, 'click', open));
    $$('[data-close]', m).forEach((b) => this.rt.td.on(b, 'click', close));
    this.rt.td.on<KeyboardEvent>(window, 'keydown', (e) => {
      if (e.key === 'Escape' && m.classList.contains('on')) close();
    });

    $$<HTMLInputElement>('.field input,.field textarea').forEach((inp) => {
      const f = inp.closest('.field')!;
      this.rt.td.on(inp, 'input', () => f.classList.toggle('fill', inp.value.length > 0));
      this.rt.td.on(inp, 'blur', () => f.classList.toggle('fill', inp.value.length > 0));
    });
    this.rt.td.on($('#form'), 'submit', (e) => {
      e.preventDefault();
      const btn = $('.modal-submit');
      btn.textContent = 'Enviando...';
      this.rt.td.timeout(() => {
        $('#modalForm').style.display = 'none';
        const ok = $('#modalOk');
        ok.style.display = '';
        btn.textContent = 'Reservar horário';
        anime({ targets: '#okCheck', strokeDashoffset: [40, 0], duration: 900, easing: 'easeOutExpo' });
        anime({ targets: '.ok-ring', scale: [0.6, 1], opacity: [0, 1], duration: 800, easing: 'spring(1,80,10,0)' });
        anime({
          targets: '#modalOk h3,#modalOk p',
          opacity: [0, 1],
          translateY: [14, 0],
          duration: 700,
          delay: anime.stagger(80, { start: 200 }),
          easing: 'easeOutExpo',
        });
        if (this.uni) gsap.fromTo(this.uni.uBurst, { value: 1.2 }, { value: 0, duration: 2.4, ease: 'expo.out' });
      }, 900);
    });
  }

  private setupPageTrans(): void {
    const bars = $$('#pt i'),
      word = $('#ptWord');
    $$('[data-trans]').forEach((a) => {
      this.rt.td.on(a, 'click', (e) => {
        const href = a.getAttribute('href');
        if (!href || href.startsWith('#')) return;
        e.preventDefault();
        const tl = gsap.timeline({ onComplete: () => this.rt.go(href) });
        tl.to(bars, { scaleY: 1, duration: 0.7, stagger: 0.055, ease: 'expo.inOut' })
          .to(word, { opacity: 1, duration: 0.4 }, '-=.3')
          .to(word, { letterSpacing: '.6em', duration: 0.6, ease: 'power2.out' }, '<');
      });
    });
    this.rt.td.on<PageTransitionEvent>(window, 'pageshow', (e) => {
      if (e.persisted) {
        gsap.set(bars, { scaleY: 0 });
        gsap.set(word, { opacity: 0 });
      }
    });
  }
}
