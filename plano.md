# Plano de Correção (Hotfix) - Sync de Banco de Dados e Dashboard Vazio

## 1. Etapa 1: Script de Backup Remoto e Restauração Local (Sincronização)
- **Objetivo:** Resolver as divergências de tags locais legadas (Problema do *correiodolulu*) e garantir uma rotina de backup segura e automatizada, tornando o ambiente local um espelho exato da produção.
- **Ação:** 
  1. Utilizar a pasta já existente `bkp-postgres/` (já mapeada no `.gitignore`).
  2. Criar um script bash (`bkp-postgres/sync-db.sh`) que:
     - Conecta via SSH na VPS de produção.
     - Executa o `pg_dump` no container do PostgreSQL remoto.
     - Faz o download seguro salvando em `bkp-postgres/dump_YYYYMMDD_HHMMSS.sql`.
     - Executa a limpeza (`drop schema`/`create schema` ou `clean`) e faz o *restore* desses dados diretamente no container local `smartcontact_postgres_db_dev`.
- **Resultado:** Ambientes sincronizados e backup do dia garantido na máquina local.

## 2. Etapa 2: Correção do Dashboard Vazio (Hotfix de Código)
- **Sintoma:** Leituras acontecem no VPS, mas os quadros (Geo e Dispositivos) não montam os gráficos.
- **Causa Raiz:** O TypeORM não traduz nomes de propriedades da entidade (`deviceType`) para colunas nativas (`device_type`) em cláusulas `andWhere` e `groupBy`, gerando um erro 500 no endpoint de agregação do `AnalyticsService`.
- **Ação:** No `AnalyticsService.breakdown`, aplicar a variável correta mapeada (`colName`) nas cláusulas `.andWhere(log.${colName} IS NOT NULL)` e `.groupBy(log.${colName})`.

## 3. Ação Proposta
1. Aprovação deste plano atualizado.
2. Commit atômico isolado do `plano.md`.
3. Criação do script de sincronização (`bkp-postgres/sync-db.sh`), teste prático da restauração local e commit.
4. Aplicação da correção (TDD RED/GREEN) no `AnalyticsService` e commit do Hotfix.
