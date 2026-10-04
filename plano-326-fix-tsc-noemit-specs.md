# Plano — #326 · Fix dos erros de `tsc --noEmit` em 2 specs do backend

**Branch:** `feature/326-fix-tsc-noemit-specs` · **PR:** #341 (`Resolves #326`) · **Milestone:** Backlog
**Território (fronteira da issue):** `backend/src/**/*.spec.ts` ∪ este arquivo
**Aprovação:** ordem de execução pendente de aprovação do usuário (protocolo §8).

## Problema

`npx tsc --noEmit` no backend falha com **7 erros TS2339** — todos em specs, nenhum
em código de produção (o app roda com SWC, transpile sem typecheck):

| Arquivo | Linhas | Erro |
|---|---|---|
| `analytics.service.spec.ts` | 50 | `summary.byCity` não existe no tipo — `getSummary` retorna **união**: `emptySummary()` (service:20) \| resumo completo com geodados (service:43) |
| `users.service.spec.ts` | 682, 683, 692, 693, 694, 703 | `mockResolvedValue` não existe em `findOne` — os repositórios são declarados como `Repository<User>`/`Repository<Tag>` **reais**, mas o módulo de teste injeta mocks (`vi.fn()`) |

Reproduzido nesta branch: `npx tsc --noEmit --incremental false` → 7× TS2339, exit 2.

### Ajuste de ambiente (não é código)

`backend/dist/` é **root-owned** (criado pelo container) e o `tsconfig` tem
`incremental: true` → `tsc` tenta gravar `dist/tsconfig.tsbuildinfo` e falha com
`TS5033 EACCES`, mascarando os erros reais. Validação local usa
`npx tsc --noEmit --incremental false` (testado: ignora o tsbuildinfo e mostra os
7 erros). Validação canônica da issue continua sendo
`docker compose exec -T api npx tsc --noEmit` (dentro do container não há EACCES).

## Commits atômicos

| # | Commit | Conteúdo |
|---|---|---|
| 1 | `chore: initialize branch for Issue #326` | commit vazio (feito na abertura da branch) |
| 2 | `docs: approve execution plan for Issue #326` | este arquivo, isolado |
| 3 | `test(backend): type narrowing for geo summary assertion in analytics spec` | fix do erro de união no `analytics.service.spec.ts` |
| 4 | `test(backend): type repository mocks correctly in users service spec` | fix dos 6 erros de `mockResolvedValue` no `users.service.spec.ts` |
| 5 | `chore: final validation and closure of TSC NoEmit Specs Fix. closes #326.` | encerramento — **após PERGUNTE** |

## Estratégia de fix (só specs, zero mudança em código de produção)

### A. `analytics.service.spec.ts:50` — narrowing sem cast

```ts
if (!('byCity' in summary)) {
  throw new Error('esperava o resumo completo com geodados');
}
expect(summary.byCity).toEqual([...]);
```

Narrowing `in` sobre a união — elimina o erro de tipo, não introduz `any` nem
`as` e mantém a asserção idêntica. **Fallback** (se a união não fechar bem):
`Extract<Awaited<ReturnType<AnalyticsService['getSummary']>>, { byCity: unknown }>`.

### B. `users.service.spec.ts` — tipar os mocks de repositório

Dois candidatos, decididos por spike (menor diff que zerar o typecheck):

- **Opção A (preferida):** declarar `usersRepository`/`tagRepository` como
  `Mocked<Repository<T>>` (vitest) e ajustar os 7 call sites com cast mínimo
  `{ id: 'user-1', ownerId: 'owner-1' } as unknown as User`.
- **Opção B (fallback):** manter `Repository<T>` na declaração e castar só o
  método nos call sites:
  `(usersRepository.findOne as unknown as Mock).mockResolvedValue(...)`.

Regra: A se não gerar novos erros de tipo; caso gere, B (diff menor e sem
brigar com as sobrecargas do TypeORM `findOne`).

## Validação

- [ ] `npx tsc --noEmit --incremental false` → **zero erros** (hoje: 7)
- [ ] `docker compose exec -T api npx tsc --noEmit` → **zero erros** (gate da issue)
- [ ] `npm run test` (Vitest, suíte completa) → verde, sem regressão de comportamento
- [ ] Diff restrito a `backend/src/analytics/analytics.service.spec.ts`,
      `backend/src/users/users.service.spec.ts` e este plano
- [ ] Nenhum arquivo de produção (`*.service.ts`, `*.controller.ts`) alterado

**TDD:** a fase RED é o próprio `tsc --noEmit` (7 erros documentados acima);
GREEN = exit 0. Os testes de comportamento já existem e permanecem verdes.

## Fora de escopo

- Débito de lint do backend (575 erros `no-unsafe-*`, pré-existentes) → issue **#259**
- `backend/dist/` (root-owned, gitignored) — resolvido só na validação local
- `.github/workflows/**` (território M0) — o `--transpileOnly` do seed segue
  até a barreira de cobertura da #259
