import { AfterViewInit, Component, OnDestroy, ViewEncapsulation } from '@angular/core';
import anime from 'animejs';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import * as THREE from 'three';
import { $, $$, clamp, lerp, rndi } from '../../core/dom';
import { PAGE_PATH } from '../../core/page-links';
import { PageRuntime } from '../../core/page-runtime';

gsap.registerPlugin(ScrollTrigger);

interface SwitchPage {
  t: string;
  f: string;
}

interface Card {
  t: string;
  d: string;
  k: Array<[string, string]>;
}

@Component({
  selector: 'page-echo',
  templateUrl: './echo.html',
  styleUrl: './echo.css',
  encapsulation: ViewEncapsulation.None,
})
export class Echo implements AfterViewInit, OnDestroy {
  protected readonly here = PAGE_PATH.echo;
  protected readonly slides = ['Abertura', 'Tese', 'Produto', 'Trajetória', 'Clientes', 'Contato'];
  protected readonly pages: SwitchPage[] = [
    { t: '01 Orbit', f: PAGE_PATH.orbit },
    { t: '02 Paper', f: PAGE_PATH.paper },
    { t: '03 Flux', f: PAGE_PATH.flux },
    { t: '04 Grid', f: PAGE_PATH.grid },
    { t: '05 Echo', f: PAGE_PATH.echo },
    { t: 'Hub', f: PAGE_PATH.hub },
  ];

  private readonly CARDS: Card[] = [
    {
      t: 'Conductor',
      d: 'Compilador de intenção. Transforma uma descrição de resultado em um grafo executável de agentes, ferramentas e modelos — e recompila quando o contexto muda.',
      k: [
        ['Tempo de compilação', '612ms p50'],
        ['Nós por grafo', 'até 240'],
        ['Replanejamento', 'em voo'],
        ['Formato', 'declarativo'],
      ],
    },
    {
      t: 'Resonance',
      d: 'Camada de observação. Mede qualidade, custo e deriva semântica em cada execução e devolve o ajuste para o roteador antes que o usuário perceba.',
      k: [
        ['Traços/dia', '18M'],
        ['Detecção de deriva', '4 min'],
        ['Retenção', '90 dias'],
        ['Replay', 'determinístico'],
      ],
    },
    {
      t: 'Silence',
      d: 'Política de dado aplicada antes da saída. Residência por região, redação automática de PII e prova criptográfica de cada decisão tomada.',
      k: [
        ['Redações/min', '620'],
        ['Residências', 'BR · EU · US'],
        ['Assinatura', 'ed25519'],
        ['Certificações', 'SOC 2 · ISO 27001'],
      ],
    },
  ];

  private readonly FOCUS = [
    { x: 0, y: 0, z: 9 },
    { x: 2.6, y: 0.2, z: 11 },
    { x: -2.8, y: -0.3, z: 12 },
    { x: 2.4, y: 0.6, z: 13 },
    { x: -2.2, y: 0.2, z: 11.5 },
    { x: 0, y: 0, z: 7.4 },
  ];

  private readonly rt = new PageRuntime({ bodyClasses: ['lock'] });

  private cz!: HTMLElement;
  private czTxt!: HTMLElement;
  private mx = innerWidth / 2;
  private my = innerHeight / 2;
  private cxx = this.mx;
  private cyy = this.my;

  private R!: THREE.WebGLRenderer;
  private S!: THREE.Scene;
  private C!: THREE.PerspectiveCamera;
  private glass!: THREE.Mesh;
  private halo!: THREE.Mesh;
  private sparks!: THREE.Points;
  private glReady = false;
  private gm = { x: 0, y: 0 };
  private gt = { x: 0, y: 0 };
  private slideP = 0;
  private T = 0;
  private t0 = performance.now();
  private energy = 0;
  private slideFocus = { x: 0, y: 0, z: 9 };

  private audioCtx: AudioContext | null = null;
  private audioOn = false;
  private gainNode: GainNode | null = null;
  private oscs: OscillatorNode[] = [];

  private revealed = new Set<string>();
  private curSlide = 0;

  private md!: HTMLElement;
  private mdbg!: HTMLElement;
  private mdc!: HTMLElement;
  private mdb!: HTMLElement;

