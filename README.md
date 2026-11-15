# SYLUX

Cinco direções visuais para a mesma marca, agora dentro de um workspace **Angular + TypeScript**.

Nada do comportamento original foi alterado: todas as animações (GSAP, ScrollTrigger, anime.js),
todos os shaders, cenas Three.js, cursores customizados, transições de página, modais, terminal,
command palette, áudio gerado em tempo real e física de scroll continuam idênticos.

## Rodar

```bash
npm install
npm start          # http://localhost:4200
npm run build      # dist/sylux
```

## Rotas

| Rota      | Página            | Arquivo original   |
| --------- | ----------------- | ------------------ |
| `/`       | Hub               | `index.html`       |
| `/orbit`  | Orbit Edition     | `lp-01-orbit.html` |
| `/paper`  | Paper Edition     | `lp-02-paper.html` |
| `/flux`   | Flux Edition      | `lp-03-flux.html`  |
| `/grid`   | Grid Edition      | `lp-04-grid.html`  |
| `/echo`   | Echo Edition      | `lp-05-echo.html`  |
| `**`      | 404 — Fora da malha | —                |

Os HTMLs originais continuam em `old/`, intactos, como referência.

## 404

Qualquer rota não existente cai em `src/app/pages/not-found/`, uma página com motor próprio — não é um
redirect para o hub. Ela mostra o caminho que o usuário tentou (`location.pathname + search + hash`),
decodificado e embaralhado caractere a caractere, e roda:

- **Three.js** — dois passes no mesmo renderer: um plano full-screen com shader de fbm/contornos e bandas
  de glitch, e 15 mil partículas que saem do caos e se formam no `404` amostrado de um glifo em canvas.
- **GSAP + ScrollTrigger** — loader, timeline de entrada, trilha de progresso, parallax do `404`, revelação
  das seções, contadores e o scrub que dissolve as partículas conforme a página desce.
- **anime.js** — scramble do marcador no loader, glitch RGB do `404` e stagger das tags.
- **Canvas 2D** — radar de varredura dos 38 nós (sweep cônico, blips e alvo que nunca resolve) e o
  sparkline do sinal de retorno.
- **Web Audio** — drone de sinal perdido gerado em tempo real, com ruído, quedas periódicas, ping a cada
  nó varrido e estática nos glitches. Desligado por padrão, no botão `Sinal` ou na tecla `S`.
- **Teclado** — `↑ ↓` seleciona rota, `⏎` navega, `R` reescaneia a malha, `S` liga o som, `Esc` volta ao hub.

## Estrutura

```
public/
  assets/img/                 logos, imagens e favicons servidos em /assets/img/
src/
  index.html                  shell único (base href, fontes de todas as páginas)
  styles.css                  apenas app-root { display: contents }
  app/
    app.ts                    <router-outlet />
    app.routes.ts             rotas com lazy loading e title por página
    core/
      dom.ts                  $, $$, lerp, clamp, rnd, rndi
      teardown.ts             registro de listeners, rAF, timers e jobs
      page-runtime.ts         ciclo de vida da página (load, navegação, limpeza)
      page-links.ts           mapa de rotas usado pelos switchers
    pages/<page>/
      <page>.ts               motor da página (TypeScript)
      <page>.html             template
      <page>.css             CSS da página, idêntico ao original
```

## Decisões de implementação

**CSS sem encapsulamento.** Cada página usa `ViewEncapsulation.None` e carrega seu CSS original sem
uma única alteração — inclusive `:root`, `body`, `*` e `@keyframes`. Como a navegação entre páginas é
um carregamento completo (igual ao original), nunca existem dois conjuntos de CSS no mesmo documento.

**`app-root { display: contents }`.** Faz o host do Angular desaparecer da árvore de layout, para que
`body`, `position: fixed`, `scroll-snap` e `height: 100%` se comportem exatamente como nos arquivos
originais.

**`preserveWhitespaces: true`.** Evita que o compilador remova espaços entre elementos inline e mude
o espaçamento do texto.

**Navegação.** Os links entre páginas disparam a mesma timeline de transição e então fazem
`location.href = '/rota'`. Cada página recebe um documento limpo, com o loader rodando desde o início,
como antes.

**Listas estáticas no template.** Switchers, trilha de cenas, dots e specs viraram `@for`. O conteúdo
gerado em runtime (terminal, logs, sparklines, barras, modais, chips da topologia) continua imperativo,
como no original.

**Limpeza.** Cada página cancela `requestAnimationFrame`, timers, listeners, ScrollTriggers, tweens,
osciladores de áudio e o contexto WebGL em `ngOnDestroy`.

## Publicação

É um SPA com rotas em path. O servidor precisa devolver `index.html` para rotas desconhecidas
(fallback de SPA), senão `/orbit` e companhia retornam 404 em acesso direto.

## Bibliotecas

`gsap 3.12.5` (+ ScrollTrigger) · `animejs 3.2.1` · `three 0.128.0` — as mesmas versões dos CDNs
usados nos arquivos originais, agora instaladas via npm.
