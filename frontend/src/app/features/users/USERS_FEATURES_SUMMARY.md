# 📁 Sumário Técnico da Feature: Users

Este arquivo serve como documentação de referência para desenvolvedores e agentes de IA compreenderem o design, funcionamento, arquitetura e fluxos de dados da feature **Users** no frontend do **SmartContact**.

> [!NOTE]
> Para detalhes técnicos adicionais sobre contratos de dados, chamadas de rede e segurança, consulte os documentos dependentes:
> * 🗃️ **[Modelos de Dados e Interfaces (TypeScript)](file:///home/jaspion/projetos/smartcontact/frontend/src/app/features/users/docs/DATA_MODELS.md)**
> * 🔌 **[Endpoints e Integração de APIs](file:///home/jaspion/projetos/smartcontact/frontend/src/app/features/users/docs/API_ENDPOINTS.md)**
> * 🔐 **[Regras de Permissão e Políticas ABAC](file:///home/jaspion/projetos/smartcontact/frontend/src/app/features/users/docs/ABAC_POLICIES.md)**

---

## 🏗️ 1. Arquitetura e Estrutura de Pastas

A feature está localizada em `/frontend/src/app/features/users/` e segue uma arquitetura orientada a componentes sob os padrões do Angular (versão standalone):

```
/frontend/src/app/features/users/
├── components/           # Componentes de apresentação (Dumb Components)
├── pages/                # Páginas inteligentes (Smart Components / Containers)
└── services/             # Serviços Angular (comunicação com a API Rest)
```

---

## ⚙️ 2. Serviços da Feature (`/services`)

*(Mapeamento completo das chamadas de rede e payloads detalhado em: [Endpoints e Integração de APIs](file:///home/jaspion/projetos/smartcontact/frontend/src/app/features/users/docs/API_ENDPOINTS.md))*

### 🔹 [user.service.ts](file:///home/jaspion/projetos/smartcontact/frontend/src/app/features/users/services/user.service.ts)
Gerencia o ciclo de vida dos usuários e ações administrativas de membros no inquilino (Tenant):
* `findAllUsers(filters)`: Consulta a lista de usuários cadastrados no tenant ativo. Aceita filtros de pesquisa (`name`, `email`, `cpf`) e parâmetros de paginação.
* `findById(userId)`: Recupera a árvore completa de informações do perfil de um usuário (contatos, endereços, links, e-mails secundários e tags).
* `updateUser(id, payload)`: Modifica os registros cadastrais, contatos associados e as configurações de direcionamento físico de tags do usuário.
* `promoteToTeam(userId, roleId, email)`: Associa um usuário existente no banco global à equipe local do Tenant, atribuindo um perfil e um papel específico.
* `demoteFromTeam(userId)`: Remove o vínculo de equipe do usuário (limpa `profile_id` e redefine o papel local para `usuario`), preservando o cadastro de login global.
* `deleteUser(id)`: Remove permanentemente a conta do usuário.

### 🔹 [role.service.ts](file:///home/jaspion/projetos/smartcontact/frontend/src/app/features/users/services/role.service.ts)
Gerencia as funções e níveis de acesso (ABAC) dentro do Workspace:
* Permite listar perfis de papéis ativos, gerenciar permissões disponíveis e executar operações de CRUD de papéis (`roles`).

---

## 🖥️ 3. Fluxos de Negócio e Páginas (`/pages`)

### 1. Gestão de Equipe (`/users-page`)
* **Componente:** `UsersPage`
* **Descrição:** Console administrativo para gerenciamento de membros.
* **Mecanismos:**
  * Filtros reativos acoplados a um formulário com atraso de digitação (`debounceTime(500)`) para poupar requisições ao servidor.
  * Modais de detalhes do usuário (`UserDetailsModalComponent`) abertas de forma ampla (`panelClass: 'large-abac-modal'`, largura de `850px` e foco automático desativado para melhor usabilidade).
  * Diálogos de promoção de membros (`PromotionDialogComponent`) para delegação de papéis de equipe.
  * Integração para sincronização em lote com a agenda do Google (`syncWithGoogle()`) utilizando autenticação OAuth de frontend (`SocialAuthService`) e repassando o token de acesso para o backend.

### 2. Vitrine de Recursos e Tags (`/my-tags`)
* **Componente:** `MyTagsComponent`
* **Descrição:** Área onde o usuário visualiza e gerencia os links e tags físicas NFC/QR Code que lhe foram delegados.
* **Mecanismos:**
  * Escuta reativamente as alterações no sinal `authService.activeTenantId` para atualizar dinamicamente a lista de tags delegadas do tenant ativo.
  * Utiliza a biblioteca `qrcode` no frontend para renderizar e converter em Data URLs as imagens de QR Code dos recursos associados.
  * Fornece o `QrViewDialogComponent` para visualização ampliada do QR Code, permitindo download direto do canvas em PNG ou cópia do endereço do recurso.
  * Resolve URLs de redirecionamento dinâmico apontando diretamente para o resolvedor do sistema (`/t/handle` ou `/t/uuid`).

### 3. Configurações do Cartão de Visitas e Perfil (`/profile-page`)
* **Componente:** `ProfileComponent`
* **Descrição:** Permite ao usuário editar suas informações de contato e configurar os gatilhos físicos de aproximação das suas tags.
* **Mecanismos:**
  * **Telefones:** Gerenciados dinamicamente via `FormArray`. Permite definir qual número é WhatsApp e qual é o telefone principal (ordenando automaticamente a lista).
  * **Endereços:** Gerenciados por `FormArray` com consulta automática de logradouro a partir do CEP usando o `CepService` integrado.
  * **E-mails Secundários:** Permite adicionar e-mails adicionais e fazer a substituição (swap) segura com o e-mail de login principal.
  * **Links Sociais:** Lista dinâmica de títulos e URLs com validações estritas de formato.
  * **Redirecionamentos Físicos (`tagSettings`):** Configura de forma independente o comportamento do chip NFC e do QR Code impresso ao serem acionados fisicamente. Suporta redirecionar para:
    * `PROFILE`: Renderização padrão da página pública (Perfil Inteligente).
    * `WHATSAPP`: Abertura imediata de conversa com o WhatsApp principal.
    * `VCARD`: Download direto do cartão de visitas virtual.
    * `CUSTOM_URL`: Encaminhamento para um link externo.

### 4. Perfil Público e Redirecionador (`/public-profile`)
* **Componente:** `PublicProfileComponent`
* **Rota:** `/t/:uuid` ou `/t/:username`
* **Mecanismos:**
  * **Resolução Dinâmica:** O componente invoca `tagService.resolveTag()` passando o identificador da tag e o parâmetro `source` (ex: `nfc`, `qr`).
  * **Lógica de Redirecionamento Físico:**
    * Se o acesso vier com o parâmetro `source` **E** a tag possuir uma configuração de redirecionamento diferente de `PROFILE`, o componente redireciona o navegador do visitante instantaneamente (para o WhatsApp ou link personalizado).
    * Se o acesso for direto (sem o parâmetro `source`), o redirecionamento automático é ignorado para que o visitante sempre visualize o **Perfil Inteligente** (a página web do cartão).
  * **Geração de vCard:** Compila dinamicamente todos os dados de contato do usuário em uma string formatada sob o padrão `vCard 3.0` e inicia o download de um arquivo `.vcf` direto no dispositivo do visitante.
  * **Captura de Leads:** Possui um formulário integrado que, quando submetido pelo visitante, envia as informações de contato para o backend usando `logsService.captureLead()`, cadastrando o visitante como um lead associado à tag do usuário.

### 5. Gestão de Leads (`/leads-page`)
* **Componente:** `LeadsPage`
* **Descrição:** Painel onde o usuário visualiza e gerencia os contatos capturados através de suas tags públicas.
* **Mecanismos:**
  * Carrega os leads capturados do usuário logado via `logsService.listMyLeads()`.
  * **Conversão para Contato:** Cada card de lead possui um botão de sincronização individual que dispara a autorização OAuth do Google no frontend e envia os dados do lead para a agenda pessoal do usuário no Google Contacts via `GoogleContactsService`. Uma vez sincronizado com o Google, o lead é considerado um **Contato** consolidado.

---

## 🎨 4. Componentes de Apresentação (`/components`)

As visualizações das listagens em **Leads** e **My Tags** são separadas em componentes de apresentação puros (Dumb Components) que mudam de layout com base no `LayoutService` global (visualização em lista tabular vs grade de cards):

* **Leads:**
  * `LeadsCardListComponent`: Apresenta os leads em formato de cards do Angular Material.
  * `LeadsListViewComponent`: Apresenta os leads em formato de tabela de dados.
* **My Tags:**
  * `MyTagsCardListComponent`: Renderiza os recursos delegados em formato de cartões visuais com QR Codes em miniatura.
  * `MyTagsListViewComponent`: Renderiza os recursos em uma tabela tabular clássica.

---

## 📖 5. Documentos Complementares de Contexto

Para evitar que este arquivo se torne excessivamente extenso, as especificações técnicas aprofundadas foram modularizadas nos seguintes guias:
* 🗃️ **[Modelos de Dados e Interfaces (TypeScript)](file:///home/jaspion/projetos/smartcontact/frontend/src/app/features/users/docs/DATA_MODELS.md)**: Detalha as tipagens do TypeScript e payloads usados no fluxo de usuários, tags, contatos e leads.
* 🔌 **[Endpoints e Integração de APIs](file:///home/jaspion/projetos/smartcontact/frontend/src/app/features/users/docs/API_ENDPOINTS.md)**: Lista o mapeamento de requisições HTTP entre os serviços do frontend Angular e os controllers do backend NestJS.
* 🔐 **[Regras de Permissão e Políticas ABAC](file:///home/jaspion/projetos/smartcontact/frontend/src/app/features/users/docs/ABAC_POLICIES.md)**: Explica o isolamento multi-tenant N:N, regras de autopropriedade (Self-ownership bypass) e controle de permissões.