  ngAfterViewInit(): void {
    this.cz = $('#cz');
    this.czTxt = $('#czTxt');
    this.rt.td.on<MouseEvent>(window, 'mousemove', (e) => {
      this.mx = e.clientX;
      this.my = e.clientY;
    });
    this.czLoop();

    this.rt.td.on<MouseEvent>(window, 'mousemove', (e) => {
      this.gt.x = (e.clientX / innerWidth - 0.5) * 2;
      this.gt.y = -(e.clientY / innerHeight - 0.5) * 2;
    });
    this.rt.td.on(window, 'resize', () => {
      if (!this.glReady) return;
      this.C.aspect = innerWidth / innerHeight;
      this.C.updateProjectionMatrix();
      this.R.setSize(innerWidth, innerHeight);
    });

    this.rt.td.on($('#sndBtn'), 'click', () => this.toggleAudio());
    this.rt.td.on($('#topBtn'), 'click', () => $('#s1').scrollIntoView({ behavior: 'smooth' }));

    this.md = $('#md');
    this.mdbg = $('.md-bg', this.md);
    this.mdc = $('.md-card', this.md);
    this.mdb = $('#mdBody');
    this.rt.td.on<MouseEvent>(document, 'click', (e) => {
      const t = e.target as HTMLElement;
      if (t.closest('[data-modal]')) {
        e.preventDefault();
        this.openMd(this.contactHTML());
      }
      if (t.closest('[data-x]')) this.closeMd();
    });
    this.rt.td.on<KeyboardEvent>(window, 'keydown', (e) => {
      if (e.key === 'Escape' && this.md.classList.contains('open')) this.closeMd();
    });

    this.rt.td.on<MouseEvent>(document, 'click', (e) => {
      const a = (e.target as HTMLElement).closest<HTMLElement>('[data-trans]');
      if (!a) return;
      const href = a.getAttribute('href');
      if (!href || href.startsWith('#')) return;
      e.preventDefault();
      if (this.audioOn) this.toggleAudio();
      gsap
        .timeline({ onComplete: () => this.rt.go(href) })
        .to('#ptr', { clipPath: 'circle(150% at 50% 50%)', duration: 1, ease: 'expo.inOut' })
        .to('#ptrT', { opacity: 1, duration: 0.4 }, '-=.4');
    });

    document.body.classList.add('lock');
    this.rt.whenLoaded(() => {
      this.initGL();
      this.setupSlides();
      this.rail();
      this.quotes();
      this.bindCz();
      this.intro();
      ScrollTrigger.refresh();
    });
  }

  ngOnDestroy(): void {
    this.rt.destroy();
    anime.remove('*');
    this.oscs.forEach((o) => o.stop());
    if (this.audioCtx) this.audioCtx.close();
    if (this.R) {
      this.R.dispose();
      this.R.forceContextLoss();
    }
  }

  private czLoop(): void {
    this.cxx = lerp(this.cxx, this.mx, 0.14);
    this.cyy = lerp(this.cyy, this.my, 0.14);
    this.cz.style.transform = `translate(${this.cxx}px,${this.cyy}px)`;
    this.rt.td.raf(() => this.czLoop());
  }

  private bindCz(): void {
    $$('a,button,.tcard,.ritem,input,textarea').forEach((el) => {
      this.rt.td.on(el, 'mouseenter', () => {
        this.cz.classList.add('big');
        this.czTxt.textContent = el.dataset.cz || '';
      });
      this.rt.td.on(el, 'mouseleave', () => this.cz.classList.remove('big'));
    });
  }

