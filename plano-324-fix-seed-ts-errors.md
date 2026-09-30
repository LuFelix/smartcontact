# Plano — #324 · Fix dos erros de TS que quebram `npm run seed`

**Branch:** `feature/324-fix-seed-ts-errors` · **PR:** #325 (`Resolves #324`) · **Milestone:** Backlog
**Território:** `backend/src/interaction-logs/**` ∪ este arquivo
**Aprovação:** ordem de execução aprovada pelo usuário ("faça na melhor ordem
(segurança e estabilidade) mas com foco na entrega do UAU").

## Problema

`npm run seed` (ts-node, typecheck real) falha em banco novo:
`interaction-logs.service.ts(95,7)` TS2820 (`'Desktop'` fora do union
`DeviceTypes` do ua-parser-js) e `(100,14)` TS2322 (`string | undefined`).
O app normal não vê isso porque roda com **SWC** (transpile sem typecheck).

## Commits atômicos

| # | Commit | Conteúdo |
|---|---|---|
| 1 | `chore: initialize branch for Issue #324` | commit vazio |
| 2 | `docs: approve execution plan for Issue #324` | este arquivo |
| 3 | `fix(backend): annotate device type to keep seed compiling` | anotação `string \| undefined` em `parseMetadata` — **mantém** os valores capitalizados (`Desktop`/`Mobile`/`Tablet`) usados na analytics |
| 4 | `chore: final validation and closure of Seed TS Fix. closes #324.` | encerramento — **após PERGUNTE** |

## Por que anotar e não trocar por 'desktop'

A coluna `deviceType` já gravou `Desktop`/`Mobile`/`Tablet` em produção;
mudar o valor para o union minúsculo mudaria a semântica dos dados. A anotação
é o fix mínimo sem alterar comportamento.

## Validação

- [ ] `docker compose exec -T api npm run seed` → compila e roda sem TSError
      (gate real do problema reportado)
- [ ] `npx tsc --noEmit` → **zero erros em `src/interaction-logs/**`**
- [ ] Erros restantes do `tsc` são todos pré-existentes em **specs**
      (`analytics.service.spec.ts`, `users.service.spec.ts`) → issue separada
      no backlog (fora desta fronteira)
- [ ] Diff = 1 arquivo de código + plano

## Fora de escopo

- Specs do backend com erro de TS (issue nova no backlog)
- Remover o `--transpileOnly` da CI (`.github/workflows/`, território M1 —
  workaround documentado e inofensivo; limpeza opcional futura)
