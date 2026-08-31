# Plano TDD - Frontend Dashboard Analytics (Geo & Devices) - Issue #303

## 1. Objetivo Visual e Funcional
- Exibir aos usuários corporativos e premium (B2B) informações riquíssimas e visuais de **Onde** e **Como** as tags estão sendo lidas.
- Impressionar visualmente: Gráficos de fácil leitura, interativos (ApexCharts) e bonitos com base nos tokens do Angular Material 3.

## 2. Modificações na Tipagem (Modelos)
- Arquivo alvo: `frontend/src/app/core/models/analytics.model.ts`
- Adicionar interfaces para o retorno geográfico e de devices:
  ```typescript
  export interface AnalyticsMetric { name: string; count: number; }
  export interface AnalyticsSummary {
    ...
    byDevice: AnalyticsMetric[];
    byBrowser: AnalyticsMetric[];
    byCity: AnalyticsMetric[];
    byRegion: AnalyticsMetric[];
    byCountry: AnalyticsMetric[];
  }
  ```

## 3. Modificações no Componente Smart (Dashboard)
- Arquivos alvo: `dashboard.component.ts` e `dashboard.component.html` (e/ou criar um componente "Dumb" de GeoAnalytics).
- Processar os novos dados da API (`summary()`) para o formato lido pelo `ApexCharts`.

## 4. Estruturação dos Gráficos (Apresentação - Impressionante)
Vamos criar 3 novos painéis na interface:
1. **Gráfico de Dispositivos (Rosca/Donut):** Mostrando a divisão entre Mobile, Tablet e Desktop.
2. **Gráfico de Navegadores (Rosca/Donut ou Barras Horizontais):** Firefox, Chrome, Safari, etc.
3. **Top Cidades/Regiões (Barra Horizontal Ranking):** Uma tabela estilizada ou gráfico de barras horizontais rankeando as Top 5 Cidades e Países com maior engajamento.

## 5. Testes Unitários (Vitest - Phase RED)
- Testar a injeção do modelo atualizado.
- Atualizar os mocks do serviço `AnalyticsService` para devolverem dados de `byCity`, `byRegion` e `byDevice`.
- O teste do `dashboard.component.spec.ts` precisará validar a montagem da _Series_ do ApexChart para esses novos dados sem quebrar.

## 6. Fluxo de Trabalho
1. Aprovação do plano pelo usuário.
2. **Commit Atômico** isolado do arquivo `plano.md`.
3. Início da fase TDD (RED -> GREEN) nas tipagens e componente.
4. Refinamento visual da tela (garantindo que fique com alto impacto B2B).
