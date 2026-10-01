# Plano — #327 · Faixa de abas nativa na profile-page (entrega UAU)

**Branch:** `feature/327-profile-tabs-native` · **PR:** #328 (`Resolves #327`) · **Milestone:** M2 (permanente)
**Território:** `frontend/src/app/features/users/pages/profile-page/**` ∪ este arquivo
**Skill aplicada:** `mobile-native-ux` (seção 3 — "Rolagem e faixa de abas")
**Aprovação §8:** pendente de confirmação do usuário nesta rodada.

## Diagnóstico (inspeção real, não chute)

Medições no runtime (Chromium Pixel 7, 412px, dev server + login seed):

| Fato | Valor |
|---|---|
| Largura da lista de abas | 524px (5 abas: 90+108+121+91+115) |
| Viewport da faixa (`.mat-mdc-tab-label-container`) | 306px — recorta **meio-das-letras** (`Er…`, `s`) |
| Setas (`.mat-mdc-tab-header-pagination`) | 36×49px — **abaixo do mínimo de 44px** |
| `aria-label` das setas | ausente (null) |
| Estrutura DOM | `mat-tab-header > [pagination-before] + .mat-mdc-tab-label-container + [pagination-after]` — o fade pode ir no container **sem tocar nas setas** |
| Evidências | `frontend/shots/profile-{iphone-13,pixel-7}-{geral,tags-qr}.png` |

Problemas: (1) corte duro sem affordance de "tem mais rolagem";
(2) alvos de toque pequenos/estados fracos; (3) nada sinaliza o gesto
horizontal. Fora do escopo desta issue: sobreposição do botão "Testar
Configuração"/FAB (issue M2 separada).

## Mudança (CSS puro, 1 arquivo)

`profile-page.scss`, seguindo a convenção `::ng-deep` do repo:

1. **Fade de transbordo** em `.mat-mdc-tab-label-container`:
   `mask-image`/`-webkit-mask-image` com gradiente horizontal simétrico
   (~20px em cada ponta) → o texto recortado vira "continua pra lá",
   nunca letra solta colada na seta.
2. **Setas ≥44px**: `min-width: 44px` em `.mat-mdc-tab-header-pagination`;
   chevron reforçado via `mask` + `background-color: currentColor`
   (respeita o dark mode do app); `:active` com `transform: scale(0.92)`
   150ms (ripple do Material já existe).
3. **Checklist da skill**: `overscroll-behavior-x: contain` no viewport da
   faixa; `-webkit-tap-highlight-color` tratado; `@media
   (prefers-reduced-motion: reduce)` anula as transições novas;
   transições 200–300ms com curva suave.
4. Nada de `100vh`, nenhum JS novo, nenhum template novo (DOM do Material
   intacto — setas continuam funcionando pelo próprio componente).

## Commits atômicos

