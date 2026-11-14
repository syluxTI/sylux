import { AfterViewInit, Component, OnDestroy, ViewEncapsulation } from '@angular/core';
import anime from 'animejs';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import * as THREE from 'three';
import { $, $$, lerp, rnd } from '../../core/dom';
import { PAGE_PATH } from '../../core/page-links';
import { PageRuntime } from '../../core/page-runtime';

gsap.registerPlugin(ScrollTrigger);

interface SwitchPage {
  n: string;
  t: string;
  d: string;
  f: string;
}

interface TopoNode {
  id: string;
  label: string;
  type: 'core' | 'ok' | 'warn' | 'tool';
  det: Array<[string, string]>;
}

interface Cmd {
  g: string;
  ic: string;
  t: string;
  k: string;
  s?: string;
  a?: string;
  h?: string;
}

interface Pulse {
  e: number;
  p: number;
  s: number;
}

@Component({
  selector: 'page-grid',
  templateUrl: './grid.html',
  styleUrl: './grid.css',
  encapsulation: ViewEncapsulation.None,
})
export class Grid implements AfterViewInit, OnDestroy {
  protected readonly here = PAGE_PATH.grid;
  protected readonly pages: SwitchPage[] = [
    { n: '01', t: 'Orbit', d: 'Orbe de partículas', f: PAGE_PATH.orbit },
    { n: '02', t: 'Paper', d: 'Editorial claro', f: PAGE_PATH.paper },
    { n: '03', t: 'Flux', d: 'Shader fluido', f: PAGE_PATH.flux },
    { n: '04', t: 'Grid', d: 'Console OaaS', f: PAGE_PATH.grid },
    { n: '05', t: 'Echo', d: 'Vidro refrativo', f: PAGE_PATH.echo },
  ];

  private readonly BOOT: Array<[string, string]> = [
    ['init', 'plano de controle sylux v4.2.1'],
    ['auth', 'credenciais verificadas'],
    ['mesh', '38 modelos registrados'],
    ['policy', '14 políticas compiladas'],
    ['region', 'br-se1 · eu-west1 · us-east2'],
    ['ready', 'console disponível'],
  ];

  private readonly TERMS: Array<Array<[string, string]>> = [
    [
      ['$ ', 'sylux deploy --project atlas --policy custo-primeiro'],
      ['d', '→ compilando grafo de intenção…'],
      ['d', '→ 7 agentes · 23 ferramentas · 4 políticas'],
      ['p', '✓ grafo validado em 612ms'],
      ['d', '→ resolvendo rotas por modelo'],
      ['hl', '  chat.default    → mistral-l · R$ 1,80/M · p50 120ms'],
      ['hl', '  chat.complex    → opus-5    · R$ 9,40/M · p50 410ms'],
      ['hl', '  embed.docs      → bge-m3    · R$ 0,06/M · p50  28ms'],
      ['p', '✓ publicado em br-se1, eu-west1'],
      ['d', '  endpoint: https://api.sylux.io/v1/atlas'],
      ['p', '✓ pronto. 0 downtime.'],
    ],
    [
      ['$ ', 'sylux trace exec_8f21c4 --replay'],
      ['d', '→ carregando traço assinado…'],
      ['hl', '  passo 1  intent.parse        18ms   ok'],
      ['hl', '  passo 2  router.select       11ms   mistral-l'],
      ['hl', '  passo 3  tool.search         204ms  4 resultados'],
      ['w', '  passo 4  tool.sql             TIMEOUT após 3000ms'],
      ['d', '→ fallback acionado por política'],
      ['hl', '  passo 5  tool.sql.replica    142ms  ok'],
      ['p', '✓ replay idêntico ao original (hash a91f…)'],
      ['d', '  custo total: R$ 0,0241 · 14.302 tokens'],
    ],
    [
      ['$ ', 'sylux cost --window 30d --group rota'],
      ['d', '→ agregando 4,2B de tokens…'],
      ['hl', '  chat.default   R$ 18.420   −64%'],
      ['hl', '  chat.complex   R$ 21.880   −38%'],
      ['hl', '  embed.docs     R$  2.140   −71%'],
      ['hl', '  vision.ocr     R$  5.760   −52%'],
      ['d', '→ simulando política alternativa…'],
      ['p', '✓ economia projetada: R$ 7.410/mês'],
      ['w', '! 2 rotas acima do orçamento definido'],
      ['d', '  execute: sylux policy apply budget-guard'],
    ],
  ];

  private readonly LOG_MSG: Array<[string, string]> = [
    ['i', 'router.select  mistral-l  conf 0.94'],
    ['i', 'tool.search    204ms  4 hits'],
    ['i', 'policy.pii     3 campos redigidos'],
    ['w', 'provider.gx    latência acima do alvo'],
    ['i', 'cache.hit      embed.docs  0ms'],
    ['i', 'exec.complete  14.302 tokens'],
    ['i', 'router.select  opus-5  conf 0.88'],
    ['w', 'budget.guard   rota chat.complex 82%'],
    ['i', 'region.shift   eu-west1 → br-se1'],
    ['i', 'trace.sign     hash a91f3c'],
    ['i', 'agent.resume   checkpoint 7/12'],
    ['i', 'vault.apply    residência br'],
  ];

