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
