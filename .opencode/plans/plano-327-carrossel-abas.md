# Plano — #327 aditivo: carrossel de abas nativo (setas + swipe + sticky)

Contexto: PR #328, branch `feature/327-profile-tabs-native`, milestone M2.
Feedback do usuário no teste ao vivo (container `:4200`, 2026-09-30):
- "apenas as setas agora são botões, mas tem que rolar a tela e depois clicar na aba"
- "o ideal é que funcionasse com o tap e com as setas também rolasse as abas como um carrossel"
- Decisões do usuário: **sticky = SIM** · **passo da seta ≈ 2 abas por tap**.

## Diagnóstico (evidência do DOM ao vivo, Pixel 7 412×839)

1. `.mat-mdc-tab-label-container` (202px) → `overflow: hidden`. **Não há scroller nativo horizontal**; o Material v20 (mdc) rola a lista apenas programaticamente (`scrollLeft` / `scrollToLabel`).
2. As setas são botões reais do Material, mas `next()/previous()` calculam o alvo em relação à **aba selecionada**, não à janela visível → com "Geral" selecionada, `scrollToLabel(1)` já está visível ≈ no-op. Motivo das setas parecerem mortas.
3. Não existe handler de toque na listagem do Material; nosso `touch-action: pan-y` (manter — vertical continua rolando a página) deixa o gesto horizontal sem dono → swipe morre no nada.
4. Faixa fica abaixo da dobra no iPhone (header + avatar + card ~50% da tela) → print do usuário em `frontend/shots/bugs/` confirma geometria.

Geometria de referência (Pixel 7): header 306px (x=53), prev x=57, contêiner 202px, next x=311; 5 abas = 524px; Geral 105-195, Contatos 195-303, Endereços 303-424, Social 424-515, Tags&QR 515-629.

## Fronteira

`frontend/src/app/features/users/pages/profile-page/` → `profile-page.html` (1 attr), `profile-page.ts` (~55 linhas), `profile-page.scss` (~15 linhas), `profile-page.spec.ts` (~25 linhas). Mesma PR #328.

## Fixes

### F1 — Setas = carrossel (~2 abas por tap)
- `profile-page.html:51` → `<mat-tab-group color="primary" #tabGroup>`.
- `profile-page.ts`:
  - imports: `MatTabGroup` de `@angular/material/tabs` (e `AfterViewInit`).
  - `@ViewChild('tabGroup') private readonly tabGroup!: MatTabGroup;`
  - `ngAfterViewInit()`: `const header = this.tabGroup.header.nativeElement;` + listener **em captura** `header.addEventListener('click', handler, true)`:
    - `btn = (e.target as HTMLElement).closest('.mat-mdc-tab-header-pagination')`; se não for → return.
    - `e.stopPropagation()` (bloqueia o handler próprio do Material no botão) + `e.preventDefault()`.
    - `this.tabCarousel(btn.classList.contains('mat-mdc-tab-header-pagination-after') ? 1 : -1)`.
  - `tabCarousel(dir: 1 | -1)` (leitura da **janela visível**, não da aba selecionada):
    - `const h = this.tabGroup.header; const c = header.querySelector('.mat-mdc-tab-label-container')!; const crect = c.getBoundingClientRect();`
    - `labels = [...c.querySelectorAll('.mat-mdc-tab')]` (com rects).
    - `dir=1`: `i` = menor índice com `rect.right > crect.right + 1`; não existe → fim da lista → return; alvo = `i + 1` (i fica inteira + 1 nova em visão ≈ 2 novas).
    - `dir=-1`: espelho — `i` = maior índice com `rect.left < crect.left - 1`; alvo = `i - 1` (≥ 0; não existe → return).
    - `h.scrollToLabel(alvo)` — API pública; o Material anima o `scrollLeft` e mantém estado interno consistente.
  - A11y mantida: os `<button>` do Material (aria-label "Previous/next tab") continuam os alvos; teclado segue no caminho nativo do Material (keydown — não interceptamos).

### F2 — Swipe horizontal na faixa rola as abas (1:1 nativo)
- No mesmo `ngAfterViewInit`, sobre o `.mat-mdc-tab-label-container`:
  - `touchstart` (passive): guarda `x0, y0`.
  - `touchend` (passive): `dx = x0 - x1; dy = y0 - y1;` se `|dx| > 32 && |dx| > 1.2*|dy|` → `c.scrollBy({ left: dx, behavior: reducedMotion ? 'auto' : 'smooth' })`.
  - Guard: só quando `c.scrollWidth > c.clientWidth + 1`.
- `touch-action: pan-y` **permanece** (navegador consome vertical; horizontal chega no JS sem `preventDefault`).

### F3 — Sticky no mobile (aprovado)
- `profile-page.scss`, dentro do bloco `:host` (nova media no style global do componente):
  ```scss
  @media (max-width: 768px) {
    ::ng-deep .mat-mdc-tab-header {
      position: sticky; top: 0; z-index: 3;
      background-color: var(--mat-sys-surface);
      padding-block: 8px;
    }
  }
  ```