  private readonly NODES: TopoNode[] = [
    {
      id: 'router',
      label: 'Mesh Router',
      type: 'core',
      det: [
        ['Decisões/s', '14.280'],
        ['Modelos', '38'],
        ['Latência', '11ms'],
        ['Versão', '4.2.1'],
      ],
    },
    {
      id: 'mistral',
      label: 'mistral-large',
      type: 'ok',
      det: [
        ['Tráfego', '38%'],
        ['p50', '120ms'],
        ['Custo/1M', 'R$ 1,80'],
        ['Região', 'br-se1'],
      ],
    },
    {
      id: 'opus',
      label: 'opus-5',
      type: 'ok',
      det: [
        ['Tráfego', '21%'],
        ['p50', '410ms'],
        ['Custo/1M', 'R$ 9,40'],
        ['Região', 'us-east2'],
      ],
    },
    {
      id: 'bge',
      label: 'bge-m3',
      type: 'ok',
      det: [
        ['Tráfego', '17%'],
        ['p50', '28ms'],
        ['Custo/1M', 'R$ 0,06'],
        ['Região', 'br-se1'],
      ],
    },
    {
      id: 'gx',
      label: 'provider-gx',
      type: 'warn',
      det: [
        ['Tráfego', '4%'],
        ['p50', '980ms'],
        ['Estado', 'degradado'],
        ['Ação', 'fallback ativo'],
      ],
    },
    {
      id: 'sql',
      label: 'tool.sql',
      type: 'tool',
      det: [
        ['Chamadas/min', '2.140'],
        ['p50', '142ms'],
        ['Sandbox', 'isolado'],
        ['Política', 'somente leitura'],
      ],
    },
    {
      id: 'search',
      label: 'tool.search',
      type: 'tool',
      det: [
        ['Chamadas/min', '3.890'],
        ['p50', '204ms'],
        ['Índice', 'vetorial'],
        ['Cache', '81% hit'],
      ],
    },
    {
      id: 'vault',
      label: 'vault.policy',
      type: 'core',
      det: [
        ['Políticas', '14'],
        ['Redações/min', '620'],
        ['Residência', 'BR'],
        ['Auditoria', 'ativa'],
      ],
    },
    {
      id: 'lens',
      label: 'lens.trace',
      type: 'core',
      det: [
        ['Traços/dia', '18M'],
        ['Retenção', '90 dias'],
        ['Replay', 'exato'],
        ['Assinatura', 'ed25519'],
      ],
    },
  ];

  private readonly EDGES: Array<[number, number]> = [
    [0, 1],
    [0, 2],
    [0, 3],
    [0, 4],
    [0, 7],
    [0, 8],
    [1, 5],
    [1, 6],
    [2, 6],
    [3, 5],
    [7, 8],
    [2, 7],
    [4, 1],
  ];

  private readonly CMDS: Cmd[] = [
    { g: 'Navegar', ic: '→', t: 'Ir para Topologia', s: '#topologia', k: 'topologia malha nós' },
    { g: 'Navegar', ic: '→', t: 'Ir para Painel de operação', s: '#painel', k: 'painel dashboard métricas' },
    { g: 'Navegar', ic: '→', t: 'Ir para Comparativo', s: '#comparativo', k: 'comparativo tabela' },
    { g: 'Navegar', ic: '→', t: 'Ir para Preços', s: '#final', k: 'preço plano' },
    { g: 'Ações', ic: '+', t: 'Criar projeto', a: 'demo', k: 'criar projeto console novo' },
    { g: 'Ações', ic: '⇅', t: 'Trocar aba do terminal', a: 'tab', k: 'terminal aba deploy trace cost' },
    { g: 'Ações', ic: '↑', t: 'Voltar ao topo', a: 'top', k: 'topo início' },
    { g: 'Edições', ic: '01', t: 'Abrir Orbit', h: PAGE_PATH.orbit, k: 'orbit partículas' },
    { g: 'Edições', ic: '02', t: 'Abrir Paper', h: PAGE_PATH.paper, k: 'paper editorial' },
    { g: 'Edições', ic: '03', t: 'Abrir Flux', h: PAGE_PATH.flux, k: 'flux shader' },
    { g: 'Edições', ic: '05', t: 'Abrir Echo', h: PAGE_PATH.echo, k: 'echo vidro' },
    { g: 'Edições', ic: '◇', t: 'Abrir o hub', h: PAGE_PATH.hub, k: 'hub index todas' },
  ];

  private readonly rt = new PageRuntime({ bodyClasses: ['lock'] });

  private tR!: THREE.WebGLRenderer;
  private tS!: THREE.Scene;
  private tC!: THREE.PerspectiveCamera;
  private nodeMeshes: THREE.Mesh[] = [];
  private pulses!: THREE.Points;
  private edgeLine!: THREE.LineSegments;
  private raycaster!: THREE.Raycaster;
  private hovered: number | null = null;
  private topoReady = false;
  private rotX = -0.18;
  private rotY = 0.5;
  private tRotX = -0.18;
  private tRotY = 0.5;
  private zoom = 1;
  private tZoom = 1;
  private drag = false;
  private lx = 0;
  private ly = 0;
  private NPOS: THREE.Vector3[] = [];
  private topoMouse = { x: 0, y: 0, inside: false, cx: 0, cy: 0 };
  private tt = 0;

