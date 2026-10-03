# 📋 Plano de Execução - Issue #335: UX Mobile - Polimento dos botões de ação no modo de edição do perfil (Salvar e Cancelar)

## 🎯 1. Objetivo
Ajustar e polir o layout dos botões de ação do modo de edição do perfil (**"Salvar"** e **"Cancelar"**) no viewport mobile (≤768px):
- Simplificar o texto do botão principal de `"Salvar Alterações"` para `"Salvar"`.
- Organizar a área de ações do avatar (`.avatar-actions`) para acomodar os dois botões harmoniosamente ao lado/abaixo do avatar de 64px, eliminando quebras desordenadas e descentralizações.
- Assegurar touch targets adequados (≥44px de área de toque) e aderência estrita aos Design Tokens do Material 3.

---

## 🗺️ 2. Fronteira de Arquivos (Território M2)
- `frontend/src/app/features/users/pages/profile-page/profile-page.html`
- `frontend/src/app/features/users/pages/profile-page/profile-page.scss`
- `plano-335-edit-mode-actions-mobile.md`

---

## 🛠️ 3. Etapas de Execução

1. **Template (`profile-page.html`):**
   - Alterar texto do botão de submissão para `Salvar` (preservando o ícone `<mat-icon>save</mat-icon>`).
   - Adicionar classe semântica `.edit-actions-group` envolvendo os botões "Salvar" e "Cancelar" para controle fino de layout.

2. **Estilos (`profile-page.scss`):**
   - No mobile (≤768px), ajustar `.avatar-actions` e `.edit-actions-group`:
     - Disposição flexbox responsiva (lado a lado compacto com `flex: 1` ou empilhamento vertical simétrico dependendo da largura).
     - Altura padronizada de 38px/40px, `border-radius: 20px`, gap simétrico.
     - Ícones e textos centralizados com espaçamento consistente.

3. **Validação e Testes:**
   - Execução da suíte de testes unitários do Vitest (`npm test`).
   - Execução da suíte Playwright Mobile (`npm run e2e:visual`).
   - Build de produção (`npm run build`).

4. **Registro e Encerramento:**
   - Atualização do `GEMINI.md` com o Passo AW.
   - Abertura de PR (Draft) -> Conclusão -> PR Ready -> Merge.
