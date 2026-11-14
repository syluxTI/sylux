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

interface Spec {
  k: string;
  v: string;
  d: Array<[string, string]>;
}

@Component({
  selector: 'page-paper',
  templateUrl: './paper.html',
  styleUrl: './paper.css',
  encapsulation: ViewEncapsulation.None,
})
export class Paper implements AfterViewInit, OnDestroy {
  protected readonly here = PAGE_PATH.paper;
  protected readonly pages: SwitchPage[] = [
    { n: '01', t: 'Orbit', d: 'Orbe de partículas · scroll horizontal', f: PAGE_PATH.orbit },
    { n: '02', t: 'Paper', d: 'Editorial claro · câmera 3D por scroll', f: PAGE_PATH.paper },
    { n: '03', t: 'Flux', d: 'Shader fluido · menu radial', f: PAGE_PATH.flux },
    { n: '04', t: 'Grid', d: 'Console OaaS · malha arrastável', f: PAGE_PATH.grid },
    { n: '05', t: 'Echo', d: 'Vidro refrativo · slides verticais', f: PAGE_PATH.echo },
  ];

  protected readonly specs: Spec[] = [
    {
      k: 'Latência',
      v: '140 ms de overhead p50',
      d: [
        ['p50', '140 ms'],
        ['p95', '310 ms'],
        ['p99', '640 ms'],
        ['Região', 'São Paulo · br-se1'],
      ],
    },
    {
      k: 'Modelos',
      v: '38 modelos em malha ativa',
      d: [
        ['Texto', '21 modelos'],
        ['Visão', '9 modelos'],
        ['Áudio', '5 modelos'],
        ['Embeddings', '3 modelos'],
      ],
    },
    {
      k: 'Disponibilidade',
      v: '99,99% com crédito em SLA',
      d: [
        ['SLA mensal', '99,99%'],
        ['Crédito', '10% por 0,1% abaixo'],
        ['Janela de manutenção', 'Zero downtime'],
        ['Status', 'status.sylux.io'],
      ],
    },
    {
      k: 'Conformidade',
      v: 'SOC 2 Tipo II · ISO 27001 · LGPD',
      d: [
        ['Residência', 'BR, EU, US'],
        ['Retenção', 'Configurável de 0 a 365 dias'],
        ['Criptografia', 'AES-256 em repouso'],
        ['PII', 'Redação automática'],
      ],
    },
    {
      k: 'Integração',
      v: 'SDK em 6 linguagens + OpenAPI',
      d: [
        ['Linguagens', 'TS, Python, Go, Rust, Java, Ruby'],
        ['Protocolos', 'REST, gRPC, SSE, WebSocket'],
        ['Compatibilidade', 'Drop-in OpenAI'],
        ['Tempo de setup', 'Abaixo de 9 minutos'],
      ],
    },
  ];

  private readonly rt = new PageRuntime({ bodyClasses: ['lock'] });

  private ring!: HTMLElement;
  private dot!: HTMLElement;
  private mx = innerWidth / 2;
  private my = innerHeight / 2;
  private rx = this.mx;
  private ry = this.my;
  private dx = this.mx;
  private dy = this.my;

  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private obj!: THREE.Group;
  private env!: THREE.CanvasTexture;
  private ready = false;
  private dragging = false;
  private dragX = 0;
  private dragVel = 0;
  private manualY = 0;
  private scrollRot = 0;
  private scrollY3 = 0;
  private scrollZ = 0;
  private tilt = { x: 0, y: 0 };
  private t0 = performance.now();
  private T = 0;

  private modal!: HTMLElement;
  private mbg!: HTMLElement;
  private sheet!: HTMLElement;
  private mBody!: HTMLElement;

  protected pad2(n: number): string {
    return String(n).padStart(2, '0');
  }

