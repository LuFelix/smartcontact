# 🔌 Endpoints e Integração de APIs - Feature Dashboard

Este documento detalha o mapeamento de comunicação de rede entre o serviço da feature **Dashboard** no frontend e os endpoints de dados no backend NestJS.

---

## 📈 1. Consulta de Métricas e KPIs
Serviço do Frontend: [dashboard.service.ts](file:///home/jaspion/projetos/smartcontact/frontend/src/app/features/dashboard/services/dashboard.service.ts)
Controller do Backend: [analytics.controller.ts](file:///home/jaspion/projetos/smartcontact/backend/src/analytics/analytics.controller.ts)

### `GET /analytics/summary`
Busca dados agregados do painel como KPIs globais, tendências diárias de leituras/leads e segmentações por navegador, dispositivo e canal físico.

* **Método no Frontend:** `loadSummary()`
* **Headers Exigidos:**
  * `Authorization: Bearer <JWT_TOKEN>` (Injetado via AuthInterceptor global)
  * `x-tenant-id: <TENANT_ID>` (Chaveia o workspace. Se o usuário estiver logado e possuir o Tenant selecionado, o `DashboardService` anexa este cabeçalho explicitamente no request).
* **Parâmetros de Query:** Não há.
* **Corpo da Resposta (JSON):**
```json
{
  "totalReads": 142,
  "totalLeads": 23,
  "readsToday": 12,
  "readsThisWeek": 74,
  "leadsThisWeek": 8,
  "trend": [
    { "date": "2026-06-25", "reads": 15, "leads": 2 },
    { "date": "2026-06-26", "reads": 22, "leads": 1 }
  ],
  "byDevice": [
    { "name": "mobile", "count": 110 },
    { "name": "desktop", "count": 32 }
  ],
  "byBrowser": [
    { "name": "Chrome", "count": 89 },
    { "name": "Safari", "count": 53 }
  ],
  "bySource": [
    { "name": "nfc", "count": 92 },
    { "name": "qr", "count": 45 },
    { "name": "link", "count": 5 }
  ]
}
```

---

## 🛠️ 2. Tratamento de Origens no Frontend
O componente inteligente [dashboard-container.ts](file:///home/jaspion/projetos/smartcontact/frontend/src/app/features/dashboard/pages/dashboard-container/dashboard-container.ts) intercepta e normaliza as origens retornadas em `bySource` preenchendo com valores nulos para evitar layouts vazios:
* Filtra e mapeia origens conhecidas: `nfc`, `qr`, `rfid`, `link`, `desconhecido`.
* Se um canal de hardware não possuir interações gravadas, o frontend exibe `0` para manter a integridade visual.