  private mdl!: HTMLElement;
  private mbg!: HTMLElement;
  private mcard!: HTMLElement;
  private mbody!: HTMLElement;

  private cmdSel = 0;
  private cmdFiltered: Cmd[] = this.CMDS;
  private cmdk!: HTMLElement;
  private cmdBox!: HTMLElement;
  private cmdBg!: HTMLElement;
  private cmdInput!: HTMLInputElement;

  ngAfterViewInit(): void {
    $$('.term-bar .tabs button').forEach((b) =>
      this.rt.td.on(b, 'click', () => {
        $$('.term-bar .tabs button').forEach((x) => x.classList.remove('on'));
        b.classList.add('on');
        this.typeTerm(+b.dataset.tab!);
      }),
    );

    this.mdl = $('#mdl');
    this.mbg = $('.mdl-bg', this.mdl);
    this.mcard = $('.mdl-card', this.mdl);
    this.mbody = $('#mdlBody');
    this.rt.td.on<MouseEvent>(document, 'click', (e) => {
      const t = e.target as HTMLElement;
      if (t.closest('[data-modal="demo"]')) this.openMdl(this.demoHTML());
      if (t.closest('[data-mcls]')) this.closeMdl();
    });

    this.cmdk = $('#cmdk');
    this.cmdBox = $('.cmdk-box', this.cmdk);
    this.cmdBg = $('.cmdk-bg', this.cmdk);
    this.cmdInput = $<HTMLInputElement>('#cmdInput');
    this.rt.td.on(this.cmdInput, 'input', () => this.renderCmds(this.cmdInput.value));
    this.rt.td.on<MouseEvent>($('#cmdList'), 'click', (e) => {
      const it = (e.target as HTMLElement).closest<HTMLElement>('.cmdk-it');
      if (it) this.runCmd(+it.dataset.i!);
    });
    this.rt.td.on<MouseEvent>($('#cmdList'), 'mousemove', (e) => {
      const it = (e.target as HTMLElement).closest<HTMLElement>('.cmdk-it');
      if (!it) return;
      this.cmdSel = +it.dataset.i!;
      $$('.cmdk-it').forEach((x, i) => x.classList.toggle('sel', i === this.cmdSel));
    });
    this.rt.td.on<KeyboardEvent>(window, 'keydown', (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        this.cmdk.classList.contains('open') ? this.closeCmdk() : this.openCmdk();
        return;
      }
      if (!this.cmdk.classList.contains('open')) {
        if (e.key === 'Escape' && this.mdl.classList.contains('open')) this.closeMdl();
        return;
      }
      if (e.key === 'Escape') this.closeCmdk();
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        this.moveSel(1);
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        this.moveSel(-1);
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        this.runCmd(this.cmdSel);
      }
    });
    this.rt.td.on<MouseEvent>(this.cmdk, 'click', (e) => {
      if ((e.target as HTMLElement).closest('[data-ccls]')) this.closeCmdk();
    });
    ['#kbdBtn', '#openCmd', '#openCmd2'].forEach((s) => {
      const el = $(s);
      if (el) this.rt.td.on(el, 'click', () => this.openCmdk());
    });

    this.rt.td.on<MouseEvent>(document, 'click', (e) => {
      const a = (e.target as HTMLElement).closest<HTMLElement>('[data-trans]');
      if (!a) return;
      const href = a.getAttribute('href');
      if (!href || href.startsWith('#')) return;
      e.preventDefault();
      this.goPage(href);
    });

    document.body.classList.add('lock');
    this.rt.whenLoaded(() => {
      this.reveals();
      this.counters();
      this.buildBars();
      this.buildRows();
      this.fab();
      this.clock();
      this.sparkPath('#sp1', 0, 1.2);
      this.sparkPath('#sp2', 2, -1.1);
      this.sparkPath('#sp3', 4, 0);
      this.initTopo();
      this.boot();
      ScrollTrigger.refresh();
    });
  }

  ngOnDestroy(): void {
    this.rt.destroy();
    anime.remove('*');
    if (this.tR) {
      this.tR.dispose();
      this.tR.forceContextLoss();
    }
  }

  private boot(): void {
    const box = $('#bootBox');
    box.innerHTML =
      this.BOOT.map(
        (b) => `<div class="boot-line"><b>[${b[0]}]</b><span>${b[1]}</span><span class="ok">ok</span></div>`,
      ).join('') + '<div class="boot-bar"><i></i></div>';
    const tl = gsap.timeline();
    tl.to('.boot-line', { opacity: 1, duration: 0.28, stagger: 0.17, ease: 'none' })
      .to('.boot-bar i', { scaleX: 1, duration: 1.5, ease: 'power2.inOut' }, 0.25)
      .to('#bootBox', { opacity: 0, duration: 0.35 }, '+=.15')
      .set('#boot', { display: 'none' })
      .to('#shutter i', { scaleY: 0, duration: 0.85, stagger: 0.06, ease: 'expo.inOut' })
      .add(() => this.intro(), '-=.55');
  }

  private intro(): void {
    document.body.classList.remove('lock');
    const tl = gsap.timeline();
    tl.to('.hero .ln i', { y: 0, duration: 1.2, stagger: 0.09, ease: 'expo.out' })
      .to('.hero .rv', { y: 0, opacity: 1, duration: 1, stagger: 0.07, ease: 'expo.out' }, '-=.85')
      .from('#fab', { scale: 0, opacity: 0, duration: 0.8, ease: 'back.out(1.7)' }, '-=.5');
    this.typeTerm(0);
    this.startTicker();
    this.startLogs();
  }

  private typeTerm(ix: number): void {
    const body = $('#termBody');
    body.innerHTML = '';
    const lines = this.TERMS[ix];
    let li = 0;
    const nextLine = () => {
      if (li >= lines.length) {
        body.insertAdjacentHTML('beforeend', '<span class="caret"></span>');
        return;
      }
      const [cls, txt] = lines[li];
      const div = document.createElement('div');
      div.className = cls === '$' ? '' : cls;
      body.appendChild(div);
      if (cls === '$') {
        div.innerHTML = '<span class="p">$</span> <span class="cmdtxt"></span><span class="caret"></span>';
        const t = $('.cmdtxt', div);
        let i = 0;
        const int = this.rt.td.interval(() => {
          t.textContent = txt.slice(0, ++i);
          if (i >= txt.length) {
            clearInterval(int);
            $('.caret', div)?.remove();
            li++;
            this.rt.td.timeout(nextLine, 240);
          }
        }, 26);
      } else {
        div.textContent = txt;
        div.style.opacity = '0';
        anime({ targets: div, opacity: [0, 1], translateX: [-6, 0], duration: 280, easing: 'easeOutQuad' });
        li++;
        this.rt.td.timeout(nextLine, rnd(130, 300));
      }
    };
    const first = lines[0];
    lines[0] = ['$', first[1]];
    nextLine();
  }

  private startTicker(): void {
    const items: Array<[string, string, string]> = [
      ['tokens/min', '2.94M', '+18,4%'],
      ['p50', '140ms', 'estável'],
      ['custo/1M', 'R$ 4,20', '−61%'],
      ['rotas ativas', '1.284', '+42'],
      ['uptime 30d', '99,99%', 'ok'],
      ['regiões', '12', 'todas no ar'],
      ['fallbacks', '0,3%', 'baixo'],
      ['deriva', 'nenhuma', 'ok'],
    ];
    const html = `<div class="tk">${items
      .map((i) => `<span>${i[0]} <b>${i[1]}</b> <i>${i[2]}</i></span>`)
      .join('')}</div>`;
    $('#ticker').innerHTML = html + html;
    const w = $('.tk').offsetWidth;
    gsap.to('.tk', {
      x: -w,
      duration: 38,
      ease: 'none',
      repeat: -1,
      modifiers: { x: gsap.utils.unitize((x: string) => parseFloat(x) % w) },
    });
  }

  private startLogs(): void {
    const box = $('#logs');
    let k = 0;
    const push = () => {
      const [lv, msg] = this.LOG_MSG[k % this.LOG_MSG.length];
      k++;
      const d = new Date();
      const el = document.createElement('div');
      el.className = 'log';
      el.innerHTML = `<span class="t">${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}</span>
      <span class="lv ${lv}">${lv === 'i' ? 'INFO' : 'WARN'}</span><span class="m">${msg}</span>`;
      box.appendChild(el);
      anime({ targets: el, opacity: [0, 1], translateY: [8, 0], duration: 420, easing: 'easeOutQuad' });
      while (box.children.length > 9) box.removeChild(box.firstChild!);
      this.rt.td.timeout(push, rnd(900, 2100));
    };
    push();
  }

  private sparkPath(id: string, seed: number, trend: number): void {
    const svg = $<SVGSVGElement>(id);
    if (!svg) return;
    const N = 36,
      pts: Array<[number, number]> = [];
    let v = 30;
    for (let i = 0; i < N; i++) {
      v += Math.sin(i * 0.7 + seed) * 5 + rnd(-5, 5) + trend;
      v = Math.max(8, Math.min(52, v));
      pts.push([i * (300 / (N - 1)), 60 - v]);
    }
    const d = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
    const line = $<SVGPathElement>('.line', svg),
      area = $<SVGPathElement>('.area', svg);
    line.setAttribute('d', d);
    area.setAttribute('d', d + ` L300,60 L0,60 Z`);
    const len = line.getTotalLength();
    line.style.strokeDasharray = String(len);
    line.style.strokeDashoffset = String(len);
    area.style.opacity = '0';
    ScrollTrigger.create({
      trigger: svg,
      start: 'top 90%',
      once: true,
      onEnter: () => {
        anime({ targets: line, strokeDashoffset: [len, 0], duration: 1600, easing: 'easeInOutQuad' });
        anime({ targets: area, opacity: [0, 1], duration: 1200, delay: 400, easing: 'easeOutQuad' });
      },
    });
  }

  private buildBars(): void {
    const data: Array<[string, number]> = [
      ['mistral-l', 92],
      ['opus-5', 71],
      ['bge-m3', 58],
      ['sonnet-5', 49],
      ['llama-4', 37],
      ['whisper-x', 26],
      ['flux-vis', 19],
      ['haiku', 14],
    ];
    $('#bars').innerHTML = data.map((d) => `<i data-h="${d[1]}" title="${d[0]}: ${d[1]}%"></i>`).join('');
    $('#barsX').innerHTML = data.map((d) => `<span>${d[0].slice(0, 6)}</span>`).join('');
    ScrollTrigger.create({
      trigger: '#bars',
      start: 'top 88%',
      once: true,
      onEnter: () => {
        anime({
          targets: '#bars i',
          scaleY: (el: HTMLElement) => Number(el.dataset.h) / 100,
          duration: 1100,
          delay: anime.stagger(60),
          easing: 'easeOutExpo',
        });
      },
    });
  }

  private buildRows(): void {
    const reg: Array<[string, number]> = [
      ['br-se1', 99.99],
      ['eu-west1', 99.98],
      ['us-east2', 99.99],
      ['ap-south1', 99.92],
    ];
    $('#regions').innerHTML = reg
      .map(
        (r) => `<div class="row"><span class="nm">${r[0]}</span>
    <span class="pg"><i data-w="${(r[1] - 99.8) / 0.2}"></i></span><span class="vl">${r[1].toFixed(2)}%</span></div>`,
      )
      .join('');
    const bud: Array<[string, number]> = [
      ['inferência', 62],
      ['embeddings', 14],
      ['ferramentas', 9],
      ['armazenamento', 4],
    ];
    $('#budget').innerHTML = bud
      .map(
        (b) => `<div class="row"><span class="nm">${b[0]}</span>
    <span class="pg"><i data-w="${b[1] / 100}"></i></span><span class="vl">${b[1]}%</span></div>`,
      )
      .join('');
    ScrollTrigger.create({
      trigger: '#regions',
      start: 'top 88%',
      once: true,
      onEnter: () => {
        anime({
          targets: '.row .pg i',
          scaleX: (el: HTMLElement) => parseFloat(el.dataset.w!),
          duration: 1300,
          delay: anime.stagger(70),
          easing: 'easeOutExpo',
        });
      },
    });
  }

  private counters(): void {
    $$('[data-kpi]').forEach((el) => {
      ScrollTrigger.create({
        trigger: el,
        start: 'top 92%',
        once: true,
        onEnter: () => {
          const t = parseFloat(el.dataset.kpi!),
            dec = parseInt(el.dataset.dec || '0'),
            o = { v: 0 };
          anime({
            targets: o,
            v: t,
            duration: 2000,
            easing: 'easeOutExpo',
            update: () => {
              el.textContent =
                el.dataset.fmt === 'compact'
                  ? (o.v / 1e6).toFixed(2) + 'M'
                  : o.v.toLocaleString('pt-BR', { minimumFractionDigits: dec, maximumFractionDigits: dec });
            },
          });
        },
      });
    });
  }

  private initTopo(): void {
    const cv = $<HTMLCanvasElement>('#topoCv'),
      st = $('.topo-stage');
    const W = st.clientWidth,
      H = st.clientHeight;
    this.tR = new THREE.WebGLRenderer({ canvas: cv, antialias: true, alpha: true });
    this.tR.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.tR.setSize(W, H, false);
    this.tS = new THREE.Scene();
    this.tC = new THREE.PerspectiveCamera(42, W / H, 0.1, 100);
    this.tC.position.z = 10;

    const group = new THREE.Group();
    this.tS.add(group);

    const gold = Math.PI * (3 - Math.sqrt(5));
    this.NODES.forEach((n, i) => {
      const y = 1 - (i / (this.NODES.length - 1)) * 2;
      const r = Math.sqrt(Math.max(0, 1 - y * y));
      const th = gold * i;
      const R = n.type === 'core' && i === 0 ? 0 : 3.1;
      const p = new THREE.Vector3(Math.cos(th) * r * R, y * R * 0.8, Math.sin(th) * r * R);
      this.NPOS.push(p);
      const col =
        n.type === 'core' ? 0x0d0d0c : n.type === 'ok' ? 0x1c7f4e : n.type === 'warn' ? 0x9a6b12 : 0x8a8a86;
      const size = n.type === 'core' ? (i === 0 ? 0.44 : 0.3) : 0.24;
      const m = new THREE.Mesh(
        new THREE.SphereGeometry(size, 32, 32),
        new THREE.MeshStandardMaterial({ color: col, roughness: 0.35, metalness: 0.1 }),
      );
      m.position.copy(p);
      m.userData = { ix: i, base: size };
      group.add(m);
      this.nodeMeshes.push(m);
      const halo = new THREE.Mesh(
        new THREE.SphereGeometry(size * 1.9, 24, 24),
        new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.08 }),
      );
      halo.position.copy(p);
      group.add(halo);
      m.userData.halo = halo;
    });

    const ep: number[] = [];
    this.EDGES.forEach((e) => {
      ep.push(
        this.NPOS[e[0]].x,
        this.NPOS[e[0]].y,
        this.NPOS[e[0]].z,
        this.NPOS[e[1]].x,
        this.NPOS[e[1]].y,
        this.NPOS[e[1]].z,
      );
    });
    const eg = new THREE.BufferGeometry();
    eg.setAttribute('position', new THREE.Float32BufferAttribute(ep, 3));
    this.edgeLine = new THREE.LineSegments(
      eg,
      new THREE.LineBasicMaterial({ color: 0x0d0d0c, transparent: true, opacity: 0.22 }),
    );
    group.add(this.edgeLine);

    const PC = this.EDGES.length * 5;
    const pp = new Float32Array(PC * 3);
    this.pulses = new THREE.Points(
      new THREE.BufferGeometry(),
      new THREE.PointsMaterial({ color: 0x0d0d0c, size: 0.1, transparent: true, opacity: 0.85 }),
    );
    this.pulses.geometry.setAttribute('position', new THREE.BufferAttribute(pp, 3));
    const pulseState: Pulse[] = [];
    this.pulses.userData.t = pulseState;
    for (let i = 0; i < PC; i++) pulseState.push({ e: i % this.EDGES.length, p: Math.random(), s: rnd(0.12, 0.34) });
    group.add(this.pulses);

    this.tS.add(new THREE.AmbientLight(0xffffff, 0.8));
    const d1 = new THREE.DirectionalLight(0xffffff, 1.1);
    d1.position.set(4, 6, 6);
    this.tS.add(d1);
    const d2 = new THREE.DirectionalLight(0xffffff, 0.5);
    d2.position.set(-5, -3, 2);
    this.tS.add(d2);

    this.raycaster = new THREE.Raycaster();
    this.tS.userData.group = group;

    const ui = $('#topoUi');
    this.NODES.forEach((n, i) => {
      const c = document.createElement('div');
      c.className = 'topo-chip';
      c.textContent = n.label;
      c.dataset.ix = String(i);
      ui.appendChild(c);
    });

    this.rt.td.on<PointerEvent>(cv, 'pointerdown', (e) => {
      this.drag = true;
      this.lx = e.clientX;
      this.ly = e.clientY;
    });
    this.rt.td.on(window, 'pointerup', () => (this.drag = false));
    this.rt.td.on<PointerEvent>(window, 'pointermove', (e) => {
      if (this.drag) {
        this.tRotY += (e.clientX - this.lx) * 0.006;
        this.tRotX += (e.clientY - this.ly) * 0.004;
        this.lx = e.clientX;
        this.ly = e.clientY;
        this.tRotX = Math.max(-0.9, Math.min(0.9, this.tRotX));
      }
      const r = cv.getBoundingClientRect();
      this.topoMouse.x = ((e.clientX - r.left) / r.width) * 2 - 1;
      this.topoMouse.y = -((e.clientY - r.top) / r.height) * 2 + 1;
      this.topoMouse.inside =
        e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
      this.topoMouse.cx = e.clientX - r.left;
      this.topoMouse.cy = e.clientY - r.top;
    });
    this.rt.td.on<WheelEvent>(
      cv,
      'wheel',
      (e) => {
        e.preventDefault();
        this.tZoom = Math.max(0.65, Math.min(1.7, this.tZoom - e.deltaY * 0.0011));
      },
      { passive: false },
    );
    this.rt.td.on(cv, 'click', () => {
      if (this.hovered !== null) this.openNode(this.hovered);
    });
    this.rt.td.on(window, 'resize', () => {
      const w = st.clientWidth,
        h = st.clientHeight;
      this.tC.aspect = w / h;
      this.tC.updateProjectionMatrix();
      this.tR.setSize(w, h, false);
    });
    this.topoReady = true;
    this.topoLoop();
  }

  private topoLoop(): void {
    this.rt.td.raf(() => this.topoLoop());
    if (!this.topoReady) return;
    this.tt += 0.016;
    const g = this.tS.userData.group as THREE.Group;
    if (!this.drag) this.tRotY += 0.0016;
    this.rotY = lerp(this.rotY, this.tRotY, 0.08);
    this.rotX = lerp(this.rotX, this.tRotX, 0.08);
    this.zoom = lerp(this.zoom, this.tZoom, 0.08);
    g.rotation.y = this.rotY;
    g.rotation.x = this.rotX;
    g.scale.setScalar(this.zoom);
    this.tC.position.z = (10 / this.zoom) * 0.9 + 1;

    const pos = this.pulses.geometry.getAttribute('position') as THREE.BufferAttribute;
    (this.pulses.userData.t as Pulse[]).forEach((t, i) => {
      t.p += t.s * 0.008;
      if (t.p > 1) t.p = 0;
      const e = this.EDGES[t.e];
      const a = this.NPOS[e[0]],
        b = this.NPOS[e[1]];
      pos.setXYZ(i, lerp(a.x, b.x, t.p), lerp(a.y, b.y, t.p), lerp(a.z, b.z, t.p));
    });
    pos.needsUpdate = true;

    this.nodeMeshes.forEach((m, i) => {
      m.scale.setScalar(this.hovered === i ? 1.45 : 1);
      m.userData.halo.scale.setScalar(this.hovered === i ? 1.3 : 1 + Math.sin(this.tt * 1.1 + i * 0.7) * 0.07);
      m.userData.halo.material.opacity = this.hovered === i ? 0.2 : 0.08;
    });

    if (this.topoMouse.inside && !this.drag) {
      this.raycaster.setFromCamera(new THREE.Vector2(this.topoMouse.x, this.topoMouse.y), this.tC);
      const hit = this.raycaster.intersectObjects(this.nodeMeshes);
      const ix = hit.length ? (hit[0].object.userData.ix as number) : null;
      if (ix !== this.hovered) {
        this.hovered = ix;
        const tip = $('#tip');
        if (ix !== null) {
          const n = this.NODES[ix];
          tip.innerHTML = `<b>${n.label}</b><span>${n.det[0][0]} ${n.det[0][1]} · clique para abrir</span>`;
          tip.style.opacity = '1';
        } else tip.style.opacity = '0';
      }
      if (this.hovered !== null) {
        const tip = $('#tip');
        tip.style.left = this.topoMouse.cx + 'px';
        tip.style.top = this.topoMouse.cy + 'px';
      }
    } else if (this.hovered !== null && this.drag) {
      this.hovered = null;
      $('#tip').style.opacity = '0';
    }

    const chips = $$('.topo-chip');
    this.nodeMeshes.forEach((m, i) => {
      const v = m.position.clone();
      v.applyMatrix4(g.matrixWorld);
      v.project(this.tC);
      const c = chips[i];
      const st = $('.topo-stage');
      c.style.left = (v.x * 0.5 + 0.5) * st.clientWidth + 'px';
      c.style.top = (-v.y * 0.5 + 0.5) * st.clientHeight - 26 + 'px';
      c.style.opacity = String(
        v.z < 1 && (this.hovered === null || this.hovered === i) ? (this.NODES[i].type === 'core' ? 1 : 0.72) : 0,
      );
    });

    this.tR.render(this.tS, this.tC);
  }

  private openMdl(html: string): void {
    this.mbody.innerHTML = html;
    this.mdl.classList.add('open');
    document.body.classList.add('lock');
    gsap.fromTo(this.mbg, { opacity: 0 }, { opacity: 1, duration: 0.35 });
    gsap.fromTo(
      this.mcard,
      { opacity: 0, y: 30, scale: 0.96 },
      { opacity: 1, y: 0, scale: 1, duration: 0.8, ease: 'expo.out' },
    );
    anime({
      targets: this.mcard.querySelectorAll('h3,p,.kv div,.fi,.go2'),
      opacity: [0, 1],
      translateY: [14, 0],
      duration: 650,
      delay: anime.stagger(45, { start: 110 }),
      easing: 'easeOutExpo',
    });
    this.bindFi();
  }

  private closeMdl(): void {
    document.body.classList.remove('lock');
    gsap.to(this.mbg, { opacity: 0, duration: 0.3 });
    gsap.to(this.mcard, {
      opacity: 0,
      y: 24,
      scale: 0.97,
      duration: 0.32,
      ease: 'power2.in',
      onComplete: () => this.mdl.classList.remove('open'),
    });
  }

  private openNode(i: number): void {
    const n = this.NODES[i];
    this.openMdl(`<div class="lbl">Nó · ${n.type}</div><h3>${n.label}</h3>
    <p>Estado consolidado nas últimas 24 horas de operação na malha.</p>
    <div class="kv">${n.det.map((d) => `<div><span>${d[0]}</span><span>${d[1]}</span></div>`).join('')}</div>
    <button class="go2" style="margin-top:22px" data-modal="demo">Abrir no console</button>`);
  }

  private demoHTML(): string {
    return `
  <div class="lbl">Novo projeto</div><h3>Abrir console</h3>
  <p>Criamos seu projeto, a chave e um endpoint compatível com OpenAI em menos de um minuto.</p>
  <form id="fm">
    <div class="fi"><input id="g1" type="text" required><label for="g1">Nome do projeto</label></div>
    <div class="fi"><input id="g2" type="email" required><label for="g2">E-mail corporativo</label></div>
    <div class="fi"><textarea id="g3"></textarea><label for="g3">Carga esperada</label></div>
    <button class="go2" type="submit">Criar projeto</button>
  </form>`;
  }

  private bindFi(): void {
    $$<HTMLInputElement>('.fi input,.fi textarea').forEach((i) => {
      const f = i.closest('.fi')!;
      const u = () => f.classList.toggle('on', i.value.length > 0);
      this.rt.td.on(i, 'input', u);
      this.rt.td.on(i, 'blur', u);
    });
    const fm = $('#fm');
    if (fm)
      this.rt.td.on(fm, 'submit', (e) => {
        e.preventDefault();
        const b = $('.go2', fm);
        b.textContent = 'Provisionando…';
        this.rt.td.timeout(() => {
          this.mbody.innerHTML = `<div class="lbl">Pronto</div><h3>Projeto criado</h3>
        <p>Seu endpoint está no ar. Copie a chave e troque a base URL do seu SDK.</p>
        <div class="kv">
          <div><span>endpoint</span><span>api.sylux.io/v1/novo</span></div>
          <div><span>região</span><span>br-se1</span></div>
          <div><span>chave</span><span>syl_live_••••••3f2a</span></div>
          <div><span>plano</span><span>Signal · 1M tokens</span></div>
        </div>`;
          anime({
            targets: this.mbody.querySelectorAll('h3,p,.kv div'),
            opacity: [0, 1],
            translateY: [14, 0],
            duration: 650,
            delay: anime.stagger(55),
            easing: 'easeOutExpo',
          });
        }, 900);
      });
  }

  private renderCmds(q = ''): void {
    const ql = q.toLowerCase().trim();
    this.cmdFiltered = this.CMDS.filter((c) => !ql || (c.t + ' ' + c.k + ' ' + c.g).toLowerCase().includes(ql));
    this.cmdSel = 0;
    let html = '',
      last = '';
    this.cmdFiltered.forEach((c, i) => {
      if (c.g !== last) {
        html += `<div class="cmdk-sec">${c.g}</div>`;
        last = c.g;
      }
      html += `<div class="cmdk-it${i === 0 ? ' sel' : ''}" data-i="${i}"><span class="ic">${c.ic}</span>${c.t}
      <span class="sub">${c.h ? 'página' : c.s ? 'seção' : 'ação'}</span></div>`;
    });
    if (!this.cmdFiltered.length) html = '<div class="cmdk-sec">Nenhum resultado</div>';
    $('#cmdList').innerHTML = html;
  }

  private openCmdk(): void {
    this.renderCmds('');
    this.cmdInput.value = '';
    this.cmdk.classList.add('open');
    document.body.classList.add('lock');
    gsap.fromTo(this.cmdBg, { opacity: 0 }, { opacity: 1, duration: 0.3 });
    gsap.fromTo(
      this.cmdBox,
      { opacity: 0, y: -18, scale: 0.97 },
      { opacity: 1, y: 0, scale: 1, duration: 0.6, ease: 'expo.out' },
    );
    anime({
      targets: '.cmdk-it',
      opacity: [0, 1],
      translateY: [8, 0],
      duration: 450,
      delay: anime.stagger(22, { start: 90 }),
      easing: 'easeOutQuad',
    });
    this.rt.td.timeout(() => this.cmdInput.focus(), 60);
  }

  private closeCmdk(): void {
    document.body.classList.remove('lock');
    gsap.to(this.cmdBg, { opacity: 0, duration: 0.25 });
    gsap.to(this.cmdBox, {
      opacity: 0,
      y: -14,
      scale: 0.98,
      duration: 0.28,
      ease: 'power2.in',
      onComplete: () => this.cmdk.classList.remove('open'),
    });
  }

  private moveSel(d: number): void {
    const items = $$('.cmdk-it');
    if (!items.length) return;
    this.cmdSel = (this.cmdSel + d + items.length) % items.length;
    items.forEach((it, i) => it.classList.toggle('sel', i === this.cmdSel));
    items[this.cmdSel].scrollIntoView({ block: 'nearest' });
  }

  private runCmd(i: number): void {
    const c = this.cmdFiltered[i];
    if (!c) return;
    this.closeCmdk();
    this.rt.td.timeout(() => {
      if (c.s) {
        const el = $(c.s);
        if (el) window.scrollTo({ top: el.getBoundingClientRect().top + scrollY - 80, behavior: 'smooth' });
      }
      if (c.a === 'demo') this.openMdl(this.demoHTML());
      if (c.a === 'top') window.scrollTo({ top: 0, behavior: 'smooth' });
      if (c.a === 'tab') {
        const tabs = $$('.term-bar .tabs button');
        const cur = tabs.findIndex((t) => t.classList.contains('on'));
        tabs[(cur + 1) % tabs.length].click();
      }
      if (c.h) this.goPage(c.h);
    }, 260);
  }

  private fab(): void {
    const f = $('#fab'),
      b = $('#fabB'),
      items = $$('#fabList button');
    let on = false;
    this.rt.td.on(b, 'click', () => {
      on = !on;
      f.classList.toggle('on', on);
      anime.remove(items);
      anime({
        targets: items,
        opacity: on ? [0, 1] : 0,
        translateY: on ? [12, 0] : 12,
        scale: on ? [0.95, 1] : 0.95,
        duration: on ? 560 : 280,
        delay: anime.stagger(50, { from: on ? 'last' : 'first' }),
        easing: on ? 'easeOutExpo' : 'easeInQuad',
      });
    });
    items.forEach((i) =>
      this.rt.td.on(i, 'click', () => {
        if (i.dataset.top) window.scrollTo({ top: 0, behavior: 'smooth' });
        if (i.hasAttribute('data-cmd')) this.openCmdk();
        b.click();
      }),
    );
  }

  private goPage(href: string): void {
    gsap
      .timeline({ onComplete: () => this.rt.go(href) })
      .to('#pt i', { scaleY: 1, duration: 0.6, stagger: 0.05, ease: 'expo.inOut' })
      .to('#ptL', { opacity: 1, duration: 0.3 }, '-=.25');
  }

  private reveals(): void {
    gsap.set('.rv', { y: 24, opacity: 0 });
    $$('.rv').forEach((el) => {
      if (el.closest('.hero')) return;
      ScrollTrigger.create({
        trigger: el,
        start: 'top 90%',
        once: true,
        onEnter: () => gsap.to(el, { y: 0, opacity: 1, duration: 1, ease: 'expo.out' }),
      });
    });
    $$('.hdr-nav a,.b2').forEach((a) => {
      const h = a.getAttribute('href');
      if (h && h.startsWith('#'))
        this.rt.td.on(a, 'click', (e) => {
          e.preventDefault();
          const el = $(h);
          if (el) window.scrollTo({ top: el.getBoundingClientRect().top + scrollY - 80, behavior: 'smooth' });
        });
    });
  }

  private clock(): void {
    this.rt.td.interval(() => {
      const d = new Date();
      $('#clock').textContent =
        `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')} BRT`;
    }, 1000);
  }
}
