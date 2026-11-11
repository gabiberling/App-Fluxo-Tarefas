import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { criarApp } from "../src/app.js";
import { tituloDaMensagem } from "../src/tickets.js";

let base, servidor;
const chamar = async (metodo, caminho, corpo) => {
  const r = await fetch(base + caminho, { method: metodo, headers: { "content-type": "application/json" }, body: corpo === undefined ? undefined : JSON.stringify(corpo) });
  return { status: r.status, dados: r.status === 204 ? null : await r.json() };
};
const abrir = async (content, extra = {}) => (await chamar("POST", "/api/tickets", { content, ...extra })).dados;

before(async () => {
  ({ servidor } = criarApp());
  await new Promise((r) => servidor.listen(0, "127.0.0.1", r));
  base = `http://127.0.0.1:${servidor.address().port}`;
});
after(() => servidor.close());

test("ticket de exemplo existe na primeira criação do banco", async () => {
  const r = await chamar("GET", "/api/tickets");
  assert.equal(r.status, 200);
  const exemplo = r.dados.tickets.find((t) => t.id === "ticket-boas-vindas");
  assert.ok(exemplo);
  assert.equal(exemplo.lastRole, "agent");
  const conversa = (await chamar("GET", "/api/tickets/ticket-boas-vindas")).dados;
  assert.deepEqual(conversa.messages.map((m) => m.role), ["user", "agent"]);
});

test("abrir ticket grava a primeira mensagem e tira o título dela", async () => {
  const r = await chamar("POST", "/api/tickets", { content: "  Não consigo excluir um cartão\nAparece erro 500  " });
  assert.equal(r.status, 201);
  assert.equal(r.dados.ticket.title, "Não consigo excluir um cartão");
  assert.equal(r.dados.ticket.status, "open");
  assert.equal(r.dados.messages.length, 1);
  assert.equal(r.dados.messages[0].role, "user");
  assert.equal(r.dados.messages[0].content, "Não consigo excluir um cartão\nAparece erro 500");

  const comTitulo = await abrir("Detalhes aqui", { title: "Título próprio" });
  assert.equal(comTitulo.ticket.title, "Título próprio");

  assert.equal((await chamar("POST", "/api/tickets", { content: "   " })).status, 400);
  assert.equal((await chamar("POST", "/api/tickets", {})).status, 400);
});

test("conversa: usuário e agente trocam mensagens em ordem; lista sobe o mais recente", async () => {
  const { ticket } = await abrir("Primeira pergunta");
  const resposta = await chamar("POST", `/api/tickets/${ticket.id}/messages`, { role: "agent", content: "Resposta do agente" });
  assert.equal(resposta.status, 201);
  assert.equal(resposta.dados.message.role, "agent");
  await chamar("POST", `/api/tickets/${ticket.id}/messages`, { content: "Obrigado!" });

  const conversa = (await chamar("GET", `/api/tickets/${ticket.id}`)).dados;
  assert.deepEqual(conversa.messages.map((m) => m.content), ["Primeira pergunta", "Resposta do agente", "Obrigado!"]);

  const lista = (await chamar("GET", "/api/tickets")).dados.tickets;
  assert.equal(lista[0].id, ticket.id);
  assert.equal(lista[0].lastRole, "user");

  assert.equal((await chamar("POST", `/api/tickets/${ticket.id}/messages`, { role: "admin", content: "x" })).status, 400);
  assert.equal((await chamar("POST", `/api/tickets/${ticket.id}/messages`, { content: "" })).status, 400);
  assert.equal((await chamar("POST", "/api/tickets/nao-existe/messages", { content: "oi" })).status, 404);
});

test("status: resolver, e mensagem do usuário reabre; agente não reabre", async () => {
  const { ticket } = await abrir("Problema");
  const resolvido = (await chamar("PATCH", `/api/tickets/${ticket.id}`, { status: "resolved" })).dados.ticket;
  assert.equal(resolvido.status, "resolved");
  assert.equal((await chamar("PATCH", `/api/tickets/${ticket.id}`, { status: "fechado" })).status, 400);

  const doAgente = await chamar("POST", `/api/tickets/${ticket.id}/messages`, { role: "agent", content: "Algo mais?" });
  assert.equal(doAgente.dados.ticket.status, "resolved");
  const doUsuario = await chamar("POST", `/api/tickets/${ticket.id}/messages`, { content: "Voltou a acontecer" });
  assert.equal(doUsuario.dados.ticket.status, "open");
});

test("renomear e excluir ticket; mensagens caem junto", async () => {
  const { ticket } = await abrir("Para apagar");
  const renomeado = (await chamar("PATCH", `/api/tickets/${ticket.id}`, { title: "  Novo nome  " })).dados.ticket;
  assert.equal(renomeado.title, "Novo nome");
  assert.deepEqual((await chamar("DELETE", `/api/tickets/${ticket.id}`)).dados, { ok: true });
  assert.equal((await chamar("GET", `/api/tickets/${ticket.id}`)).status, 404);
});

const quadroAtendimento = async () => (await chamar("GET", "/api/boards/board-atendimento")).dados;

test("abrir ticket cria cartão no fim da primeira coluna do quadro Atendimento", async () => {
  const antes = await quadroAtendimento();
  assert.deepEqual(antes.lists.map((l) => l.title), ["Novos", "Em atendimento", "Sem resposta", "Resolvidos"]);
  const qtd = antes.lists[0].cards.length;

  const { ticket } = await abrir("A tela trava ao arrastar cartões", { title: "Tela travando" });
  assert.equal(ticket.boardId, "board-atendimento");
  assert.equal(typeof ticket.cardId, "string");

  const novos = (await quadroAtendimento()).lists[0];
  assert.equal(novos.cards.length, qtd + 1);
  const cartao = novos.cards.at(-1);
  assert.equal(cartao.id, ticket.cardId);
  assert.equal(cartao.title, "Tela travando");
  assert.equal(cartao.description, "A tela trava ao arrastar cartões");
  assert.equal(cartao.position, qtd);
});

