import assert from "node:assert/strict";
import { test } from "node:test";
import { agruparPorData, horaDaMensagem, situacao } from "../src/atendimento.js";

const agora = new Date(2026, 10, 11, 15, 0); // 11/11/2026 15:00, horário local
const em = (dias, hora = 10) => new Date(2026, 10, 11 - dias, hora, 0).toISOString();

test("agrupa tickets por data mantendo a ordem e sem grupos vazios", () => {
  const tickets = [
    { id: "a", updatedAt: em(0, 14) },
    { id: "b", updatedAt: em(0, 0) },
    { id: "c", updatedAt: em(1) },
    { id: "d", updatedAt: em(5) },
    { id: "e", updatedAt: em(60) },
    { id: "f", updatedAt: "data inválida" },
  ];
  const grupos = agruparPorData(tickets, agora);
  assert.deepEqual(grupos.map((g) => g.rotulo), ["Hoje", "Ontem", "Últimos 7 dias", "Mais antigos"]);
  assert.deepEqual(grupos[0].tickets.map((t) => t.id), ["a", "b"]);
  assert.deepEqual(grupos[3].tickets.map((t) => t.id), ["e", "f"]);
  assert.deepEqual(agruparPorData([], agora), []);
});

test("hora da mensagem: só a hora hoje, data e hora em outro dia", () => {
  assert.match(horaDaMensagem(em(0, 9), agora), /^09:00$/);
  assert.match(horaDaMensagem(em(1, 9), agora), /^10\/11, 09:00$/);
  assert.equal(horaDaMensagem("x", agora), "");
});

test("situação do ticket", () => {
  assert.equal(situacao({ status: "resolved", lastRole: "user" }).id, "resolvido");
  assert.equal(situacao({ status: "open", lastRole: "agent" }).id, "respondido");
  assert.equal(situacao({ status: "open", lastRole: "user" }).id, "aguardando");
});
