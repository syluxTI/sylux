import { AfterViewInit, Component, OnDestroy, ViewEncapsulation } from '@angular/core';
import anime from 'animejs';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import * as THREE from 'three';
import { $, $$, clamp, lerp, rnd, rndi } from '../../core/dom';
import { PAGE_PATH } from '../../core/page-links';
import { PageRuntime } from '../../core/page-runtime';

gsap.registerPlugin(ScrollTrigger);

interface RouteItem {
  n: string;
  t: string;
  f: string;
  d: string;
  g: string[];
}

interface TermLine {
  cls: string;
  text: string;
  wait: number;
  speed: number;
}

interface RadarNode {
  a: number;
  r: number;
  hit: number;
  seen: boolean;
}

interface BgUniforms {
  uTime: { value: number };
  uRes: { value: THREE.Vector2 };
  uMouse: { value: THREE.Vector2 };
  uScroll: { value: number };
  uGlitch: { value: number };
}

interface DotUniforms {
  uTime: { value: number };
  uForm: { value: number };
  uMouse: { value: THREE.Vector2 };
  uSize: { value: number };
  uOpacity: { value: number };
  uBurst: { value: number };
  uGlitch: { value: number };
  uScroll: { value: number };
}

const SCRAMBLE = '!<>-_\\/[]{}—=+*^?#01234ABCDEF';

@Component({
  selector: 'page-not-found',
  templateUrl: './not-found.html',
  styleUrl: './not-found.css',
  encapsulation: ViewEncapsulation.None,
})
export class NotFound implements AfterViewInit, OnDestroy {
  protected readonly nodes = 38;
  protected readonly regions = 12;
  protected readonly path = NotFound.readPath();

  protected readonly routes: RouteItem[] = [
    {
      n: '00',
      t: 'Hub',
      f: PAGE_PATH.hub,
      d: 'O índice das cinco direções, com rede de partículas reativa, preview flutuante e navegação por teclado.',
      g: ['Canvas 2D', 'Preview', 'Teclado'],
    },
    {
      n: '01',
      t: 'Orbit',
      f: PAGE_PATH.orbit,
      d: 'Escuridão absoluta e um orbe de 17 mil partículas que colapsa em galáxia conforme você desce.',
      g: ['WebGL', 'Partículas', 'Scroll horizontal'],
    },
    {
      n: '02',
      t: 'Paper',
      f: PAGE_PATH.paper,
      d: 'Luz, papel e um objeto de metal girando sob controle do scroll — e do seu arrasto.',
      g: ['3D arrastável', 'Editorial', 'Parallax'],
    },
    {
      n: '03',
      t: 'Flux',
      f: PAGE_PATH.flux,
      d: 'Um shader de ruído deformado ocupa a tela inteira e reage ao mouse, com seis cenas na horizontal.',
      g: ['Shader GLSL', 'Menu radial', 'Snap'],
    },
    {
      n: '04',
      t: 'Grid',
      f: PAGE_PATH.grid,
      d: 'O console de operação: terminal que digita sozinho, topologia 3D girável e command palette em ⌘K.',
      g: ['Topologia 3D', 'Terminal', '⌘K'],
    },
    {
      n: '05',
      t: 'Echo',
      f: PAGE_PATH.echo,
      d: 'Cinema: um sólido de vidro refrativo flutua enquanto os slides passam com snap vertical.',
      g: ['Refração', 'Slides', 'Web Audio'],
    },
  ];

  private readonly rt = new PageRuntime();

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
  private bgScene!: THREE.Scene;
  private bgCam!: THREE.OrthographicCamera;
  private scene!: THREE.Scene;
  private cam!: THREE.PerspectiveCamera;
  private dots!: THREE.Points;
  private readonly bgUni: BgUniforms = {
    uTime: { value: 0 },
    uRes: { value: new THREE.Vector2(innerWidth, innerHeight) },
    uMouse: { value: new THREE.Vector2(0, 0) },
    uScroll: { value: 0 },
    uGlitch: { value: 0 },
  };
  private readonly dotUni: DotUniforms = {
    uTime: { value: 0 },
    uForm: { value: 0 },
    uMouse: { value: new THREE.Vector2(0, 0) },
    uSize: { value: 1 },
    uOpacity: { value: 0 },
    uBurst: { value: 0 },
    uGlitch: { value: 0 },
    uScroll: { value: 0 },
  };
  private glReady = false;
  private readonly glOpacity = { v: 0 };
  private fadeTarget = 1;
  private fade = 1;
  private glMouse = { x: 0, y: 0 };
  private glMouseT = { x: 0, y: 0 };
  private clock = { t: 0, last: performance.now() };

  private radar!: HTMLCanvasElement;
  private rctx!: CanvasRenderingContext2D;
  private rsize = 0;
  private sweep = 0;
  private rnodes: RadarNode[] = [];
  private rseen = 0;

  private spark!: HTMLCanvasElement;
  private sctx!: CanvasRenderingContext2D;
  private swave: number[] = [];
  private sTick = 0;

  private typed = false;
  private term!: HTMLElement;

  private sel = -1;
  private leaving = false;

  private actx: AudioContext | null = null;
  private master: GainNode | null = null;
  private nodesAudio: Array<OscillatorNode | AudioBufferSourceNode> = [];
  private audioOn = false;

  private static readonly FALLBACK = '/rota-desconhecida';

  private static readPath(): string {
    const raw = location.pathname + location.search + location.hash;
    let out = raw;
    try {
      out = decodeURIComponent(raw);
    } catch {
      out = raw;
    }
    if (!out || out === '/') out = NotFound.FALLBACK;
    return out.length > 120 ? out.slice(0, 117) + '…' : out;
  }

