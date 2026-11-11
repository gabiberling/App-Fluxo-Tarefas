# Decisões e configurações

Registro do que foi decidido, do que já está configurado e do que ainda falta decidir ou configurar. O histórico detalhado por etapa está em `PROGRESSO.md`.

## Decisões tomadas

| Data | Decisão | Motivo |
|---|---|---|
| 11/11 | Projeto em `d:\ProjetoGTIA`, publicado em https://github.com/gabiberling/App-Fluxo-Tarefas (público) | Cópia do App Fluxo Tarefas V1 do professor (baixado em zip; não é fork) |
| 11/11 | Área **Atendimento** no estilo ChatGPT: cada ticket é uma conversa | Pedido da aluna |
| 11/11 | Ticket novo só pelo botão **Novo ticket** da lateral (janela com título e descrição); a área central é sempre um chat | Pedido da aluna |
| 11/11 | Todo ticket vira cartão na coluna "Novos" do quadro **Atendimento** (colunas: Novos, Em atendimento, Sem resposta, Resolvidos) | Pedido da aluna; quadro próprio para não misturar com os de trabalho |
| 11/11 | Atendimento **100% automático**, sem atendente humano; respostas virão de uma base de conhecimento futura | Direção do produto |
| 11/11 | Sem informação na base: o agente avisa o cliente e o cartão vai para "Sem resposta" com pergunta, o que faltou e onde procurou (reaproveita o cartão, não duplica) | Pedido da aluna; mostra o que falta na base |
| 11/11 | Sem plano pago do Copilot. Primeiro foi adotado o Claude Code como equivalente (agents espelhados em `.claude/`) | Cloud agent exige plano pago |
| 11/11 | **De/para com workflows** (sugestão do professor): o Copilot CLI roda no GitHub Actions com os agents de `.github/agents/`, usando o **Copilot Free** e o secret `COPILOT_AGENT_TOKEN` | Grátis (Actions é ilimitado em repo público; CLI incluída no Copilot Free); testado com sucesso |
| 11/11 | Agente **banco-de-dados**: só ele cria migrações, sempre no fim da lista, via PR; perda de dados vira `human-review` | Pedido da aluna; política da aula proíbe banco aos demais |
| 11/11 | Lacunas de informação usam o desfecho `human-review` (já existente no contrato), sem criar outro | Não quebrar o contrato do relatório da aula |
| 11/11 | No ensaio, o agente roda no Actions só com o token do Copilot, sem push e sem internet; commit, push e PR ficam com o controlador da main, depois de conferir a política e os testes | Um ticket mal-intencionado não consegue fazer o agente mexer em workflow, banco ou credenciais |
| 11/11 | Entrega (etapa 05): PR com `Refs` (não `Fixes`); depois do merge, resposta do N1 com ID estável `entrega-merge` e issue fechada pelo controlador; no máximo uma rodada automática de correção, e depois decide o instrutor | Pedido da aula; retomadas sem duplicar |
| 11/11 | `AUTO_MERGE=false` (padrão): o PR fica aberto para a demonstração e o merge é da dona do repositório | Ainda não houve autorização para merge automático |
| 11/11 | Verificação mínima (etapa 04): CI `ci.yml` (`npm ci` + build + testes) em push e PRs de pessoas; nos PRs do agente, a mesma verificação roda sem token no `native-agents` e vira o status `fluxo/build-e-testes` do commit. Para aceitar código: origem do PR (branch `agente/<requestId>` do próprio repositório), requestId, caminhos permitidos e build do commit atual | PR aberto pelo token do Actions não dispara outros workflows; um PR qualquer que cite a issue não pode entregar nem fechar |
| 11/11 | Esclarecimento: a resposta da cliente no app vai para a issue como `fluxo:cliente` e retoma o mesmo pedido; o workflow só aceita esses comentários da conta do app | O caso parava em `waiting-customer` para sempre; repo público não pode gastar créditos com comentário de terceiros |
| 11/11 | (Substituída) A home ficou primeiro fora da lista permitida | Ver a decisão seguinte |
| 11/11 | **Agentes podem mudar todo o código**, exceto `.github/`, `.claude/`, `.env`, `server/dados/` e o controlador; **a `main` é protegida e todo PR exige a aprovação da dona do repositório** (CODEOWNERS, revisão obrigatória) | Decisão da dona do repositório: liberar o Copilot sem perder o controle do que entra na main |
| 11/11 | As cores e as outras mudanças de produto pedidas no atendimento são feitas pelo Copilot, nunca à mão pelo Claude | Decisão da dona do repositório: o objetivo é ver o fluxo dos agentes |
| 11/11 | Ticket aberto com login fica com **dono** (`ticket.usuario_id`); só o dono lê. Sem login, segue aberto (a interface ainda não tem login) | Etapa 03 |

## Configurações

