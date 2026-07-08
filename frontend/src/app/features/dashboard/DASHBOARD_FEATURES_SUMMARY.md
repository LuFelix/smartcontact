# 📁 Sumário Técnico da Feature: Dashboard

Este arquivo serve como documentação de referência para desenvolvedores e agentes de IA compreenderem o design, funcionamento, arquitetura e fluxos de dados da feature **Dashboard** no frontend do **SmartContact**.

> [!NOTE]
> Para detalhes técnicos adicionais sobre contratos de dados, chamadas de rede e segurança, consulte os documentos dependentes:
> * 🗃️ **[Modelos de Dados e Interfaces (TypeScript)](file:///home/jaspion/projetos/smartcontact/frontend/src/app/features/dashboard/docs/DATA_MODELS.md)**
> * 🔌 **[Endpoints e Integração de APIs](file:///home/jaspion/projetos/smartcontact/frontend/src/app/features/dashboard/docs/API_ENDPOINTS.md)**
> * 🔐 **[Regras de Permissão e Políticas ABAC](file:///home/jaspion/projetos/smartcontact/frontend/src/app/features/dashboard/docs/ABAC_POLICIES.md)**

---

## 🏗️ 1. Arquitetura e Estrutura de Pastas

A feature está localizada em `/frontend/src/app/features/dashboard/` e segue uma arquitetura orientada a componentes sob os padrões do Angular (versão standalone):

```
/frontend/src/app/features/dashboard/
├── components/           # Componentes de apresentação (Dumb Components)
│   ├── interaction-list/ # Listagem cronológica de interações
│   └── kpi-card/         # Cartão visual para exibição de KPIs individuais
├── pages/                # Páginas inteligentes (Smart Components / Containers)
│   └── dashboard-container/# Container principal do Dashboard
├── services/             # Serviços Angular (comunicação com a API Rest)
│   └── dashboard.service.ts
└── docs/                 # Documentos de especificação técnica auxiliares
```

---

## ⚙️ 2. Serviços da Feature (`/services`)

*(Mapeamento completo das chamadas de rede e payloads detalhado em: [Endpoints e Integração de APIs](file:///home/jaspion/projetos/smartcontact/frontend/src/app/features/dashboard/docs/API_ENDPOINTS.md))*

### 🔹 [dashboard.service.ts](file:///home/jaspion/projetos/smartcontact/frontend/src/app/features/dashboard/services/dashboard.service.ts)
Gerencia o estado e consumo das APIs de estatísticas:
* **Gerência de Estado com Signals:** Armazena internamente o estado `DashboardState` (carregamento, dados e erros) como um `WritableSignal` privado (`#state`) e o expõe publicamente como um sinal de somente leitura `state`.
* `loadSummary()`: Executa uma requisição HTTP GET para `/analytics/summary` anexando dinamicamente o header do workspace ativo (`x-tenant-id`) do `AuthService` para atualizar as métricas.

---

## 🖥️ 3. Fluxos de Negócio e Páginas (`/pages`)

### 1. Painel de Indicadores e Analytics (`/dashboard-container`)
* **Componente:** `DashboardContainerComponent`
* **Descrição:** Central de controle onde o usuário visualiza gráficos agregados de uso das suas tags e contatos capturados.
* **Mecanismos:**
  * Consome o sinal somente leitura `state` exposto pelo serviço e cria sinais derivados (`computed`) para `summary`, `isLoading` e `error`.
  * **Visualização de Origens:** Deriva e normaliza a distribuição de cliques físicos através do computado `bySourcePreview`, preenchendo origens conhecidas (`nfc`, `qr`, `rfid`, `link`, `desconhecido`) com `0` se não possuírem dados, e determinando os ícones correspondentes a cada canal de leitura (`sourceIcon`).
  * Utiliza abas gráficas (`mat-tab-group`) para alternar a visualização dos dados consolidados entre as segmentações de **Dispositivos**, **Navegadores** e **Origens**.

---

## 🎨 4. Componentes de Apresentação (`/components`)

As visualizações internas do Dashboard são desacopladas da lógica de negócios através de componentes puros:

* **[kpi-card](file:///home/jaspion/projetos/smartcontact/frontend/src/app/features/dashboard/components/kpi-card/kpi-card.ts):**
  * Recebe como inputs o título (`label`), a quantidade numérica (`value`), o ícone visual (`icon`) e a cor personalizada do card (`color`). Renderiza o KPI de forma elegante no topo da tela.
* **[interaction-list](file:///home/jaspion/projetos/smartcontact/frontend/src/app/features/dashboard/components/interaction-list/interaction-list.ts):**
  * Recebe a lista temporal de interações e exibe o gráfico ou listagem agregada cronologicamente sobre os dias de leitura e leads coletados.

---

## 📖 5. Documentos Complementares de Contexto

Para evitar que este arquivo se torne excessivamente extenso, as especificações técnicas aprofundadas foram modularizadas nos seguintes guias:
* 🗃️ **[Modelos de Dados e Interfaces (TypeScript)](file:///home/jaspion/projetos/smartcontact/frontend/src/app/features/dashboard/docs/DATA_MODELS.md)**: Detalha as tipagens do TypeScript e payloads usados no fluxo de analytics.
* 🔌 **[Endpoints e Integração de APIs](file:///home/jaspion/projetos/smartcontact/frontend/src/app/features/dashboard/docs/API_ENDPOINTS.md)**: Lista o mapeamento de requisições HTTP entre os serviços do frontend Angular e os controllers do backend NestJS.
* 🔐 **[Regras de Permissão e Políticas ABAC](file:///home/jaspion/projetos/smartcontact/frontend/src/app/features/dashboard/docs/ABAC_POLICIES.md)**: Explica o isolamento multi-tenant N:N, regras de autopropriedade e controle de permissões.