  ngAfterViewInit(): void {
    this.ring = $('#ring');
    this.dot = $('#dot');
    this.rt.td.on<MouseEvent>(window, 'mousemove', (e) => {
      this.mx = e.clientX;
      this.my = e.clientY;
    });
    this.cursorLoop();

    this.rt.td.on<MouseEvent>(window, 'mousemove', (e) => {
      this.tilt.x = (e.clientY / innerHeight - 0.5) * -0.3;
      this.tilt.y = (e.clientX / innerWidth - 0.5) * 0.42;
    });
    this.rt.td.on(window, 'resize', () => {
      if (!this.ready) return;
      this.camera.aspect = innerWidth / innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(innerWidth, innerHeight);
    });

    this.modal = $('#modal');
    this.mbg = $('.modal-bg', this.modal);
    this.sheet = $('.sheet', this.modal);
    this.mBody = $('#mBody');
    $$('[data-modal]').forEach((b) => this.rt.td.on(b, 'click', () => this.openModal(this.formHTML())));
    this.rt.td.on<MouseEvent>(this.modal, 'click', (e) => {
      if ((e.target as HTMLElement).closest('[data-close]')) this.closeModal();
    });
    this.rt.td.on<KeyboardEvent>(window, 'keydown', (e) => {
      if (e.key === 'Escape' && this.modal.classList.contains('show')) this.closeModal();
    });
    this.rt.td.on<MouseEvent>($('#specList'), 'click', (e) => {
      const r = (e.target as HTMLElement).closest<HTMLElement>('[data-spec]');
      if (!r) return;
      this.openModal(this.specHTML(+r.dataset.spec!));
    });

    document.body.classList.add('lock');
    this.rt.whenLoaded(() => {
      this.init3D();
      this.scrollSetup();
      this.filmSetup();
      this.fabSetup();
      this.transSetup();
      this.bindCursor();
      $$('.btn,.nav-btn,.fab-btn,.play').forEach((b) => this.magnetic(b, 0.28));
      this.loader();
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

  private cursorLoop(): void {
    this.rx = lerp(this.rx, this.mx, 0.14);
    this.ry = lerp(this.ry, this.my, 0.14);
    this.dx = lerp(this.dx, this.mx, 0.45);
    this.dy = lerp(this.dy, this.my, 0.45);
    this.ring.style.transform = `translate(${this.rx}px,${this.ry}px)`;
    this.dot.style.transform = `translate(${this.dx}px,${this.dy}px)`;
    this.rt.td.raf(() => this.cursorLoop());
  }

  private bindCursor(): void {
    $$('a,button,.spec-row,.panel,input,textarea,select').forEach((el) => {
      this.rt.td.on(el, 'mouseenter', () => this.ring.classList.add('big'));
      this.rt.td.on(el, 'mouseleave', () => this.ring.classList.remove('big'));
    });
  }

  private magnetic(el: HTMLElement, s = 0.32): void {
    let tx = 0,
      ty = 0,
      cx = 0,
      cy = 0,
      raf = false;
    const tick = () => {
      cx = lerp(cx, tx, 0.16);
      cy = lerp(cy, ty, 0.16);
      el.style.transform = `translate(${cx}px,${cy}px)`;
      if (Math.abs(cx - tx) > 0.1 || Math.abs(cy - ty) > 0.1) {
        raf = true;
        this.rt.td.raf(tick);
      } else {
        raf = false;
        el.style.transform = `translate(${tx}px,${ty}px)`;
      }
    };
    this.rt.td.on<MouseEvent>(el, 'mousemove', (e) => {
      const r = el.getBoundingClientRect();
      tx = (e.clientX - r.left - r.width / 2) * s;
      ty = (e.clientY - r.top - r.height / 2) * s;
      if (!raf) {
        raf = true;
        this.rt.td.raf(tick);
      }
    });
    this.rt.td.on(el, 'mouseleave', () => {
      tx = 0;
      ty = 0;
      if (!raf) {
        raf = true;
        this.rt.td.raf(tick);
      }
    });
  }

  private studioEnv(): THREE.CanvasTexture {
    const c = document.createElement('canvas');
    c.width = 512;
    c.height = 256;
    const g = c.getContext('2d')!;
    const grd = g.createLinearGradient(0, 0, 0, 256);
    grd.addColorStop(0, '#ffffff');
    grd.addColorStop(0.42, '#e8e5dc');
    grd.addColorStop(0.52, '#8e8c86');
    grd.addColorStop(1, '#2a2a28');
    g.fillStyle = grd;
    g.fillRect(0, 0, 512, 256);
    g.fillStyle = 'rgba(255,255,255,.95)';
    g.fillRect(60, 20, 120, 60);
    g.fillRect(330, 10, 110, 48);
    g.filter = 'blur(14px)';
    g.drawImage(c, 0, 0);
    const t = new THREE.CanvasTexture(c);
    t.mapping = THREE.EquirectangularReflectionMapping;
    return t;
  }

  private roundedPlate(w: number, h: number, d: number, r: number): THREE.ExtrudeGeometry {
    const sh = new THREE.Shape();
    const x = -w / 2,
      y = -h / 2;
    sh.moveTo(x + r, y);
    sh.lineTo(x + w - r, y);
    sh.quadraticCurveTo(x + w, y, x + w, y + r);
    sh.lineTo(x + w, y + h - r);
    sh.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    sh.lineTo(x + r, y + h);
    sh.quadraticCurveTo(x, y + h, x, y + h - r);
    sh.lineTo(x, y + r);
    sh.quadraticCurveTo(x, y, x + r, y);
    return new THREE.ExtrudeGeometry(sh, {
      depth: d,
      bevelEnabled: true,
      bevelSegments: 6,
      bevelSize: 0.035,
      bevelThickness: 0.035,
      curveSegments: 24,
    });
  }

  private init3D(): void {
    const cv = $<HTMLCanvasElement>('#gl');
    this.renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.renderer.setSize(innerWidth, innerHeight);
    this.renderer.outputEncoding = THREE.sRGBEncoding;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(38, innerWidth / innerHeight, 0.1, 60);
    this.camera.position.set(0, 0, 8.4);
    this.env = this.studioEnv();

    this.obj = new THREE.Group();

    const body = new THREE.Mesh(
      this.roundedPlate(2.5, 3.6, 0.34, 0.42),
      new THREE.MeshStandardMaterial({
        color: 0x101010,
        metalness: 0.92,
        roughness: 0.22,
        envMap: this.env,
        envMapIntensity: 1.5,
      }),
    );
    body.geometry.center();
    this.obj.add(body);

    const inlay = new THREE.Mesh(
      this.roundedPlate(2.08, 3.18, 0.06, 0.3),
      new THREE.MeshStandardMaterial({
        color: 0xf0eee6,
        metalness: 0.25,
        roughness: 0.42,
        envMap: this.env,
        envMapIntensity: 0.9,
      }),
    );
    inlay.geometry.center();
    inlay.position.z = 0.2;
    this.obj.add(inlay);

    const ringGeo = new THREE.TorusGeometry(0.56, 0.035, 24, 120);
    const ringMat = new THREE.MeshStandardMaterial({
      color: 0x0d0d0c,
      metalness: 0.95,
      roughness: 0.14,
      envMap: this.env,
      envMapIntensity: 1.6,
    });
    for (let i = 0; i < 3; i++) {
      const r = new THREE.Mesh(ringGeo, ringMat);
      r.scale.setScalar(1 + i * 0.42);
      r.position.z = 0.26 + i * 0.012;
      r.rotation.z = i * 0.6;
      r.userData.spin = (i % 2 ? -1 : 1) * (0.14 + i * 0.06);
      this.obj.add(r);
    }

    const edgeGeo = new THREE.TorusGeometry(1.46, 0.012, 12, 160);
    const edge = new THREE.Mesh(
      edgeGeo,
      new THREE.MeshBasicMaterial({ color: 0x0d0d0c, transparent: true, opacity: 0.22 }),
    );
    edge.rotation.x = Math.PI / 2.2;
    edge.scale.set(1, 1, 1);
    this.obj.add(edge);

    const dotsGeo = new THREE.BufferGeometry();
    const N = 700;
    const pos = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      const a = Math.random() * Math.PI * 2,
        r = 2.3 + Math.random() * 2.6;
      pos[i * 3] = Math.cos(a) * r;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 4.2;
      pos[i * 3 + 2] = Math.sin(a) * r;
    }
    dotsGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const dots = new THREE.Points(
      dotsGeo,
      new THREE.PointsMaterial({ color: 0x0d0d0c, size: 0.016, transparent: true, opacity: 0.45 }),
    );
    this.obj.add(dots);
    this.obj.userData.dots = dots;

    this.scene.add(this.obj);
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.42));
    const k = new THREE.DirectionalLight(0xffffff, 2.1);
    k.position.set(3, 5, 5);
    this.scene.add(k);
    const f = new THREE.DirectionalLight(0xffffff, 0.8);
    f.position.set(-5, -2, 3);
    this.scene.add(f);
    const rim = new THREE.DirectionalLight(0xffffff, 1.6);
    rim.position.set(-2, 3, -5);
    this.scene.add(rim);

    this.ready = true;
    this.render();
    const cv2 = $<HTMLCanvasElement>('#gl');
    cv2.style.pointerEvents = 'auto';
    this.rt.td.on<PointerEvent>(cv2, 'pointerdown', (e) => {
      this.dragging = true;
      this.dragX = e.clientX;
      this.ring.classList.add('drag');
    });
    this.rt.td.on(window, 'pointerup', () => {
      this.dragging = false;
      this.ring.classList.remove('drag');
    });
    this.rt.td.on<PointerEvent>(window, 'pointermove', (e) => {
      if (!this.dragging) return;
      const d = (e.clientX - this.dragX) * 0.0072;
      this.dragX = e.clientX;
      this.manualY += d;
      this.dragVel = d;
    });
  }