### Já feitas
- [x] `gh` logado na conta dona do repositório; Actions habilitadas.
- [x] **Copilot Free** ativado na conta.
- [x] Secret do repositório **`COPILOT_AGENT_TOKEN`**: token fine-grained da conta pessoal com permissão "Copilot Requests". Testado pelo workflow `teste-copilot.yml`.
- [x] Workflows na `main`: `teste-copilot.yml` (manual) e `native-agents.yml` (controlador).
- [x] **`.env` local** com `AGENT_RUNTIME=github-native`, `AGENT_DRY_RUN=true`, `GITHUB_REPO` e **`GITHUB_ISSUES_TOKEN`** (fine-grained, só este repositório, Issues: leitura e escrita). Fica só no computador; **não** é secret do repositório (o app local não lê secrets do GitHub). O secret `ISSUES_TOKEN`, criado por engano no repositório, foi excluído. O `AGENT_DRY_RUN` do `.env` não controla o agente: quem controla é a variável do repositório (veja "Dry-run" abaixo).
- [x] **Label `origin:app`** criado no repositório.
- [x] **Apelidos dos tokens** em *Developer settings → Fine-grained tokens* (só nomes): `App-Fluxo-Tarefas` = token do secret `COPILOT_AGENT_TOKEN` (Copilot Requests); `App-Fluxo-Tarefas-Git` = token do `.env` `GITHUB_ISSUES_TOKEN` (Issues). Os dois vencem em 09/02/2027. Não apagar: os dois estão em uso.
- [x] **Troca para o Copilot CLI:** `native-agents.yml` roda `copilot --agent=coordenador` (`AGENT_EXECUTOR=copilot-cli`, padrão); a atribuição paga continua disponível com `AGENT_EXECUTOR=cloud-agent`.
- [x] **Proteção da `main`** (11/11): PR obrigatório com 1 aprovação de code owner (`.github/CODEOWNERS` → `@gabiberling`). Admins não são forçados, para a manutenção direta continuar possível; o bot do Actions não faz merge sem a aprovação. O CI não é check obrigatório.
- [x] **Actions pode abrir PR:** *Settings → Actions → General → Allow GitHub Actions to create and approve pull requests* ligado.
- [x] **Variável do repositório `AGENT_DRY_RUN=false`** (11/11, com o ok da dona do repositório). Veja "Dry-run" abaixo.

### Pendentes
- [ ] (Decisão) **`AUTO_MERGE`**: hoje não existe a variável, ou seja, `false`. Para integrar automaticamente o commit conferido, crie a variável do repositório `AUTO_MERGE=true` (`gh variable set AUTO_MERGE --body true`). Só com autorização da dona do repositório.
- [ ] **Validade dos tokens:** renovar o `COPILOT_AGENT_TOKEN` e o `GITHUB_ISSUES_TOKEN` antes de vencerem.

## Dry-run: ligar, desligar e custo

**O que é:** com o dry-run **ligado**, o workflow "Agentes nativos" só **monta e mostra** o que faria (o pedido para o Copilot), sem executar nenhum agente e sem gastar créditos. Com o dry-run **desligado**, cada issue do app aciona o Copilot CLI de verdade.

**Situação atual:** **desligado** desde 11/11/2026 (variável do repositório `AGENT_DRY_RUN=false`). Portanto, **todo ticket novo aberto no app aciona os agentes e gasta créditos**.

**Quem controla:** só a variável do repositório `AGENT_DRY_RUN` (*Settings → Secrets and variables → Actions → Variables*). Sem a variável, o padrão é `true` (ligado). O `AGENT_DRY_RUN` do `.env` local não muda nada no GitHub.

| Para… | Comando (ou pela tela de Variables) |
|---|---|
| Ver como está | `gh variable list` |
| **Ligar o dry-run** (pausar agentes, sem gasto) | `gh variable set AGENT_DRY_RUN --body true` |
| **Desligar o dry-run** (agentes executam) | `gh variable set AGENT_DRY_RUN --body false` |
| Voltar ao padrão (ligado) | `gh variable delete AGENT_DRY_RUN` |

**Gasto de créditos (Copilot Free):**
- Teste simples do CLI (`teste-copilot.yml`, 2 perguntas): cerca de **0,30** crédito.
- Um ticket completo (coordenador + N1, PO, Desenvolvedor e Revisor), no ensaio de 11/11: **2,72** créditos, em cerca de 4 minutos. Pedidos com código e uma rodada de correção podem gastar mais.
- Os minutos do Actions não custam nada (repositório público).
- O saldo e o limite mensal do Copilot Free ficam em https://github.com/settings/copilot. Quando os créditos acabam, o passo do agente falha e a issue fica em `erro-execucao` até ser retomada.
- Dica: deixe o dry-run **ligado** quando não estiver demonstrando, e desligue só para testar.

## Decisões em aberto
- **Nome de quem responde no chat:** hoje aparece "Suporte", o status mostra "Aguardando suporte" e a caixa diz "Responder ao suporte…". Sugestões: "Assistente" ou "Atendimento automático". O status "Respondido" também aparece em casos sem resposta.
- **Login na interface:** a API tem login, mas as telas não. Sem login, os tickets não têm dono e todos veem todos.
- **Cota do Copilot Free:** cada ticket passa por vários agents. Acompanhar o consumo de créditos e decidir se um plano pago vale a pena.
- **Privacidade:** o repositório é público e o texto do ticket vai para a issue. Para uso real: repositório privado ou issue só com um resumo.
- **Agents no Copilot CLI:** a CLI também lê `.claude/commands/coordenador.md`. Ver se isso atrapalha no ensaio.
- **Rota de mensagens do agente:** qualquer pessoa pode enviar `role: "agent"` pela API. Proteger antes de uso real.

## Configuração do Claude Code neste projeto
- `CLAUDE.md` (raiz): regras e contexto lidos em toda sessão.
- `.claude/agents/`: subagents espelho dos agents da aula.
- `.claude/commands/coordenador.md`: comando `/coordenador`.
- Sem hooks e sem settings de projeto até agora.
