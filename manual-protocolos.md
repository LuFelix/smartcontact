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
3. Faça o comentário na PR que está sendo encerrada com o commit final contendo um resumo do que foi executado.
4. Edite o GEMINI.md para manter o projeto atualizado seguindo o padrão.
5. IMPORTANTE: Nunca faça merge local. O merge para a branch principal será feito exclusivamente pelo usuário através da interface do GitHub (Remoto).

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
   - **Planejamento (`plano.md`):** Antes de codificar qualquer alteração, o agente deve apresentar o plano dos testes e aguardar aprovação.
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