  private render(): void {
    this.rt.td.raf(() => this.render());
    if (!this.ready) return;
    const now = performance.now(),
      dt = Math.min((now - this.t0) / 1000, 0.05);
    this.t0 = now;
    this.T += dt;
    if (!this.dragging) {
      this.manualY += this.dragVel;
      this.dragVel *= 0.94;
    }
    this.obj.rotation.y = lerp(this.obj.rotation.y, this.scrollRot + this.manualY + this.tilt.y, 0.07);
    this.obj.rotation.x = lerp(this.obj.rotation.x, this.tilt.x + Math.sin(this.T * 0.4) * 0.04, 0.07);
    this.obj.position.y = lerp(this.obj.position.y, this.scrollY3 + Math.sin(this.T * 0.6) * 0.06, 0.07);
    this.obj.position.z = lerp(this.obj.position.z, this.scrollZ, 0.07);
    this.obj.children.forEach((c) => {
      if (c.userData.spin) c.rotation.z += dt * c.userData.spin;
    });
    if (this.obj.userData.dots) this.obj.userData.dots.rotation.y -= dt * 0.05;
    this.renderer.render(this.scene, this.camera);
  }

  private loader(): void {
    const tl = gsap.timeline();
    tl.to('#ldImg', { opacity: 1, y: 0, duration: 1.2, ease: 'expo.out' }, 0)
      .from('#ldImg', { scale: 1.14, duration: 1.6, ease: 'expo.out' }, 0)
      .to('#ldBar', { scaleX: 1, duration: 1.9, ease: 'power2.inOut' }, 0.2)
      .to('.ld-in', { opacity: 0, y: -24, duration: 0.6, ease: 'power2.in' }, '+=.1')
      .to('#fold i', { scaleY: 1, duration: 0.7, ease: 'expo.inOut' }, '-=.3')
      .set('#loader', { display: 'none' })
      .to(
        '#fold i',
        {
          scaleY: 0,
          duration: 0.95,
          ease: 'expo.inOut',
          onStart: () => {
            $$('#fold i')[0].style.transformOrigin = 'bottom';
            $$('#fold i')[1].style.transformOrigin = 'top';
          },
        },
        '+=.08',
      )
      .add(() => this.intro(), '-=.65');
  }

