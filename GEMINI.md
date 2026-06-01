# 🚀 SmartContact - Diretrizes de Engenharia e Contexto da Missão

Este arquivo é a fonte da verdade para todos os agentes Gemini CLI que atuarem neste repositório. As instruções abaixo têm **precedência absoluta**.

## 🎯 1. O que é o Sistema?
O **SmartContact** resolve a fricção do networking físico através de **Cartões de Visita Digitais Inteligentes**. 
- O usuário possui uma Tag (NFC ou QR Code).
- O sistema gerencia o redirecionamento dinâmico (Perfil, WhatsApp, vCard).
- **Missão B2B:** Atualmente estamos construindo a camada de Workspace, onde um Administrador (ex: TIWEB) gerencia Turmas/Tags e delega acesso a esses recursos para Membros/Vendedores através de travas **ABAC**.

---

## 🎨 2. Padrões de Interface (CRÍTICO)

### 🌓 Theming e Cores
- **Regra:** NUNCA use cores fixas (Hexadecimal, RGB, RGBA ou nomes de cores).
- **Padrão:** Use estritamente os **Design Tokens** do Angular Material 3.
- **Exemplos:** 
    - Fundo: `var(--mat-sys-surface)` ou `var(--mat-sys-surface-container-low)`
    - Texto: `var(--mat-sys-on-surface)` ou `var(--mat-sys-on-surface-variant)`
    - Primária: `var(--mat-sys-primary)`
- **Por que:** O sistema alterna entre Light e Dark Mode e o uso de cores fixas quebra o visual.

### 🖼️ Modais e Layout
- **Dimensões:** As modais administrativas devem ser espaçosas para evitar claustrofobia visual.
- **Largura Padrão:** Entre **900px e 1000px**.
- **Abertura:** Sempre use `panelClass: 'large-abac-modal'` (ou similar) e `{ autoFocus: false }` para evitar scroll automático.
- **Scrollbars:** Evite barras de rolagem externas na modal. Use `max-height: 75vh` e aplique `overflow-y: auto` apenas na lista interna de dados.

---

## 🛠️ 3. Estado Atual da Missão (Passo a Passo)

- [x] **PASSO A (Issue #123):** Motor de convites via Token e QR Code (OK).
- [x] **PASSO B (Issue #124):** Roteamento independente (NFC vs QR Code) na entidade Tag (OK).
- [x] **PASSO C (Issue #106):** Trava ABAC (Vendedores só acessam o que lhes foi delegado) (OK).
- [x] **PASSO D (Issue #118/126):** UI de Gestão de Equipe e Refinamento da Modal ABAC (OK).
- [x] **PASSO E (Issue #95):** Refatoração de Links para Usar Username (OK).
- [x] **PASSO F (Issue #133):** Refatoração da Modal de Usuário para Tabs (OK).
- [x] **PASSO G (Issue #132):** Refinamento da Modal ABAC e Remoção de Redundância (OK).
- [x] **PASSO H (Issue #125):** Painel ABAC com Configuração Separada de Fluxos NFC/QR (OK).
- [x] **PASSO I (Issue #15):** Integração do Botão 'Salvar Contato' com vCard (OK).

---

## 🛠️ 3.1 Fase 1.5: Pit Stop de UX (Passo a Passo)
- [x] **PASSO J (Issue #143):** Bugfix UX: Estabilidade da Modal e Ícones (OK).
- [x] **PASSO K (Issue #141):** Separação Lógica entre Contatos e Equipe (OK).
- [x] **PASSO L (Issue #144):** Restauração da Visão Geral da Equipe (OK).
- [x] **PASSO M (Issue #142):** Filtros de Busca Avançada e Integridade de Backend (OK).
- [ ] **PRÓXIMO PASSO:** Refatoração de UI e Estabilização de UX.

---

## ⚠️ 4. Erros a Não Repetir (Lições Aprendidas)

1. **Redundância:** Não colocar gestão de Roles dentro de "Gestão de Equipe". Roles são globais e ficam no menu lateral. Equipe foca em Membros e Recursos (Tags).
2. **Área de Clique:** Em listas Master-Detail (como a de Tags na modal), a linha inteira deve ser a área de clique para o preview, deixando o checkbox isolado apenas para a ação de seleção/delegação.
3. **Builds:** Não rodar `npm run build` ou similares sem necessidade, para economizar contexto e tokens. O usuário validará visualmente.
4. **EXECUÇÂO** NUNCA SAIR EXECUTANDO COMANDOS E CRIAÇÃO DE CÓDIGO AUTOMATICAMENTE SEM SEGUIR O PROTOCOLO.



---

## 📄 5. Protocolos de Branch
1. **Encerramento de Branch** Siga rigorosamente o arquivo `manual-protocolos.md` na raiz para Abertura, Fechamento e Faxina de Issues.
2. **Encerramento de Branch** Sempre perguntar se o código tem erros ou se ainda há algum ajuste antes de encerrar a branch com o commit de encerramento padrão ouro.
