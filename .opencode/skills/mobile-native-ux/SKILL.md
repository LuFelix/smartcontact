---
name: mobile-native-ux
description: Use quando for criar ou alterar UI mobile/UX no frontend Angular do SmartContact — abas, scroll, gestures, animações, safe-area, touch targets, teclado, telas responsivas. Padroniza o nível de acabamento "nativo" (iOS HIG × Android Material 3), o loop de validação com npm run e2e:visual e as regras do milestone M2 (evidências em frontend/shots/, issue de bug visual, spec de regressão). Use ONLY em tarefas de interface/UX visual do frontend; não use para backend, testes unitários ou governança pura.
---

# Skill: mobile-native-ux (UX mobile nativo)

## 1. Quando usar

- Criar/editar telas, componentes ou estilos com impacto em **viewport mobile**
  no `frontend/` (abas, scroll, gestures, animações, bottom nav, formulários).
- Corrigir bug visual/UX reportado em issue do milestone **M2**.
- Validar mudanças de UI com a suíte visual do M1.

Fora do escopo: backend, lógica de negócio, testes unitários, CI.

## 2. Contexto do stack (fatos do repo)

| Item | Valor |
|---|---|
| Framework | Angular 20 + **Angular Material** + SCSS (não é Tailwind/shadcn) |
| Validação visual | `cd frontend && npm run e2e:visual` → iPhone 13 (WebKit) + Pixel 7 (Chromium) |
| Evidências | `frontend/shots/*.png` (**gitignored** — nunca commitar PNG) |
| Servidor da suíte | `webServer` do Playwright sobe `npm start` em `localhost:4200` |
| API | `docker compose up -d db api` (Postgres do projeto na porta **5433** — 5432 é do lab mas-ia); porta 3000 |
| Usuário de teste | `admin@smartcontact.com.br` / `Senha@123` (seed) |
| Referência de tela | `frontend/src/app/features/users/pages/profile-page/profile-page.html` (ex.: `mat-tab-group` linha 51) |

## 3. Checklist "nativo" (aplicar antes de dizer que a UI está pronta)

**Viewport e área segura**
- [ ] Alturas com `100dvh`/`100svh`, nunca `100vh` (barra de endereço mobile)
- [ ] `env(safe-area-inset-top/bottom/left-right)` respeitado (notch, home indicator) — usar `viewport-fit=cover` no `<meta viewport>` se usar insets
- [ ] Nada crítico a menos de ~16px das bordas inferiores (área de gesto do sistema)

**Toque e entrada**
- [ ] Alvos de toque ≥ 44×44px (iOS) / 48×48dp (Android), sem elementos colados
- [ ] Inputs com fonte ≥ **16px** (abaixo disso o Safari iOS dá zoom automático no foco)
- [ ] Estados `:hover`/`:active`/focus visíveis; `-webkit-tap-highlight-color` tratado
- [ ] Teclado virtual não cobre bottom nav/CTA (testar com o campo focado)

**Rolagem e faixa de abas**
- [ ] `overscroll-behavior: contain` em áreas com scroll próprio (evita "puxar" a página inteira)
- [ ] Faixa de abas com transbordo rolável (scroll-snap quando fizer sentido) e **setas visíveis** — nunca depender de gesto oculto (bug clássico da profile-page)
- [ ] `scroll-padding`/`scroll-margin` para âncoras e headers sticky não cobrirem conteúdo

**Motion**
- [ ] Durações 200–300ms; curva mais suave/longa no iOS, mais rápida/direta no Android (Material 3 easing)
- [ ] `prefers-reduced-motion: reduce` desliga/anula animações não essenciais
- [ ] Animações usam `transform`/`opacity` (evitar animar `height/top/left` — jank em mobile)

**Visual**
- [ ] Contraste WCAG AA; textos não estouram em 320–430px de largura
- [ ] Imagens/SVGs com dimensionamento estável (sem layout shift)

## 4. Loop de validação (obrigatório)

1. Mudou UI mobile → `cd frontend && npm run e2e:visual` (precisa da API no ar se a tela for autenticada).
2. Conferir os PNGs novos/atualizados em `frontend/shots/` (dois viewports).
3. Bug visual novo → **issue no milestone M2** (permanente) com os PNGs como evidência.
4. **Spec de regressão nova pode ser criada em M2 apenas com comentário prévio na issue M1 correspondente** (fronteira flexível, regra acordada — ver `.docs/governance/milestone-file-matrix.md`).
5. Só então commitar (validação pré-PR + build `npm run build`).

## 5. Guardrails (herdados do `manual-protocolos.md`)

- Toda issue nova precisa do bloco `**Fronteira de arquivos:**`.
- UI não codificada sem `plano-<id>-*.md` aprovado pelo usuário (§8).
- Commits em inglês, atômicos, com `#ID` e What/Why/Testing; nunca em `develop`/`main`.
- Arquivos universais (`package.json`/lock, `GEMINI.md`) só via rebase.
- PNGs de `frontend/shots/` **nunca** entram no repositório.

## 6. Referências

- `.docs/governance/milestone-file-matrix.md` — territórios e precedências
- `manual-protocolos.md` — SOP completo (§2 encerramento, §8 planos)
- `GEMINI.md` — checklist de passos (PASSO AL em diante)
- Evidências vivas: `frontend/shots/` (regeneráveis com `npm run e2e:visual`)
