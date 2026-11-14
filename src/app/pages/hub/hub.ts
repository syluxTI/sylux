import { AfterViewInit, Component, OnDestroy, ViewEncapsulation } from '@angular/core';
import anime from 'animejs';
import { gsap } from 'gsap';
import { $, $$, lerp } from '../../core/dom';
import { PAGE_PATH } from '../../core/page-links';
import { PageRuntime } from '../../core/page-runtime';

interface HubPage {
  n: string;
  t: string;
  f: string;
  d: string;
  g: string[];
}

interface NetPoint {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
}

@Component({
  selector: 'page-hub',
  templateUrl: './hub.html',
  styleUrl: './hub.css',
  encapsulation: ViewEncapsulation.None,
})
export class Hub implements AfterViewInit, OnDestroy {
  protected readonly pages: HubPage[] = [
    {
      n: '01',
      t: 'Orbit',
      f: PAGE_PATH.orbit,
      d: 'Escuridão absoluta e um orbe de 17 mil partículas que colapsa em galáxia conforme você desce. Scroll horizontal fixado, cartões em vidro líquido, cursor magnético.',
      g: ['WebGL', 'Partículas', 'Scroll horizontal', 'Liquid glass'],
    },
    {
      n: '02',
      t: 'Paper',
      f: PAGE_PATH.paper,
      d: 'Luz, papel e um objeto de metal girando sob controle do scroll — e do seu arrasto. Editorial, silencioso, com dobras de página e filme embutido.',
      g: ['3D arrastável', 'Editorial', 'Parallax', 'Iframe'],
    },
    {
      n: '03',
      t: 'Flux',
      f: PAGE_PATH.flux,
      d: 'Um shader de ruído deformado ocupa a tela inteira e reage ao mouse. Seis cenas na horizontal com snap, menu radial e inversão de tema ao vivo.',
      g: ['Shader GLSL', 'Menu radial', 'Tema dinâmico', 'Snap'],
    },
    {
      n: '04',
      t: 'Grid',
      f: PAGE_PATH.grid,
      d: 'O console de operação: terminal que digita sozinho, topologia 3D que você gira e inspeciona, painel ao vivo e uma command palette em ⌘K.',
      g: ['Topologia 3D', 'Terminal', '⌘K', 'Dados ao vivo'],
    },
    {
      n: '05',
      t: 'Echo',
      f: PAGE_PATH.echo,
      d: 'Cinema: um sólido de vidro refrativo flutua enquanto os slides passam com snap vertical. Tem até um drone sonoro gerado em tempo real.',
      g: ['Refração', 'Slides', 'Web Audio', 'Carrossel'],
    },
  ];

  private readonly rt = new PageRuntime();

  private cur!: HTMLElement;
  private mx = innerWidth / 2;
  private my = innerHeight / 2;
  private cx = this.mx;
  private cy = this.my;

  private cv!: HTMLCanvasElement;
  private ctx!: CanvasRenderingContext2D;
  private W = 0;
  private H = 0;
  private pts: NetPoint[] = [];
  private pm = { x: -9999, y: -9999 };

  private prev!: HTMLElement;
  private pdivs: HTMLElement[] = [];
  private px = 0;
  private py = 0;
  private ptx = 0;
  private pty = 0;
  private prevOn = false;

  private sel = -1;

  ngAfterViewInit(): void {
    this.cursor();
    this.network();
    this.preview();
    this.keyboard();
    this.transitions();
    this.rt.whenLoaded(() => this.intro());
  }

  ngOnDestroy(): void {
    this.rt.destroy();
  }

