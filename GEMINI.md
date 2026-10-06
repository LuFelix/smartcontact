# 🚀 SmartContact - Diretrizes de Engenharia e Contexto da Missão

Este arquivo é a fonte da verdade para todos os agentes Gemini CLI que atuarem neste repositório. As instruções abaixo têm **precedência absoluta**.

> **⚠️ CONTRATO DE EXECUÇÃO DE MILESTONES (issue #312):** ANTES de iniciar qualquer milestone ou issue de feature, leia `.docs/governance/milestone-file-matrix.md` — matriz de território de arquivos por milestone (M0 Supervisão, M1 Testes Visuais Mobile, M2 Bugs Visuais & UX Mobile), precedências obrigatórias, arquivos universais (`package.json`/lockfiles e este `GEMINI.md` — conflito resolve por `git rebase`, nunca merge manual), seção `**Fronteira de arquivos:**` obrigatória no corpo de toda issue e checklist pré-PR. Ela impede choques de arquivo entre milestones executados por sessões/agentes distintos: **issue de um milestone jamais edita o território de outro milestone.**

## 🎯 1. O que é o Sistema?
O **SmartContact** resolve a fricção do networking físico através de **Cartões de Visita Digitais Inteligentes**. 
- O usuário possui uma Tag (NFC ou QR Code).
- O sistema gerencia o redirecionamento dinâmico (Perfil, WhatsApp, vCard).
- **Missão B2B:** Atualmente estamos construindo a camada de Workspace, onde um Administrador (ex: TIWEB) gerencia Turmas/Tags e delega acesso a esses recursos para Membros/Vendedores através de travas **ABAC**.

---

## 🏗️ 2. Arquitetura Multi-Tenant N:N (CRÍTICO)
O sistema opera em um paradigma Multi-Tenant N:N (estilo Google Drive).

### 🔑 Identidade vs Contexto
- **Usuários são Globais:** Um único e-mail permite login no sistema todo.
- **Permissões são Locais:** As roles e o acesso a recursos são definidos pela tabela pivot `memberships`.
- **Contexto Dinâmico:** O Backend resolve a role do usuário em tempo real via `JwtStrategy` baseada no header `X-Tenant-ID`.

### 👥 Tipos de Membros no Workspace
1. **Dono (Owner):** Criador do Workspace.
2. **Equipe (Member):** Possui um `profile_id` vinculado na membership. Aparece na gestão de equipe.
3. **Usuário Standard:** Possui membership no tenant mas `profile_id` é null. Acesso apenas ao painel básico.
4. **Lead:** Role 'contato' (sem senha), capturado via perfil público e exibido no menu "Meus Leads". Torna-se **Contato** após a sincronização com o Google através do botão de envio presente em cada card.

---

## 🎨 3. Padrões de Interface (CRÍTICO)

### 🌓 Theming e Cores
- **Regra:** NUNCA use cores fixas (Hexadecimal, RGB, RGBA ou nomes de cores).
- **Padrão:** Use estritamente os **Design Tokens** do Angular Material 3.

### 🖼️ Modais e Layout
- **Dimensões:** As modais administrativas devem ser espaçosas (900px-1000px).
- **Abertura:** Sempre use `panelClass: 'large-abac-modal'` e `{ autoFocus: false }`.

---

## 🛠️ 4. Estado Atual da Missão (Passo a Passo)

- [x] **PASSO G (Issue #132):** Refinamento da Modal ABAC (OK).
- [x] **PASSO H (Issue #125):** Painel ABAC com Configuração NFC/QR (OK).
- [x] **PASSO I (Issue #15):** Integração 'Salvar Contato' com vCard (OK).
- [x] **PASSO N (Issue #164):** Context Switcher e Arquitetura Multi-Tenant N:N (OK).
- [x] **PASSO O (Issue #156):** Estabilização - Auto-verificação, Prompt Promoção, Visibilidade Básica (OK - no remoto).
- [x] **PASSO P (Issue #173):** Fix Tags tab permanently disabled in User Modal (OK).
- [x] **PASSO Q (Issue #216):** Self-ownership bypass for profile and tag editing in multitenant context — JwtStrategy, UsersService, TagsService + CPF empty string fix (OK).
- [x] **PASSO R (Issue #224):** Reestruturar profile-page.html com layout de abas (tabs) — template adaptado da modal user-details (OK).
- [x] **PASSO S (Issue #225):** Adaptar profile-page.ts — limpeza de imports não utilizados, zero mudanças funcionais (OK).
- [x] **PASSO T (Issue #231):** Per-tenant tag filtering — findById() com QueryBuilder, update() busca tag por tenant, upsert em createDefaultTag(), @Unique(['userId', 'tenantId']). QR/NFC URLs unificadas (UUID para QR/NFC, handle para source=link). Botão Gravar Chip NFC na modal de contatos. Fix: botão "Testar Configuração" agora usa source=qr para respeitar o dropdown de QR redirect (PR #233) (OK).
- [x] **PASSO U (Issue #237):** Correção de colisão e persistência de configurações de tags NFC/QR no perfil — atualização de tags por ID no backend e filtro de tag pessoal (!isResource) no frontend (PR #240) (OK).
- [x] **PASSO V (Issue #239):** Estruturação e Padronização da Documentação Técnica (FE/BE) — consolidação de sumários modulares das features e guias de especificações detalhadas de apoio (PR #241) (OK).
- [x] **PASSO W (Issue #238):** Upgrade do Dashboard - Histórico Detalhado de Leituras de Tags (OK).
- [x] **PASSO X (Issue #243):** Setup do ApexCharts e Série Temporal com Filtro de Período (OK).
- [x] **PASSO Y (Issue #244):** Painel de Gráficos - Evolução Temporal e Rosca de Origens (OK).
- [x] **PASSO Z (Issue #245):** Dashboard B2B - Ranking de Engajamento de Membros da Equipe (OK).
- [x] **PASSO AA (Issue #255):** Configuração da Infraestrutura de Testes com Vitest no Backend (OK).
- [x] **PASSO AB (Issue #256):** Migração e Setup da Suite de Testes do Frontend para Vitest (OK).
- [x] **PASSO AC (Issue #257):** Implementação de Testes Unitários e Integração no Backend com 95% de Cobertura (OK).
- [x] **PASSO AD (Issue #258):** Implementação de Testes Unitários no Frontend - Vitest setup estabilizado (pool forks), 17 arquivos e 44 specs verdes (100% de sucesso), e cobertura fina de core services e smart components (OK).
- [x] **PASSO AE (Issue #267):** Correção de Colisão e Fallback de Tags do Perfil — QueryBuilder com OR no findById, defaultTag global no UsersService e restrição isResource no resolveTag (OK).
- [x] **PASSO AF (Issue #270):** Lazy-Create & Fallback de Perfil de Dono — Garantia de tag pessoal ativa no Workspace de contexto B2B e fallback de perfil para manter consistência visual (OK).
- [x] **PASSO AG (Issue #286):** Fix do Erro 500 no Salvamento de Perfil (Falso Negativo) — Isolamento correto do ownerId no interceptor/jwt strategy. (OK).
- [x] **PASSO AH (Issue #297):** Hotfix de Build e Strict Dependencies (TypeORM) — Migração do backend para SWC Compiler resolvendo crash silencioso no boot do Node 20+ (OK).
- [x] **PASSO AI (Issue #299):** Arquitetura de Identidade Multi-Tenant — Sincronização contínua do nome global (User) via Google Auth isolada do apelido contextual de terceiros (Membership.alias) (OK).
- [x] **PASSO AJ (Issue #302):** Backend Analytics — Captura de GeoIP persistida na TagReadLog via `geoip-lite` e extração robusta de User-Agent via `ua-parser-js`, com agregações por cidade, estado e país (OK).
- [x] **PASSO AK (Issue #303):** Frontend Dashboard Analytics — Interface B2B de alto impacto com novos painéis gráficos de Dispositivos (Mobile/Desktop), Navegadores e Ranking de Regiões utilizando ApexCharts integrado (OK).
- [x] **PASSO AL (Issue #312):** Governança de Paralelismo Multi-Agente — Matriz de Independência de Milestones (`.docs/governance/milestone-file-matrix.md`) com territórios M0/M1/M2, arquivos universais resolvidos por rebase (`package.json`/lockfiles + `GEMINI.md`), `**Fronteira de arquivos:**` obrigatória no corpo de toda issue, plano por issue (`plano-<nome-issue>.md`) e sync do `manual-protocolos.md` com o baseline do mas-ia (novo passo de `gh pr ready` + remoção de `WIP:` no encerramento) (PR #313) (OK).
- [x] **PASSO AM (Issue #314):** Setup do Playwright Mobile (QA Visual) — `@playwright/test` 1.63 no frontend, projects **iPhone 13 (WebKit/Safari)** e **Pixel 7 (Chromium)** com DPR real, `webServer` sobre o `npm start` em `localhost:4200`, spec smoke da landing, screenshots full-page em `frontend/shots/` (gitignored) e script `npm run e2e:visual` — 2/2 testes verdes (PR #318) (OK).
- [x] **PASSO AN (Issue #315):** Smoke autenticada da profile-page — login pela UI com o admin seed e captura das abas **Geral** e **Tags & QR** em iPhone 13 e Pixel 7 (`frontend/e2e/smoke-profile.spec.ts`, 4 PNGs de evidência), suite completa em 6/6 com `workers: 1` (paralelismo saturava a máquina e causava `EAI_AGAIN db`/HTTP 500 no login) — base visual para a meta de UX mobile "efeito nativo" (PR #319) (OK).
- [x] **PASSO AO (Issue #320):** Skill `mobile-native-ux` — pacote de instruções `.opencode/skills/mobile-native-ux/SKILL.md` com gatilho de UI mobile, checklist "nativo" (dvh/safe-area/16px/44px/overscroll/scroll-snap/reduced-motion), loop de validação com `e2e:visual` e regras do M2; território `.opencode/**` registrado na matriz de governança (PR #321) (OK).
- [x] **PASSO AP (Issue #316):** Rotina visual print → issue → fix — `frontend/e2e/README.md` com o fluxo completo (captura → issue M2 com `**Fronteira de arquivos:**` → fix → spec de regressão com comentário prévio na M1 → validação PNG antes/depois), template de issue e o caso real das abas da profile-page (PR #322) (OK).
- [x] **PASSO AQ (Issue #317):** CI Playwright mobile — `.github/workflows/e2e-mobile.yml` independente (§4.1, `deploy.yml` intocado): gatilhos paths do território M1 + `workflow_dispatch`, Node 20, `.env` dummy, stack completo (`db`+`api`), seed transpile-only (contorna os 2 erros de TS pré-existentes, issue #324), gate de login 201, `npm ci --legacy-peer-deps`, Chromium+WebKit e os 6 testes — **run verde em 46.2s de suite** (PR #323) (OK).
- [x] **PASSO AR (Issue #324):** Seed typecheck — anotação `string | undefined` em `interaction-logs.service.ts:92` destrava `npm run seed` em banco novo (era o único `tsc` erro no caminho do seed); validação `npm run seed` → `Seeding completo!` exit 0 sem workaround; erros restantes do typecheck total (specs) viraram backlog **#326** (PR #325) (OK).
- [x] **PASSO AS (Issue #327):** Faixa de abas nativa na profile-page — `profile-page.scss` sob `:host` (sem vazamento pros 3 componentes admin com `mat-tab-group`): fade direcional por `mask-image` (cristolino nas pontas via `:has` no estado disabled), setas **44×49px** com chevron 10px `currentColor` (dark/light), press feedback + `prefers-reduced-motion`, disabled 0.38; validação suíte **6/6** + dark mode nos dois aparelhos + `npm run build` (PR #328) (OK).
- [x] **PASSO AT (Issue #329):** Fix do botão 'Testar Configuração' sobrepondo título no card NFC vs QR — empilhamento flexbox vertical no mobile (≤768px) em `.header-with-action`, padding responsivo do card e validação com suíte Playwright 6/6 (PR #331) (OK).
- [x] **PASSO AU (Issue #330):** UX Mobile - Header ultra-compacto e faixa de abas na profile-page — layout inline no mobile (≤768px) com avatar 64px + botão compacto, redução de padding do container e ganho de ~260px verticais; validação suíte Playwright 6/6 (iPhone 13 e Pixel 7) e Vitest 13/13 (PR #333) (OK).
- [x] **PASSO AV (Issue #332):** UX Mobile - Redesenho dos cards da aba Tags & QR e eliminação do overflow horizontal — preview do QR Code verticalizado e responsivo no mobile (≤600px), acabamento dos cards de destino NFC/QR e link com tokens M3 (superfícies e elevações suaves); validação suíte Playwright 6/6 e Vitest 13/13 (PR #334) (OK).
- [x] **PASSO AW (Issue #335):** UX Mobile - Polimento dos botões de ação no modo de edição do perfil (Salvar e Cancelar) — simplificação do texto 'Salvar Alterações' para 'Salvar', layout responsivo inline em .edit-actions-group no mobile (≤768px), touch target padronizado e budget CSS otimizado; validação suíte Vitest 94/94 e Playwright 6/6 (PR #336) (OK).
- [x] **PASSO AX (Issue #337):** Sincronização e desabilitação síncrona de FormArrays no Perfil — criação do helper `setFormControlsState`, restauração síncrona in-memory no Cancelar sem race condition, `[readonly]` template defense-in-depth e desativação consistente de phones, addresses, secondaryEmails, links e tagSettings; validação unitária Vitest (97/97) e Playwright e2e (6/6) (PR #338) (OK).
- [x] **PASSO BA (Issue #326):** Typecheck total do backend zerado — narrowing `'byCity' in summary` no `analytics.service.spec.ts` (união `emptySummary | fullSummary`) e declaração dos mocks como `Mocked<Repository<User>>`/`Mocked<Repository<Tag>>`/`Mocked<TagsService>` com casts mínimos nos literals parciais; gates `npx tsc --noEmit` local e `docker compose exec -T api npx tsc --noEmit` em exit 0 + Vitest 102/102 (PR #341) (OK).
- [x] **PASSO BB (Issue #339):** Bloqueio/desbloqueio consistente de Textfields e FormArrays no Perfil — fix do rebuild `clear()+push()` que deixava bindings órfãos (perda silenciosa de dados após Cancelar): helper `syncFormArray` com `patchValue` + push/removeAt só do delta, remoção dos `[disabled]="!isEditing"` no-op nos inputs nativos, spec de regressão e2e `profile-edit-cycle.spec.ts` (iPhone 13 / Pixel 7) + 2 testes unitários de identidade de controles; vitest 99/99, e2e 10/10, build OK, evidência dark/light (PR #342) (OK).
- [x] **PASSO BC (Issue #343):** Botão Cancelar estourando em viewports ≤320px e com fonte ampliada — avatar 56px, padding 4px, botões 44px/12px/0.75rem, flex 1 1 auto + min/max-width 100% + ellipsis; fix Firefox (max-width 100% no container + item); spec `profile-edit-actions-visual.spec.ts` (6 viewports × 2 temas × 2 devices); **fix address tag dropdown**: @if (addressTags.length > 0) wrapper para forçar change detection no @for aninhado; vitest 99/99, e2e 36/36, build OK (PR #346) (OK).
- [ ] **PRÓXIMOS PASSOS (Backlog Estratégico - Go-to-Market):**
  - Milestones ativos (fronteiras em `.docs/governance/milestone-file-matrix.md`): **M0** Supervisão, Governança & Pipeline CI · **M1** Testes Visuais Mobile (Playwright) · **M2** Bugs Visuais & UX Mobile (permanente)
  - #259: [CI/QA] Pipeline de CI/CD com Barreira de Cobertura Mínima de 95%
  - #169: [BE/FE] Módulo de Gestão Administrativa de Tenants (Workspaces)
  - #220-223: [BE/FE] Motor Dinâmico de Permissões e Roles Customizadas
  - #97: [Growth] Motor de Recompensa e Link de Indicação (Acquisition Loop)
  - #11, #20: [Engajamento] Push Notifications Firebase e Modo Evento

---

## ⚠️ 5. Erros a Não Repetir (Lições Aprendidas)
1. **Vazamento de Dados:** SEMPRE filtrar queries por `tenant_id` usando QueryBuilder no backend.
2. **Promoção de Membros:** Se o usuário já existe globalmente, use `promoteToTeam` em vez de tentar criar um novo.
3. **Rebaixamento:** Ao remover da equipe, rebaixe para role 'usuario' e limpe o `profile_id`, mas NÃO delete o usuário.

---

## 📄 6. Protocolos
1. **Rigor:** Leia sempre `manual-protocolos.md` e `DOCUMENTACAO_ARQUITETURA.md`.
2. **Branches:** Siga o Protocolo Padrão Ouro para abertura e fechamento.
3. **Paralelismo:** Antes de qualquer issue, consulte `.docs/governance/milestone-file-matrix.md` — território do seu milestone, arquivos universais (rebase) e fronteira obrigatória.
