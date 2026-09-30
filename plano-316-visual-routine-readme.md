# Plano — #316 · FE-QA-003 · Rotina visual print → issue → fix

**Branch:** `feature/316-visual-routine-readme` · **PR:** #322 (`Resolves #316`) · **Milestone:** M1
**Território:** `frontend/e2e/**` ∪ este arquivo
**Aprovação:** concedida pelo usuário na sessão ("vamos em frente com a faxina e o plano").

## Objetivo

Documentar a rotina operacional de correção visual que o M1 passou a viabilizar:
do print à correção validada, com as regras de governança já acordadas.

## Commits atômicos (em inglês, What/Why/Testing, `#316`)

| # | Commit | Conteúdo |
|---|---|---|
| 1 | `chore: initialize branch for Issue #316` | commit vazio |
| 2 | `docs: approve execution plan for Issue #316` | este arquivo |
| 3 | `docs: add visual regression routine readme` | `frontend/e2e/README.md` — fluxo passo a passo, comandos (`npm run e2e:visual`, `frontend/shots/`), template de issue M2 com `**Fronteira de arquivos:**`, regras de spec de regressão e fronteira cruzada com link pra matriz (§4.2, §4.5) |
| 4 | `docs: reference profile-page tabs as first routine case` | mesma seção do README com o **caso real** (abas da profile-page, issue M2 a nascer) como template prático |
| 5 | `chore: final validation and closure of Visual Routine. closes #316.` | encerramento — **após PERGUNTE** |

## Conteúdo do README (critérios de aceite da issue)

1. **Fluxo completo:** captura (celular manual ou `frontend/shots/` via Playwright)
   → issue no **M2** com bloco `**Fronteira de arquivos:**`
   → correção atômica com branch/PR padrão-ouro
   → spec de regressão visual (arquivo novo em `frontend/e2e/` com
   **comentário prévio na issue M1 correspondente**)
   → validação lendo o PNG antes/depois.
2. **Template de issue M2** (título, evidências, fronteira, critérios).
3. **Citação das regras** da matriz com link:
   `.docs/governance/milestone-file-matrix.md` §4.2 (specs de regressão) e
   §4.5 (fronteira cruzada).
4. **Caso real:** faixa de abas da `profile-page` (evidências já geradas em
   `frontend/shots/profile-*.png`) como referência prática.

## Validação

- [ ] Os 3 critérios de aceite da issue presentes no README
- [ ] `git diff --name-only develop...HEAD` ⊆ `frontend/e2e/**` + plano
- [ ] Nenhum workflow, código de produto ou config tocado
- [ ] Suíte intocada (não roda — docs only; checagem de diff basta)

## Fora de escopo

- Qualquer arquivo fora de `frontend/e2e/**`
- Abertura da issue M2 do caso real (é passo do fluxo, não deste documento)