  private intro(): void {
    document.body.classList.remove('lock');
    gsap.to('#gl', { opacity: 1, duration: 2, ease: 'power2.out' });
    gsap.fromTo(this.camera.position, { z: 17 }, { z: 8.4, duration: 2.6, ease: 'expo.out' });
    gsap.fromTo(this.obj.rotation, { y: -2.2 }, { y: 0, duration: 2.8, ease: 'expo.out' });
    gsap.set('.hero-sub,.hero-cta', { y: 24 });
    const tl = gsap.timeline();
    tl.fromTo(
      '#heroMark',
      { opacity: 0, y: 40, scale: 1.06 },
      { opacity: 1, y: 0, scale: 1, duration: 1.8, ease: 'expo.out' },
      0,
    )
      .to('.hero .ln i', { y: 0, duration: 1.3, stagger: 0.1, ease: 'expo.out' }, 0.35)
      .to('.hero-sub', { opacity: 1, y: 0, duration: 1, ease: 'expo.out' }, '-=.9')
      .to('.hero-cta', { opacity: 1, y: 0, duration: 1, ease: 'expo.out' }, '-=.8')
      .to('.hero-note', { opacity: 1, duration: 0.8 }, '-=.5')
      .from('#fab', { scale: 0, opacity: 0, duration: 0.9, ease: 'back.out(1.7)' }, '-=.7');
  }