  private cubeEnv(): THREE.CubeTexture {
    const faces: HTMLCanvasElement[] = [];
    const words = ['SYLUX', 'ECHO', 'SYLUX', 'OaaS', 'SYLUX', '·'];
    for (let i = 0; i < 6; i++) {
      const c = document.createElement('canvas');
      c.width = c.height = 512;
      const g = c.getContext('2d')!;
      const grd = g.createLinearGradient(0, 0, 0, 512);
      if (i === 2) {
        grd.addColorStop(0, '#e9e6dc');
        grd.addColorStop(1, '#9a978f');
      } else if (i === 3) {
        grd.addColorStop(0, '#0a0a0c');
        grd.addColorStop(1, '#1c1c20');
      } else {
        grd.addColorStop(0, '#1a1a1e');
        grd.addColorStop(0.45, '#4a4a50');
        grd.addColorStop(0.55, '#0e0e11');
        grd.addColorStop(1, '#050506');
      }
      g.fillStyle = grd;
      g.fillRect(0, 0, 512, 512);
      g.fillStyle = 'rgba(240,238,230,.9)';
      for (let k = 0; k < 4; k++) {
        const h = rndi(6, 26),
          y = rndi(40, 470);
        g.globalAlpha = 0.1 + Math.random() * 0.4;
        g.fillRect(0, y, 512, h);
      }
      g.globalAlpha = 1;
      g.save();
      g.translate(256, 256);
      g.rotate((i % 2 ? 1 : -1) * 0.12);
      g.font = '700 92px Syne, sans-serif';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillStyle = 'rgba(240,238,230,.85)';
      g.fillText(words[i], 0, 0);
      g.restore();
      faces.push(c);
    }
    const t = new THREE.CubeTexture(faces);
    t.mapping = THREE.CubeRefractionMapping;
    t.needsUpdate = true;
    return t;
  }

  private initGL(): void {
    this.R = new THREE.WebGLRenderer({ canvas: $<HTMLCanvasElement>('#gl'), antialias: true, alpha: true });
    this.R.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.R.setSize(innerWidth, innerHeight);
    this.S = new THREE.Scene();
    this.C = new THREE.PerspectiveCamera(42, innerWidth / innerHeight, 0.1, 100);
    this.C.position.z = 9;
    const env = this.cubeEnv();

    const geo = new THREE.IcosahedronGeometry(2.2, 1);
    const mat = new THREE.MeshPhongMaterial({
      color: 0xd9d7cf,
      envMap: env,
      refractionRatio: 0.92,
      reflectivity: 0.96,
      shininess: 120,
      specular: 0xffffff,
      flatShading: true,
      transparent: true,
      opacity: 0.92,
    });
    this.glass = new THREE.Mesh(geo, mat);
    this.S.add(this.glass);

    const wire = new THREE.Mesh(
      new THREE.IcosahedronGeometry(2.24, 1),
      new THREE.MeshBasicMaterial({ color: 0xf0eee6, wireframe: true, transparent: true, opacity: 0.1 }),
    );
    this.glass.add(wire);

    this.halo = new THREE.Mesh(
      new THREE.TorusGeometry(3.3, 0.008, 8, 180),
      new THREE.MeshBasicMaterial({ color: 0xf0eee6, transparent: true, opacity: 0.35 }),
    );
    this.halo.rotation.x = Math.PI / 2.6;
    this.S.add(this.halo);
    const halo2 = this.halo.clone();
    halo2.scale.setScalar(1.22);
    halo2.rotation.x = Math.PI / 1.9;
    halo2.rotation.y = 0.4;
    halo2.material = (this.halo.material as THREE.MeshBasicMaterial).clone();
    (halo2.material as THREE.MeshBasicMaterial).opacity = 0.18;
    this.S.add(halo2);
    this.halo.userData.b = halo2;

    const N = 2600;
    const pp = new Float32Array(N * 3),
      sz = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      const a = Math.random() * Math.PI * 2,
        r = 3.4 + Math.pow(Math.random(), 0.7) * 7;
      const y = (Math.random() - 0.5) * 7;
      pp[i * 3] = Math.cos(a) * r;
      pp[i * 3 + 1] = y;
      pp[i * 3 + 2] = Math.sin(a) * r;
      sz[i] = Math.random();
    }
    const sg = new THREE.BufferGeometry();
    sg.setAttribute('position', new THREE.BufferAttribute(pp, 3));
    this.sparks = new THREE.Points(
      sg,
      new THREE.PointsMaterial({
        color: 0xf0eee6,
        size: 0.028,
        transparent: true,
        opacity: 0.5,
        sizeAttenuation: true,
      }),
    );
    this.S.add(this.sparks);

    this.S.add(new THREE.AmbientLight(0xffffff, 0.5));
    const l1 = new THREE.PointLight(0xffffff, 1.6);
    l1.position.set(5, 5, 6);
    this.S.add(l1);
    const l2 = new THREE.PointLight(0xbfc4cc, 1.1);
    l2.position.set(-6, -3, 4);
    this.S.add(l2);
    const l3 = new THREE.DirectionalLight(0xffffff, 0.9);
    l3.position.set(0, 4, -6);
    this.S.add(l3);

