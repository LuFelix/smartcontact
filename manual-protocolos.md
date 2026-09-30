# 🤖 MANUAL DE PROTOCOLOS DO AGENTE

Este arquivo define as Regras de Ouro e Procedimentos Operacionais Padrão (SOP) para o desenvolvimento neste repositório. Leia e aplique estas instruções estritamente em todas as sessões.

## 1. [ABERTURA DE BRANCH PADRÃO OURO]
O que é:
   * Criação do ambiente de trabalho e sinalização de início.
   * Por que o commit vazio? Para permitir a criação imediata do Pull Request (Draft)*. Sem um commit, o GitHub não permite abrir o PR. Isso garante que a tarefa apareça no board como "Em Progresso".

Sempre que iniciarmos o desenvolvimento de uma nova Issue, execute exatamente esta sequência de comandos no terminal para garantir o alinhamento com o repositório remoto:

git checkout develop
git fetch origin
git pull --ff-only origin develop
git checkout -b feature/ID-nome-da-issue
git commit --allow-empty -m "chore: initialize branch for Issue #ID"
git push -u origin feature/ID-nome-da-issue
gh pr create --draft --title "WIP: Nome da Issue" --body "Resolves #ID"

**REGRA ABSOLUTA:** JAMAIS COMMITE DIRETAMENTE NA BRANCH `develop` OU `main`. O repositório possui proteção rígida. Todas as alterações, sejam de código ou documentação, devem ocorrer estritamente através de branches de feature/fix e Pull Requests.

## 2. [FECHAMENTO DE ISSUE PADRÃO OURO]
Ao concluir o desenvolvimento e os testes de uma Issue, siga o protocolo de encerramento:

1. Realize um commit final (pode ser vazio) depois de confirmado que pode encerrar pelo usuário (PERGUNTE) com a exata sintaxe:
   git commit -m "chore: final validation and closure of Issue Name. closes #ID."
2. Faça o push das alterações para a branch de feature atual (git push).
3. Ao fazer o commit/push de encerramento, coloque a PR em estado de revisão (`gh pr ready <PR>`) e retire o prefixo `WIP:` do título, deixando-o definitivo.
4. Faça o comentário na PR que está sendo encerrada com o commit final contendo um resumo do que foi executado.
5. Edite o GEMINI.md para manter o projeto atualizado seguindo o padrão.
6. IMPORTANTE: Nunca faça merge local. O merge para a branch principal será feito exclusivamente pelo usuário através da interface do GitHub (Remoto).

## 3. [FAXINA LOCAL]
Para manter o ambiente local limpo e sincronizado. Atenção: Só execute esta sequência após a confirmação explícita do usuário de que o merge remoto foi concluído.

git checkout develop
git fetch origin
git pull --ff-only origin develop
git branch --merged develop
git branch -d nome-da-branch

## 4. [CADASTRO DE ISSUE NO TODO]
Se durante a análise for identificada a necessidade de uma nova tarefa, apresente-a em formato JSON puro.
* Siga o esquema do arquivo issues-todo.json localizado na raiz do projeto.
* Entregue o JSON limpo, sem numeração de linhas de terminal e sem artefatos visuais extras.
* Não altere o arquivo apenas informe a issue para ser trabalhada.
* Nunca execute comandos de build, apenas pessa para verificar se está ok com o código antes de  preosseguir.

