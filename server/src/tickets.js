// Atendimento: tickets de suporte em formato de conversa. Contrato JSON em inglês, sem exigir login.
// role "user" = quem abriu o ticket; role "agent" = suporte (pessoa ou agente autônomo, no futuro).
import { randomUUID } from "node:crypto";
import { invalido, naoEncontrado, texto } from "./http.js";
import { transacao } from "./db.js";

const PAPEIS = ["user", "agent"];
const STATUS = ["open", "resolved"];
const MAX_TITULO = 80;

/** Título a partir da primeira mensagem: primeira linha, cortada em palavra inteira. */
export function tituloDaMensagem(conteudo) {
  const linha = conteudo.split("\n").map((l) => l.trim()).find(Boolean) ?? "Novo ticket";
  if (linha.length <= MAX_TITULO) return linha;
  const corte = linha.slice(0, MAX_TITULO - 1);
  const espaco = corte.lastIndexOf(" ");
  return `${(espaco > 40 ? corte.slice(0, espaco) : corte).trimEnd()}…`;
}

export const QUADRO_ATENDIMENTO = "board-atendimento";
const COLUNAS_ATENDIMENTO = ["Novos", "Em atendimento", "Resolvidos"];
const MAX_DESCRICAO_CARTAO = 5000;

const saidaTicket = (t) => ({
  id: t.id, title: t.title, status: t.status, cardId: t.card_id ?? null, boardId: QUADRO_ATENDIMENTO,
  createdAt: t.criado_em, updatedAt: t.atualizado_em,
});

/** Primeira coluna do quadro Atendimento. Recria o quadro (ou uma coluna) se alguém tiver apagado. */
function primeiraColunaDoAtendimento(db) {
  if (!db.prepare("SELECT 1 FROM board WHERE id = ?").get(QUADRO_ATENDIMENTO)) {
    db.prepare("INSERT INTO board (id, title, criado_em) VALUES (?, 'Atendimento', ?)").run(QUADRO_ATENDIMENTO, new Date().toISOString());
    const criar = db.prepare("INSERT INTO list (id, board_id, title, position) VALUES (?, ?, ?, ?)");
    COLUNAS_ATENDIMENTO.forEach((titulo, i) => criar.run(randomUUID(), QUADRO_ATENDIMENTO, titulo, i));
  }
  const primeira = db.prepare("SELECT id FROM list WHERE board_id = ? ORDER BY position, rowid LIMIT 1").get(QUADRO_ATENDIMENTO);
  if (primeira) return primeira.id;
  const id = randomUUID();
  db.prepare("INSERT INTO list (id, board_id, title, position) VALUES (?, ?, ?, 0)").run(id, QUADRO_ATENDIMENTO, COLUNAS_ATENDIMENTO[0]);
  return id;
}

/** Cartão no fim da primeira coluna do quadro Atendimento. */
function criarCartaoDoTicket(db, titulo, descricao) {
  const listId = primeiraColunaDoAtendimento(db);
  const id = randomUUID();
  const posicao = db.prepare("SELECT COALESCE(MAX(position), -1) + 1 AS p FROM card WHERE list_id = ?").get(listId).p;
  db.prepare("INSERT INTO card (id, list_id, title, description, position) VALUES (?, ?, ?, ?, ?)")
    .run(id, listId, titulo, descricao.slice(0, MAX_DESCRICAO_CARTAO), posicao);
  return id;
}
const saidaMensagem = (m) => ({ id: m.id, ticketId: m.ticket_id, role: m.role, content: m.content, createdAt: m.criado_em });

