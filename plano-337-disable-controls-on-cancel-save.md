# 📋 Plano de Execução - Issue #337: [BUG-PROFILE-002] Bug: Campos das abas Contatos, Endereços e Links permanecem habilitados após Cancelar ou Salvar no Perfil

## 🎯 1. Objetivo
Corrigir a persistência indevida do estado editável nos campos das abas do perfil (**Contatos**, **Endereços**, **Links Sociais** e **E-mails Adicionais**) ao acionar **Cancelar** ou **Salvar**:
- Centralizar o controle de habilitação/desabilitação de todos os controles do formulário em um método padronizado (`setFormControlsState(enabled: boolean)`).
- Garantir desabilitação sincrônica e imediata de todos os `FormArray` (`phones`, `addresses`, `secondaryEmails`, `links`) e `FormGroup` aninhados (`tagSettings`).
- Blindar os botões de ação do modo de edição (`.edit-actions-group`) contra qualquer possibilidade de overflow/estouro em viewports móveis ultra-compactos.

---

## 🗺️ 2. Fronteira de Arquivos (Território M2)
- `frontend/src/app/features/users/pages/profile-page/profile-page.ts`
- `frontend/src/app/features/users/pages/profile-page/profile-page.html`
- `frontend/src/app/features/users/pages/profile-page/profile-page.scss`
- `plano-337-disable-controls-on-cancel-save.md`

---

## 🛠️ 3. Etapas de Execução

1. **Lógica de Estado do Formulário (`profile-page.ts`):**
   - Implementar método `setFormControlsState(enabled: boolean)` que manipula uniformemente tanto o formulário raiz quanto todos os `FormArray` e `FormGroup` filhos.
   - Chamar `setFormControlsState(false)` de forma síncrona em `onCancel()`, no sucesso de `onSave()` e no carregamento inicial `loadInitialProfile()`.
   - Garantir que `addPhone()`, `addAddress()`, `addSecondaryEmail()` e `addLink()` respeitem rigorosamente o estado `isEditing`.

2. **Template e Layout (`profile-page.html` / `profile-page.scss`):**
   - Verificar bindings de formulário para garantir que nenhum controle ignore o estado de desabilitação.
   - Reforçar flexbox responsivo em `.edit-actions-group` para blindar contra estouros laterais em larguras mínimas (320px-360px).

3. **Validação e Testes:**
   - Adicionar specs unitárias no Vitest verificando que `onCancel()` e `onSave()` desabilitam os controles dos arrays.
   - Execução de `npm test` (Vitest).
   - Execução de `npm run e2e:visual` (Playwright Mobile).
   - Build de produção (`npm run build`).

4. **Registro e Encerramento:**
   - Atualização do `GEMINI.md` com o Passo AX.
   - Abertura de PR (Draft) -> Conclusão -> PR Ready -> Merge.
