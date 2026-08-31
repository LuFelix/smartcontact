# Plano TDD - Backend Captura GeoIP e Analytics Persistente na TagReadLog (Issue #302)

## 1. Pacotes a Instalar
- `geoip-lite` e `ua-parser-js` (e seus `@types`).

## 2. Modificações na Entidade (`interaction-log.entity.ts`)
- Adicionar colunas `country`, `region`, `city` (tipo `varchar`, `nullable: true`).

## 3. Modificações no Serviço (`interaction-logs.service.ts`)
- Alterar o `logVisit` e `captureLead` para usar `geoip.lookup(metadata.ip)`.
- Alterar a extração de User-Agent para utilizar o `UAParser` (da biblioteca `ua-parser-js`), preenchendo corretamente `deviceType` e `browser`, além de associar os dados geográficos `country`, `region`, `city` no momento de salvar.

## 4. Modificações em Analytics (`analytics.service.ts`)
- No método `getSummary()`, adicionar novas métricas usando a função interna `breakdown`:
  - `byCity`: agregação de `log.city`
  - `byRegion`: agregação de `log.region`
  - `byCountry`: agregação de `log.country`

## 5. Testes Unitários (TDD)
- Criar o arquivo `interaction-logs.service.spec.ts` que validará a lógica principal:
  - Mock de `geoip-lite` retornando um lookup fake (ex: BR, SP, São Paulo).
  - Mock de `ua-parser-js` retornando device e browser.
  - Teste 1: `should extract and save geo and user-agent data correctly in logVisit`.
  - Teste 2: `should handle missing or unresolvable IPs gracefully (saving nulls for geo)`.
- Criar o arquivo `analytics.service.spec.ts` para validar se as agregações geográficas foram incluídas no retorno final.

## 6. Fluxo de Execução
1. Instalar as libs.
2. Criar e rodar testes para `InteractionLogsService` -> Falhar (RED).
3. Implementar entidade e lógica de serviço -> Passar (GREEN).
4. Criar e rodar testes para `AnalyticsService` -> Falhar (RED).
5. Implementar agregação geográfica -> Passar (GREEN).
6. Commit e PR!