| # | Commit | Conteúdo |
|---|---|---|
| 1 | `chore: initialize branch for Issue #327` | commit vazio |
| 2 | `docs: approve execution plan for Issue #327` | este arquivo |
| 3 | `fix(profile-page): add native overflow affordances to tab strip` | mudanças no `profile-page.scss` |
| 4 | `docs: record native tab strip step in GEMINI.md` | PASSO AS (après PASSO AR da #324) |
| 5 | `chore: final validation and closure of Native Tab Strip. closes #327.` | encerramento — **após PERGUNTE** |

## Validação (loop obrigatório da skill §4)

- [ ] `cd frontend && npm run e2e:visual` → 6/6 verde (iPhone 13 WebKit + Pixel 7 Chromium)
- [ ] Conferir PNGs novos: fade visível, setas maiores, sem letra cortada feia
- [ ] `npm run build` (produção) passa
- [ ] Checklist nativo: alvo ≥44px ✓, reduced-motion ✓, overscroll ✓,
      gesto não é mais a única via de navegação
- [ ] Diff dentro da fronteira (1 SCSS + plano + GEMINI no encerramento)

## Fora de escopo

- Sobreposição "Testar Configuração"/FAB → issue M2 própria
- Spec de regressão nova → só com comentário prévio na #315 (matriz §4.2)
- Ajustar largura/padding das abas (mudaria o layout desktop)

## Aditivo — pedido do usuário na revisão do shot dark (2026-09-30)

Escopo alargado (mesma fronteira, mesmos arquivos, continua **só CSS**):

1. **Setas "ruim como um todo"** → viram chips circulares 44×44 com superfície
   (`surface-container-high`), chevron 10px; disabled agora apaga só o chevron
   (0.38) e mantém o chip visível (afordância permanece).
2. **Rolagem melhor / tap-to-scroll** → `touch-action: pan-y` no header
   (gesto horizontal reservado ao swipe do Material, vertical continua
   rolando a página nativamente); tap em aba parcialmente visível já rola
   animado para ela (comportamento nativo do Material preservado).
3. **Avatar grande ocupa espaço** → no mobile (≤768px): avatar 160→112px,
   header 40→24px de padding, título 2.25→1.75rem, gaps reduzidos — a faixa
   e o conteúdo sobem ~80px (melhora também o shot iPhone da evidência).
4. **Botões estourando texto** → é o overlap "Testar Configuração" = issue
   **#329** (PR separado, faixa de issues do M2).

Commits continuam os mesmos do plano (item 3 absorve o aditivo).

## Aditivo 2 — iteração de feedback ao vivo (2026-09-30, após merge visual dos chips)

Teste real do usuário (container `:4200`, S25 305×780, prints em
`frontend/shots/bugs/`): "apenas as setas agora são botões, mas tem que rolar a
tela e depois clicar na aba; o ideal é tap + setas rolando as abas como
carrossel".

### Diagnóstico runtime (Playwright no dev server)

| Fato | Valor |
|---|---|
| `.mat-mdc-tab-label-container` | 202px, `overflow: hidden` — **não há scroller nativo horizontal**; o Material rola só programaticamente |
| Setas do Material | `next()/previous()` calculam o alvo pela **aba selecionada**, não pela janela visível → com "Geral" selecionada ≈ no-op |
| Swipe horizontal | sem handler no Material v20; `touch-action: pan-y` deixa o gesto sem dono → morre |
| Scroll container da página | **`.page-content`** (`overflow-y: auto`), não a `window` |
| Assassino do sticky | `mat-card.profile-card` com `overflow: hidden` (corte dos cantos 32px) — sticky morre dentro de ancestor com overflow ≠ visible |

### Mudanças (approved pelo usuário: sticky = sim, passo = ~2 abas por tap)

1. **F1 setas = carrossel** (`html` + `ts`): interceptor em captura no
   `.mat-mdc-tab-header`; alvo calculado pela **janela visível**
   (revela ~2 abas) via API pública `MatTabHeader.scrollToLabel()`; no limite →
   no-op. TDD (RED→GREEN).
2. **F2 swipe 1:1** (`ts`): `touchstart/touchend` no
   `.mat-mdc-tab-label-container`; `|dx| > 32px && |dx| > 1.2|dy|` →
   `scrollBy({left: dx, behavior: smooth})`; `touch-action: pan-y` permanece
   (vertical segue nativa). TDD (RED→GREEN).
3. **F3 sticky no mobile ≤768px** (`scss`): `position: sticky; top: 0; z-index: 3`
   + fundo `--mat-sys-surface-container` no `.mat-mdc-tab-header`; **e**
   `.profile-card { overflow: visible }` só no mobile (desktop mantém o
   clipping dos cantos) + `border-radius` compensatório no
   `.profile-card-header`. App bar fica fora do scroller → `top: 0` segura a
   faixa abaixo dela.
4. **Regressão**: spec "arrow scrolls the tab strip" + spec de swipe
   (`profile-page.spec.ts`); `npm run test` (95%+), `npm run build`,
   `npm run e2e:visual` 6/6, runtime 2 dispositivos × claro/escuro.

Commits da iteração (α atômica, inglês, What/Why/Testing):
`docs:` (este aditivo) → `feat(327)` setas → `feat(327)` swipe →
`feat(327)` sticky → encerramento §2.
