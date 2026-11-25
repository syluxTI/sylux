import { AfterViewInit, Component, OnDestroy, ViewEncapsulation } from '@angular/core';
import anime from 'animejs';
import { gsap } from 'gsap';
import { $, $$, lerp, rnd } from '../../core/dom';
import { PAGE_PATH } from '../../core/page-links';
import { PageRuntime } from '../../core/page-runtime';

interface HubProduct {
  n: string;
  name: string;
  what: string;
  who: string;
  d: string;
  g: string[];
  f: string | null;
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
  protected readonly products: HubProduct[] = [
    {
      n: '01',
      name: 'Pulse',
      what: 'CRM',
      who: 'Times comerciais, SDRs e atendimento',
      d: 'Funil, WhatsApp e automação de vendas num só lugar. Leads chegam do tráfego já qualificados pela IA, com histórico, score e próxima ação sugerida.',
      g: ['Funil', 'WhatsApp', 'Score por IA'],
      f: PAGE_PATH.orbit,
    },
    {
      n: '02',
      name: 'Atlas',
      what: 'ERP',
      who: 'Empresas que precisam de fiscal, compras e vendas integrados',
      d: 'Compras, vendas, fiscal e contabilidade conversando entre si. Emissão de notas, conciliação e relatórios em tempo real, moldados ao seu processo.',
      g: ['Fiscal', 'NF-e', 'Sob medida'],
      f: PAGE_PATH.paper,
    },
    {
      n: '03',
      name: 'Forge',
      what: 'MRP',
      who: 'Indústrias, fábricas e manufatura sob encomenda',
      d: 'Planejamento de produção, ordens, insumos e capacidade. Calcula o que comprar, quando produzir e onde está o gargalo antes de ele parar a linha.',
      g: ['Produção', 'Ordens', 'Insumos'],
      f: PAGE_PATH.grid,
    },
    {
      n: '04',
      name: 'Loop',
      what: 'BPM',
      who: 'Operações, qualidade e áreas com processo repetitivo',
      d: 'Desenho, automação e acompanhamento de processos. Cada etapa com dono, prazo e aprovação, sem planilha paralela e sem cobrança por e-mail.',
      g: ['Processos', 'Aprovações', 'SLA'],
      f: null,
    },
    {
      n: '05',
      name: 'Beacon',
      what: 'Gestor de tráfego',
      who: 'Negócios que investem em Meta, Google e TikTok Ads',
      d: 'Gestão de tráfego pago operada com IA. Campanhas, criativos e orçamento ajustados todo dia para custo por lead cair e a receita subir.',
      g: ['Meta Ads', 'Google Ads', 'IA'],
      f: null,
    },
    {
      n: '06',
      name: 'Lens',
      what: 'Auditoria financeira',
      who: 'CFOs, controllers, contadores e sócios',
      d: 'Varredura de lançamentos, conciliação e desvios. A IA cruza extrato, notas e razão e aponta onde o dinheiro está vazando, com evidência.',
      g: ['Conciliação', 'Desvios', 'Evidências'],
      f: PAGE_PATH.flux,
    },
    {
      n: '07',
      name: 'Nexus',
      what: 'Página de links e cartão digital',
      who: 'Profissionais, criadores, clínicas e marcas',
      d: 'Toda a sua presença num link só: redes, WhatsApp, catálogo, agenda e pagamentos. Página própria, métricas de clique e domínio personalizado.',
      g: ['Link único', 'Métricas', 'Domínio próprio'],
      f: null,
    },
    {
      n: '08',
      name: 'Gate',
      what: 'Credenciador de eventos',
      who: 'Produtores de eventos, congressos e feiras',
      d: 'Credenciamento, check-in por QR e controle de acesso em tempo real. Crachá impresso na hora, filas curtas e relatório de presença ao vivo.',
      g: ['QR Code', 'Check-in', 'Crachás'],
      f: null,
    },
    {
      n: '09',
      name: 'Blast',
      what: 'Disparador de WhatsApp',
      who: 'Marketing, vendas e cobrança',
      d: 'Disparos em massa com segmentação, variáveis e fila inteligente. Mensagens que chegam, respostas que caem no CRM e número protegido de bloqueio.',
      g: ['Massa', 'Segmentação', 'Anti-bloqueio'],
      f: null,
    },
    {
      n: '10',
      name: 'Pass',
      what: 'Bilheteria digital',
      who: 'Produtores, casas de show e eventos pagos',
      d: 'Venda de ingressos, pagamentos e repasse num fluxo só. Lotes, cupons, taxas transparentes e ingresso no celular validado pelo Gate.',
      g: ['Ingressos', 'Pagamentos', 'Lotes'],
      f: null,
    },
    {
      n: '11',
      name: 'Slot',
      what: 'Sistema de agendamento',
      who: 'Clínicas, salões, consultórios e prestadores de serviço',
      d: 'Agenda online com confirmação automática pelo WhatsApp, lembretes, encaixes e controle de faltas. O cliente marca sozinho, você só atende.',
      g: ['Agenda', 'Lembretes', 'Confirmação'],
      f: PAGE_PATH.echo,
    },
  ];

  protected open = -1;

  private readonly rt = new PageRuntime({ bodyClasses: ['light'] });
  private readonly hover = matchMedia('(hover:hover)');

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
  private rgb = '';

