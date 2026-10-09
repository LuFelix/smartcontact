# 🗺️ Matriz de Independência de Milestones

> **Contrato de leitura obrigatória** (issue #312 / GOV-PLATFORM-001).
> Este documento existe para que **sessões/agentes distintos executem qualquer milestone sem choque de arquivos**. Toda sessão nova é redirecionada para cá pelo topo do `GEMINI.md`.

---

## 1. Checklist pré-execução (antes de rodar QUALQUER milestone)

1. Localize a linha do milestone na **matriz da Seção 3** e anote o território.
2. Leia a **Seção 4 (Conflitos e precedências)** — se houver precedência pendente, execute-a primeiro ou combine por comentário nas duas issues.
3. Antes de **cada PR**: `git diff --name-only develop...HEAD` precisa estar contido em **território ∪ arquivos universais**.
4. Confirme que nenhum PR aberto de outro milestone toca os mesmos arquivos: `gh pr list`.
5. Fora do território? **Pare** — declare a fronteira na issue ou comente na issue do milestone dono antes de seguir.
6. Arquivo universal (Seção 2) → resolve por `git rebase`, nunca por merge manual.

---

## 2. Arquivos universais (rebase obrigatório)

- `backend/package.json`, `backend/package-lock.json`
- `frontend/package.json`, `frontend/package-lock.json`
- `GEMINI.md`
- `plano-<nome-issue>.md` (raiz) — arquivo por issue; somente a própria issue edita o seu

**Pontos de registro/acesso compartilhados** (vários milestones precisam se registrar aqui — só acréscimo aditivo estritamente necessário, uma linha/entrada por issue):

- `backend/src/app.module.ts`, `backend/src/main.ts` (imports, guards, interceptors, providers)
- `frontend/src/app/app.config.ts`, `frontend/src/app/app.routes.ts` (providers e rotas lazy)
- `frontend/index.html` (somente meta tags de política — território de uso do M5)
- `env.example` (somente as variáveis do próprio território)
- `backend/test/smoke/run-all-smoke-tests.sh` (somente a linha de registro do script do próprio módulo)
- `backend/test/smoke/**` — cada módulo cria o **seu** `test-<modulo>-api.sh`; o runner é o único arquivo compartilhado

Regras: só adicionar a dependência/registro estritamente necessário ao próprio território; nunca editar scripts/confs de outros pacotes; conflito de lockfile → `git rebase` + reinstalação limpa (`rm -rf node_modules && npm ci`), **nunca** merge manual de `package-lock.json`. Conflito no `GEMINI.md` ou num ponto de registro → `git rebase` reaplicando a sua linha, **nunca** merge manual.

---

## 3. Matriz milestone → território de arquivos

| Milestone | Território (pastas/arquivos) | Observação |
|---|---|---|
| **M0** Supervisão, Governança & Pipeline CI | `.docs/governance/**`, `.github/workflows/**` (exceto `e2e-mobile.yml`), `manual-protocolos.md`, `manual-issues.md`, `issues-*.js` | **Proibido** `frontend/src`, `backend/src`. Herda a #259 (CI de cobertura). |
| **M1** Testes Visuais Mobile (Playwright) | `frontend/playwright.config.ts`, `frontend/e2e/**`, `shots/**` (gitignored), `.github/workflows/e2e-mobile.yml` | `frontend/package.json` é universal (Seção 2). Specs de regressão criadas pelo M2 entram aqui (§4.2). |
| **M2** Bugs Visuais & UX Mobile (permanente) | Declarado **por issue** na seção `**Fronteira de arquivos:**` | Cross-cutting: pode tocar qualquer arquivo de produto **desde que** declare a fronteira e comente previamente na issue do milestone dono do território (§4.5). |
| **M3** Billing & Planos de Cobrança | `backend/src/billing/**`, `backend/migrations/billing/**`, `frontend/src/app/features/billing/**`, `libs/billing-shared/**` | Go-to-Market (#349–#354). Não altera `backend/src/users/**` nem `backend/src/auth/**` — assinatura resolve por tabela própria (`subscription` por `tenant_id`). |
| **M4** LGPD & Proteção de Dados | `backend/src/lgpd/**`, `backend/migrations/lgpd/**`, `frontend/src/app/features/lgpd/**`, `docs/lgpd/**` + **aditivo** em `frontend/src/app/features/auth/register/**` | (#355–#361). Leitura dos demais módulos **somente via repositórios TypeORM** (sem editar `users`, `auth`, `interaction-logs`). |
| **M5** Segurança & Pentest | `scripts/security/**`, `backend/src/security/**`, `backend/migrations/security/**`, `.github/dependabot.yml`, `docs/security/**` | (#362–#368). **Proibido** `.github/workflows/**` (M0) — ativação dos scripts é issue M0 com comentário cruzado na #363. `frontend/index.html` só meta de política (§2). |
| **M6** Core Unification (× mas-ia) | `libs/**` (auth-core, permissions-core, abac-engine, observability-core), `docs/architecture/**` | (#369–#375). Cross-cutting de **criação**: só cria libs/docs. A **adoção** no código de produto acontece via issue do milestone consumidor com fronteira + comentário cruzado (§4.5). |
| **Agentes do projeto (opencode)** | `.opencode/**` (skills, agents, commands, plugins) | Artefato de agente: segue o protocolo normal de issue/PR, **não** é universal (sem rebase) e não mistura com código de produto numa mesma issue. |
| **Backlog** | Triagem | Issue só sai daqui **para um milestone** antes de virar trabalho. |
| *Futuros milestones de produto* | A definir na abertura do milestone | Ex.: `features/users/**`, `features/dashboard/**` — sempre com linha nova nesta tabela. |

---

## 4. Conflitos conhecidos e precedências obrigatórias

1. **#259 (M0) e FE-QA-004 (M1) são independentes:** workflows distintos — a #259 cria o pipeline de cobertura, a FE-QA-004 cria `.github/workflows/e2e-mobile.yml`. Podem rodar em paralelo; **nunca** edite o arquivo de workflow do outro milestone.
2. **Specs de regressão visual:** o M2 pode **criar** arquivo novo de spec em `frontend/e2e/**` para a tela que corrigiu, desde que (a) declare os dois arquivos na fronteira e (b) comente previamente na issue M1 correspondente. **Editar** spec existente do M1 exige combinado na issue.
3. **`GEMINI.md` é universal:** toda issue edita (bullet no checklist de passos). Conflito → `git rebase`, um bullet por milestone/issue.
4. **`plano-<nome-issue>.md`:** cada issue tem o seu na raiz — zero conflito por construção. Nunca reaproveite o plano de outra issue.
5. **Bugs visuais são cross-cutting (padrão CODEOWNERS):** não se impede o toque no arquivo, exige-se fronteira declarada + aprovação (comentário) de quem é dono do território. Sem comentário prévio, o PR é bloqueado no checklist (Seção 7).
6. **Arquivos universais de lockfile** só via rebase (Seção 2).
7. **M3 × M4 × M5 (produto paralelo):** territórios disjuntos por construção — billing não toca LGPD, LGPD não toca segurança etc. `backend/src/users/**` e `backend/src/auth/**` são **código compartilhado sem dono**: M3 e M4 operam sem alterá-los (M3 = tabelas próprias de assinatura; M4 = leitura via repositórios; consentimento no registro = aditivo §2). Precisou tocar? Declare a fronteira e comente na outra issue antes do PR.
8. **M5 × M0 (workflows):** o M5 só **entrega** `scripts/security/**` + snippet em `docs/security/`. A ativação em `.github/workflows/**` é issue do **M0**, que comenta na **#363** (BE-SEC-002) — e vice-versa: o M0 não inventa regra de segurança sem a doc do M5.
9. **M6 × consumidores (adoção):** o M6 **nunca** edita `backend/src/**` nem `frontend/src/**`. A troca de implementação por `@smartcontact/*` é issue do consumidor com `**Fronteira de arquivos:**` + comentário prévio na issue M6 correspondente (padrão §4.5). Bloqueio interno do M6: **#369 (ADR) aprova antes de #371/#373/#374/#370/#375**.
10. **Dependências de sequência entre issues do mesmo milestone** (billing: #349 → #351/#353 → #350/#352/#354; LGPD: #355/#359 → #356 → #358/#361; segurança: runner do #363 antes do #366) são internas ao milestone — não afetam o paralelismo **entre** milestones.
11. **Registro em `run-all-smoke-tests.sh`:** linha aditiva por módulo, resolvida por rebase (Seção 2).

---

## 5. Ordem recomendada (livre fora as precedências)

```
M0 (governança e CI base, zero choque com produto)
  → M1 (setup de QA visual — desbloqueia a validação das telas)
    → M2 (bugs visuais — primeiro caso: abas da profile-page)
  → M3 Billing · M4 LGPD · M5 Segurança · M6 Core Unification
      (4 tracks PARALELOS — territórios disjuntos Seção 3; precedências internas na Seção 4.7-4.11)
      M6: #369 (ADR) bloqueia as demais issues do M6
      M4: #355/#359 (ROPA/docs) antes dos endpoints
```

---

## 6. Regra geral de fronteira (padrão para issues novas)

Todo corpo de issue de feature/fix deve declarar a seção **`**Fronteira de arquivos:**`** listando pastas/arquivos que a execução pode tocar (o template está no `manual-issues.md`). Milestones **cross-cutting** (M2 bugs, e no futuro styles/design-system) nunca editam o território de um milestone de produto sem comentário cruzado nas duas issues.

---

## 7. Verificação obrigatória pré-PR (copie para o checklist do PR)

- [ ] `git diff --name-only develop...HEAD` ⊆ território ∪ arquivos universais
- [ ] `gh pr list` — nenhum PR aberto edita os mesmos arquivos (ou combinado por comentário)
- [ ] Conflitos da Seção 4 verificados para o meu milestone
- [ ] `**Fronteira de arquivos:**` declarada no corpo da issue e contém todos os arquivos do diff
- [ ] Lockfile resolvido por rebase, nunca por merge manual
