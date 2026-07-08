# 🚀 SmartContact - Diretrizes de Engenharia e Contexto da Missão

Este arquivo é a fonte da verdade para todos os agentes Gemini CLI que atuarem neste repositório. As instruções abaixo têm **precedência absoluta**.

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
- [ ] **PRÓXIMOS PASSOS (Backlog Prioritário - issues-todo.json):**
  - #169: Módulo de Gestão Administrativa de Tenants (Workspaces) - BE/FE
  - #97: Motor de Recompensa e Link de Indicação (Growth Loop) - BE/DB
  - #24: QA Homologação Performance (< 500ms) - QA/Release
  - #23: QA Teste Físico End-to-End - QA/E2E
  - #22: Hardware Gravação NFC Tags - Testing/Hardware
  - #21: Infra Túnel Ngrok/Cloudflare - Infra/Testing
  - #20: FE Modo Evento com Firebase Cloud Messaging - FE/PWA
  - #19: FE Dashboard Analytics - FE/Dashboard
  - #18: BE Gravação Assíncrona InteractionLog - BE/Async
  - #17: FE Tela Gestão Tags e Redirecionamento - FE/UI-UX
  - #11: Core Push Notifications Firebase - BE/Async
  - #10: BE Endpoint vCard Dinâmico - BE/API
  - #9: BE Lógica Roteamento Dinâmico Tag - BE/API
  - #8: BE Endpoint Resolução Tag com Rate Limiting - BE/API/Security

---

## ⚠️ 5. Erros a Não Repetir (Lições Aprendidas)
1. **Vazamento de Dados:** SEMPRE filtrar queries por `tenant_id` usando QueryBuilder no backend.
2. **Promoção de Membros:** Se o usuário já existe globalmente, use `promoteToTeam` em vez de tentar criar um novo.
3. **Rebaixamento:** Ao remover da equipe, rebaixe para role 'usuario' e limpe o `profile_id`, mas NÃO delete o usuário.

---

## 📄 6. Protocolos
1. **Rigor:** Leia sempre `manual-protocolos.md` e `DOCUMENTACAO_ARQUITETURA.md`.
2. **Branches:** Siga o Protocolo Padrão Ouro para abertura e fechamento.
