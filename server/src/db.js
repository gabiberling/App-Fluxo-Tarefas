// SQLite embutido do Node (node:sqlite). Migrações em ordem; cada uma roda uma única vez.
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { DatabaseSync } from "node:sqlite";

const MIGRACOES = [
  `CREATE TABLE item (
     id TEXT PRIMARY KEY,
     titulo TEXT NOT NULL,
     descricao TEXT NOT NULL DEFAULT '',
     concluido INTEGER NOT NULL DEFAULT 0,
     posicao INTEGER NOT NULL,
     criado_em TEXT NOT NULL,
     atualizado_em TEXT NOT NULL
   )`,
  `CREATE TABLE usuario (
     id TEXT PRIMARY KEY,
     email TEXT NOT NULL UNIQUE,
     nome TEXT NOT NULL,
     senha_hash TEXT NOT NULL,
     criado_em TEXT NOT NULL
   );
   CREATE TABLE sessao (
     token_hash TEXT PRIMARY KEY,
     usuario_id TEXT NOT NULL REFERENCES usuario(id) ON DELETE CASCADE,
     expira_em TEXT NOT NULL
   )`,
  `CREATE TABLE board (
     id TEXT PRIMARY KEY,
     title TEXT NOT NULL,
     criado_em TEXT NOT NULL
   );
   CREATE TABLE list (
     id TEXT PRIMARY KEY,
     board_id TEXT NOT NULL REFERENCES board(id) ON DELETE CASCADE,
     title TEXT NOT NULL,
     position INTEGER NOT NULL
   );
   CREATE TABLE card (
     id TEXT PRIMARY KEY,
     list_id TEXT NOT NULL REFERENCES list(id) ON DELETE CASCADE,
     title TEXT NOT NULL,
     description TEXT NOT NULL DEFAULT '',
     position INTEGER NOT NULL
   )`,
  // Seeds rodam uma única vez (controlado pelo user_version), só na primeira criação do banco.
  `INSERT INTO board (id, title, criado_em) VALUES
     ('board-sprint', 'Sprint da semana', '2026-11-10T09:00:00.000Z'),
     ('board-ideias', 'Ideias do produto', '2026-11-10T09:00:01.000Z');
   INSERT INTO list (id, board_id, title, position) VALUES
     ('list-a-fazer', 'board-sprint', 'A fazer', 0),
     ('list-fazendo', 'board-sprint', 'Fazendo', 1),
     ('list-pronto', 'board-sprint', 'Pronto para revisar', 2),
     ('list-backlog', 'board-ideias', 'Backlog', 0);
   INSERT INTO card (id, list_id, title, description, position) VALUES
     ('card-requisitos', 'list-a-fazer', 'Levantar requisitos do quadro', 'O que o quadro precisa resolver antes da primeira versão.', 0),
     ('card-telas', 'list-a-fazer', 'Desenhar as telas do quadro', '', 1),
     ('card-api', 'list-fazendo', 'Montar a API de quadros', 'Boards, listas e cartões com movimentação entre listas.', 0),
     ('card-paleta', 'list-pronto', 'Escolher a paleta de cores', '', 0),
     ('card-metricas', 'list-backlog', 'Medir tempo por cartão', '', 0);`,
  // Atendimento: cada ticket é uma conversa; role = 'user' (quem abriu) ou 'agent' (suporte / agente autônomo).
  `CREATE TABLE ticket (
     id TEXT PRIMARY KEY,
     title TEXT NOT NULL,
     status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved')),
     criado_em TEXT NOT NULL,
     atualizado_em TEXT NOT NULL
   );
   CREATE TABLE message (
     id TEXT PRIMARY KEY,
     ticket_id TEXT NOT NULL REFERENCES ticket(id) ON DELETE CASCADE,
     role TEXT NOT NULL CHECK (role IN ('user', 'agent')),
     content TEXT NOT NULL,
     criado_em TEXT NOT NULL
   );
   CREATE INDEX message_por_ticket ON message (ticket_id, criado_em);
   INSERT INTO ticket (id, title, status, criado_em, atualizado_em) VALUES
     ('ticket-boas-vindas', 'Como convido alguém para o meu quadro?', 'open', '2026-11-10T10:00:00.000Z', '2026-11-10T10:02:00.000Z');
   INSERT INTO message (id, ticket_id, role, content, criado_em) VALUES
     ('msg-boas-vindas-1', 'ticket-boas-vindas', 'user', 'Oi! Como convido alguém para o meu quadro?', '2026-11-10T10:00:00.000Z'),
     ('msg-boas-vindas-2', 'ticket-boas-vindas', 'agent', 'Olá! Por enquanto os quadros são pessoais, mas o compartilhamento está no nosso planejamento. Posso ajudar com mais alguma coisa?', '2026-11-10T10:02:00.000Z');`,
  // Todo ticket vira um cartão na primeira coluna do quadro "Atendimento" (tickets.js recria o quadro se ele for apagado).
  `ALTER TABLE ticket ADD COLUMN card_id TEXT REFERENCES card(id) ON DELETE SET NULL;
   INSERT INTO board (id, title, criado_em) VALUES ('board-atendimento', 'Atendimento', '2026-11-10T09:00:02.000Z');
   INSERT INTO list (id, board_id, title, position) VALUES
     ('list-atend-novos', 'board-atendimento', 'Novos', 0),
     ('list-atend-andamento', 'board-atendimento', 'Em atendimento', 1),
     ('list-atend-resolvidos', 'board-atendimento', 'Resolvidos', 2);
   INSERT INTO card (id, list_id, title, description, position) VALUES
     ('card-ticket-boas-vindas', 'list-atend-andamento', 'Como convido alguém para o meu quadro?', 'Oi! Como convido alguém para o meu quadro?', 0);
   UPDATE ticket SET card_id = 'card-ticket-boas-vindas' WHERE id = 'ticket-boas-vindas';`,
  // Coluna para perguntas que o agente não soube responder (falta informação na base).
  `UPDATE list SET position = position + 1 WHERE board_id = 'board-atendimento' AND position >= 2;
   INSERT INTO list (id, board_id, title, position)
     SELECT 'list-atend-sem-resposta', 'board-atendimento', 'Sem resposta', 2
     WHERE EXISTS (SELECT 1 FROM board WHERE id = 'board-atendimento');`,
  // Etapa 03: dono do ticket (quem estava logado ao abrir) e estado mínimo da automação no GitHub.
  `ALTER TABLE ticket ADD COLUMN usuario_id TEXT REFERENCES usuario(id) ON DELETE SET NULL;
   CREATE TABLE agent_request (
     ticket_id TEXT PRIMARY KEY REFERENCES ticket(id) ON DELETE CASCADE,
     request_id TEXT NOT NULL UNIQUE,
     issue_number INTEGER,
     pr_number INTEGER,
     fase TEXT NOT NULL,
     mensagens_enviadas TEXT NOT NULL DEFAULT '[]',
     atualizado_em TEXT NOT NULL
   )`,
];

/** `caminho` = arquivo do banco; `:memory:` nos testes. */
export function abrirBanco(caminho = ":memory:") {
  if (caminho !== ":memory:") mkdirSync(dirname(caminho), { recursive: true });
  const db = new DatabaseSync(caminho);
  db.exec("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;");
  const atual = db.prepare("PRAGMA user_version").get().user_version;
  for (let i = atual; i < MIGRACOES.length; i++) {
    db.exec("BEGIN");
    try { db.exec(MIGRACOES[i]); db.exec(`PRAGMA user_version = ${i + 1}`); db.exec("COMMIT"); }
    catch (e) { db.exec("ROLLBACK"); throw e; }
  }
  return db;
}

/** Roda `fn` numa transação; desfaz tudo se ela lançar. */
export function transacao(db, fn) {
  db.exec("BEGIN");
  try { const r = fn(); db.exec("COMMIT"); return r; }
  catch (e) { db.exec("ROLLBACK"); throw e; }
}