  private cursor(): void {
    const cur = (this.cur = $('#cur'));
    this.rt.td.on<MouseEvent>(window, 'mousemove', (e) => {
      this.mx = e.clientX;
      this.my = e.clientY;
    });
    const loop = () => {
      this.cx = lerp(this.cx, this.mx, 0.15);
      this.cy = lerp(this.cy, this.my, 0.15);
      cur.style.transform = `translate(${this.cx}px,${this.cy}px)`;
      this.rt.td.raf(loop);
    };
    loop();
    $$('a,button').forEach((el) => {
      this.rt.td.on(el, 'mouseenter', () => cur.classList.add('on'));
      this.rt.td.on(el, 'mouseleave', () => cur.classList.remove('on'));
    });
  }

  private network(): void {
    const cv = (this.cv = $<HTMLCanvasElement>('#net'));
    const ctx = (this.ctx = cv.getContext('2d') as CanvasRenderingContext2D);
    const resize = () => {
      this.W = cv.width = innerWidth * Math.min(devicePixelRatio, 2);
      this.H = cv.height = innerHeight * Math.min(devicePixelRatio, 2);
      cv.style.width = innerWidth + 'px';
      cv.style.height = innerHeight + 'px';
      const n = Math.min(110, Math.floor(innerWidth / 14));
      this.pts = [];
      for (let i = 0; i < n; i++)
        this.pts.push({
          x: Math.random() * this.W,
          y: Math.random() * this.H,
          vx: (Math.random() - 0.5) * 0.22,
          vy: (Math.random() - 0.5) * 0.22,
          r: Math.random() * 1.5 + 0.5,
        });
    };
    resize();
    this.rt.td.on(window, 'resize', resize);
    this.rt.td.on<MouseEvent>(window, 'mousemove', (e) => {
      const d = Math.min(devicePixelRatio, 2);
      this.pm.x = e.clientX * d;
      this.pm.y = e.clientY * d;
    });
    const draw = () => {
      this.rt.td.raf(draw);
      ctx.clearRect(0, 0, this.W, this.H);
      const d = Math.min(devicePixelRatio, 2);
      this.pts.forEach((p) => {
        const dx = p.x - this.pm.x,
          dy = p.y - this.pm.y,
          dist = Math.hypot(dx, dy);
        if (dist < 160 * d) {
          p.vx += (dx / dist) * 0.03;
          p.vy += (dy / dist) * 0.03;
        }
        p.vx *= 0.992;
        p.vy *= 0.992;
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > this.W) p.vx *= -1;
        if (p.y < 0 || p.y > this.H) p.vy *= -1;
        p.x = Math.max(0, Math.min(this.W, p.x));
        p.y = Math.max(0, Math.min(this.H, p.y));
      });
      ctx.lineWidth = 1 * d;
      for (let i = 0; i < this.pts.length; i++) {
        for (let j = i + 1; j < this.pts.length; j++) {
          const a = this.pts[i],
            b = this.pts[j];
          const dd = Math.hypot(a.x - b.x, a.y - b.y);
          if (dd < 130 * d) {
            ctx.strokeStyle = `rgba(240,238,230,${(1 - dd / (130 * d)) * 0.14})`;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
        ctx.fillStyle = 'rgba(240,238,230,.4)';
        ctx.beginPath();
        ctx.arc(this.pts[i].x, this.pts[i].y, this.pts[i].r * d, 0, 7);
        ctx.fill();
      }
    };
    draw();
  }

  private preview(): void {
    const prev = (this.prev = $('#preview'));
    const pdivs = (this.pdivs = $$('#preview div'));
    const pl = () => {
      this.px = lerp(this.px, this.ptx, 0.12);
      this.py = lerp(this.py, this.pty, 0.12);
      prev.style.left = this.px + 'px';
      prev.style.top = this.py + 'px';
      this.rt.td.raf(pl);
    };
    pl();
    $$('.row').forEach((r) => {
      this.rt.td.on(r, 'mouseenter', () => {
        const i = +r.dataset.i!;
        pdivs.forEach((d, k) => d.classList.toggle('on', k === i));
        if (!this.prevOn) {
          this.prevOn = true;
          this.px = this.mx;
          this.py = this.my;
          gsap.to(prev, { opacity: 1, scale: 1, duration: 0.6, ease: 'expo.out' });
        }
      });
      this.rt.td.on(r, 'mouseleave', () => {
        this.prevOn = false;
        gsap.to(prev, { opacity: 0, scale: 0.9, duration: 0.35, ease: 'power2.in' });
      });
    });
    this.rt.td.on<MouseEvent>(window, 'mousemove', (e) => {
      this.ptx = e.clientX + 170;
      this.pty = e.clientY;
    });
  }

  private keyboard(): void {
    this.rt.td.on<KeyboardEvent>(window, 'keydown', (e) => {
      const rows = $$('.row');
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        this.sel = (this.sel + (e.key === 'ArrowDown' ? 1 : -1) + rows.length) % rows.length;
        rows.forEach((r, i) => {
          gsap.to($('.fill', r), { scaleY: i === this.sel ? 1 : 0, duration: 0.5, ease: 'power3.out' });
          gsap.to($('.tt', r), {
            x: i === this.sel ? 16 : 0,
            color: i === this.sel ? '#070708' : '#F0EEE6',
            duration: 0.5,
            ease: 'power3.out',
          });
          gsap.to([$('.nn', r), $('.desc', r)], { color: i === this.sel ? 'rgba(7,7,8,.6)' : '', duration: 0.4 });
        });
        if (this.sel >= 0) {
          this.pdivs.forEach((d, k) => d.classList.toggle('on', k === this.sel));
          const rr = rows[this.sel].getBoundingClientRect();
          this.ptx = innerWidth - 230;
          this.pty = rr.top + rr.height / 2;
          gsap.to(this.prev, { opacity: 1, scale: 1, duration: 0.5, ease: 'expo.out' });
        }
      }
      if (e.key === 'Enter' && this.sel >= 0) this.go($$('.row')[this.sel].getAttribute('href')!);
    });
  }

