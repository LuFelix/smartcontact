# Plano de Ação - Auto-Provisionamento e Contingência de Perfil (Multi-Tenant)

## 1. O Problema
Usuários legados (ou afetados por falhas de rede) ficam sem uma "Tag Pessoal" no Tenant atual, causando o erro "Nenhuma tag ativa encontrada" na tela de Perfil. 

## 2. Solução 1: Contingência no Frontend (Botão Inicializar)
- **Onde:** `profile-page.html` e `profile-page.ts`
- **Ação:** 
  1. Detectar quando o backend retorna que o usuário não possui tag válida para o Tenant atual.
  2. Substituir o aviso de erro seco por um estado vazio (Empty State) amigável com um botão **"Inicializar Perfil Profissional"**.
  3. Ao clicar, o frontend fará um disparo (POST) limpo para gerar a tag sob demanda e recarregar a tela.

## 3. Solução 2: Auto-Provisionamento no Backend (Padrão Ouro)
- **Onde:** `MembershipsService` (ou fluxo de adição de equipe)
- **Ação:** 
  1. Garantir que no momento em que um usuário aceita ou recebe uma permissão (Membership) para entrar numa Workspace, o sistema automaticamente invoca a criação de sua Tag de Perfil inicial para aquele Tenant.
  2. Isso zera a fricção: na imensa maioria das vezes, o usuário já entra com tudo pronto, sem depender da contingência.

## 4. Ação Proposta (Execução)
1. Aprovação deste plano.
2. Commit atômico isolado deste plano.
3. Implementação e testes (RED/GREEN) do Botão de Contingência (Frontend).
4. Implementação e testes (RED/GREEN) do Auto-Provisionamento via Membership (Backend).

- [x] **PASSO AL (Issue #309):** Hotfix - Correção do GeoIP (Proxy Reverso)
  - Identificação de que o NestJS estava armazenando o IP interno do Docker (\`172.18.0.x\`) devido à ausência de \`trust proxy\`.
  - Habilitação do \`trust proxy\` no \`main.ts\` (AppModule).
  - Sanitização e extração do primeiro IP público via \`X-Forwarded-For\` nos controllers de Logs e Tags.