## 5. REGRAS GERAIS DE CONVERSA E CÓDIGO
* [APENAS RESPONDA]: Quando o prompt for uma pergunta técnica ou de arquitetura, não escreva código ou abra branches. Apenas explique o conceito e aguarde a próxima instrução.
* [AUTO-EDIT]: Ao codificar, todos os commits devem ser atômicos. As mensagens de commit devem ser escritas obrigatoriamente em Inglês e devem conter a referência da Issue (#ID), seguindo o padrão ouro (What/Why/Testing).

## 6. [REGRA DE OURO: ATOMICIDADE CIRÚRGICA]
  A falha nesta regra é considerada erro grave de workflow.

   1. Um Contexto, Um Commit: NUNCA agrupe alterações de telas, componentes ou módulos diferentes em um único commit. Se
      você mexeu na Gestão de Equipe e depois nos Leads, você DEVE fazer o commit da Equipe antes de tocar no código dos
      Leads.
   2. Fluxo de Execução:
       * Codificar: Realize a alteração em um componente/tela.
       * Validar: Verifique se o build passa e se não há erros de referência.
       * Commitar: Faça o commit atômico seguindo o padrão (What/Why/Testing).
       * Seguir: Só então avance para a próxima tarefa ou arquivo.
   3. Proibição de "Bundles": É expressamente proibido realizar "entregas em lote" de arquivos modificados que resolvam
      subtarefas distintas, mesmo que façam parte da mesma Issue.
   4. Rastreabilidade: Cada commit deve ser pequeno o suficiente para que, em caso de erro, a reversão seja cirúrgica e
      não afete outras partes funcionais implementadas no mesmo turno.

## 7. [FECHAMENTO ORGÂNICO DE ISSUE VIA CLI]
O que é:
   * Encerramento de tarefas no backlog que foram resolvidas como efeito colateral (indiretamente) de outras implementações, dispensando a necessidade de uma PR dedicada.

Sempre que instruído a fechar uma issue "organicamente" ou "limpar o backlog", o Agente não deve criar commits vazios ou branches. Ele deve executar o comando do GitHub CLI (`gh`) diretamente no terminal usando uma única linha de comando para evitar erros de escape de caracteres.

Sintaxe obrigatória:
`gh issue close <ID> -r "completed" -c "**Status de Resolução:** Fechada organicamente. <Justificativa técnica detalhando onde o código foi absorvido>."`

Exemplo prático de execução:
gh issue close 99 -r "completed" -c "**Status de Resolução:** Fechada organicamente. A funcionalidade foi absorvida pela refatoração do TagService na Issue #98."

## 8. [TESTES TDD E SETUP DO AMBIENTE (VITEST)]
Para o desenvolvimento com Test-Driven Development (TDD) no SmartContact, a IA deve utilizar a suíte **Vitest** (runner de testes oficial do projeto, superior ao Jest em velocidade e integração) operando em conjunto com o compilador **SWC**. O desenvolvimento guiado por testes deve seguir este protocolo:

1. **Stack Tecnológica Oficial:**
   - **Bibliotecas:** `vitest` (v2.1+), `@swc/core` (compilador nativo) e `unplugin-swc`.
   - **Sintaxe de Mocking:** Utilizar sempre a API do Vitest (`vi.fn()`, `vi.mock()`, `vi.spyOn()`) e NUNCA APIs do Jest (`jest.fn()`).

2. **Fluxo de Trabalho TDD Obrigatório:**
   - **Planejamento (`plano-<nome-issue>.md`):** Antes de codificar, o agente deve SEMPRE criar na raiz do projeto o arquivo de plano **daquela issue**, no formato `plano-<nome-issue>.md` (ex: `plano-312-matriz-independencia-milestones.md`), com o plano de ação e testes. Cada issue tem o seu próprio arquivo — **nunca** reaproveite nem sobrescreva o plano de outra issue (regra anti-conflito para agentes em paralelo, conforme `.docs/governance/milestone-file-matrix.md`).
   - **Commit do Plano (Regra Estrita):** Assim que o plano for aprovado pelo usuário, o `plano-<nome-issue>.md` DEVE ser commitado de forma atômica e 100% isolada (ex: `docs: aprova plano de execução da Issue #ID`), SEM nenhuma modificação de código junto. Se o plano mudar no meio do caminho, a alteração no arquivo de plano também deve receber seu próprio commit isolado.
   - **Fase RED:** Escrever os testes unitários (`.spec.ts`) validando a nova regra de negócio e executar via terminal (`npm run test -- arquivo.spec.ts`). O agente deve comprovar que o teste falhou.
   - **Fase GREEN:** Escrever/alterar o código de produção (`.ts`) estritamente necessário para fazer o teste passar, e executar novamente comprovando o sucesso.
   - **Validação Global:** Executar a suíte inteira (`npm run test`) para assegurar a ausência de regressões no projeto (Manter a barreira de 95%+ de cobertura intacta).

3. **Regra de Ouro de Isolamento:**
   - Serviços, Repositórios e dependências injetadas devem ser 100% mockados. Nenhuma requisição de rede ou acesso direto ao banco de dados deve ser executada nos testes unitários em `.spec.ts`.

## 9. [PADRÃO DE COMPONENTIZAÇÃO: SMART/DUMB + SIGNALS]
Todo novo componente de visualização deve seguir o padrão:
1. **Container (Smart):** Responsável por injetar serviços, realizar requisições HTTP e gerenciar o estado via `WritableSignal`.
2. **Presentational (Dumb):** Recebe dados via `input()` (preferencialmente Signals) e emite eventos via `output()`.
3. **Reatividade:** Evite `BehaviorSubject` ou `AsyncPipe` para novos desenvolvimentos. Utilize Signals (`signal`, `computed`, `effect`) para garantir máxima performance com o Angular v17+.

## 10. [ORGANIZAÇÃO DE DOMÍNIO (FEATURE-DRIVEN)]
O código deve seguir estritamente o domínio da funcionalidade:
1. **Features:** Módulos de nível superior devem ser baseados em funcionalidade (ex: `features/dashboard`, `features/tags`, `features/auth`).
2. **Users:** A pasta `features/users` deve conter estritamente o gerenciamento do usuário (perfil, dados, configurações). Não mova dashboards, logs ou relatórios para lá.

## 11. [SMOKE TESTS & RUNNER DASHBOARD DE TELEMETRIA (BACKEND/TEST/SMOKE)]
Para garantir a saúde operacional e a validação ponta a ponta dos contratos de API no ambiente real (containers Docker ou instâncias locais), todo novo módulo ou funcionalidade backend deve conter testes de fumaça automatizados via shell/HTTP.

1. **Obrigatoriedade por Feature/Módulo (Etapa Imprescindível):**
   - A cada nova funcionalidade, endpoint ou módulo construído no backend (ex: `tags`, `analytics`, `memberships`, `notifications`), é **estritamente obrigatório** criar ou atualizar o script de teste de fumaça dedicado em `backend/test/smoke/test-<modulo>-api.sh`.
   - O novo script deve ser imediatamente integrado e registrado no runner universal `backend/test/smoke/run-all-smoke-tests.sh`.

2. **Estrutura e Responsabilidades do Script (`test-<modulo>-api.sh`):**
   - **Autenticação Automática:** Obter token JWT dinâmico via `POST /api/v1/auth/login` com as credenciais administrativas de teste.
   - **Ciclo de Vida Completo (CRUD & Fluxos Reais):** Testar fluxos de criação (201), leitura/filtros (200), detalhamento (200), atualização (200) e vínculos relacionais/associativos.
   - **Testes de Segurança e Multi-Tenancy:** Validar explicitamente rejeições de acesso não autorizado (401 Unauthorized e 403 Forbidden) para assegurar o isolamento estrito entre papéis (roles) e tenants.
   - **Medição de Latência:** Cronometrar o tempo de resposta milimétrico (`time_total`) em cada requisição para telemetria de performance.
   - **Saída Padronizada:** Emitir logs claros no terminal (badges `[ PASS ]` e `[ FAIL ]`) e exportar os dados brutos de resultado para o agregador.

3. **Dashboard de Resultados & Relatórios:**
   - O runner universal (`run-all-smoke-tests.sh`) consolida a execução de todas as suítes de fumaça, exibindo um painel interativo no terminal e gerando automaticamente um relatório visual rico em `backend/test/smoke/reports/smoke-report.html`.
   - O relatório HTML deve apresentar taxa de sucesso (%), total de testes aprovados/reprovados, latência média (ms) e tabela discriminada com status HTTP e duração de cada endpoint.

4. **Regra de Execução Pré-Encerramento:**
   - Antes de solicitar a aprovação de uma PR ou realizar o commit final de encerramento de qualquer issue de backend, o agente deve executar o runner de smoke tests (`bash backend/test/smoke/run-all-smoke-tests.sh`) contra o ambiente de desenvolvimento/lab, comprovando 100% de aprovação (0 falhas).

## 12. [PERSISTÊNCIA TYPEORM & POSTGRESQL: ANTI-CONCORRÊNCIA DDL EM ENUMS]
Para garantir estabilidade máxima no deploy, migrações e concorrência com scripts de seed/workers:
1. **Proibição de `type: 'enum'` Nativo do Postgres:** Nunca declare `@Column({ type: 'enum', enum: MeuEnum })` em entidades TypeORM com banco PostgreSQL.
2. **Padrão Obrigatório (`type: 'varchar'`):** Declare sempre como `@Column({ type: 'varchar', length: 50, default: MeuEnum.VALOR })` associado ao tipo TypeScript e validado na camada de DTO com `@IsEnum(MeuEnum)` do `class-validator`.
3. **Motivação Técnica:** O `synchronize: true` do TypeORM tenta criar `CREATE TYPE` no catálogo `pg_type`. Quando múltiplos processos (ex: backend NestJS + script de seed) sobem concorrentemente no deploy, ocorre colisão de chave única (`duplicate key value violates unique constraint "pg_type_typname_nsp_index"`). O uso de `varchar` elimina completamente qualquer bloqueio DDL no Postgres mantendo 100% da segurança de tipos no TypeScript.


## 13. [RELEASE PARA PRODUÇÃO — PR develop → main]
O que é:
   * A Release acontece exclusivamente quando fazemos o merge da `develop` na `main`.
   * O push na `main` dispara o deploy automático imediato (`.github/workflows/deploy.yml` executa o `deploy.sh` na VPS).
   * Esta seção padroniza o TÍTULO e o CORPO (body) dessas PRs, padrão adotado a partir da governança de releases do projeto.

### A. Regras de construção do TÍTULO
1. Formato obrigatório: `Release: <resumo fiel em português do conteúdo entregue> (#issue1, #issue2, ...)`
   * Exemplo: `Release: Rebalanceamento da Trilha IFAL Integrado conforme Raio X (#448)`
   * Múltiplas issues separadas por vírgula dentro do mesmo parêntese: `(#399, #391, #392)`.
2. É PROIBIDO usar o padrão de issue (`[PREFIXO-ID] Tipo: Nome`) ou o prefixo `WIP:` em PR de release.
3. O resumo do título deve ser fiel ao escopo real do delta `develop..main` (não copiar cegamente o título de uma das issues).

### B. Regras de construção do CORPO (body)
1. **Abertura:** cabeçalho `## 🚀 Release: <mesmo resumo do título>` seguido de um parágrafo de escopo (o quê e por quê).
2. **Miolo:** seção `### 📦 Principais Entregas` com itens agrupados por área/entrega (`#### 1. 🎓 ...`), bullets técnicos e rastreabilidade da origem no formato `(#issue / PR #origem)`.
3. **Validação:** seção `### ✅ Validação` em checklist marcado, cobrindo no mínimo: testes Vitest (BE/FE), lint, smoke tests e validação do usuário no ambiente de lab.
4. **Rastreabilidade:** última linha sempre `Closes #issue1, #issue2` (encerra as issues automaticamente no merge). Se o trabalho foi feito em PR intermediária da develop, usar a variante `Closes #ID via PR #origem`.
5. **Escala proporcional:** release pontual (1 fix/feature) pode usar `### Changelog` enxuto em bullets estilo conventional commits (`feat:` / `fix:`); releases de milestone usam o relatório completo com subseções numeradas.

### C. Fluxo de execução
1. Verificar o delta real: `git log origin/main..origin/develop --oneline`
2. Criar a PR: `gh pr create --base main --head develop --title "Release: ..." --body "..."`
3. Aguardar o usuário fazer o merge exclusivamente pela interface do GitHub (o merge dispara o deploy).