  private go(href: string): void {
    gsap
      .timeline({ onComplete: () => this.rt.go(href) })
      .to('#pt i', { scaleY: 1, duration: 0.7, stagger: 0.055, ease: 'expo.inOut' })
      .to('#ptT', { opacity: 1, duration: 0.4 }, '-=.3')
      .fromTo('#ptT', { letterSpacing: '.1em' }, { letterSpacing: '.45em', duration: 0.7, ease: 'power2.out' }, '<');
  }

  private transitions(): void {
    $$('.row').forEach((r) =>
      this.rt.td.on(r, 'click', (e) => {
        e.preventDefault();
        this.go(r.getAttribute('href')!);
      }),
    );
  }

  private intro(): void {
    const tl = gsap.timeline();
    tl.to('#mark', { opacity: 1, duration: 1.3, ease: 'expo.out' }, 0)
      .from('#mark', { y: 24, scale: 1.05, duration: 1.5, ease: 'expo.out' }, 0)
      .to('.head-meta', { opacity: 1, duration: 1 }, 0)
      .from('.head-meta', { y: 16, duration: 1, ease: 'expo.out' }, 0)
      .to('.hero .ln i', { y: 0, duration: 1.4, stagger: 0.11, ease: 'expo.out' }, 0.25)
      .to('#heroP', { opacity: 1, duration: 1, ease: 'power2.out' }, '-=.85')
      .from('#heroP', { y: 22, duration: 1.1, ease: 'expo.out' }, '<')
      .to('.row', { opacity: 1, duration: 0.9, stagger: 0.08, ease: 'expo.out' }, '-=.7')
      .from('.row', { y: 30, duration: 1, stagger: 0.08, ease: 'expo.out' }, '<')
      .to('.foot', { opacity: 1, duration: 0.8 }, '-=.4');
    anime({
      targets: '.tg',
      opacity: [0, 1],
      scale: [0.8, 1],
      duration: 600,
      delay: anime.stagger(18, { start: 1400 }),
      easing: 'easeOutExpo',
    });
  }
}