  private scrollSetup(): void {
    gsap.set('.reveal', { y: 28, opacity: 0 });
    $$('.reveal').forEach((el) =>
      ScrollTrigger.create({
        trigger: el,
        start: 'top 88%',
        once: true,
        onEnter: () => gsap.to(el, { y: 0, opacity: 1, duration: 1.1, ease: 'expo.out' }),
      }),
    );

    gsap.to('#heroMark', {
      y: -90,
      scale: 0.92,
      opacity: 0.25,
      ease: 'none',
      scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: 0.6 },
    });

    ScrollTrigger.create({
      trigger: '.stage',
      start: 'top bottom',
      end: 'bottom bottom',
      scrub: 1,
      onUpdate: (s) => {
        this.scrollRot = s.progress * Math.PI * 2.4;
        this.scrollZ = Math.sin(s.progress * Math.PI) * 1.6;
      },
    });
    ScrollTrigger.create({
      trigger: '.hero',
      start: 'top top',
      end: 'bottom top',
      scrub: 1,
      onUpdate: (s) => {
        this.scrollY3 = -s.progress * 0.4;
      },
    });
    ScrollTrigger.create({
      trigger: '.panels',
      start: 'top bottom',
      end: 'top center',
      scrub: 1,
      onUpdate: (s) => {
        if (this.camera) this.camera.position.x = s.progress * 2.6;
        this.scrollY3 = -0.4 - s.progress * 0.3;
      },
    });
    ScrollTrigger.create({
      trigger: '.panels',
      start: 'top center',
      end: 'bottom top',
      onToggle: (s) => gsap.to('#gl', { opacity: s.isActive ? 0.25 : 1, duration: 0.9 }),
    });
    ScrollTrigger.create({
      trigger: '.end',
      start: 'top 80%',
      onToggle: (s) => gsap.to('#gl', { opacity: s.isActive ? 0 : 0.25, duration: 0.7 }),
    });

    $$('.step-card').forEach((c) => {
      ScrollTrigger.create({
        trigger: c,
        start: 'top 78%',
        end: 'bottom 30%',
        onEnter: () => {
          gsap.to(c, { opacity: 1, y: 0, duration: 1.2, ease: 'expo.out' });
          gsap.to($('.bar i', c), { scaleX: 1, duration: 1.4, ease: 'expo.out', delay: 0.2 });
        },
        onLeaveBack: () => gsap.to(c, { opacity: 0, y: 40, duration: 0.6 }),
      });
    });

    const q = $('#quoteText'),
      words = q.textContent!.trim().split(/\s+/);
    q.innerHTML = words.map((w) => `<span class="w">${w}</span>`).join(' ');
    const ws = $$('.w', q);
    ScrollTrigger.create({
      trigger: q,
      start: 'top 80%',
      end: 'bottom 50%',
      scrub: true,
      onUpdate: (s) => {
        const n = Math.round(s.progress * ws.length);
        ws.forEach((w, i) => w.classList.toggle('lit', i < n));
      },
    });

