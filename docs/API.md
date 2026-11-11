# API e detalhes técnicos

Referência da API HTTP do Fluxo e de como o ambiente local funciona. A visão geral do projeto está no [README](../README.md).

## Ambiente

- **Node 22.13 ou mais novo**: o banco usa o SQLite embutido do Node (`node:sqlite`), que não existe em versões anteriores.
- Uma instalação só, na raiz: `npm install`.

| Comando | O que faz |
|---|---|
| `npm run dev` | Sobe API e interface juntas, em portas livres, e mostra os endereços |
| `npm test` | Testes da API e da lógica da interface (`node --test`) |
| `npm run build` | Gera a interface em `dist/` |
| `npm run preflight` | Confere Node e SQLite sem subir nada |
| `npm start` | Sobe só a API |

### `npm run dev`

```
  Interface: http://127.0.0.1:5173
  API:       http://127.0.0.1:3001/api
```

- **Portas:** são escolhidas livres no momento (3001 para a API e 5173 para a interface). A interface recebe a porta da API por `API_PORT`, então o proxy de `/api` da Vite aponta sempre para o lugar certo.
- **Fixar portas:** use `API_PORT` e `WEB_PORT`.
- **Encerrar:** Ctrl+C encerra a API e a interface; nada fica em segundo plano.
- **Conferência do ambiente:** antes de subir, o comando confere o ambiente. Sem `node:sqlite`, ele avisa qual versão instalar e não sobe só metade do projeto.

### SQLite

- **Onde fica:** `server/dados/app.sqlite` (fora do Git).
- **Criação:** o banco nasce na primeira execução, com as migrações de `server/src/db.js` aplicadas em ordem. Cada migração roda uma vez (controle por `PRAGMA user_version`).
- **Dados de exemplo:** são semeados só quando o banco nasce vazio.
- **Começar do zero:** apague a pasta `server/dados/`.

### Variáveis do `.env` (local, fora do Git)

| Variável | Uso |
|---|---|
| `AGENT_RUNTIME` | `github-native` liga a ponte app → issue no GitHub |
| `GITHUB_REPO` | `dono/repositório` onde as issues são criadas |
| `GITHUB_ISSUES_TOKEN` | Token fine-grained só deste repositório, com *Issues: read and write* |
| `AGENT_DRY_RUN` | Sem efeito no GitHub; quem controla os agentes é a variável do repositório |

## Convenções

- JSON puro. Login não é obrigatório: a interface ainda não tem tela de login.
- A interface fala com a API pelo proxy `/api` da Vite.
- IDs são strings e `position` é inteiro.
- Erros voltam como `{ "error": "mensagem" }`, com o status HTTP adequado.

## Quadros, listas e cartões

| Método | Rota | Resposta |
|---|---|---|
| GET | `/api/boards` | `{boards:[{id,title}]}` |
| POST | `/api/boards` | `{board:{id,title}}` |
| GET | `/api/boards/:id` | `{board,lists:[{...,cards:[...]}]}` |
| PATCH | `/api/boards/:id` | `{board}` |
| DELETE | `/api/boards/:id` | `{ok:true}` |
| POST | `/api/boards/:id/lists` | `{list}` |
| PATCH | `/api/lists/:id` | `{list}` |
| DELETE | `/api/lists/:id` | `{ok:true}` |
| POST | `/api/lists/:id/cards` | `{card}` |
| PATCH | `/api/cards/:id` | `{card}`; com `{listId, position}`, move o cartão |
| DELETE | `/api/cards/:id` | `{ok:true}` |

Excluir um quadro apaga listas e cartões em cascata. Mover um cartão reordena as duas listas na mesma transação.

## Atendimento (tickets)

Cada ticket é uma conversa. O campo `role` é `user` (quem abriu) ou `agent` (agente automático; não há atendimento humano).

| Método | Rota | Resposta |
|---|---|---|
| GET | `/api/tickets` | `{tickets:[{id,title,status,updatedAt,lastRole}]}` |
| POST | `/api/tickets` `{content, title?}` | `{ticket, messages}` (sem `title`, o título vem da 1ª mensagem) |
| GET | `/api/tickets/:id` | `{ticket, messages:[{id,role,content,createdAt}]}` |
| PATCH | `/api/tickets/:id` `{title?, status?}` | `{ticket}` (`status`: `open` ou `resolved`) |
| DELETE | `/api/tickets/:id` | `{ok:true}` |
| POST | `/api/tickets/:id/messages` `{content, role?}` | `{message, ticket}` |
| POST | `/api/tickets/:id/knowledge-gap` `{content, question, missing, searched}` | `{message, ticket}`: resposta do agente e cartão movido para "Sem resposta" |

**Ticket e quadro Atendimento**
- Todo ticket vira também um cartão no fim da coluna "Novos" do quadro **Atendimento** (`board-atendimento`, com as colunas Novos, Em atendimento, Sem resposta e Resolvidos).
- Se o quadro for apagado, o próximo ticket o recria.
- Excluir o ticket tira o cartão do Kanban. Excluir só o cartão mantém a conversa (`cardId` fica `null`).

**Dono do ticket**
- Ticket aberto com sessão de login fica com dono, e só o dono lê.
- As rotas usadas pelos agentes (`role: "agent"` e `knowledge-gap`) não exigem login.

**Mensagens**
- A tela busca novidades a cada 5 segundos.
- Mensagem do usuário num ticket resolvido reabre o ticket.

## Integração com o GitHub

Com `AGENT_RUNTIME=github-native`, o backend (`server/src/automacao.js`):

1. Ao abrir um ticket, cria a issue `origin:app` com a marca `<!-- fluxo:origem app ticket=… requestId=… -->`. Antes de criar, procura se a issue já existe.
2. A cada 60 s, lê os comentários da issue e:
   - traz para o chat as mensagens `<!-- fluxo:publico id=… -->`, uma vez cada;
   - aplica o estado (`<!-- fluxo:estado {...} -->`), incluindo `knowledgeGap`, que move o cartão para "Sem resposta";
   - em `waiting-customer`, publica as respostas da cliente como `<!-- fluxo:cliente id=… -->`;
   - quando o caso termina, marca o ticket como resolvido e para de sincronizar.

O estado local fica na tabela `agent_request`: issue, requestId, PR, fase e IDs já enviados.