    this.glReady = true;
    this.loopGL();
  }

  private loopGL(): void {
    this.rt.td.raf(() => this.loopGL());
    if (!this.glReady) return;
    const now = performance.now(),
      dt = Math.min((now - this.t0) / 1000, 0.05);
    this.t0 = now;
    this.T += dt;
    this.gm.x = lerp(this.gm.x, this.gt.x, 0.05);
    this.gm.y = lerp(this.gm.y, this.gt.y, 0.05);
    this.energy = lerp(this.energy, this.audioOn ? 1 : 0, 0.03);
    this.glass.rotation.y += dt * (0.14 + this.energy * 0.16);
    this.glass.rotation.x = lerp(this.glass.rotation.x, this.gm.y * 0.4 + Math.sin(this.T * 0.4) * 0.08, 0.05);
    this.glass.rotation.z = lerp(this.glass.rotation.z, this.gm.x * 0.2, 0.05);
    const pulse = 1 + Math.sin(this.T * 1.1) * 0.025 + this.energy * 0.06;
    this.glass.scale.setScalar(pulse * (1 + this.slideP * 0.12));
    this.glass.position.x = lerp(this.glass.position.x, this.gm.x * 0.5 + this.slideFocus.x, 0.05);
    this.glass.position.y = lerp(this.glass.position.y, this.gm.y * 0.35 + this.slideFocus.y, 0.05);
    this.C.position.z = lerp(this.C.position.z, this.slideFocus.z, 0.045);
    this.halo.rotation.z += dt * 0.1;
    this.halo.userData.b.rotation.z -= dt * 0.07;
    this.halo.position.copy(this.glass.position);
    this.halo.userData.b.position.copy(this.glass.position);
    this.sparks.rotation.y += dt * 0.016;
    this.sparks.rotation.x = this.gm.y * 0.06;
    this.R.render(this.S, this.C);
  }

  private toggleAudio(): void {
    const btn = $('#sndBtn');
    if (!this.audioCtx) {
      const Ctx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.audioCtx = new Ctx();
      this.gainNode = this.audioCtx.createGain();
      this.gainNode.gain.value = 0;
      const filter = this.audioCtx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 620;
      filter.Q.value = 1.4;
      this.gainNode.connect(filter);
      filter.connect(this.audioCtx.destination);
      [55, 82.4, 110, 164.8, 220].forEach((f, i) => {
        const o = this.audioCtx!.createOscillator();
        o.type = i % 2 ? 'sine' : 'triangle';
        o.frequency.value = f;
        const g = this.audioCtx!.createGain();
        g.gain.value = [0.3, 0.18, 0.22, 0.1, 0.07][i];
        const lfo = this.audioCtx!.createOscillator();
        lfo.frequency.value = 0.05 + i * 0.031;
        const lg = this.audioCtx!.createGain();
        lg.gain.value = [0.12, 0.08, 0.1, 0.05, 0.035][i];
        lfo.connect(lg);
        lg.connect(g.gain);
        lfo.start();
        o.connect(g);
        g.connect(this.gainNode!);
        o.start();
        this.oscs.push(o, lfo);
      });
    }
    this.audioCtx.resume();
    this.audioOn = !this.audioOn;
    btn.classList.toggle('active', this.audioOn);
    this.gainNode!.gain.cancelScheduledValues(this.audioCtx.currentTime);
    this.gainNode!.gain.setTargetAtTime(
      this.audioOn ? 0.085 : 0,
      this.audioCtx.currentTime,
      this.audioOn ? 1.6 : 0.7,
    );
    anime.remove('#eq b');
    if (this.audioOn) {
      anime({
        targets: '#eq b',
        height: () => [4, 4 + Math.random() * 10],
        duration: 620,
        direction: 'alternate',
        loop: true,
        delay: anime.stagger(90),
        easing: 'easeInOutSine',
      });
    } else {
      anime({ targets: '#eq b', height: 4, duration: 300, easing: 'easeOutQuad' });
    }
  }

  private intro(): void {
    const o = { v: 0 };
    const tl = gsap.timeline();
    tl.to('#introWord', { y: 0, duration: 1.4, ease: 'expo.out' })
      .to(
        o,
        {
          v: 100,
          duration: 2,
          ease: 'power2.inOut',
          onUpdate: () => {
            $('#introPct').textContent = String(Math.round(o.v)).padStart(2, '0');
          },
        },
        0,
      )
      .to('#introWord', { y: '-110%', duration: 0.9, ease: 'expo.inOut' }, '+=.15')
      .to('.intro-meta', { opacity: 0, duration: 0.4 }, '<')
      .set('#intro', { display: 'none' })
      .fromTo(
        '#iris',
        { clipPath: 'circle(150% at 50% 50%)' },
        { clipPath: 'circle(0% at 50% 50%)', duration: 1.3, ease: 'expo.inOut' },
      )
      .add(() => this.start(), '-=.95');
  }

  private start(): void {
    document.body.classList.remove('lock');
    gsap.to('#gl', { opacity: 1, duration: 2.2, ease: 'power2.out' });
    gsap.fromTo(this.C.position, { z: 20 }, { z: 9, duration: 3, ease: 'expo.out' });
    gsap.fromTo(this.glass.rotation, { y: -3 }, { y: 0, duration: 3.2, ease: 'expo.out' });
    this.revealSlide($('#s1'));
    gsap.to('.s1-cta,.scrolldown', { opacity: 1, duration: 1, stagger: 0.15, delay: 0.9, ease: 'power2.out' });
    gsap.from('.fabs .fb,.fab-main,.dots,.prog', {
      opacity: 0,
      y: 16,
      duration: 0.9,
      stagger: 0.08,
      delay: 1.1,
      ease: 'expo.out',
    });
  }

  private revealSlide(sec: HTMLElement): void {
    if (!sec || this.revealed.has(sec.id)) return;
    this.revealed.add(sec.id);
    gsap.to($$('.mskl i', sec), { y: 0, duration: 1.3, stagger: 0.1, ease: 'expo.out' });
    anime({
      targets: $$('[data-rv]', sec),
      opacity: [0, 1],
      translateY: [26, 0],
      duration: 900,
      delay: anime.stagger(80, { start: 180 }),
      easing: 'easeOutExpo',
    });
    if (sec.id === 's3')
      anime({
        targets: $$('.tcard', sec),
        opacity: [0, 1],
        translateY: [50, 0],
        duration: 1100,
        delay: anime.stagger(110, { start: 260 }),
        easing: 'easeOutExpo',
      });
    if (sec.id === 's4')
      anime({
        targets: $$('.ritem', sec),
        opacity: [0, 1],
        translateX: [46, 0],
        duration: 1000,
        delay: anime.stagger(90, { start: 260 }),
        easing: 'easeOutExpo',
      });
    if (sec.id === 's5')
      anime({
        targets: $$('.logos span', sec),
        opacity: [0, 0.5],
        translateY: [14, 0],
        duration: 800,
        delay: anime.stagger(60, { start: 400 }),
        easing: 'easeOutExpo',
      });
  }

  private setupSlides(): void {
    gsap.set('[data-rv]', { opacity: 0 });
    gsap.set('.tcard,.ritem', { opacity: 0 });
    $$('.slide').forEach((sec, i) => {
      ScrollTrigger.create({
        trigger: sec,
        start: 'top 60%',
        end: 'bottom 40%',
        onToggle: (s) => {
          if (!s.isActive) return;
          this.curSlide = i;
          this.revealSlide(sec);
          $$('#dots button').forEach((b, k) => b.classList.toggle('on', k === i));
          $('#progTxt').textContent = `${String(i + 1).padStart(2, '0')} / 06`;
          gsap.to(this.slideFocus, {
            x: this.FOCUS[i].x,
            y: this.FOCUS[i].y,
            z: this.FOCUS[i].z,
            duration: 1.6,
            ease: 'power2.inOut',
          });
        },
      });
      gsap.to($('.inner', sec), {
        y: -40,
        ease: 'none',
        scrollTrigger: { trigger: sec, start: 'top bottom', end: 'bottom top', scrub: 1 },
      });
    });
    ScrollTrigger.create({
      start: 0,
      end: 'max',
      onUpdate: (s) => {
        $<SVGCircleElement>('#progRing').style.strokeDashoffset = String(100 - s.progress * 100);
        this.slideP = s.progress;
      },
    });
    $$('#dots button').forEach((b) =>
      this.rt.td.on(b, 'click', () => {
        $('#s' + (+b.dataset.slide! + 1)).scrollIntoView({ behavior: 'smooth' });
      }),
    );
    $$('.top-r a,.cta-b').forEach((a) => {
      const h = a.getAttribute('href');
      if (h && h.startsWith('#') && h.length > 1)
        this.rt.td.on(a, 'click', (e) => {
          e.preventDefault();
          $(h).scrollIntoView({ behavior: 'smooth' });
        });
    });
    const th = $('#thesis');
    const ws = th.textContent!.trim().split(/\s+/);
    th.innerHTML = ws.map((w) => `<span class="w">${w}</span>`).join(' ');
    const wEls = $$('.w', th);
    ScrollTrigger.create({
      trigger: th,
      start: 'top 85%',
      end: 'bottom 55%',
      scrub: true,
      onUpdate: (s) => {
        const n = Math.round(s.progress * wEls.length);
        wEls.forEach((w, i) => w.classList.toggle('on', i < n));
      },
    });
    $$('.tcard').forEach((c) => {
      this.rt.td.on<MouseEvent>(c, 'mousemove', (e) => {
        const r = c.getBoundingClientRect();
        c.style.setProperty('--x', e.clientX - r.left + 'px');
        c.style.setProperty('--y', e.clientY - r.top + 'px');
      });
      this.rt.td.on(c, 'click', () => this.openCard(+c.dataset.card!));
    });
  }

  private rail(): void {
    const track = $('#railTrack'),
      prog = $('#railProg');
    let x = 0,
      target = 0,
      down = false,
      sx = 0,
      s0 = 0;
    const max = () => Math.max(0, track.scrollWidth - track.parentElement!.clientWidth);
    const upd = () => {
      x = lerp(x, target, 0.1);
      track.style.transform = `translate3d(${-x}px,0,0)`;
      const m = max();
      prog.style.transform = `translateX(${m ? (x / m) * 233 : 0}%)`;
      this.rt.td.raf(upd);
    };
    upd();
    this.rt.td.on<PointerEvent>(track, 'pointerdown', (e) => {
      down = true;
      sx = e.clientX;
      s0 = target;
    });
    this.rt.td.on(window, 'pointerup', () => (down = false));
    this.rt.td.on<PointerEvent>(window, 'pointermove', (e) => {
      if (down) target = clamp(s0 - (e.clientX - sx) * 1.5, 0, max());
    });
    this.rt.td.on($('#railNext'), 'click', () => (target = clamp(target + 300, 0, max())));
    this.rt.td.on($('#railPrev'), 'click', () => (target = clamp(target - 300, 0, max())));
  }

  private quotes(): void {
    const qs = $$('.qt'),
      btns = $$('#qnav button');
    let i = 0,
      timer = 0;
    const go = (n: number) => {
      if (n !== i) {
        qs[i].classList.remove('on');
        anime({ targets: qs[i], opacity: 0, translateY: -14, duration: 400, easing: 'easeInQuad' });
      }
      i = n;
      qs[i].classList.add('on');
      anime({ targets: qs[i], opacity: [0, 1], translateY: [16, 0], duration: 700, easing: 'easeOutExpo' });
      anime({
        targets: $$('blockquote,cite', qs[i]),
        opacity: [0, 1],
        translateY: [18, 0],
        duration: 800,
        delay: anime.stagger(90),
        easing: 'easeOutExpo',
      });
      btns.forEach((b, k) => {
        anime.remove($('i', b));
        $('i', b).style.transform = 'scaleX(0)';
        if (k === i) anime({ targets: $('i', b), scaleX: [0, 1], duration: 6000, easing: 'linear' });
      });
      clearTimeout(timer);
      timer = this.rt.td.timeout(() => go((i + 1) % qs.length), 6000);
    };
    btns.forEach((b, k) => this.rt.td.on(b, 'click', () => go(k)));
    ScrollTrigger.create({ trigger: '#s5', start: 'top 60%', once: true, onEnter: () => go(0) });
  }

  private openMd(html: string): void {
    this.mdb.innerHTML = html;
    this.md.classList.add('open');
    document.body.classList.add('lock');
    gsap.fromTo(this.mdbg, { opacity: 0 }, { opacity: 1, duration: 0.45 });
    gsap.fromTo(
      this.mdc,
      { opacity: 0, y: 42, scale: 0.95 },
      { opacity: 1, y: 0, scale: 1, duration: 0.9, ease: 'expo.out' },
    );
    anime({
      targets: this.mdc.querySelectorAll('h3,p,.kvv div,.ff,.sb'),
      opacity: [0, 1],
      translateY: [18, 0],
      duration: 700,
      delay: anime.stagger(50, { start: 130 }),
      easing: 'easeOutExpo',
    });
    this.bindFF();
    this.bindCz();
  }

  private closeMd(): void {
    document.body.classList.remove('lock');
    gsap.to(this.mdbg, { opacity: 0, duration: 0.35 });
    gsap.to(this.mdc, {
      opacity: 0,
      y: 30,
      scale: 0.96,
      duration: 0.4,
      ease: 'power2.in',
      onComplete: () => this.md.classList.remove('open'),
    });
  }

  private openCard(i: number): void {
    const c = this.CARDS[i];
    this.openMd(`<div class="kick" style="margin-bottom:10px">Instrumento 0${i + 1}</div><h3>${c.t}</h3><p>${c.d}</p>
   <div class="kvv" style="display:flex;flex-direction:column;font-size:13px">
   ${c.k
     .map(
       (k) => `<div style="display:flex;justify-content:space-between;gap:14px;padding:12px 0;border-bottom:1px solid var(--line)">
     <span style="color:var(--p3)">${k[0]}</span><span>${k[1]}</span></div>`,
     )
     .join('')}</div>
   <button class="sb" style="margin-top:24px" data-modal>Falar com a gente</button>`);
  }

  private contactHTML(): string {
    return `
  <div class="kick" style="margin-bottom:10px">Contato</div>
  <h3>Vamos ouvir<br>o seu eco.</h3>
  <p>Conte o que você está construindo. Respondemos em até 4 horas úteis com um plano concreto.</p>
  <form id="ff">
    <div class="ff"><input id="e1" type="text" required><label for="e1">Nome</label></div>
    <div class="ff"><input id="e2" type="email" required><label for="e2">E-mail corporativo</label></div>
    <div class="ff"><textarea id="e3"></textarea><label for="e3">O que você quer orquestrar?</label></div>
    <button class="sb" type="submit">Enviar</button>
  </form>`;
  }

  private bindFF(): void {
    $$<HTMLInputElement>('.ff input,.ff textarea').forEach((i) => {
      const f = i.closest('.ff')!;
      const u = () => f.classList.toggle('on', i.value.length > 0);
      this.rt.td.on(i, 'input', u);
      this.rt.td.on(i, 'blur', u);
    });
    const f = $('#ff');
    if (f)
      this.rt.td.on(f, 'submit', (e) => {
        e.preventDefault();
        const b = $('.sb', f);
        b.textContent = 'Enviando…';
        this.rt.td.timeout(() => {
          this.mdb.innerHTML = `<div style="text-align:center;padding:16px 0">
        <div style="width:70px;height:70px;border-radius:50%;border:1px solid var(--line);display:grid;place-items:center;margin:0 auto 22px">
        <svg id="ck" viewBox="0 0 24 24" style="width:28px;height:28px;stroke:var(--paper);fill:none;stroke-width:1.3;stroke-dasharray:40;stroke-dashoffset:40"><path d="M5 13l4 4L19 7"/></svg></div>
        <h3>Ecoou.</h3><p style="color:var(--p2);margin-top:12px">Recebemos sua mensagem. Em breve você ouve de volta.</p></div>`;
          anime({ targets: '#ck', strokeDashoffset: [40, 0], duration: 900, easing: 'easeOutExpo' });
          anime({
            targets: this.mdb.querySelectorAll('h3,p'),
            opacity: [0, 1],
            translateY: [14, 0],
            duration: 700,
            delay: anime.stagger(80, { start: 180 }),
            easing: 'easeOutExpo',
          });
          if (this.glReady)
            gsap.fromTo(
              this.glass.scale,
              { x: 1.5, y: 1.5, z: 1.5 },
              { x: 1, y: 1, z: 1, duration: 2, ease: 'elastic.out(1,.4)' },
            );
        }, 850);
      });
  }
}
