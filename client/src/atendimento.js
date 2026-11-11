// Lógica pura do atendimento: testada sem navegador (client/test/atendimento.test.js).

const DIA = 86_400_000;

/** Agrupa tickets por data de atualização, como o histórico do ChatGPT. Mantém a ordem recebida. */
export function agruparPorData(tickets, agora = new Date()) {
  const hoje = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate()).getTime();
  const faixas = [
    ["Hoje", hoje],
    ["Ontem", hoje - DIA],
    ["Últimos 7 dias", hoje - 7 * DIA],
    ["Últimos 30 dias", hoje - 30 * DIA],
    ["Mais antigos", -Infinity],
  ];
  const grupos = faixas.map(([rotulo]) => ({ rotulo, tickets: [] }));
  for (const t of tickets) {
    const ms = Date.parse(t.updatedAt);
    const i = faixas.findIndex(([, desde]) => ms >= desde);
    grupos[i === -1 ? grupos.length - 1 : i].tickets.push(t);
  }
  return grupos.filter((g) => g.tickets.length);
}

/** "14:32" se for hoje; "10/11, 14:32" se for outro dia. */
export function horaDaMensagem(iso, agora = new Date()) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const hora = d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  const mesmoDia = d.toDateString() === agora.toDateString();
  return mesmoDia ? hora : `${d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}, ${hora}`;
}

/** Situação do ticket para a lateral e o topo da conversa. */
export function situacao(ticket) {
  if (ticket.status === "resolved") return { id: "resolvido", rotulo: "Resolvido" };
  if (ticket.lastRole === "agent") return { id: "respondido", rotulo: "Respondido" };
  return { id: "aguardando", rotulo: "Aguardando suporte" };
}
