# 📋 Manual de Padronização e Criação de Issues - SmartContact

Este guia serve como fonte de verdade para a estrutura de criação de novas issues no arquivo de backlog (`issues-todo.json` ou `issues-numerar.json`) do **SmartContact**. Seguir este padrão garante que desenvolvedores humanos e agentes de IA compreendam perfeitamente o escopo, tarefas e critérios de aceitação de cada tarefa.

---

## 🏗️ 1. Estrutura do Objeto JSON da Issue

Cada issue deve ser representada como um objeto JSON contendo exatamente as seguintes propriedades:

```json
{
  "title": "[PREFIXO-ID] Tipo: Nome Curto da Issue",
  "state": "open",
  "labels": [
    "camada-afetada",
    "tipo-de-mudança"
  ],
  "body": "**Problema:** \\n\\n**Descrição:** \\n\\n**Tarefas e Etapas (Commits Atômicos):** \\n\\n**Critérios de Aceite:**"
}
```

---

## 🏷️ 2. Especificação das Propriedades

### A. Título (`title`)
* **Padrão:** `"[PREFIXO-ID] Tipo: Nome Curto"`
* **Partes:**
  * `[PREFIXO-ID]`: Código descritivo de onde a mudança ocorre (ex: `[BE/FE-CORE-005]` para alterações conjuntas de Core, ou `[FE-UI-012]` para mudanças exclusivas de frontend).
  * `Tipo`: Classificação da issue (ex: `UX`, `Feature`, `Fix`, `QA`).
  * `Nome Curto`: Descrição clara da meta da issue.

### B. Estado (`state`)
* **Valores suportados:** `"open"` (aberta) ou `"closed"` (concluída).

### C. Rótulos (`labels`)
Lista de tags que categorizam o escopo técnico. Rótulos comuns:
* **Camadas:** `frontend`, `backend`, `database`
* **Tipo:** `feature`, `enhancement`, `fix`, `ux`, `qa`, `admin`

### D. Corpo (`body`)
Texto em formato Markdown (com quebras de linha normalizadas em `\n` no JSON). Deve conter as seguintes seções estritas:
1. **`**Problema:**`** Descreve a dor do usuário, bug atual ou a limitação do sistema.
2. **`**Descrição:**`** Visão geral da solução a ser implementada.
3. **`**Tarefas e Etapas (Commits Atômicos):**`** Lista numerada e detalhada de passos de codificação separados de forma atômica por camada (Frontend e Backend).
4. **`**Critérios de Aceite:**`** Regras de validação estritas que determinam quando a issue pode ser dada como concluída.

---

## 📝 3. Modelo de Referência (Template Markdown para o Body)

Ao escrever o corpo da issue, utilize a seguinte base:

```markdown
**Problema:** [Descreva o comportamento incorreto ou a ausência da funcionalidade aqui]

**Descrição:** [Explique como o sistema deve se comportar após a implementação da solução]

**Tarefas e Etapas (Commits Atômicos):**
1. **Backend - [Nome do Módulo/Serviço]:**
   - Tarefa detalhada A
   - Tarefa detalhada B
2. **Frontend - [Nome da Feature/Componente]:**
   - Tarefa detalhada C
   - Tarefa detalhada D

**Critérios de Aceite:**
- [Critério 1 de funcionamento]
- [Critério 2 de segurança ou isolamento]
```

---

## 💡 4. Exemplo Completo de Issue (Formato JSON)

Aqui está um exemplo exato de como uma nova entrada deve ser inserida na lista do JSON do backlog. Perceba que as quebras de linha do corpo markdown são representadas por `\n`:

```json
{
  "title": "[BE/FE-TAGS-015] Fix: Correção de Colisão e Persistência de Tags no Perfil",
  "state": "open",
  "labels": [
    "frontend",
    "backend",
    "fix",
    "tags"
  ],
  "body": "**Problema:** Ao configurar o redirecionamento de tags na tela de perfil, as edições colidem com as tags criadas na gestão administrativa do mesmo tenant, pois o backend ignora o ID da tag no payload e resolve uma tag genérica do tenant. No frontend, a tag genérica é exibida por vir primeiro no array ordenado por data de criação.\\n\\n**Descrição:** Ajustar o salvamento de tags por ID no backend e filtrar a tag pessoal no frontend para isolar o comportamento do perfil.\\n\\n**Tarefas e Etapas (Commits Atômicos):**\\n1. **Backend - UsersService:**\\n   - No `update` de `UsersService`, iterar pelo array `tags` do payload e atualizar especificamente as tags pelo seu `id` correspondente.\\n   - Se vier configurações na raiz do DTO, atualizar preferencialmente a tag onde `isResource === false` (tag de perfil do usuário).\\n2. **Frontend - ProfileComponent:**\\n   - Em `loadInitialProfile()`, filtrar e selecionar a tag ativa priorizando a tag onde `isResource` é falso (tag de perfil pessoal do usuário).\\n\\n**Critérios de Aceite:**\\n- Salvar configurações no Perfil altera apenas a tag pessoal do usuário.\\n- Alterar tags na gestão administrativa não desconfigura a tag pessoal de perfil.\\n- O QR Code renderizado no perfil aponta para a tag pessoal do usuário."
}
```