  ngAfterViewInit(): void {
    this.cursor();
    this.network();
    this.keyboard();
    this.magnetic();
    this.rt.td.on<MouseEvent>($('#mark'), 'click', (e) => this.theme(e));
    this.rt.td.on<PointerEvent>(document, 'pointerdown', (e) => {
      if (!(e.target as Element).closest('.pill')) this.open = -1;
    });
    gsap.set('#pt i', { scaleY: 1, transformOrigin: 'top' });
    gsap.set('#ptT', { opacity: 1, letterSpacing: '.45em' });
    this.rt.whenLoaded(() => this.reveal());
  }

  ngOnDestroy(): void {
    this.rt.destroy();
  }

  protected tap(i: number, e: Event): void {
    const p = this.products[i];
    if (p.f && (e.target as Element).closest('.popen')) {
      e.preventDefault();
      this.go(p.f);
      return;
    }
    this.open = this.open === i ? -1 : i;
  }

  private v(name: string): string {
    return getComputedStyle(document.body).getPropertyValue(name).trim();
  }

  private theme(e: MouseEvent): void {
    const light = document.body.classList.contains('light');
    const flip = () => {
      document.body.classList.toggle('light');
      this.rgb = this.v('--net');
    };
    if (!document.startViewTransition) return flip();
    const x = e.clientX,
      y = e.clientY,
      r = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
    const clip = [`circle(0 at ${x}px ${y}px)`, `circle(${r}px at ${x}px ${y}px)`];
    document.documentElement.classList.toggle('back', light);
    document.startViewTransition(flip).ready.then(() =>
      document.documentElement.animate(
        { clipPath: light ? clip.reverse() : clip },
        {
          duration: 1100,
          easing: 'cubic-bezier(.7,0,.2,1)',
          pseudoElement: light ? '::view-transition-old(root)' : '::view-transition-new(root)',
        },
      ),
    );
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
    this.rgb = this.v('--net');
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
            ctx.strokeStyle = `rgba(${this.rgb},${(1 - dd / (130 * d)) * 0.14})`;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
        ctx.fillStyle = `rgba(${this.rgb},.4)`;
        ctx.beginPath();
        ctx.arc(this.pts[i].x, this.pts[i].y, this.pts[i].r * d, 0, 7);
        ctx.fill();
      }
    };
    draw();
  }

  private magnetic(): void {
    if (!this.hover.matches) return;
    $$('.pill').forEach((pill) => {
      const tx = gsap.quickTo(pill, 'x', { duration: 0.6, ease: 'power3.out' });
      const ty = gsap.quickTo(pill, 'y', { duration: 0.6, ease: 'power3.out' });
      this.rt.td.on<MouseEvent>(pill, 'mousemove', (e) => {
        const r = pill.getBoundingClientRect();
        const px = e.clientX - r.left,
          py = e.clientY - r.top;
        pill.style.setProperty('--mx', `${px}px`);
        pill.style.setProperty('--my', `${py}px`);
        tx((px - r.width / 2) * 0.05);
        ty((py - r.height / 2) * 0.08);
      });
      this.rt.td.on(pill, 'mouseleave', () => {
        gsap.to(pill, { x: 0, y: 0, duration: 1.1, ease: 'elastic.out(1,.55)' });
      });
    });
  }

  private keyboard(): void {
    this.rt.td.on<KeyboardEvent>(window, 'keydown', (e) => {
      const n = this.products.length;
      if (
        e.key === 'ArrowDown' ||
        e.key === 'ArrowRight' ||
        e.key === 'ArrowUp' ||
        e.key === 'ArrowLeft'
      ) {
        e.preventDefault();
        const dir = e.key === 'ArrowDown' || e.key === 'ArrowRight' ? 1 : -1;
        this.open = (this.open + dir + n) % n;
        $$('.pill')[this.open]?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
      if (e.key === 'Escape') this.open = -1;
      if (e.key === 'Enter' && this.open >= 0) {
        const f = this.products[this.open].f;
        if (f) this.go(f);
      }
    });
  }

  private go(href: string): void {
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

  private reveal(): void {
    gsap
      .timeline()
      .to('#ptT', { opacity: 0, letterSpacing: '.6em', duration: 0.6, ease: 'power2.in' })
      .to('#pt i', { scaleY: 0, duration: 0.9, stagger: 0.055, ease: 'expo.inOut' }, '-=.2')
      .set('#pt i', { transformOrigin: 'bottom' })
      .add(() => this.intro(), '-=.55');
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
      .to('.pills-head', { opacity: 1, duration: 0.8 }, '-=.6')
      .from('.pills-head', { y: 14, duration: 0.9, ease: 'expo.out' }, '<')
      .to(
        '.pill-wrap',
        { opacity: 1, duration: 0.9, stagger: { each: 0.055, from: 'start' }, ease: 'expo.out' },
        '-=.6',
      )
      .from(
        '.pill-wrap',
        {
          y: 34,
          scale: 0.9,
          duration: 1.3,
          stagger: { each: 0.055, from: 'start' },
          ease: 'elastic.out(1,.75)',
        },
        '<',
      )
      .add(() => this.float(), '-=.9')
      .to('.foot', { opacity: 1, duration: 0.8 }, '-=.6');
    anime({
      targets: '.tg',
      opacity: [0, 1],
      scale: [0.8, 1],
      duration: 600,
      delay: anime.stagger(14, { start: 1500 }),
      easing: 'easeOutExpo',
    });
  }

  private float(): void {
    if (matchMedia('(prefers-reduced-motion:reduce)').matches) return;
    $$('.pill-wrap').forEach((w) => {
      gsap.to(w, {
        y: rnd(-4, 4),
        rotation: rnd(-0.35, 0.35),
        duration: rnd(3.2, 5.4),
        delay: rnd(0, 2),
        ease: 'sine.inOut',
        yoyo: true,
        repeat: -1,
      });
    });
  }
}
