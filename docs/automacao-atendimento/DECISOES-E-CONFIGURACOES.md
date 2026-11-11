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
| 11/11 | Ticket aberto com login fica com **dono** (`ticket.usuario_id`); só o dono lê. Sem login, segue aberto (a interface ainda não tem login) | Etapa 03 |

## Configurações

### Já feitas
- [x] `gh` logado na conta dona do repositório; Actions habilitadas.
- [x] **Copilot Free** ativado na conta.
- [x] Secret do repositório **`COPILOT_AGENT_TOKEN`**: token fine-grained da conta pessoal com permissão "Copilot Requests". Testado pelo workflow `teste-copilot.yml`.
- [x] Workflows na `main`: `teste-copilot.yml` (manual) e `native-agents.yml` (controlador, `AGENT_DRY_RUN=true`).
- [x] **`.env` local** com `AGENT_RUNTIME=github-native`, `AGENT_DRY_RUN=true`, `GITHUB_REPO` e **`GITHUB_ISSUES_TOKEN`** (fine-grained, só este repositório, Issues: leitura e escrita). Fica só no computador; **não** é secret do repositório (o app local não lê secrets do GitHub). O secret `ISSUES_TOKEN`, criado por engano no repositório, foi excluído.
- [x] **Label `origin:app`** criado no repositório.

### Pendentes
- [ ] (Opcional) Variáveis do repositório `AGENT_RUNTIME` e `AGENT_DRY_RUN` em *Settings → Secrets and variables → Actions → Variables*. Sem elas, o workflow usa `github-native` e `true`.
- [ ] **Ensaio:** trocar no controlador a atribuição ao `copilot-swe-agent[bot]` (cloud agent pago) por um passo que roda `copilot --agent=coordenador` no próprio workflow (de/para), e só então usar `AGENT_DRY_RUN=false`.
- [ ] **Validade dos tokens:** renovar o `COPILOT_AGENT_TOKEN` e o `GITHUB_ISSUES_TOKEN` antes de vencerem.

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
