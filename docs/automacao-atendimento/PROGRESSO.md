# Progresso: automação do atendimento

## Decisão: Claude Code no lugar do GitHub Copilot (11/11/2026)

A conta não tem plano pago do Copilot, e o cloud agent não vem no plano Free. Os prompts da aula citam o Copilot; nesta cópia, o equivalente é feito com o Claude Code:

| Na aula (Copilot) | Nesta cópia (Claude Code) |
|---|---|
| `.github/agents/*.agent.md` | Mantidos como a aula pede, com um espelho em `.claude/agents/*.md` para o Claude Code executar |
| Copilot cloud agent nas Actions | Claude Code GitHub Actions (`@claude` em issue ou PR), instalado com `/install-github-app` |
| Secret `COPILOT_AGENT_TOKEN` | Secret `ANTHROPIC_API_KEY` ou um token da assinatura do Claude |
| Agente executando a tarefa | O Claude Code executa o agente localmente, com ticket fictício |

Cada etapa registra aqui o que foi adaptado. O que depender de automação no GitHub fica como pendência até o secret ser configurado.

## Etapa 00: preparar o projeto e o acesso (11/11/2026)

**Cópia do projeto**
- URL: https://github.com/gabiberling/App-Fluxo-Tarefas (pública; visibilidade não alterada)
- Origem: cópia do App Fluxo Tarefas V1 (https://github.com/bittencourtthulio/App-Fluxo-Tarefas-V1), com a área de atendimento já adicionada. Não é um fork no GitHub.
- Pasta local: `d:\ProjetoGTIA`, branch `main` sincronizada com `origin/main`.
- Node v24.14.0 e npm 11.9.0 (o projeto exige Node 22.13 ou mais novo).
- Comandos do `package.json`: `dev`, `preflight`, `start`, `test`, `build`.

**Abrir o app**
- Comando: `npm run dev`
- Interface em http://127.0.0.1:5173 (o atendimento fica em `/atendimento`), API em http://127.0.0.1:3001/api. Se essas portas estiverem ocupadas, o comando escolhe as próximas livres e mostra os endereços no terminal.
- Conferido: a interface `/atendimento` respondeu 200 e `/api/boards` listou os quadros.

**Build**
- Comando: `npm run build`
- Resultado: ok (`✓ built`), com a saída gerada em `dist/`.
- `npm install`: dependências já atualizadas, 0 vulnerabilidades.

**Dados locais preservados**
- O banco SQLite em `server/dados/app.sqlite` não foi alterado nem apagado (a pasta está no `.gitignore`).
- Não há `.env` no projeto.

**Acesso ao GitHub**
- `gh` logado na conta dona do repositório.
- Actions habilitadas no repositório (`allowed_actions: all`).
- Copilot cloud agent: sem acesso. O Copilot não aparece entre os responsáveis que podem ser atribuídos no repositório, e `gh agent-task list` retornou `403 Forbidden`. Por isso, a decisão foi usar o Claude Code (veja acima).
- Claude Code GitHub Actions: **pendente**. O repositório ainda não tem workflow nem secret; a instalação vem numa etapa futura.

**Credenciais (separadas, valores nunca registrados aqui)**
- Backend local: uma credencial própria do app, em `.env` local (fora do Git), quando for necessária.
- Actions: um secret só para o agente, cadastrado só nas configurações do repositório no GitHub. Na aula ele se chama `COPILOT_AGENT_TOKEN`. Atualização de 11/11/2026: o plano mudou para o de/para com workflows (Copilot CLI no GitHub Actions, que lê `.github/agents/`), e o secret `COPILOT_AGENT_TOKEN` foi criado pela dona do repositório. O nome foi conferido com `gh secret list`; o valor não foi visto. O workflow ainda não existe.

## Etapa 01: definir contexto e limites (11/11/2026)

- `docs/automacao-atendimento/PRODUTO.md`: o que o app faz, como usar e o que ele não tem.
- `docs/automacao-atendimento/POLITICA-DE-AUTONOMIA.md`: os agentes podem responder dúvidas de uso, pedir esclarecimento e fazer pequenas mudanças no quadro de tarefas; a política lista os caminhos que podem e os que não podem mudar.
- `automacao/commercial-catalog.json`: só recursos reais; preço, planos e prazos ficam `null`, porque não existem no app.
- Conferido: os caminhos citados existem, os rótulos citados existem na interface, o JSON é válido e não há segredos nos arquivos.
- Adaptação para o Claude Code: `.claude/` foi incluído na política como caminho que o agente de produto não muda.

**Não feito até a etapa 01, de propósito**
- Nenhuma configuração remota, nenhum arquivo em `.github/agents/` e nenhum ticket de teste.
- Demonstrações futuras devem usar somente dados fictícios.

## Etapa 02: criar a equipe de agents (11/11/2026)

- Seis perfis da aula em `.github/agents/`: `coordenador`, `n1`, `comercial`, `po`, `desenvolvedor` e `revisor` (`.agent.md`), com frontmatter `name`, `description`, `target: github-copilot` e `tools`, sem modelo fixado. Os caminhos apontam para a base da etapa 01.
- O relatório JSON fica definido no coordenador: `requestId`, `outcome`, `publicText`, `agents`, `allowedFiles`, `criteria` e `updates`. Não havia controlador no projeto, então não houve contrato prévio a alinhar.
- Adaptação para o Claude Code:
  - Os especialistas foram espelhados em `.claude/agents/*.md`. Cada espelho manda ler o `.agent.md` correspondente, que continua sendo a única fonte das regras.
  - No Claude Code, um subagent não chama outro. Por isso o Coordenador virou o comando `/coordenador` (`.claude/commands/coordenador.md`), que roda na sessão principal e invoca os especialistas pela ferramenta Agent.
  - `report_progress` não existe no Claude Code; o comando regrava o relatório em `resultPath`, que por padrão fica em `automacao/resultados/`.
- Conferido: frontmatter completo em todos os arquivos, `tools` do Copilot em JSON válido, os cinco especialistas existem nos dois formatos e não há segredos.
- Ainda não executado: nenhum pedido foi rodado pela equipe, nem pelo Copilot nem pelo Claude Code. Os subagents novos só aparecem numa nova sessão do Claude Code.

## Extra: sem informação na base (11/11/2026, pedido fora das etapas da aula)

- O atendimento é só automático, sem atendente humano. Quando a base não tem a resposta, o agente avisa o cliente e registra a lacuna com `POST /api/tickets/:id/knowledge-gap`.
- Essa rota publica a mensagem do agente e move o cartão do ticket, sem duplicar, para a nova coluna "Sem resposta" do quadro Atendimento. A descrição do cartão fica organizada em: pergunta do cliente, o que faltou, onde o agente procurou e link do ticket.
- O relatório do coordenador usa `outcome: "human-review"` (revisão interna), sem criar um desfecho novo no contrato.
- Política, catálogo e os agents `n1`, `comercial` e `coordenador` foram atualizados; saiu o "encaminhe para uma pessoa".
- Conferido: `npm run build` ok, `npm test` com 31 testes passando (1 novo para a rota) e simulação com dados fictícios num banco de teste. A migração foi testada numa cópia do banco local; o original não foi alterado e ganha a coluna na próxima vez que o app subir.

## Extra: agente de banco de dados (11/11/2026, pedido fora das etapas da aula)

- Novo agente `banco-de-dados` (`.github/agents/banco-de-dados.agent.md` e o espelho `.claude/agents/banco-de-dados.md`). Ele só acrescenta migrações no fim de `MIGRACOES` em `server/src/db.js` e testa com `npm test` ou numa cópia do banco. Não toca em `server/dados/` nem nas tabelas de login. Perda de dados sem pedido explícito vira `human-review`.
- O PO indica "Banco: não precisa" ou a mudança necessária. O coordenador invoca `banco-de-dados` só quando precisa, antes do desenvolvedor, e o desenvolvedor não edita `db.js`. O revisor confere a migração em quatro pontos.
- A política ganhou a seção "Agente banco-de-dados". O banco continua proibido para os demais agentes, e texto de cliente continua sem autorizar mudança de banco por conta própria: a migração chega por PR e o merge é de uma pessoa.

## Teste do Copilot CLI no Actions (11/11/2026)

- O workflow manual `.github/workflows/teste-copilot.yml` rodou com sucesso (run 43042301006): o `COPILOT_AGENT_TOKEN` e o Copilot Free funcionaram, e o agente `n1` foi carregado de `.github/agents/` e respondeu certo. Custo: cerca de 0,30 crédito de IA.
- A CLI ignora o campo `target` (aviso esperado) e também leu `.claude/commands/coordenador.md`.

## Etapa 03: conectar app, issue e coordenador (11/11/2026)

- **App → issue:** com `AGENT_RUNTIME=github-native`, ao abrir um ticket o backend (`server/src/automacao.js`) cria a issue `origin:app` com a marca `fluxo:origem` (ticket e requestId). Antes de criar, procura se a issue já existe, para não duplicar depois de um erro de rede. A credencial local é `GITHUB_ISSUES_TOKEN` no `.env` (modelo em `.env.example`), separada do `COPILOT_AGENT_TOKEN`.
- **SQLite:** `ticket.usuario_id` guarda o dono, que não vai para o GitHub. A tabela `agent_request` guarda só issue, requestId, PR, fase e IDs de mensagens já enviadas. Ticket com dono só é lido pelo dono; agentes ainda respondem pelas rotas deles.
- **Controlador:** `automacao/controlador.mjs` e `.github/workflows/native-agents.yml`. Ele lê a origem, registra requestId/resultPath e relê responsáveis e estado antes de atribuir. Monta a atribuição com `assignees=["copilot-swe-agent[bot]"]` e `agent_assignment` (`target_repo`, `base_branch=main`, `custom_agent=coordenador`, `custom_instructions` com o pedido). Publica o resumo interno na issue e repassa o `publicText` dos updates do relatório como comentários `fluxo:publico`, que o app traz para o chat a cada 60 s, sem repetir. Usa `GITHUB_TOKEN` para controle e `COPILOT_AGENT_TOKEN` só na atribuição. Roda a partir da main (`pull_request_target` + checkout da main); o relatório do PR é lido como dado. Há `workflow_dispatch` para retomar.
- **AGENT_DRY_RUN=true** (padrão, inclusive no workflow): a atribuição é só montada e mostrada. Não havia motor antigo a suspender.
- **Conferido localmente com dados fictícios:** `npm test` com 32 testes passando (1 novo: leitura pelo dono) e `npm run build` ok. Issue e atribuição foram montadas sem chamada ao GitHub, repetir não cria outro pedido e a mensagem do N1 chega ao chat uma vez só (resposta do GitHub simulada). A migração foi testada numa cópia do banco local.
- **Pendências:**
  - O workflow ainda não foi enviado ao GitHub e nenhuma issue real foi criada.
  - O `GITHUB_ISSUES_TOKEN` local ainda não existe.
  - A atribuição a `copilot-swe-agent[bot]` exige o cloud agent (plano pago). No ensaio, o de/para troca esse passo pelo Copilot CLI com `--agent=coordenador` no próprio workflow.
  - O repositório é público, então o texto do ticket fica visível na issue. Use só dados fictícios.

## Teste ponta a ponta da etapa 03 (11/11/2026)

- Configuração: `.env` local com o `GITHUB_ISSUES_TOKEN`, que só acessa este repositório (testado sem mostrar o valor); label `origin:app` criado; o secret `ISSUES_TOKEN`, sem uso, foi excluído.
- O app subiu com o `.env` real e um banco de teste (o banco local não foi usado). Pela tela, com **Novo ticket**, foi aberto o ticket fictício "[Teste fictício] Cartão não muda de lista".
- Resultado: o backend criou a **issue #1** com o label `origin:app` (https://github.com/gabiberling/App-Fluxo-Tarefas/issues/1) e gravou `agent_request` com fase `issue-criada`.
- O workflow `Agentes nativos` disparou duas vezes (opened e labeled), ambas com sucesso. A issue ficou com um único "Resumo interno do controlador" (fase `dry-run`), porque o segundo disparo releu o estado e atualizou o mesmo comentário. A atribuição a `copilot-swe-agent[bot]` com `custom_agent=coordenador` foi montada e mostrada no resumo do Actions, **sem envio** (`AGENT_DRY_RUN=true`).
- Falta, para o ensaio: trocar a atribuição do cloud agent pago pelo passo com Copilot CLI (`copilot --agent=coordenador`) e então usar `AGENT_DRY_RUN=false`.

## Ensaio: troca do cloud agent pelo Copilot CLI (11/11/2026)

- O controlador (`automacao/controlador.mjs`) agora tem os modos `preparar`, `finalizar` e `acompanhar`. Com `AGENT_EXECUTOR=copilot-cli` (padrão) e `AGENT_DRY_RUN=false`, o workflow roda `copilot --agent=coordenador` com o pedido e, depois, o controlador lê o relatório. Com outcome `code`, ele confere os arquivos contra a política, abre o PR (`Refs #issue`, sem merge) e publica o resumo e as mensagens do N1 na issue. A atribuição ao cloud agent continua disponível com `AGENT_EXECUTOR=cloud-agent`.
- Segurança do workflow:
  - O controlador é copiado da main antes do agente rodar.
  - O agente só tem o token do Copilot, não tem push nem internet, e a escrita fica bloqueada em `.github`, `.env`, `server/dados`, configs e no próprio controlador.
  - Os testes rodam sem token.
  - O PR só abre se os arquivos estiverem na política e o build e os testes passarem.
- Sem informação na base pelo GitHub: o relatório traz `knowledgeGap`, o controlador o coloca no estado da issue e o app move o cartão para "Sem resposta" na sincronização.
- Configuração do repositório: ligado "Allow GitHub Actions to create and approve pull requests" (`can_approve_pull_request_reviews=true`), necessário para o workflow abrir PR. O padrão de permissões continua leitura.
- Conferido localmente: pedido do CLI montado, filtro da política (produto permitido; workflow, login, atendimento, package.json e controlador bloqueados), `npm test` com 32 testes passando e `npm run build` ok.

## Ensaio real com AGENT_DRY_RUN=false (11/11/2026)

- Com o ok da dona do repositório, foi criada a variável `AGENT_DRY_RUN=false` e o workflow rodou na issue #1 (run 43051505901, 4m34s, todos os passos com sucesso).
- O coordenador invocou de verdade os subagentes Suporte N1, Product Owner, Desenvolvedor e Revisor. Como o ticket é fictício e o código não tem esse defeito, os agentes não inventaram mudança e encerraram em `human-review`, sem PR. O relatório foi gravado em resultPath; o resumo interno e a mensagem do N1 foram publicados na issue.
- Custo: 2,72 créditos de IA (cerca de 4 minutos de agente). Acompanhe o saldo em https://github.com/settings/copilot.
- Ajustes depois do ensaio:
  1. O agente não roda mais build nem testes. A regra `shell(npm run build)` não casava e foi retirada, porque o workflow já roda build e testes num passo sem token.
  2. `.claude/` fica escondido do `git status` enquanto está fora do caminho, porque o Revisor o via como "apagado".
  3. Texto repetido (o mesmo publicText como andamento e como final) é publicado uma vez só.
  4. O pedido diferencia "faltou detalhe do cliente" (`waiting-customer`, com uma pergunta) de "a base não tem a resposta" (`human-review` + `knowledgeGap`).
- Atenção: com `AGENT_DRY_RUN=false`, todo ticket novo aberto no app aciona o agente e gasta créditos. Para pausar: `gh variable set AGENT_DRY_RUN --body true`.

## Etapa 05: entregar resposta e tratar retomadas (11/11/2026)

- **Entrega:**
  - O workflow abre o PR a partir do relatório do coordenador. É o "coordenador abre o PR" do cloud agent: aqui o agente não tem push.
  - O Revisor registra `review.ok`/`notes` no relatório.
  - O commit só é conferido depois de build e testes verdes; o SHA fica no estado e no corpo do PR.
  - O PR usa `Refs #issue`, e não `Fixes`, para o merge não fechar a issue antes da resposta.
- **AUTO_MERGE** (variável do repositório; padrão `false`):
  - Com `false`, o PR fica aberto para a demonstração. Quando a dona faz o merge, o evento do PR aciona a entrega.
  - Com `true`, autorizado antes para a cópia, o controlador integra pela API só o SHA conferido. A API respeita as regras da branch, sem bypass. Depois ele entrega a resposta na mesma execução.
- **Depois do merge confirmado:** o controlador publica a resposta curta do N1 (`deliveryText` do relatório ou um texto padrão), com o ID estável `entrega-merge`, e fecha a issue (`completed`). O texto diz que o código foi integrado e que o app local precisa ser atualizado. Na sincronização seguinte, o app mostra a mensagem no ticket da dona, marca o ticket como resolvido e para de sincronizar o caso.
- **Outros desfechos:** dúvida de uso respondida (`answered`) recebe a resposta e fecha a issue. Esclarecimento pendente (`waiting-customer`), `commercial` e `human-review` mantêm o caso aberto.
- **Falhas:** se o build/testes ou a revisão falharem, o controlador (modo `avaliar`) pede uma única rodada de correção ao coordenador no mesmo trabalho (mesmo requestId, mesmos arquivos e o erro curto) e confere de novo. Se ainda falhar, o PR abre como rascunho, com a pendência no corpo e fase `pr-pendente`, e o instrutor decide. Nenhum ticket novo é criado e o trabalho não recomeça.
- **Conferido com transporte simulado** (um GitHub falso em arquivo, sem rede):
  - Uma retomada depois do merge publicou a resposta e fechou a issue. Repetida, não duplicou nada (3 comentários e 1 fechamento).
  - A sincronização do app trouxe a resposta para o ticket, marcou o ticket como resolvido e parou.
  - O modo `avaliar` pediu correção só quando o build falhou.
  - `npm test`: 32 testes passando; `npm run build` ok.
- **Ainda não executado de verdade:** um pedido com código no GitHub, que abriria PR, nem a rodada de correção real. As duas coisas gastam créditos do Copilot.

**Caminho de retomada:** tudo é retomado pela própria issue, sem abrir ticket novo. O comentário "Resumo interno do controlador" guarda requestId, PR, fase, SHA conferido e os IDs das mensagens já publicadas. Para retomar, use *Actions → Agentes nativos → Run workflow* com o número da issue. O controlador relê esse estado e faz só o que falta:
- se já existe PR com merge, apenas entrega a resposta (`entrega-merge`) e fecha a issue, sem repetir mensagens;
- se o PR está aberto ou pendente, só acompanha;
- se o trabalho parou no meio (`executando`) ou o relatório falhou (`erro-execucao`), executa de novo o mesmo requestId.

No app, a sincronização usa os mesmos IDs e não duplica mensagens.

## Etapa 04: validar código e regressão (11/11/2026, feita depois da 05)

O professor não usou esta etapa em aula, mas ela foi conferida e completada.
- **Já atendido:** o `native-agents` instala pelo lockfile (`npm ci`) e roda `npm run build` + `npm test` num passo sem token. Os testes existentes são mantidos e nenhum teste novo é obrigatório. O critério é simples (`{id, description}`), sem exigir caminho de teste. O código candidato nunca roda com tokens de controle. Uma falha concreta volta ao desenvolvedor (rodada única da etapa 05).
- **Acrescentado:**
  1. `.github/workflows/ci.yml`: verificação mínima (`npm ci`, build e testes) em push na main e em PRs de pessoas.
  2. Status do commit `fluxo/build-e-testes` publicado pelo controlador no SHA do PR do agente, porque PR aberto pelo token do Actions não dispara o CI.
  3. Origem do PR conferida antes de entregar ou fechar: só a branch `agente/<requestId>` do próprio repositório.
  4. Campo `verification` no relatório, com a frase de conferência do Desenvolvedor (no Actions, sem navegador, ele diz que falta a conferência visual), mostrado no PR. O Revisor continua com a frase em `review.notes`.
- **Proteção da main:** nenhuma (sem branch protection nem rulesets), sem exigências antigas a ajustar.
- **Conferido:** regra de origem (PR do agente aceito; outra branch e fork recusados), `npm test` com 32 testes passando e `npm run build` ok. O resultado da primeira execução do CI na main está registrado logo abaixo.
- **Build registrado:** a primeira execução do CI na main (commit 8e3e0fc, run 43054017197) passou: `npm ci`, `npm run build` e `npm test` verdes.

## Teste completo (ticket "Cores", issue #2) e retomada do esclarecimento (11/11/2026)

- O ticket real "Cores" (pedido: trocar o azul por tons pastéis de rosa e lilás) criou a issue #2. O agente rodou (0,68 crédito), o N1 perguntou "Em qual parte da interface…?" e o caso ficou em `waiting-customer`. O segundo disparo (labeled) não repetiu nada.
- **Problema encontrado:** a resposta da cliente no app ("Apenas na primeira página… Na home") ficava só no app. Nada a levava para a issue nem acordava o agente.
- **Correção:**
  - Com o caso em `waiting-customer`, a sincronização do app publica as respostas da cliente na issue como comentário `fluxo:cliente id=<mensagem>`, uma vez cada.
  - O workflow escuta `issue_comment`, mas só aceita `fluxo:cliente` vindo da mesma conta que abriu a issue (a do app). Num repositório público, comentário de outra pessoa não gasta créditos.
  - O controlador retoma o mesmo requestId na rodada seguinte, com a conversa pública como contexto, ids novos (`r2-…`) e sem repetir textos já publicados.
- **Política mantida (decisão da dona do repositório):** a página inicial (`Landing.jsx`, `landing.css`) não entra na lista de caminhos permitidos. O PO agora devolve `human-review` antes de implementar quando o pedido exige arquivo fora da lista, para não gastar créditos à toa.
- Conferido localmente: filtro de respostas (só a conta do app), pedido de retomada com a conversa, `npm test` com 32 testes passando.
- **Retomada real (run 43059557960, 0,78 crédito):** a resposta da cliente chegou à issue antes do workflow novo estar na main, então a retomada foi feita uma vez por `workflow_dispatch`, com a issue #2. O coordenador retomou o mesmo requestId com a conversa, o N1 confirmou o entendimento e o PO barrou a mudança porque a home está fora da política. Resultado: `human-review`, sem PR e sem código. As mensagens chegaram ao chat do ticket. Ajuste: o id já com prefixo da rodada (`r2-…`) não ganha prefixo de novo.
- **Custo total do ticket "Cores":** 0,68 + 0,78 = 1,46 crédito.

## Política liberada com aprovação obrigatória (11/11/2026)

- **Decisão da dona do repositório:** os agentes podem mudar todo o código; ela aprova cada PR antes de ele entrar na `main`.
- **Política e controlador:** a lista "pode mudar" virou uma lista de exceções (`BLOQUEADOS`): `.github/`, `.claude/`, `.env`, `server/dados/` e `automacao/controlador.mjs`, por motivos técnicos e de segurança. PO, Desenvolvedor e Revisor foram atualizados. O workflow deixou de bloquear `package*.json`, `vite.config.js` e `scripts/`.
- **Aprovação:** `.github/CODEOWNERS` com `@gabiberling` e proteção da `main` exigindo 1 aprovação de code owner.
- **Retomada manual:** `workflow_dispatch` agora também refaz casos em `human-review` ou `erro-execucao`, com a conversa como contexto. A pessoa que dispara é quem autoriza a nova tentativa.
- As cores do ticket "Cores" serão feitas pelo Copilot, retomando a issue #2. Nada foi alterado à mão.
- **1ª tentativa das cores (run 43061406897, 3,48 créditos):** o Copilot alterou `client/src/landing.css` e o build e os testes passaram, mas o Finalizar falhou por um defeito do controlador. O `git status --porcelain` era lido com `trim()`, o que cortava o 1º caractere do 1º caminho (`lient/src/landing.css`). Sem PR, o trabalho se perdeu com o runner e a issue ficou em `executando`. Correção: função `arquivosMudados`, conferida com a saída que falhou. A issue #2 foi retomada manualmente.
