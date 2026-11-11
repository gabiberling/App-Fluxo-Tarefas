# trello-clone-7

Quadro de tarefas no estilo Trello: quadros, listas e cartões, com API Node e
SQLite e interface React/Vite.

## Requisitos

- Node 22.13 ou mais novo. O banco usa o SQLite embutido do Node
  (`node:sqlite`), que não existe em versões antigas.
- Uma instalação só, na raiz: `npm install`.

## Comandos

| Comando | O que faz |
|---|---|
| `npm install` | instala as dependências da API e da interface |
| `npm run dev` | sobe API e interface juntas, em portas livres |
| `npm test` | roda os testes da API e da lógica da interface |
| `npm run build` | gera a interface em `dist/` |
| `npm run preflight` | confere Node e SQLite sem subir nada |

## `npm run dev`

Um único comando sobe as duas partes e mostra os endereços:

```
  Interface: http://127.0.0.1:5173
  API:       http://127.0.0.1:3001/api
```

As portas são escolhidas livres no momento (3001 para a API, 5173 para a
interface) e a interface recebe a porta da API por `API_PORT`, então o proxy de
`/api` aponta sempre para o lugar certo. Para fixar portas, use `API_PORT` e
`WEB_PORT`. Ctrl+C encerra API e interface; nada fica rodando em segundo
plano.

O comando primeiro confere o ambiente: sem `node:sqlite`, ele avisa qual
versão instalar e não sobe metade do projeto.

## SQLite

O banco fica em `server/dados/app.sqlite` e é criado na primeira execução, com
as migrações aplicadas em ordem (cada uma roda uma vez). Para começar de novo,
apague a pasta `server/dados/`.

Os dados de exemplo são semeados só quando o banco nasce vazio, então a tela
inicial nunca abre em branco.

## API

JSON puro, sem login obrigatório. A interface fala com a API pelo proxy
`/api` da Vite.

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
| PATCH | `/api/cards/:id` | `{card}` |
| DELETE | `/api/cards/:id` | `{ok:true}` |

### Atendimento (tickets)

A tela fica em `/atendimento`. Cada ticket é uma conversa; `role` é `user`
(quem abriu) ou `agent` (agente automático; não há atendimento humano).

| Método | Rota | Resposta |
|---|---|---|
| GET | `/api/tickets` | `{tickets:[{id,title,status,updatedAt,lastRole}]}` |
| POST | `/api/tickets` `{content, title?}` | `{ticket, messages}` (título sai da 1ª mensagem) |
| GET | `/api/tickets/:id` | `{ticket, messages:[{id,role,content,createdAt}]}` |
| PATCH | `/api/tickets/:id` `{title?, status?}` | `{ticket}` (`status`: `open` ou `resolved`) |
| DELETE | `/api/tickets/:id` | `{ok:true}` |
| POST | `/api/tickets/:id/messages` `{content, role?}` | `{message, ticket}` |
| POST | `/api/tickets/:id/knowledge-gap` `{content, question, missing, searched}` | `{message, ticket}`: resposta do agente e cartão movido para "Sem resposta" |

Para um agente responder: `POST /api/tickets/:id/messages` com
`{"role":"agent","content":"..."}`. A tela busca novidades a cada 5 segundos.
Mensagem do usuário num ticket resolvido reabre o ticket.

Todo ticket aberto vira também um cartão no fim da primeira coluna ("Novos")
do quadro **Atendimento** (`board-atendimento`, colunas Novos, Em atendimento, Sem resposta e Resolvidos). Se esse quadro for apagado,
o próximo ticket o recria. Excluir o ticket tira o cartão do Kanban; excluir só
o cartão mantém a conversa (`cardId` fica `null`).

IDs são strings, `position` é número e erros voltam como `{error:"mensagem"}`
com o status adequado. Excluir um quadro apaga listas e cartões em cascata;
mover um cartão reordena as duas listas na mesma transação.

## Onde fica cada coisa

| Pasta | O que tem |
|---|---|
| `server/src/` | API, banco e rotas |
| `client/src/` | interface React, cliente HTTP e componentes |
| `scripts/` | `npm run dev`, escolha de portas e conferência do ambiente |