    $$('.panel').forEach((p, i) => {
      gsap.from(p, {
        yPercent: 14 * (i + 1),
        opacity: 0,
        duration: 1.3,
        ease: 'expo.out',
        scrollTrigger: { trigger: '.panel-row', start: 'top 82%' },
        delay: i * 0.12,
      });
    });
    gsap.from('.panels-head h2', {
      y: 60,
      opacity: 0,
      duration: 1.3,
      ease: 'expo.out',
      scrollTrigger: { trigger: '.panels-head', start: 'top 85%' },
    });

    ScrollTrigger.create({ start: 60, onToggle: (s) => $('#nav').classList.toggle('stuck', s.isActive) });

    ScrollTrigger.create({
      trigger: '.end',
      start: 'top 75%',
      once: true,
      onEnter: () => gsap.to('.end .ln i', { y: 0, duration: 1.3, stagger: 0.1, ease: 'expo.out' }),
    });

    $$('.nav-mid a,[data-go],.hero-cta a').forEach((a) => {
      this.rt.td.on(a, 'click', (e) => {
        const h = a.getAttribute('href') || a.dataset.go;
        if (!h || !h.startsWith('#')) return;
        e.preventDefault();
        const el = $(h);
        if (!el) return;
        window.scrollTo({ top: el.getBoundingClientRect().top + scrollY - 40, behavior: 'smooth' });
      });
    });
  }

  private filmSetup(): void {
    const box = $('#filmBox'),
      frame = $<HTMLIFrameElement>('#filmFrame');
    this.rt.td.on($('#playBtn'), 'click', () => {
      frame.src = 'https://www.youtube.com/embed/ScMzIvxBSi4?autoplay=1&rel=0&modestbranding=1';
      box.classList.add('playing');
    });
    gsap.from(box, {
      scale: 0.9,
      opacity: 0,
      duration: 1.4,
      ease: 'expo.out',
      scrollTrigger: { trigger: box, start: 'top 82%' },
    });
    gsap.to(box, {
      yPercent: -6,
      ease: 'none',
      scrollTrigger: { trigger: box, start: 'top bottom', end: 'bottom top', scrub: 1 },
    });
  }

  private openModal(html: string): void {
    this.mBody.innerHTML = html;
    this.modal.classList.add('show');
    document.body.classList.add('lock');
    gsap.fromTo(this.mbg, { opacity: 0 }, { opacity: 1, duration: 0.45 });
    gsap.fromTo(
      this.sheet,
      { opacity: 0, y: 44, scale: 0.95 },
      { opacity: 1, y: 0, scale: 1, duration: 0.9, ease: 'expo.out' },
    );
    anime({
      targets: this.sheet.querySelectorAll('.fld,.sub,.spec-detail div,h3,p'),
      opacity: [0, 1],
      translateY: [18, 0],
      duration: 720,
      delay: anime.stagger(50, { start: 120 }),
      easing: 'easeOutExpo',
    });
    this.bindFields();
    this.bindCursor();
  }

  private closeModal(): void {
    document.body.classList.remove('lock');
    gsap.to(this.mbg, { opacity: 0, duration: 0.35 });
    gsap.to(this.sheet, {
      opacity: 0,
      y: 30,
      scale: 0.97,
      duration: 0.4,
      ease: 'power2.in',
      onComplete: () => this.modal.classList.remove('show'),
    });
  }

  private formHTML(): string {
    return `
  <div class="kicker">Acesso antecipado</div>
  <h3>Reserve seu<br>lugar na malha.</h3>
  <p>Enviamos credenciais em até 48h para equipes aprovadas. Sem cartão.</p>
  <form id="form">
    <div class="fld"><input type="text" required id="n1"><label for="n1">Nome</label></div>
    <div class="fld"><input type="email" required id="n2"><label for="n2">E-mail corporativo</label></div>
    <div class="fld"><input type="text" id="n3"><label for="n3">Empresa</label></div>
    <div class="fld"><textarea id="n4"></textarea><label for="n4">Qual carga você quer mover?</label></div>
    <button class="sub" type="submit">Enviar solicitação</button>
  </form>`;
  }

  private specHTML(i: number): string {
    const s = this.specs[i];
    return `<div class="kicker">${s.k}</div><h3>${s.v}</h3>
   <p>Números medidos na malha de produção nos últimos 90 dias.</p>
   <div class="spec-detail">${s.d.map((d) => `<div><span>${d[0]}</span><span>${d[1]}</span></div>`).join('')}</div>`;
  }

  private bindFields(): void {
    $$<HTMLInputElement>('.fld input,.fld textarea').forEach((i) => {
      const f = i.closest('.fld')!;
      const u = () => f.classList.toggle('on', i.value.length > 0);
      this.rt.td.on(i, 'input', u);
      this.rt.td.on(i, 'blur', u);
    });
    const f = $('#form');
    if (f)
      this.rt.td.on(f, 'submit', (e) => {
        e.preventDefault();
        const b = $('.sub', f);
        b.textContent = 'Enviando…';
        this.rt.td.timeout(() => {
          this.mBody.innerHTML = `<div style="text-align:center;padding:14px 0">
        <div style="width:66px;height:66px;border-radius:50%;border:1px solid var(--line);display:grid;place-items:center;margin:0 auto 20px">
        <svg id="ck" viewBox="0 0 24 24" style="width:26px;height:26px;stroke:var(--ink);fill:none;stroke-width:1.4;stroke-dasharray:40;stroke-dashoffset:40"><path d="M5 13l4 4L19 7"/></svg></div>
        <h3 style="margin-bottom:10px">Solicitação enviada.</h3>
        <p style="color:var(--ink-2);font-size:14px;line-height:1.6">Você entrou na fila de acesso antecipado. Acompanhe seu e-mail.</p></div>`;
          anime({ targets: '#ck', strokeDashoffset: [40, 0], duration: 900, easing: 'easeOutExpo' });
          anime({
            targets: this.mBody.querySelectorAll('h3,p'),
            opacity: [0, 1],
            translateY: [14, 0],
            duration: 700,
            delay: anime.stagger(80, { start: 180 }),
            easing: 'easeOutExpo',
          });
        }, 850);
      });
  }

  private fabSetup(): void {
    const fab = $('#fab'),
      btn = $('#fabBtn'),
      items = $$('#fabPop button');
    let on = false;
    this.rt.td.on(btn, 'click', () => {
      on = !on;
      fab.classList.toggle('on', on);
      anime.remove(items);
      anime({
        targets: items,
        opacity: on ? [0, 1] : 0,
        translateY: on ? [14, 0] : 14,
        scale: on ? [0.9, 1] : 0.9,
        duration: on ? 620 : 300,
        delay: anime.stagger(55, { from: on ? 'last' : 'first' }),
        easing: on ? 'spring(1,90,12,0)' : 'easeInQuad',
      });
    });
    items.forEach((i) =>
      this.rt.td.on(i, 'click', () => {
        if (i.dataset.top) window.scrollTo({ top: 0, behavior: 'smooth' });
        if (i.dataset.go) {
          const el = $(i.dataset.go);
          if (el) window.scrollTo({ top: el.getBoundingClientRect().top + scrollY - 40, behavior: 'smooth' });
        }
        if (i.dataset.modal !== undefined && i.hasAttribute('data-modal')) return;
        btn.click();
      }),
    );
  }

  private transSetup(): void {
    const bars = $$('#pt i'),
      mark = $('#ptMark');
    $$('[data-trans]').forEach((a) =>
      this.rt.td.on(a, 'click', (e) => {
        const href = a.getAttribute('href');
        if (!href || href.startsWith('#')) return;
        e.preventDefault();
        gsap
          .timeline({ onComplete: () => this.rt.go(href) })
          .to(bars, { scaleY: 1, duration: 0.72, ease: 'expo.inOut' })
          .to(mark, { opacity: 1, duration: 0.4 }, '-=.25')
          .fromTo(mark, { scale: 0.9 }, { scale: 1, duration: 0.7, ease: 'power2.out' }, '<');
      }),
    );
  }
}
