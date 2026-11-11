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
