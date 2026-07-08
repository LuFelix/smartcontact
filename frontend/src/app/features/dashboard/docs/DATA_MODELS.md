# 🗃️ Modelos de Dados e Interfaces - Feature Dashboard

Este documento detalha os modelos de dados e as interfaces TypeScript que representam o estado e os dados do dashboard na feature **Dashboard** no frontend do **SmartContact**. As definições principais residem no arquivo do serviço da feature: [dashboard.service.ts](file:///home/jaspion/projetos/smartcontact/frontend/src/app/features/dashboard/services/dashboard.service.ts).

---

## 📊 1. Resumo do Dashboard (`DashboardSummary`)

Esta interface representa o payload completo de métricas consolidadas retornado pela API de Analytics.

```typescript
export interface DashboardSummary {
  totalReads: number;           // Total geral de leituras (Visitas/Visits) de tags do escopo
  totalLeads: number;           // Total geral de leads capturados de tags do escopo
  readsToday: number;           // Leituras registradas na data de hoje
  readsThisWeek: number;        // Leituras registradas nos últimos 7 dias
  leadsThisWeek: number;        // Leads capturados nos últimos 7 dias
  trend: DashboardTrendItem[];   // Série temporal de leituras e leads por dia
  byDevice: DashboardBreakdownItem[];   // Distribuição de cliques por tipo de dispositivo
  byBrowser: DashboardBreakdownItem[];  // Distribuição de cliques por navegador
  bySource: DashboardBreakdownItem[];   // Distribuição de cliques por origem (NFC, QR Code, RFID, Link)
}
```

---

## 📈 2. Interfaces Auxiliares de Métricas

### `DashboardTrendItem` (Item de Tendência Temporal)
Usado para montar gráficos ou listas ordenadas por data com leituras e leads.
```typescript
export interface DashboardTrendItem {
  date: string; // Data formatada no backend (ex: 'YYYY-MM-DD')
  reads: number;
  leads: number;
}
```

### `DashboardBreakdownItem` (Item de Distribuição/Breakdown)
Estrutura genérica chave-valor de contagem para breakdowns de navegadores, dispositivos e origens.
```typescript
export interface DashboardBreakdownItem {
  name: string;  // Nome do navegador (Chrome, Safari, etc.) ou dispositivo (Mobile, Desktop) ou origem
  count: number; // Quantidade de ocorrências
}
```

---

## ⚙️ 3. Estado Interno do Dashboard (`DashboardState`)

Representa a estrutura de estado local gerenciada pelo serviço da feature através de Signals do Angular.

```typescript
export interface DashboardState {
  summary: DashboardSummary | null; // Dados consolidados ou nulo se não carregado
  isLoading: boolean;              // Indicador de carregamento de API ativo
  error: string | null;            // Mensagem de erro de backend caso falhe
}
```