export function rotasDeTickets(app, db) {
  const buscar = (id) => {
    const t = db.prepare("SELECT * FROM ticket WHERE id = ?").get(id);
    if (!t) throw naoEncontrado("Ticket");
    return t;
  };
  const mensagens = (ticketId) =>
    db.prepare("SELECT * FROM message WHERE ticket_id = ? ORDER BY criado_em, rowid").all(ticketId).map(saidaMensagem);
  const inserirMensagem = (ticketId, role, content) => {
    const m = { id: randomUUID(), ticket_id: ticketId, role, content, criado_em: new Date().toISOString() };
    db.prepare("INSERT INTO message (id, ticket_id, role, content, criado_em) VALUES (?, ?, ?, ?, ?)")
      .run(m.id, m.ticket_id, m.role, m.content, m.criado_em);
    return m;
  };
  const conteudo = (corpo) => texto(corpo, "content", { max: 10_000 });

  // Lista para a lateral: mais recente primeiro, com quem falou por último.
  app.get("/api/tickets", () => ({
    tickets: db.prepare(
      `SELECT t.*, (SELECT role FROM message m WHERE m.ticket_id = t.id ORDER BY m.criado_em DESC, m.rowid DESC LIMIT 1) AS ultimo
       FROM ticket t ORDER BY t.atualizado_em DESC, t.rowid DESC`,
    ).all().map((t) => ({ ...saidaTicket(t), lastRole: t.ultimo ?? null })),
  }));

  // Abrir ticket: a descrição vira a primeira mensagem da conversa e um cartão na coluna "Novos" do quadro Atendimento.
  app.post("/api/tickets", ({ corpo }) => {
    const content = conteudo(corpo);
    const title = texto(corpo, "title", { max: 120, opcional: true }) ?? tituloDaMensagem(content);
    return transacao(db, () => {
      const agora = new Date().toISOString();
      const id = randomUUID();
      const cardId = criarCartaoDoTicket(db, title, content);
      db.prepare("INSERT INTO ticket (id, title, status, card_id, criado_em, atualizado_em) VALUES (?, ?, 'open', ?, ?, ?)").run(id, title, cardId, agora, agora);
      inserirMensagem(id, "user", content);
      return { ticket: saidaTicket(buscar(id)), messages: mensagens(id) };
    });
  });

  app.get("/api/tickets/:id", ({ params }) => {
    const t = buscar(params.id);
    return { ticket: saidaTicket(t), messages: mensagens(t.id) };
  });

  app.patch("/api/tickets/:id", ({ params, corpo }) => {
    const t = buscar(params.id);
    const title = texto(corpo, "title", { max: 120, opcional: true }) ?? t.title;
    if (corpo.status !== undefined && !STATUS.includes(corpo.status)) throw invalido("status deve ser open ou resolved.");
    const status = corpo.status ?? t.status;
    db.prepare("UPDATE ticket SET title = ?, status = ?, atualizado_em = ? WHERE id = ?").run(title, status, new Date().toISOString(), t.id);
    return { ticket: saidaTicket(buscar(t.id)) };
  });

  app.delete("/api/tickets/:id", ({ params }) => {
    const t = buscar(params.id);
    transacao(db, () => {
      db.prepare("DELETE FROM ticket WHERE id = ?").run(t.id); // mensagens caem em cascata
      if (t.card_id) {
        // Sai do Kanban também, renumerando a coluna para não deixar buraco nas posições.
        const card = db.prepare("SELECT list_id FROM card WHERE id = ?").get(t.card_id);
        db.prepare("DELETE FROM card WHERE id = ?").run(t.card_id);
        if (card) {
          const gravar = db.prepare("UPDATE card SET position = ? WHERE id = ?");
          db.prepare("SELECT id FROM card WHERE list_id = ? ORDER BY position, rowid").all(card.list_id).forEach((c, i) => gravar.run(i, c.id));
        }
      }
    });
    return { ok: true };
  });

  // Nova mensagem. Agentes respondem com role "agent". Se quem abriu escreve num ticket resolvido, ele reabre.
  app.post("/api/tickets/:id/messages", ({ params, corpo }) => {
    const t = buscar(params.id);
    const role = corpo.role ?? "user";
    if (!PAPEIS.includes(role)) throw invalido("role deve ser user ou agent.");
    const content = conteudo(corpo);
    return transacao(db, () => {
      const m = inserirMensagem(t.id, role, content);
      const status = role === "user" ? "open" : t.status;
      db.prepare("UPDATE ticket SET status = ?, atualizado_em = ? WHERE id = ?").run(status, m.criado_em, t.id);
      return { message: saidaMensagem(m), ticket: saidaTicket(buscar(t.id)) };
    });
  });
}