test("excluir ticket tira o cartão do Kanban; excluir o cartão mantém o ticket", async () => {
  const a = (await abrir("Ticket A")).ticket;
  const b = (await abrir("Ticket B")).ticket;
  await chamar("DELETE", `/api/tickets/${a.id}`);
  const novos = (await quadroAtendimento()).lists[0].cards;
  assert.ok(!novos.some((c) => c.id === a.cardId));
  assert.deepEqual(novos.map((c) => c.position), novos.map((_, i) => i));

  await chamar("DELETE", `/api/cards/${b.cardId}`);
  const conversa = await chamar("GET", `/api/tickets/${b.id}`);
  assert.equal(conversa.status, 200);
  assert.equal(conversa.dados.ticket.cardId, null);
  assert.equal((await chamar("DELETE", `/api/tickets/${b.id}`)).status, 200);
});

test("se o quadro Atendimento for apagado, o próximo ticket recria o quadro com as colunas", async () => {
  await chamar("DELETE", "/api/boards/board-atendimento");
  const { ticket } = await abrir("Depois de apagar o quadro");
  const quadro = await quadroAtendimento();
  assert.equal(quadro.board.title, "Atendimento");
  assert.deepEqual(quadro.lists.map((l) => l.title), ["Novos", "Em atendimento", "Sem resposta", "Resolvidos"]);
  assert.equal(quadro.lists[0].cards[0].id, ticket.cardId);
});

test("sem informação na base: agente avisa o cliente e o cartão vai para Sem resposta, organizado", async () => {
  const { ticket } = await abrir("Quanto custa o plano anual?", { title: "Preço do plano anual" });
  const lacuna = {
    content: "Ainda não tenho essa informação. Registrei sua pergunta para complementarmos a base.",
    question: "Cliente quer saber o preço do plano anual",
    missing: "Preço e existência de plano anual",
    searched: "PRODUTO.md e commercial-catalog.json",
  };
  const r = await chamar("POST", `/api/tickets/${ticket.id}/knowledge-gap`, lacuna);
  assert.equal(r.status, 201);
  assert.equal(r.dados.message.role, "agent");
  assert.equal(r.dados.ticket.cardId, ticket.cardId); // reaproveita o cartão, não duplica

  const quadro = await quadroAtendimento();
  const semResposta = quadro.lists.find((l) => l.title === "Sem resposta");
  const cartao = semResposta.cards.find((c) => c.id === ticket.cardId);
  assert.ok(cartao);
  assert.equal(cartao.description, [
    "Pergunta do cliente: Cliente quer saber o preço do plano anual",
    "O que faltou: Preço e existência de plano anual",
    "Onde procurei: PRODUTO.md e commercial-catalog.json",
    `Ticket: /atendimento?ticket=${ticket.id}`,
  ].join("\n"));
  assert.ok(!quadro.lists[0].cards.some((c) => c.id === ticket.cardId));
  assert.deepEqual(quadro.lists[0].cards.map((c) => c.position), quadro.lists[0].cards.map((_, i) => i));

  const conversa = (await chamar("GET", `/api/tickets/${ticket.id}`)).dados;
  assert.equal(conversa.messages.at(-1).content, lacuna.content);
  assert.equal((await chamar("POST", `/api/tickets/${ticket.id}/knowledge-gap`, { content: "x" })).status, 400);
});

test("ticket aberto com login fica com o dono: só ele lê; agente ainda responde", async () => {
  const cad = await fetch(base + "/api/auth/cadastro", {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: "dona.ficticia@exemplo.com", nome: "Dona Fictícia", senha: "senha-ficticia-123" }),
  });
  const cookie = cad.headers.get("set-cookie").split(";")[0];
  const comoDona = (metodo, caminho, corpo) => fetch(base + caminho, {
    method: metodo, headers: { "content-type": "application/json", cookie }, body: corpo && JSON.stringify(corpo),
  }).then(async (r) => ({ status: r.status, dados: await r.json() }));

  const { ticket } = (await comoDona("POST", "/api/tickets", { title: "Ticket da dona", content: "Pedido fictício" })).dados;
  assert.equal((await comoDona("GET", `/api/tickets/${ticket.id}`)).status, 200);
  assert.ok((await comoDona("GET", "/api/tickets")).dados.tickets.some((t) => t.id === ticket.id));

  assert.equal((await chamar("GET", `/api/tickets/${ticket.id}`)).status, 404);
  assert.ok(!(await chamar("GET", "/api/tickets")).dados.tickets.some((t) => t.id === ticket.id));
  assert.equal((await chamar("POST", `/api/tickets/${ticket.id}/messages`, { content: "intruso" })).status, 404);
  assert.equal((await chamar("POST", `/api/tickets/${ticket.id}/messages`, { role: "agent", content: "Resposta do agente" })).status, 201);
});

test("título derivado corta textos longos em palavra inteira", () => {
  assert.equal(tituloDaMensagem("\n\n  Oi  \nresto"), "Oi");
  const longo = tituloDaMensagem("palavra ".repeat(30));
  assert.ok(longo.length <= 80);
  assert.ok(longo.endsWith("…"));
  assert.ok(!longo.includes("palavra …"));
});
