# Rotina de regressão visual mobile — print → issue → fix

Este documento é a **rotina operacional** do milestone
[M2: Bugs Visuais & UX Mobile](../../.docs/governance/milestone-file-matrix.md)
(matriz de governança). Segue-a toda vez que um problema visual/mobile for
detectado — por print de celular, por inspeção ou pela suíte Playwright.

## Passo 1 — Captura (evidência)

- **Manual:** print direto do celular do usuário (ou do emulador).
- **Automático:** a suíte gera screenshots full-page em `frontend/shots/`
  nos viewports iPhone 13 (WebKit) e Pixel 7 (Chromium):

```bash
cd frontend && npm run e2e:visual
```

- **Nunca** commite PNGs: `frontend/shots/` é gitignored. Anexe os arquivos
  à issue (drag & drop no GitHub).
- Para telas autenticadas a API precisa estar no ar:
  `docker compose up -d db api` (Postgres do projeto na porta **5433**).

## Passo 2 — Issue no milestone M2

Abra a issue em **M2: Bugs Visuais & UX Mobile (permanente)** com o template
abaixo. Se a correção invadir território de outro milestone (ex.: mexer em
`frontend/e2e/**`, que é M1), deixe um **comentário prévio na issue dona do
território** antes de começar — regra da
[matriz §4.5](../../.docs/governance/milestone-file-matrix.md).

### Template de issue M2

```markdown
## Bug visual mobile — <tela/sintoma>

**Evidências:** <PNGs anexados — antes/depois quando possível>
**Viewport(s) afetado(s):** iPhone 13 / Pixel 7 (ou dispositivo real do print)

**Passos para reproduzir:**
1. ...

**Esperado × Obtido:**

**Fronteira de arquivos:**
<pastas/arquivos que a correção vai tocar — obrigatório>

**Critérios de aceite:**
- [ ] Correção aplicada dentro da fronteira declarada
- [ ] `cd frontend && npm run e2e:visual` verde
- [ ] PNG de antes/depois anexado nesta issue
```

## Passo 3 — Correção atômica

- Branch `feature/<id>-<nome-curto>` + commit vazio + PR **draft** com
  `Resolves #<id>` (padrão-ouro do `manual-protocolos.md`).
- Plano (`plano-<id>-*.md`) aprovado **antes** de codar UI (§8).
- Commits em inglês, atômicos, com `#ID` e What/Why/Testing.
- Universais (`package.json`/lock, `GEMINI.md`) só via **rebase**.

## Passo 4 — Spec de regressão (quando fizer sentido)

- Bug que pode voltar → **spec nova** em `frontend/e2e/` (território M1).
- **Regra:** spec de regressão pode ser criada em uma issue do M2 **apenas
  com comentário prévio na issue M1 correspondente**
  [matriz §4.2](../../.docs/governance/milestone-file-matrix.md).
- A spec deve falhar sem a correção e passar com ela (valide antes do PR).

## Passo 5 — Validação por PNG (antes/depois)

1. Rode `npm run e2e:visual` **antes** da correção (guarda o "antes") e
   **depois** (gera o "depois") em `frontend/shots/`.
2. Compare os dois arquivos visualmente (mesmo viewport) e anexe ambos na issue.
3. Checklist pré-PR da [matriz §7](../../.docs/governance/milestone-file-matrix.md)
   + `npm run build` (produção).

## Comandos úteis

| Comando | O que faz |
|---|---|
| `cd frontend && npm run e2e:visual` | Roda a suíte mobile (2 viewports) e regenera `shots/` |
| `docker compose up -d db api` | Sobe API + Postgres (porta 5433) |
| `npm run build` (em `frontend/`) | Build de produção (pré-PR) |
| `ls frontend/shots/` | Evidências geradas (gitignored) |

## Caso real — faixa de abas da profile-page

Primeiro caso registrado com esta rotina (base do "efeito nativo" mobile):

- **Sintoma:** em viewport mobile a faixa de abas
  (Geral/Contatos/Endereços/Social/Tags & QR) transborda e depende de
  gesto/scroll pouco evidente — setas de navegação pouco visíveis.
- **Evidências já geradas** pela suíte (regeneráveis):
  `frontend/shots/profile-iphone-13-*.png` e
  `frontend/shots/profile-pixel-7-{geral,tags-qr}.png`
  — fonte: `frontend/src/app/features/users/pages/profile-page/profile-page.html`
  (`mat-tab-group`).
- **Fluxo previsto:** abrir a issue no **M2** com os PNGs acima anexados e a
  `**Fronteira de arquivos:**` (provável: `frontend/src/app/features/users/pages/profile-page/**`),
  corrigir seguindo o checklist "nativo" da skill `mobile-native-ux`
  (`.opencode/skills/mobile-native-ux/SKILL.md`) e, se a correção pedir
  proteção de regressão, criar a spec em `frontend/e2e/` **comentando antes
  na issue M1 correspondente** (§4.2).