- **Risco a checar em runtime**: ancestor com `overflow: hidden/auto` quebra o sticky. Check rápido: subir de `.mat-mdc-tab-header` até `body` e inspecionar `overflow` computado (Playwright, antes de implementar/validar). Se houver clipping → fallback: promover a faixa no fluxo (não previsto — esperar resultado do check).

### F4 — Regressão e validação
- `profile-page.spec.ts`: novo teste "arrow scrolls the tab strip" — fixture com host de ~280px (5 abas estouram), `fixture.detectChanges()`, `debugElement.query(By.css('.mat-mdc-tab-header-pagination-after')).nativeElement.click()`, espera `requestAnimationFrame`/`tick`, expect `container.scrollLeft > 0`.
- `npm run build` → exit 0 (orçamento de style: 11.7kB → +~0.5kB, continua <15kB).
- Runtime (script novo em `/tmp/opencode/`, sem commit): Pixel 7 + iPhone 13 × light/dark:
  - click em "next" → `scrollLeft` sobe; click repetido até fim → estável (no-op no limite);
  - swipe sintético (`TouchEvent` dispatch no contêiner) → `scrollLeft` desce/ sobe;
  - `position: sticky` efetivo: `getComputedStyle(header).position === 'sticky'` e, após `window.scrollBy(0, 600)`, `header.getBoundingClientRect().top` continua ≈0;
  - screenshots `shots/` (regenerar suíte) + `shots/bugs/` p/ comparação antes/depois com o print do usuário.
- `npm run e2e:visual` → 6/6 (suíte atual inaltera; sticky não muda o paint em scroll=0).

## Commits (fase de execução, mesma branch/PR #328 — §6 atomicidade + §5 inglês What/Why/Testing)

1. `docs: add iteration plan for Issue #327 (carousel arrows, swipe, sticky).` — aditivo "Iteração: feedback do usuário" em `plano-327-profile-tabs-native.md` (commit isolado, §8).
2. **c1 setas/carrossel (TDD)**: RED — spec "arrow scrolls the tab strip" falha (comprovar) → GREEN — `#tabGroup` no html + interceptor de captura + `tabCarousel()` (~2 abas/tap via `scrollToLabel`) → `feat(327): scroll tab strip from visible window on arrow tap. What/Why/Testing: ...`
3. **c2 swipe (TDD)**: RED — spec com `TouchEvent` sintético + spy `scrollBy` falha → GREEN — handlers `touchstart/touchend` 1:1 → `feat(327): scroll tab strip on horizontal swipe (1:1). What/Why/Testing: ...`
4. **c3 sticky (CSS)**: media ≤768px `position: sticky` + fundo `--mat-sys-surface` → validação runtime (computed style + top após scroll) → `feat(327): make profile tab strip sticky on mobile. What/Why/Testing: ...`
5. **Encerramento (§2)**: PERGUNTE (usuário re-testa no container) → `chore: final validation and closure of Issue #327. closes #327.` → push → `gh pr ready` + retirar `WIP:` do título → comentário na PR (resumo + commit final) → PASSO AT no `GEMINI.md` → merge só pelo usuário no GitHub. **§3 faxina** só após confirmação do merge remoto.

## Pipeline de issues novas (§4 manual-protocolos, fluxo real com scripts)

- Nova issue descoberta na execução → objeto JSON no padrão `manual-issues.md` (`[PREFIXO-ID] Tipo: Nome`, `labels`, body com Problema/Descrição/Tarefas/Critérios/Fronteira) → **apresentar ao usuário para validação** → então append em `issues-numerar.json` (não mexer em `issues-todo.json`).
- Envio: `node issues-enviar.smartcontact.js` envia a **fila inteira** de `issues-numerar.json` p/ o GitHub (LuFelix/smartcontact). ⚠️ Alerta: a fila atual tem 2 issues antigas de ANALYTICS (GeoIP) ainda não enviadas — elas vão junto com a nova; usuário decide se limpa a fila antes.
- Numeração: `node issues-ler.smartcontact.js` sobresscreve `issues-todo.json` com as issues abertas já numeradas → lemos os números corretos ali.
- Bugs (prints do usuário): pasta `frontend/shots/bugs/` — print "antes" + screenshot "depois" gerado na validação.
- **#329** (já numerada, criada fora do pipeline via `gh`): alinhar depois com `gh issue edit 329` — título p/ `[FE-UI-xxx] UX: ...`, inserir seções `**Descrição:**` e `**Tarefas e Etapas (Commits Atômicos):**`, reordenar (Fronteira por último) e conferir labels. Fora do escopo da #327.

## Riscos / notas

- Interceptor em captura quebra se o Material mudar o seletor `.mat-mdc-tab-header-pagination-*` (v20.1.0 pinado) — acceptable.
- `scrollToLabel` anima via `scrollLeft` do Material: compatível com `overflow:hidden` (programático).
- Estado disabled visual do Material pode ficar desatualizado após scroll manual (apenas affordance — chevron apagado é dica, não fonte de verdade); não tratamos.
- Print do usuário em `frontend/shots/bugs/` (gitignored) — entrada da validação "antes".