  ngAfterViewInit(): void {
    this.cursorRig();
    this.magnets();
    this.radarSetup();
    this.sparkSetup();
    this.bindKeys();
    this.bindRows();
    this.bindButtons();
    this.loop2d();
    gsap.set(['.nav', '.panel', '.row'], { opacity: 0 });
    this.rt.whenLoaded(() => {
      try {
        this.initGL();
      } catch {
        this.glReady = false;
      }
      this.scrollRig();
      this.runLoader();
    });
  }

  ngOnDestroy(): void {
    this.rt.destroy();
    anime.remove('*');
    this.stopAudio();
    if (this.renderer) {
      this.renderer.dispose();
      this.renderer.forceContextLoss();
    }
  }

  private cursorRig(): void {
    this.cur = $('#cur');
    this.curDot = $('#curDot');
    this.curLabel = $('#curLabel');
    this.rt.td.on<MouseEvent>(window, 'mousemove', (e) => {
      this.mx = e.clientX;
      this.my = e.clientY;
      this.glMouseT.x = (e.clientX - innerWidth / 2) / innerHeight;
      this.glMouseT.y = -(e.clientY - innerHeight / 2) / innerHeight;
    });
    const loop = () => {
      this.cx = lerp(this.cx, this.mx, 0.14);
      this.cy = lerp(this.cy, this.my, 0.14);
      this.dx = lerp(this.dx, this.mx, 0.42);
      this.dy = lerp(this.dy, this.my, 0.42);
      this.cur.style.transform = `translate(${this.cx}px,${this.cy}px)`;
      this.curDot.style.transform = `translate(${this.dx}px,${this.dy}px)`;
      this.curLabel.style.transform = `translate(${this.cx}px,${this.cy}px) translate(-50%,-50%)`;
      this.rt.td.raf(loop);
    };
    loop();
    $$('a,button,.row,.panel').forEach((el) => {
      this.rt.td.on(el, 'mouseenter', () => {
        this.cur.classList.add('on');
        const label = el.dataset.cur;
        if (label) {
          this.curLabel.textContent = label;
          gsap.to(this.curLabel, { opacity: 1, duration: 0.3 });
        }
      });
      this.rt.td.on(el, 'mouseleave', () => {
        this.cur.classList.remove('on');
        gsap.to(this.curLabel, { opacity: 0, duration: 0.25 });
      });
    });
  }

  private magnets(): void {
    $$('.mag').forEach((el) => {
      const x = gsap.quickTo(el, 'x', { duration: 0.5, ease: 'power3.out' });
      const y = gsap.quickTo(el, 'y', { duration: 0.5, ease: 'power3.out' });
      this.rt.td.on<MouseEvent>(el, 'mousemove', (e) => {
        const r = el.getBoundingClientRect();
        x((e.clientX - (r.left + r.width / 2)) * 0.28);
        y((e.clientY - (r.top + r.height / 2)) * 0.4);
      });
      this.rt.td.on(el, 'mouseleave', () => {
        x(0);
        y(0);
      });
    });
  }

  private initGL(): void {
    const cv = $<HTMLCanvasElement>('#gl');
    this.renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
    this.renderer.setSize(innerWidth, innerHeight);
    this.renderer.autoClear = false;

    this.bgScene = new THREE.Scene();
    this.bgCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.bgUni.uRes.value.set(innerWidth, innerHeight);
    const bgFrag = `
  precision highp float;
  uniform float uTime;uniform vec2 uRes;uniform vec2 uMouse;uniform float uScroll;uniform float uGlitch;
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
    for(int i=0;i<5;i++){v+=a*noise(p);p=m*p;a*=0.5;}
    return v;
  }
  void main(){
    vec2 uv=(gl_FragCoord.xy-0.5*uRes)/uRes.y;
    float band=floor(gl_FragCoord.y/8.0);
    float jitter=(hash(vec2(band,floor(uTime*14.0)))-0.5)*uGlitch*0.16;
    vec2 p=uv*1.35+vec2(jitter,0.0);
    float t=uTime*0.055+uScroll*0.5;
    vec2 q=vec2(fbm(p+vec2(0.0,t)),fbm(p+vec2(4.4,1.1)-t*0.7));
    float f=fbm(p+2.6*q+uScroll*0.8);
    float md=length(uv-uMouse);
    f+=0.055/(md*md+0.07)*0.2;
    float g=clamp(f*1.15-0.16,0.0,1.3);
    vec3 col=mix(vec3(0.014,0.014,0.018),vec3(0.085,0.086,0.10),pow(g,1.2));
    col+=vec3(0.10,0.105,0.13)*pow(clamp(g-0.60,0.0,1.0),2.0)*1.4;
    float iso=abs(fract(f*7.0)-0.5);
    col+=vec3(0.055,0.057,0.07)*smoothstep(0.03,0.0,iso-0.46);
    float warn=smoothstep(0.42,0.0,md)*uGlitch*0.5;
    col+=vec3(0.36,0.11,0.07)*warn;
    float vgn=1.0-0.5*dot(uv*0.8,uv*0.8);
    col*=vgn;
    col+=(hash(gl_FragCoord.xy+uTime)-0.5)*0.022;
    gl_FragColor=vec4(col,1.0);
  }`;
    this.bgScene.add(
      new THREE.Mesh(
        new THREE.PlaneGeometry(2, 2),
        new THREE.ShaderMaterial({
          uniforms: this.bgUni as unknown as Record<string, THREE.IUniform>,
          vertexShader: 'void main(){gl_Position=vec4(position.xy,0.0,1.0);}',
          fragmentShader: bgFrag,
          depthTest: false,
          depthWrite: false,
        }),
      ),
    );

    this.scene = new THREE.Scene();
    this.cam = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.1, 120);
    this.fitCam();

