# Plano de Execução — Issue #312
## Matriz de Independência de Milestones e Regras de Paralelismo

---

## 1. Contexto

O repositório passará a ter múltiplos agentes executando milestones em paralelo
(M0 Supervisão, M1 Testes Visuais Mobile, M2 Bugs Visuais & UX Mobile).
Sem contrato de território, os arquivos da raiz editados por toda issue
(`GEMINI.md`, `plano.md`) e os workflows de CI viram pontos de colisão.

Padrão de referência: `.docs/governance/milestone-file-matrix.md` do mas-ia
(issue #468 / PR #476).

## 2. Plano de Ação (Commits Atômicos)

| # | Commit | Arquivo(s) |
|---|---|---|
| 1 | `docs: approve execution plan for Issue #312` | `plano-312-matriz-independencia-milestones.md` (isolado, sem código) |
| 2 | `docs: add milestone independence matrix for parallel agents` | `.docs/governance/milestone-file-matrix.md` |
| 3 | `docs: scope plans to plano-<issue>.md in protocol §8` | `manual-protocolos.md` |
| 4 | `docs: add milestone contract pointer and universal-file rule to GEMINI.md` | `GEMINI.md` |

### Conteúdo da matriz (7 seções)
1. Checklist pré-execução.
2. Arquivos universais → `git rebase` obrigatório, nunca merge manual:
   `backend/package.json`, `backend/package-lock.json`,
   `frontend/package.json`, `frontend/package-lock.json`, `GEMINI.md`.
3. Territórios por milestone (M0/M1/M2/Backlog).
4. Conflitos e precedências (#259 × FE-QA-004 independentes por arquivo;
   specs de regressão criadas pelo M2 com comentário no M1).
5. Ordem recomendada.
6. `**Fronteira de arquivos:**` obrigatória no corpo de toda issue.
7. Checklist pré-PR.

### Territórios declarados
- **M0:** `.docs/governance/**`, `.github/workflows/**` (exceto
  `e2e-mobile.yml`), `manual-protocolos.md`, `manual-issues.md`, `issues-*.js`.
  PROIBIDO `frontend/src`, `backend/src`.
- **M1:** `frontend/playwright.config.ts`, `frontend/e2e/**`, `shots/**`
  (gitignored), `.github/workflows/e2e-mobile.yml`.
- **M2:** declarado por issue (`**Fronteira de arquivos:**`); cross-cutting;
  pode criar spec nova de regressão com comentário prévio na issue M1.

## 3. Testes / Validação

- Documentação pura: validação por revisão de leitura (estrutura 7 seções,
  links do ⚠️ apontando para o caminho correto).
- `npm run build` não se aplica (nenhum arquivo de código alterado).
- Checklist pré-PR da própria matriz aplicado antes do push.

## 4. Fora de escopo

- Criação das issues do M1 (Fase 1 — issue dedicada).
- Setup do Playwright (FE-QA-001).
- Alterações em `frontend/src` ou `backend/src`.