    const COUNT = innerWidth < 760 ? 7200 : 15000;
    const wide = innerWidth / innerHeight > 1.05;
    const target = this.sampleGlyph('404', COUNT, wide ? 4.5 : 4.8, wide ? 2.05 : 0, wide ? 0.62 : 1.2);
    const pos = new Float32Array(COUNT * 3);
    const rndA = new Float32Array(COUNT);
    const sc = new Float32Array(COUNT);
    for (let i = 0; i < COUNT; i++) {
      const r = 1.9 + Math.pow(Math.random(), 0.7) * 2.9;
      const th = Math.random() * Math.PI * 2;
      const ph = Math.acos(2 * Math.random() - 1);
      pos[i * 3] = Math.sin(ph) * Math.cos(th) * r;
      pos[i * 3 + 1] = Math.cos(ph) * r * 0.72;
      pos[i * 3 + 2] = Math.sin(ph) * Math.sin(th) * r * 0.6;
      rndA[i] = Math.random();
      sc[i] = 0.45 + Math.random() * 1.5;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('aTarget', new THREE.BufferAttribute(target, 3));
    geo.setAttribute('aRnd', new THREE.BufferAttribute(rndA, 1));
    geo.setAttribute('aScale', new THREE.BufferAttribute(sc, 1));

    this.dotUni.uSize.value = this.renderer.getPixelRatio();

    const vert = `
  uniform float uTime;uniform float uForm;uniform vec2 uMouse;uniform float uSize;
  uniform float uBurst;uniform float uGlitch;uniform float uScroll;
  attribute vec3 aTarget;attribute float aRnd;attribute float aScale;
  varying float vA;varying float vR;
  void main(){
    vec3 chaos=position;
    chaos+=vec3(sin(uTime*0.42+aRnd*33.0),cos(uTime*0.35+aRnd*21.0),sin(uTime*0.28+aRnd*11.0))
           *0.32*(0.25+aRnd);
    vec3 tgt=aTarget;
    tgt.z+=sin(uTime*0.75+aTarget.x*1.8+aRnd*6.0)*0.12;
    tgt.x+=sin(uTime*0.6+aTarget.y*2.2)*0.03;
    float lag=aRnd*0.4;
    float t=clamp((uForm-lag)/(1.0-lag),0.0,1.0);
    t=t*t*(3.0-2.0*t);
    vec3 p=mix(chaos,tgt,t);
    float band=step(0.5,fract(aRnd*9.0));
    p.x+=sin(uTime*7.0+aRnd*60.0)*uGlitch*0.55*band;
    p.y+=cos(uTime*5.0+aRnd*42.0)*uGlitch*0.18*(1.0-band);
    p+=normalize(p+vec3(0.0001))*uBurst*(0.5+aRnd*1.4);
    p.xy+=uMouse*0.55*(0.3+aRnd*0.9);
    p.z-=uScroll*3.2;
    p.y+=uScroll*0.7*(0.3+aRnd);
    vec4 mv=modelViewMatrix*vec4(p,1.0);
    gl_Position=projectionMatrix*mv;
    float d=length(mv.xyz);
    gl_PointSize=aScale*uSize*(150.0/d)*(0.35+aRnd*0.5)*0.135;
    vR=aRnd;
    vA=smoothstep(26.0,2.0,d)*(0.22+aRnd*0.6);
  }`;
    const frag = `
  precision highp float;
  uniform float uOpacity;uniform float uGlitch;
  varying float vA;varying float vR;
  void main(){
    vec2 c=gl_PointCoord-0.5;
    float d=length(c);
    if(d>0.5)discard;
    float a=smoothstep(0.5,0.04,d);
    vec3 col=mix(vec3(0.86,0.85,0.82),vec3(0.34,0.36,0.42),vR*0.78);
    if(vR>0.965)col=mix(col,vec3(0.91,0.31,0.23),0.7+uGlitch*0.3);
    if(vR<0.02)col=mix(col,vec3(0.44,0.71,1.0),0.55);
    gl_FragColor=vec4(col,a*vA*uOpacity);
  }`;

    this.dots = new THREE.Points(
      geo,
      new THREE.ShaderMaterial({
        uniforms: this.dotUni as unknown as Record<string, THREE.IUniform>,
        vertexShader: vert,
        fragmentShader: frag,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    this.scene.add(this.dots);
    this.glReady = true;

    this.rt.td.on(window, 'resize', () => {
      this.renderer.setSize(innerWidth, innerHeight);
      this.bgUni.uRes.value.set(innerWidth, innerHeight);
      this.cam.aspect = innerWidth / innerHeight;
      this.fitCam();
      ScrollTrigger.refresh();
    });

    this.renderGL();
  }

  private fitCam(): void {
    const half = 4.3;
    const aspect = Math.max(innerWidth / innerHeight, 0.35);
    const z = half / (Math.tan((50 * Math.PI) / 360) * aspect);
    this.cam.aspect = innerWidth / innerHeight;
    this.cam.position.z = Math.max(6.1, Math.min(z, 22));
    this.cam.updateProjectionMatrix();
  }

  private sampleGlyph(text: string, count: number, span: number, ox: number, oy: number): Float32Array {
    const W = 900;
    const H = 380;
    const cv = document.createElement('canvas');
    cv.width = W;
    cv.height = H;
    const ctx = cv.getContext('2d') as CanvasRenderingContext2D;
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `700 ${Math.round(H * 0.86)}px 'Chakra Petch','Inter',sans-serif`;
    ctx.fillText(text, W / 2, H / 2 + H * 0.02);
    const data = ctx.getImageData(0, 0, W, H).data;
    const hits: number[] = [];
    for (let y = 0; y < H; y += 2)
      for (let x = 0; x < W; x += 2) if (data[(y * W + x) * 4 + 3] > 130) hits.push(x, y);
    const out = new Float32Array(count * 3);
    const total = hits.length / 2;
    for (let i = 0; i < count; i++) {
      if (!total) {
        out[i * 3] = ox + rnd(-span / 2, span / 2);
        out[i * 3 + 1] = oy + rnd(-1.2, 1.2);
        out[i * 3 + 2] = rnd(-0.3, 0.3);
        continue;
      }
      const k = rndi(0, total) * 2;
      out[i * 3] = ox + (hits[k] / W - 0.5) * span + rnd(-0.014, 0.014);
      out[i * 3 + 1] = oy - (hits[k + 1] / H - 0.5) * span * (H / W) + rnd(-0.014, 0.014);
      out[i * 3 + 2] = rnd(-0.2, 0.2);
    }
    return out;
  }

  private renderGL(): void {
    this.rt.td.raf(() => this.renderGL());
    if (!this.glReady) return;
    const now = performance.now();
    const dt = Math.min((now - this.clock.last) / 1000, 0.05);
    this.clock.last = now;
    this.clock.t += dt;
    this.glMouse.x = lerp(this.glMouse.x, this.glMouseT.x, 0.05);
    this.glMouse.y = lerp(this.glMouse.y, this.glMouseT.y, 0.05);
    this.bgUni.uTime.value = this.clock.t;
    this.bgUni.uMouse.value.set(this.glMouse.x, this.glMouse.y);
    this.dotUni.uTime.value = this.clock.t;
    this.dotUni.uMouse.value.set(this.glMouse.x, this.glMouse.y);
    this.dots.rotation.y = lerp(this.dots.rotation.y, this.glMouse.x * 0.3, 0.05);
    this.dots.rotation.x = lerp(this.dots.rotation.x, this.glMouse.y * 0.22, 0.05);
    this.fade = lerp(this.fade, this.fadeTarget, 0.06);
    this.dotUni.uOpacity.value = this.glOpacity.v * this.fade;
    this.renderer.clear();
    this.renderer.render(this.bgScene, this.bgCam);
    this.renderer.render(this.scene, this.cam);
  }

  private runLoader(): void {
    const mark = $('#ldMark');
    const chars = [...(mark.textContent || '')].map((c) => {
      const s = document.createElement('span');
      s.textContent = c;
      return s;
    });
    mark.textContent = '';
    chars.forEach((s) => mark.appendChild(s));
    anime({
      targets: '#ldMark span',
      opacity: [0, 1],
      translateY: [12, 0],
      duration: 700,
      delay: anime.stagger(70),
      easing: 'easeOutExpo',
    });

    const o = { p: 0 };
    const bar = $('#ldBar');
    const pct = $('#ldPct');
    gsap.to(o, {
      p: 100,
      duration: 1.6,
      ease: 'power2.inOut',
      onUpdate: () => {
        bar.style.transform = `scaleX(${o.p / 100})`;
        pct.textContent = String(Math.round(o.p)).padStart(3, '0');
      },
      onComplete: () => {
        gsap
          .timeline()
          .to('#loader', { opacity: 0, duration: 0.45, ease: 'power2.inOut' })
          .set('#loader', { display: 'none' })
          .to('#ldCurtain i', { scaleY: 0, duration: 1, stagger: 0.07, ease: 'expo.inOut' }, 0.15)
          .add(() => this.intro(), 0.45);
      },
    });
  }

  private intro(): void {
    const tl = gsap.timeline();
    tl.to('.nav', { opacity: 1, duration: 0.9, ease: 'power2.out' }, 0)
      .from('.nav', { y: -18, duration: 1, ease: 'expo.out' }, 0)
      .to('#eyebrow', { opacity: 1, duration: 0.8 }, 0.1)
      .from('#eyebrow s', { scaleX: 0, transformOrigin: 'left', duration: 1, ease: 'expo.out' }, 0.1)
      .to('.big .g1', { opacity: 1, duration: 1.1, ease: 'expo.out' }, 0.2)
      .from('.big .g1', { scale: 1.14, y: 26, filter: 'blur(14px)', duration: 1.5, ease: 'expo.out' }, 0.2)
      .to('.ttl .ln i', { y: 0, duration: 1.3, stagger: 0.1, ease: 'expo.out' }, 0.55)
      .to('#lead', { opacity: 1, duration: 1 }, 0.9)
      .from('#lead', { y: 20, duration: 1.1, ease: 'expo.out' }, 0.9)
      .to('#pathbox', { opacity: 1, duration: 0.9 }, 1)
      .from('#pathbox', { y: 24, duration: 1.1, ease: 'expo.out' }, 1)
      .to('.btn', { opacity: 1, duration: 0.8, stagger: 0.1, ease: 'power2.out' }, 1.2)
      .from('.btn', { y: 16, duration: 0.9, stagger: 0.1, ease: 'expo.out' }, 1.2)
      .to('#hint', { opacity: 1, duration: 0.8 }, 1.6);

    gsap.to(this.glOpacity, { v: 1, duration: 1.6, ease: 'power2.out', delay: 0.3 });
    gsap.to(this.dotUni.uForm, { value: 1, duration: 2.6, ease: 'power3.inOut', delay: 0.5 });

    this.scramble($('#big1'), '404', 900, '0123456789');
    this.scramblePath();
    this.traceId();
    this.glitchLoop();
  }

  private scramble(el: HTMLElement, final: string, duration: number, pool = SCRAMBLE): void {
    const steps = Math.max(10, Math.round(duration / 42));
    const o = { i: 0 };
    gsap.killTweensOf(o);
    gsap.to(o, {
      i: steps,
      duration: duration / 1000,
      ease: 'none',
      onUpdate: () => {
        const p = o.i / steps;
        el.textContent = [...final]
          .map((c, k) => {
            if (c === ' ' || c === '/' || c === '.') return c;
            return k / final.length < p ? c : pool[rndi(0, pool.length)];
          })
          .join('');
      },
      onComplete: () => {
        el.textContent = final;
      },
    });
  }

  private scramblePath(): void {
    this.scramble($('#pathOut'), this.path, 1100);
    this.scramble($('#navPath'), this.path, 900);
    const state = $('#pathState');
    const words = ['varrendo…', 'sem rota', 'sem nó', 'inexistente'];
    words.forEach((w, i) =>
      this.rt.td.timeout(() => (state.textContent = w), 400 + i * 420),
    );
  }

  private traceId(): void {
    const el = $('#stTrace');
    const hex = '0123456789abcdef';
    const id = Array.from({ length: 12 }, () => hex[rndi(0, 16)]).join('');
    this.scramble(el, id, 1000, hex);
  }

  private glitchLoop(): void {
    const big = $('#big');
    const fire = () => {
      const hard = Math.random() > 0.62;
      big.classList.add('gl');
      gsap.to(this.bgUni.uGlitch, { value: hard ? 1 : 0.45, duration: 0.08 });
      gsap.to(this.dotUni.uGlitch, { value: hard ? 0.9 : 0.35, duration: 0.08 });
      anime({
        targets: '#big .g1',
        translateX: [0, rnd(-14, 14), rnd(-6, 6), 0],
        skewX: [0, rnd(-7, 7), 0],
        duration: hard ? 420 : 230,
        easing: 'steps(5)',
      });
      if (hard && this.audioOn) this.zap();
      this.rt.td.timeout(() => {
        big.classList.remove('gl');
        gsap.to(this.bgUni.uGlitch, { value: 0, duration: 0.45 });
        gsap.to(this.dotUni.uGlitch, { value: 0, duration: 0.45 });
      }, hard ? 300 : 170);
      this.rt.td.timeout(fire, rnd(2200, 5600));
    };
    this.rt.td.timeout(fire, 1600);
  }

  private scrollRig(): void {
    const fill = $('#railFill');
    ScrollTrigger.create({
      start: 0,
      end: 'max',
      onUpdate: (s) => {
        fill.style.transform = `scaleX(${s.progress})`;
      },
    });

    ScrollTrigger.create({
      trigger: '#hero',
      start: 'top top',
      end: 'bottom top',
      scrub: true,
      onUpdate: (s) => {
        const p = s.progress;
        this.bgUni.uScroll.value = p;
        this.dotUni.uScroll.value = p;
        this.dotUni.uForm.value = clamp(1 - p * 1.25, 0.08, 1);
        this.fadeTarget = 1 - p * 0.76;
      },
    });

    gsap.to('#big .g1', {
      scrollTrigger: { trigger: '#hero', start: 'top top', end: 'bottom top', scrub: true },
      y: -120,
      opacity: 0.12,
      letterSpacing: '0.08em',
      ease: 'none',
    });

    ScrollTrigger.create({
      trigger: '#diag',
      start: 'top 78%',
      once: true,
      onEnter: () => {
        gsap.to('#diag .panel', { opacity: 1, duration: 1, stagger: 0.12, ease: 'power2.out' });
        gsap.from('#diag .panel', { y: 34, duration: 1.2, stagger: 0.12, ease: 'expo.out' });
        gsap.from('#diag .sec-h', { opacity: 0, y: 24, duration: 1, ease: 'expo.out' });
        this.typeTerm();
        this.countStats();
        gsap.to(this.dotUni.uBurst, { value: 0.3, duration: 1.4, ease: 'power2.out' });
      },
    });

    ScrollTrigger.create({
      trigger: '#routes',
      start: 'top 76%',
      once: true,
      onEnter: () => {
        gsap.to('.row', { opacity: 1, duration: 0.9, stagger: 0.08, ease: 'power2.out' });
        gsap.from('.row', { y: 28, duration: 1, stagger: 0.08, ease: 'expo.out' });
        gsap.from('#routes .sec-h', { opacity: 0, y: 24, duration: 1, ease: 'expo.out' });
        anime({
          targets: '.row .tg',
          opacity: [0, 1],
          scale: [0.82, 1],
          duration: 560,
          delay: anime.stagger(16, { start: 320 }),
          easing: 'easeOutExpo',
        });
      },
    });
  }

  private countStats(): void {
    $$('[data-count]').forEach((el) => {
      const to = parseFloat(el.dataset.count || '0');
      const suffix = el.dataset.suffix || '';
      const o = { v: to === 0 ? 100 : 0 };
      gsap.to(o, {
        v: to,
        duration: 1.9,
        ease: 'power2.out',
        onUpdate: () => {
          el.textContent = Math.round(o.v) + suffix;
        },
      });
    });
  }

  private radarSetup(): void {
    this.radar = $<HTMLCanvasElement>('#radar');
    this.rctx = this.radar.getContext('2d') as CanvasRenderingContext2D;
    for (let i = 0; i < this.nodes; i++)
      this.rnodes.push({ a: Math.random() * Math.PI * 2, r: 0.26 + Math.random() * 0.68, hit: 0, seen: false });
    const resize = () => {
      const d = Math.min(devicePixelRatio, 2);
      const box = this.radar.getBoundingClientRect();
      const s = Math.max(120, box.width);
      this.rsize = s;
      this.radar.width = s * d;
      this.radar.height = s * d;
      this.rctx.setTransform(d, 0, 0, d, 0, 0);
    };
    resize();
    this.rt.td.on(window, 'resize', resize);
  }

  private sparkSetup(): void {
    this.spark = $<HTMLCanvasElement>('#spark');
    this.sctx = this.spark.getContext('2d') as CanvasRenderingContext2D;
    for (let i = 0; i < 90; i++) this.swave.push(0);
    const resize = () => {
      const d = Math.min(devicePixelRatio, 2);
      const box = this.spark.getBoundingClientRect();
      this.spark.width = Math.max(120, box.width) * d;
      this.spark.height = Math.max(40, box.height) * d;
      this.sctx.setTransform(d, 0, 0, d, 0, 0);
    };
    resize();
    this.rt.td.on(window, 'resize', resize);
  }

  private loop2d(): void {
    this.rt.td.raf(() => this.loop2d());
    this.drawRadar();
    this.drawSpark();
  }

  private drawRadar(): void {
    const s = this.rsize;
    if (!s) return;
    const ctx = this.rctx;
    const c = s / 2;
    const R = s * 0.42;
    ctx.clearRect(0, 0, s, s);

    ctx.strokeStyle = 'rgba(240,238,230,.1)';
    ctx.lineWidth = 1;
    for (let i = 1; i <= 4; i++) {
      ctx.beginPath();
      ctx.arc(c, c, (R * i) / 4, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(c - R, c);
    ctx.lineTo(c + R, c);
    ctx.moveTo(c, c - R);
    ctx.lineTo(c, c + R);
    ctx.stroke();

    this.sweep += 0.016;
    const grad = ctx.createConicGradient
      ? ctx.createConicGradient(this.sweep - 0.5, c, c)
      : null;
    if (grad) {
      grad.addColorStop(0, 'rgba(240,238,230,0)');
      grad.addColorStop(0.07, 'rgba(240,238,230,.05)');
      grad.addColorStop(0.135, 'rgba(240,238,230,.11)');
      grad.addColorStop(0.15, 'rgba(240,238,230,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(c, c, R, 0, Math.PI * 2);
      ctx.fill();
    }
    const lg = ctx.createLinearGradient(c, c, c + Math.cos(this.sweep) * R, c + Math.sin(this.sweep) * R);
    lg.addColorStop(0, 'rgba(240,238,230,.04)');
    lg.addColorStop(1, 'rgba(240,238,230,.4)');
    ctx.strokeStyle = lg;
    ctx.beginPath();
    ctx.moveTo(c, c);
    ctx.lineTo(c + Math.cos(this.sweep) * R, c + Math.sin(this.sweep) * R);
    ctx.stroke();

    const beam = ((this.sweep % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
    this.rnodes.forEach((n) => {
      const diff = Math.abs(((n.a - beam + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
      if (diff > Math.PI - 0.06) {
        n.hit = 1;
        if (!n.seen) {
          n.seen = true;
          this.rseen++;
          $('#radarCount').textContent = `${this.rseen} / ${this.nodes}`;
          if (this.audioOn) this.ping();
        }
      }
      n.hit *= 0.955;
      const x = c + Math.cos(n.a) * n.r * R;
      const y = c + Math.sin(n.a) * n.r * R;
      ctx.fillStyle = `rgba(240,238,230,${0.12 + n.hit * 0.75})`;
      ctx.beginPath();
      ctx.arc(x, y, 1.6 + n.hit * 2.2, 0, Math.PI * 2);
      ctx.fill();
      if (n.hit > 0.25) {
        ctx.strokeStyle = `rgba(240,238,230,${n.hit * 0.3})`;
        ctx.beginPath();
        ctx.arc(x, y, 4 + (1 - n.hit) * 14, 0, Math.PI * 2);
        ctx.stroke();
      }
    });

    const pulse = 0.55 + Math.sin(this.clock.t * 4) * 0.45;
    ctx.strokeStyle = `rgba(232,80,58,${0.35 + pulse * 0.5})`;
    ctx.lineWidth = 1.2;
    const k = 7 + pulse * 3;
    ctx.beginPath();
    ctx.moveTo(c - k, c - k);
    ctx.lineTo(c + k, c + k);
    ctx.moveTo(c + k, c - k);
    ctx.lineTo(c - k, c + k);
    ctx.stroke();
    ctx.strokeStyle = `rgba(232,80,58,${0.2 + pulse * 0.25})`;
    ctx.beginPath();
    ctx.arc(c, c, 13 + pulse * 4, 0, Math.PI * 2);
    ctx.stroke();
  }

  private drawSpark(): void {
    const ctx = this.sctx;
    if (!ctx) return;
    const w = this.spark.clientWidth || 200;
    const h = this.spark.clientHeight || 56;
    this.sTick++;
    if (this.sTick % 5 === 0) {
      const spike = Math.random() > 0.93 ? rnd(0.35, 0.95) : 0;
      this.swave.push(clamp(rnd(-0.1, 0.1) + spike, -1, 1));
      this.swave.shift();
      $('#sparkV').textContent = `${(-72 + rnd(0, 9)).toFixed(1)} dB`;
    }
    ctx.clearRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(240,238,230,.08)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, h / 2);
    ctx.lineTo(w, h / 2);
    ctx.stroke();

    const step = w / (this.swave.length - 1);
    ctx.beginPath();
    this.swave.forEach((v, i) => {
      const x = i * step;
      const y = h / 2 - v * (h / 2 - 3);
      if (!i) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = 'rgba(240,238,230,.6)';
    ctx.lineWidth = 1.3;
    ctx.stroke();
    ctx.lineTo(w, h / 2);
    ctx.lineTo(0, h / 2);
    ctx.closePath();
    ctx.fillStyle = 'rgba(240,238,230,.07)';
    ctx.fill();

    const last = this.swave[this.swave.length - 1];
    ctx.fillStyle = Math.abs(last) > 0.3 ? '#E8503A' : 'rgba(240,238,230,.8)';
    ctx.beginPath();
    ctx.arc(w - 1.5, h / 2 - last * (h / 2 - 3), 2.2, 0, Math.PI * 2);
    ctx.fill();
  }

  private typeTerm(): void {
    if (this.typed) return;
    this.typed = true;
    this.term = $('#term');
    const seg = this.path.split('/').filter(Boolean)[0] || 'rota-desconhecida';
    const lines: TermLine[] = [
      { cls: 'cmd', text: `$ sylux trace --path "${this.path}"`, wait: 140, speed: 14 },
      { cls: 'dim', text: '  resolvendo via edge-sao1 · anycast', wait: 220, speed: 8 },
      { cls: 'ok', text: '  ✓ handshake tls1.3 · 18ms', wait: 160, speed: 8 },
      { cls: 'ok', text: `  ✓ ${this.nodes} nós consultados · ${this.regions} regiões`, wait: 200, speed: 8 },
      { cls: 'err', text: `  ✕ nenhum nó declara o prefixo "/${seg}"`, wait: 260, speed: 12 },
      { cls: 'err', text: '  ✕ HTTP 404 · ROUTE_NOT_IN_MESH', wait: 320, speed: 14 },
      { cls: 'dim', text: '  sessão preservada · orquestrador estável', wait: 300, speed: 8 },
      { cls: 'cmd', text: '$ sylux route --suggest', wait: 180, speed: 14 },
      { cls: 'ok', text: '  → /        hub · cinco direções', wait: 90, speed: 7 },
      { cls: 'ok', text: '  → /orbit   webgl · 17k partículas', wait: 90, speed: 7 },
      { cls: 'ok', text: '  → /paper   editorial · objeto 3D', wait: 90, speed: 7 },
      { cls: 'ok', text: '  → /flux    shader · malha líquida', wait: 90, speed: 7 },
      { cls: 'ok', text: '  → /grid    console · topologia', wait: 90, speed: 7 },
      { cls: 'ok', text: '  → /echo    cinema · refração', wait: 220, speed: 7 },
      { cls: 'cmd', text: '$ sylux route --fallback hub', wait: 240, speed: 14 },
      { cls: 'dim', text: '  aguardando ⏎ para reconectar', wait: 0, speed: 16 },
    ];

    let li = 0;
    const nextLine = () => {
      if (li >= lines.length) {
        const cr = document.createElement('span');
        cr.className = 'cr';
        this.term.lastElementChild?.appendChild(cr);
        return;
      }
      const line = lines[li++];
      const el = document.createElement('div');
      el.className = `tl ${line.cls}`;
      this.term.appendChild(el);
      let ci = 0;
      const typeChar = () => {
        el.textContent = line.text.slice(0, ++ci);
        this.term.scrollTop = this.term.scrollHeight;
        if (ci < line.text.length) this.rt.td.timeout(typeChar, line.speed);
        else this.rt.td.timeout(nextLine, line.wait);
      };
      typeChar();
    };
    nextLine();
  }

  private rescan(): void {
    this.rnodes.forEach((n) => {
      n.seen = false;
      n.a = Math.random() * Math.PI * 2;
      n.r = 0.26 + Math.random() * 0.68;
    });
    this.rseen = 0;
    $('#radarCount').textContent = `0 / ${this.nodes}`;
    this.scramblePath();
    this.traceId();
    this.scramble($('#big1'), '404', 800, '0123456789');
    gsap.fromTo(this.dotUni.uBurst, { value: 1.4 }, { value: 0, duration: 1.8, ease: 'expo.out' });
    gsap.fromTo(this.dotUni.uForm, { value: 0.1 }, { value: 1, duration: 2.1, ease: 'power3.inOut' });
    gsap.fromTo(this.bgUni.uGlitch, { value: 1 }, { value: 0, duration: 0.9, ease: 'power2.out' });
    anime({
      targets: '#pathbox',
      translateX: [0, -8, 7, -4, 0],
      duration: 420,
      easing: 'easeOutQuad',
    });
    if (this.audioOn) this.zap();
  }

  private bindButtons(): void {
    this.rt.td.on($('#rescan'), 'click', () => this.rescan());
    this.rt.td.on($('#sndBtn'), 'click', () => this.toggleAudio());
    $$('[data-trans]').forEach((el) =>
      this.rt.td.on<MouseEvent>(el, 'click', (e) => {
        e.preventDefault();
        this.go(el.getAttribute('href') || PAGE_PATH.hub);
      }),
    );
  }

  private bindRows(): void {
    $$('.row').forEach((r) =>
      this.rt.td.on<MouseEvent>(r, 'click', (e) => {
        e.preventDefault();
        this.go(r.getAttribute('href') || PAGE_PATH.hub);
      }),
    );
  }

  private bindKeys(): void {
    this.rt.td.on<KeyboardEvent>(window, 'keydown', (e) => {
      const rows = $$('.row');
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        this.sel = (this.sel + (e.key === 'ArrowDown' ? 1 : -1) + rows.length) % rows.length;
        rows.forEach((r, i) => r.classList.toggle('sel', i === this.sel));
        rows[this.sel].scrollIntoView({ behavior: 'smooth', block: 'center' });
        if (this.audioOn) this.ping();
        return;
      }
      if (e.key === 'Enter') {
        const row = this.sel >= 0 ? rows[this.sel] : null;
        this.go(row ? row.getAttribute('href') || PAGE_PATH.hub : PAGE_PATH.hub);
        return;
      }
      if (e.key === 'Escape') {
        this.go(PAGE_PATH.hub);
        return;
      }
      if (e.key === 'r' || e.key === 'R') this.rescan();
      if (e.key === 's' || e.key === 'S') this.toggleAudio();
    });
  }

  private go(href: string): void {
    if (this.leaving) return;
    this.leaving = true;
    gsap.to(this.dotUni.uBurst, { value: 2.2, duration: 0.9, ease: 'power2.in' });
    gsap
      .timeline({ onComplete: () => this.rt.go(href) })
      .to('#pt i', { scaleY: 1, duration: 0.7, stagger: 0.055, ease: 'expo.inOut' })
      .to('#ptT', { opacity: 1, duration: 0.4 }, '-=.3')
      .fromTo(
        '#ptT',
        { letterSpacing: '.1em' },
        { letterSpacing: '.45em', duration: 0.7, ease: 'power2.out' },
        '<',
      );
  }

  private toggleAudio(): void {
    const btn = $('#sndBtn');
    if (!this.actx) {
      const Ctx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.actx = new Ctx();
      this.master = this.actx.createGain();
      this.master.gain.value = 0;
      const lp = this.actx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 540;
      lp.Q.value = 1.1;
      this.master.connect(lp);
      lp.connect(this.actx.destination);

      [49, 73.4, 98, 147].forEach((f, i) => {
        const o = this.actx!.createOscillator();
        o.type = i % 2 ? 'sine' : 'triangle';
        o.frequency.value = f;
        const g = this.actx!.createGain();
        g.gain.value = [0.32, 0.2, 0.14, 0.08][i];
        const lfo = this.actx!.createOscillator();
        lfo.frequency.value = 0.04 + i * 0.027;
        const lg = this.actx!.createGain();
        lg.gain.value = [0.14, 0.1, 0.07, 0.04][i];
        lfo.connect(lg);
        lg.connect(g.gain);
        o.connect(g);
        g.connect(this.master!);
        o.start();
        lfo.start();
        this.nodesAudio.push(o, lfo);
      });

      const len = Math.floor(this.actx.sampleRate * 2);
      const buf = this.actx.createBuffer(1, len, this.actx.sampleRate);
      const ch = buf.getChannelData(0);
      for (let i = 0; i < len; i++) ch[i] = (Math.random() * 2 - 1) * 0.5;
      const noise = this.actx.createBufferSource();
      noise.buffer = buf;
      noise.loop = true;
      const bp = this.actx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = 1400;
      bp.Q.value = 0.8;
      const ng = this.actx.createGain();
      ng.gain.value = 0.16;
      noise.connect(bp);
      bp.connect(ng);
      ng.connect(this.master);
      noise.start();
      this.nodesAudio.push(noise);

      this.rt.td.interval(() => {
        if (!this.audioOn || !this.actx || !this.master) return;
        const t = this.actx.currentTime;
        this.master.gain.setTargetAtTime(0.012, t, 0.05);
        this.master.gain.setTargetAtTime(0.09, t + 0.22, 0.3);
      }, 7400);
    }

    this.actx.resume();
    this.audioOn = !this.audioOn;
    btn.classList.toggle('on', this.audioOn);
    const t = this.actx.currentTime;
    this.master!.gain.cancelScheduledValues(t);
    this.master!.gain.setTargetAtTime(this.audioOn ? 0.09 : 0, t, this.audioOn ? 1.2 : 0.5);
  }

  private ping(): void {
    if (!this.actx || !this.master) return;
    const t = this.actx.currentTime;
    const o = this.actx.createOscillator();
    o.type = 'sine';
    o.frequency.value = rnd(900, 1500);
    const g = this.actx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.1, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
    o.connect(g);
    g.connect(this.actx.destination);
    o.start(t);
    o.stop(t + 0.32);
  }

  private zap(): void {
    if (!this.actx) return;
    const t = this.actx.currentTime;
    const len = Math.floor(this.actx.sampleRate * 0.18);
    const buf = this.actx.createBuffer(1, len, this.actx.sampleRate);
    const ch = buf.getChannelData(0);
    for (let i = 0; i < len; i++) ch[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.actx.createBufferSource();
    src.buffer = buf;
    const bp = this.actx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 2200;
    const g = this.actx.createGain();
    g.gain.value = 0.085;
    src.connect(bp);
    bp.connect(g);
    g.connect(this.actx.destination);
    src.start(t);
  }

  private stopAudio(): void {
    this.nodesAudio.forEach((n) => {
      try {
        n.stop();
      } catch {
        void 0;
      }
    });
    this.nodesAudio = [];
    if (this.actx) {
      this.actx.close();
      this.actx = null;
    }
    this.audioOn = false;
  }
}
