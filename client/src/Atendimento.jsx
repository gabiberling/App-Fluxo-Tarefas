import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { api } from "./api.js";
import { agruparPorData, horaDaMensagem, situacao } from "./atendimento.js";
import { Botao } from "./componentes/Botao.jsx";
import { Campo } from "./componentes/Campo.jsx";
import { Confirmar } from "./componentes/Confirmar.jsx";
import { Dialogo } from "./componentes/Dialogo.jsx";
import { Icone } from "./componentes/Icone.jsx";
import { Menu } from "./componentes/Menu.jsx";
import { Marca, Navegacao } from "./componentes/Navegacao.jsx";

const ATUALIZAR_A_CADA = 5000; // busca respostas novas do suporte enquanto a aba está visível
const SUGESTOES = ["Não consigo acessar minha conta", "Encontrei um erro no quadro", "Tenho uma sugestão de melhoria"];

/** Caixa de mensagem no estilo ChatGPT: cresce com o texto, Enter envia e Shift+Enter quebra linha. */
function Composer({ valor, aoMudar, aoEnviar, desabilitado, placeholder }) {
  const ref = useRef(null);
  useLayoutEffect(() => {
    const t = ref.current;
    if (!t) return;
    t.style.height = "auto";
    t.style.height = `${Math.min(t.scrollHeight, 200)}px`;
  }, [valor]);

  const pode = valor.trim() && !desabilitado;
  return (
    <form className="composer" onSubmit={(e) => { e.preventDefault(); if (pode) aoEnviar(); }}>
      <textarea
        ref={ref}
        className="composer-texto"
        rows={1}
        value={valor}
        onChange={(e) => aoMudar(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
            e.preventDefault();
            if (pode) aoEnviar();
          }
        }}
        placeholder={placeholder}
        aria-label="Mensagem"
        maxLength={10000}
      />
      <button type="submit" className="composer-enviar" aria-label="Enviar mensagem" disabled={!pode}>
        <Icone nome="enviar" tamanho={18} />
      </button>
    </form>
  );
}

function Mensagem({ mensagem }) {
  if (mensagem.role === "user") {
    return (
      <div className="msg msg-usuario" data-pendente={mensagem.pendente ? "" : undefined}>
        <p className="msg-balao">{mensagem.content}</p>
        <span className="msg-hora">{mensagem.pendente ? "Enviando…" : horaDaMensagem(mensagem.createdAt)}</span>
      </div>
    );
  }
  return (
    <div className="msg msg-agente">
      <span className="msg-avatar" aria-hidden="true"><Icone nome="suporte" tamanho={16} /></span>
      <div className="msg-corpo">
        <p className="msg-autor">Suporte <span className="msg-hora">{horaDaMensagem(mensagem.createdAt)}</span></p>
        <p className="msg-texto">{mensagem.content}</p>
      </div>
    </div>
  );
}

export function Atendimento() {
  const [tickets, setTickets] = useState(null);
  const [ativoId, setAtivoId] = useState(() => new URLSearchParams(window.location.search).get("ticket"));
  const [conversa, setConversa] = useState(null);
  const [rascunho, setRascunho] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState(null);
  const [dialogo, setDialogo] = useState(null);
  const fimRef = useRef(null);

  const abrirNovoTicket = (titulo = "") => setDialogo({ tipo: "novo", titulo, erro: null, enviando: false });

  const carregarLista = useCallback(() => api.tickets.listar().then((d) => setTickets(d?.tickets ?? [])), []);

  useEffect(() => {
    carregarLista().catch((e) => { setErro(e.message); setTickets([]); });
  }, [carregarLista]);

  // O ticket aberto fica na URL (?ticket=…), então recarregar a página mantém a conversa.
  useEffect(() => {
    const url = new URL(window.location.href);
    if (ativoId) url.searchParams.set("ticket", ativoId);
    else url.searchParams.delete("ticket");
    window.history.replaceState(null, "", url);
    setRascunho("");
  }, [ativoId]);

  useEffect(() => {
    if (!ativoId) { setConversa(null); return; }
    let vivo = true;
    setConversa((atual) => (atual?.ticket.id === ativoId ? atual : null));
    api.tickets.detalhe(ativoId)
      .then((d) => { if (vivo) setConversa(d); })
      .catch((e) => { if (vivo) { setErro(e.message); setAtivoId(null); } });
    return () => { vivo = false; };
  }, [ativoId]);

  // Respostas do suporte (ou de agentes autônomos) aparecem sozinhas.
  useEffect(() => {
    if (enviando) return;
    const id = setInterval(() => {
      if (document.hidden) return;
      carregarLista().catch(() => {});
      if (ativoId) {
        api.tickets.detalhe(ativoId)
          .then((d) => setConversa((atual) => (atual?.ticket.id === d.ticket.id ? d : atual)))
          .catch(() => {});
      }
    }, ATUALIZAR_A_CADA);
    return () => clearInterval(id);
  }, [ativoId, enviando, carregarLista]);

  const totalMensagens = conversa?.messages.length ?? 0;
  useEffect(() => { fimRef.current?.scrollIntoView({ block: "end" }); }, [totalMensagens, ativoId]);

  // Janela "Novo ticket": cria a conversa e o cartão no quadro Atendimento, depois abre a conversa.
  const criarTicket = async (title, content) => {
    setDialogo((d) => ({ ...d, enviando: true, erro: null }));
    try {
      const d = await api.tickets.abrir({ title, content });
      setConversa(d);
      setAtivoId(d.ticket.id);
      setDialogo(null);
      await carregarLista();
    } catch (e) {
      setDialogo((d) => (d ? { ...d, enviando: false, erro: e.message } : d));
    }
  };

  const enviar = async () => {
    const conteudo = rascunho.trim();
    if (!conteudo || !ativoId) return;
    setErro(null);
    setEnviando(true);
    setRascunho("");
    try {
      const temporaria = { id: `temp-${Date.now()}`, role: "user", content: conteudo, createdAt: new Date().toISOString(), pendente: true };
      setConversa((a) => ({ ...a, messages: [...a.messages, temporaria] }));
      await api.tickets.responder(ativoId, conteudo);
      setConversa(await api.tickets.detalhe(ativoId));
      await carregarLista();
    } catch (e) {
      setErro(e.message);
      setRascunho(conteudo);
      setConversa((a) => (a ? { ...a, messages: a.messages.filter((m) => !m.pendente) } : a));
    } finally {
      setEnviando(false);
    }
  };

  const atualizarTicket = async (mudanca) => {
    try {
      setErro(null);
      const { ticket } = await api.tickets.editar(conversa.ticket.id, mudanca);
      setConversa((a) => ({ ...a, ticket }));
      await carregarLista();
      setDialogo(null);
    } catch (e) { setErro(e.message); }
  };

  const excluirTicket = async () => {
    const alvo = dialogo?.ticket;
    if (!alvo) return;
    try {
      setErro(null);
      await api.tickets.excluir(alvo.id);
      setDialogo(null);
      if (alvo.id === ativoId) setAtivoId(null);
      await carregarLista();
    } catch (e) { setErro(e.message); }
  };

  const ticketAtivo = conversa ? { ...conversa.ticket, lastRole: conversa.messages.at(-1)?.role } : null;
  const estadoAtivo = ticketAtivo ? situacao(ticketAtivo) : null;

  const aviso = erro ? (
    <div className="aviso" role="alert">
      <span className="aviso-texto"><Icone nome="alerta" tamanho={18} /><span>{erro}</span></span>
      <Botao variante="fantasma" icone="fechar" aria-label="Fechar aviso" onClick={() => setErro(null)} />
    </div>
  ) : null;

  const conteudo = () => {
    // Nenhum ticket aberto: convite para abrir um, com atalhos que já preenchem o título.
    if (!ativoId) {
      return (
        <div className="chat-inicio">
          <span className="chat-inicio-icone" aria-hidden="true"><Icone nome="suporte" tamanho={28} /></span>
          <h1>Como podemos ajudar?</h1>
          <p>Abra um ticket contando o problema ou a dúvida. Ele vira uma conversa com o suporte e entra no quadro Atendimento.</p>
          {aviso}
          <Botao variante="primario" icone="novo-ticket" onClick={() => abrirNovoTicket()}>Abrir ticket</Botao>
          <div className="sugestoes">
            {SUGESTOES.map((s) => (
              <button key={s} type="button" className="sugestao" onClick={() => abrirNovoTicket(s)}>{s}</button>
            ))}
          </div>
        </div>
      );
    }

    if (!conversa) {
      return <p className="carregando-line chat-carregando" role="status">Carregando conversa…</p>;
    }

    const resolvido = conversa.ticket.status === "resolved";
    return (
      <>
        <header className="chat-topo">
          <div className="chat-topo-texto">
            <h1 className="chat-titulo">{conversa.ticket.title}</h1>
            <span className="selo" data-estado={estadoAtivo.id}>{estadoAtivo.rotulo}</span>
          </div>
          <div className="chat-topo-acoes">
            {conversa.ticket.cardId ? (
              <a className="botao botao-fantasma" href={`/quadro?quadro=${conversa.ticket.boardId}`}>
                <Icone nome="colunas" tamanho={18} />
                Ver no quadro
              </a>
            ) : null}
            <Botao variante="suave" icone={resolvido ? "atualizar" : "check"} onClick={() => void atualizarTicket({ status: resolvido ? "open" : "resolved" })}>
              {resolvido ? "Reabrir" : "Marcar como resolvido"}
            </Botao>
            <Menu
              rotulo="Mais ações do ticket"
              itens={[
                { rotulo: "Renomear", icone: "lapis", aoClicar: () => setDialogo({ tipo: "renomear", ticket: conversa.ticket }) },
                { rotulo: "Excluir", icone: "lixeira", perigo: true, aoClicar: () => setDialogo({ tipo: "excluir", ticket: conversa.ticket }) },
              ]}
            />
          </div>
        </header>

        <div className="chat-rolagem">
          <div className="chat-coluna" aria-live="polite">
            {conversa.messages.map((m) => <Mensagem key={m.id} mensagem={m} />)}
            {estadoAtivo.id === "aguardando" && !enviando ? (
              <div className="msg msg-agente msg-aguardando">
                <span className="msg-avatar" aria-hidden="true"><Icone nome="suporte" tamanho={16} /></span>
                <div className="msg-corpo">
                  <p className="msg-autor">Suporte</p>
                  <p className="msg-texto"><span className="digitando" aria-hidden="true"><i /><i /><i /></span> Ticket recebido. A resposta aparece aqui.</p>
                </div>
              </div>
            ) : null}
            <div ref={fimRef} />
          </div>
        </div>

        <div className="chat-rodape">
          {aviso}
          <Composer
            valor={rascunho}
            aoMudar={setRascunho}
            aoEnviar={enviar}
            desabilitado={enviando}
            placeholder={resolvido ? "Escreva para reabrir o ticket…" : "Responder ao suporte…"}
          />
          <p className="chat-nota">Enter envia · Shift+Enter quebra a linha</p>
        </div>
      </>
    );
  };

  const grupos = tickets ? agruparPorData(tickets) : [];

  return (
    <div className="app">
      <aside className="lateral" aria-label="Tickets de atendimento">
        <Marca />
        <Navegacao atual="atendimento" />

        <Botao variante="suave" className="botao-bloco novo-ticket" icone="novo-ticket" aria-haspopup="dialog" onClick={() => abrirNovoTicket()}>
          Novo ticket
        </Botao>

        {tickets === null ? (
          <p className="lateral-vazio">Carregando tickets…</p>
        ) : tickets.length ? (
          <div className="tickets">
            {grupos.map((g) => (
              <section key={g.rotulo} className="tickets-grupo">
                <h2 className="tickets-grupo-titulo">{g.rotulo}</h2>
                <ul className="tickets-lista">
                  {g.tickets.map((t) => {
                    const s = situacao(t);
                    const ativo = t.id === ativoId;
                    return (
                      <li key={t.id}>
                        <div className="lateral-item" data-ativo={ativo ? "" : undefined}>
                          <span className="ticket-estado" data-estado={s.id} aria-hidden="true" />
                          <button
                            type="button"
                            className="lateral-escolha"
                            aria-current={ativo ? "page" : undefined}
                            aria-label={`${t.title} (${s.rotulo})`}
                            title={`${t.title} · ${s.rotulo}`}
                            onClick={() => setAtivoId(t.id)}
                          >
                            {t.title}
                          </button>
                          <span className="lateral-acoes">
                            <Botao variante="fantasma" icone="lixeira" aria-label={`Excluir ticket ${t.title}`} onClick={() => setDialogo({ tipo: "excluir", ticket: t })} />
                          </span>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>
        ) : (
          <p className="lateral-vazio">Nenhum ticket ainda. Abra o primeiro quando precisar de ajuda.</p>
        )}
      </aside>

      <main className="chat">{conteudo()}</main>

      {dialogo?.tipo === "novo" ? (
        <Dialogo
          aberto
          titulo="Novo ticket"
          descricao="Conte o que aconteceu. O ticket vira uma conversa com o suporte e um cartão na coluna “Novos” do quadro Atendimento."
          aoFechar={() => { if (!dialogo.enviando) setDialogo(null); }}
        >
          <form
            className="formulario"
            onSubmit={(e) => {
              e.preventDefault();
              const dados = new FormData(e.currentTarget);
              const title = String(dados.get("title") ?? "").trim();
              const content = String(dados.get("content") ?? "").trim();
              if (title && content) void criarTicket(title, content);
            }}
          >
            <Campo rotulo="Título" name="title" defaultValue={dialogo.titulo} maxLength={120} required autoFocus placeholder="Ex.: Não consigo excluir um cartão" />
            <Campo
              rotulo="Descrição"
              name="content"
              multilinha
              rows={5}
              maxLength={5000}
              required
              placeholder="O que você tentou fazer, o que aconteceu e o que esperava que acontecesse"
            />
            {dialogo.erro ? (
              <p className="aviso" role="alert" style={{ margin: 0 }}>
                <span className="aviso-texto"><Icone nome="alerta" tamanho={18} /><span>{dialogo.erro}</span></span>
              </p>
            ) : null}
            <div className="acoes">
              <Botao onClick={() => setDialogo(null)} disabled={dialogo.enviando}>Cancelar</Botao>
              <Botao variante="primario" type="submit" disabled={dialogo.enviando}>{dialogo.enviando ? "Abrindo…" : "Abrir ticket"}</Botao>
            </div>
          </form>
        </Dialogo>
      ) : null}

      {dialogo?.tipo === "renomear" ? (
        <Dialogo aberto titulo="Renomear ticket" aoFechar={() => setDialogo(null)}>
          <form
            className="formulario"
            onSubmit={(e) => {
              e.preventDefault();
              const title = String(new FormData(e.currentTarget).get("title") ?? "").trim();
              if (title) void atualizarTicket({ title });
            }}
          >
            <Campo rotulo="Título do ticket" name="title" defaultValue={dialogo.ticket.title} maxLength={120} required autoFocus />
            <div className="acoes">
              <Botao onClick={() => setDialogo(null)}>Cancelar</Botao>
              <Botao variante="primario" type="submit">Salvar alterações</Botao>
            </div>
          </form>
        </Dialogo>
      ) : null}

      {dialogo?.tipo === "excluir" ? (
        <Confirmar
          aberto
          titulo="Excluir ticket"
          descricao={`Excluir "${dialogo.ticket.title}" apaga a conversa inteira e o cartão dele no quadro Atendimento. Não dá para desfazer.`}
          rotuloConfirmar="Excluir ticket"
          aoConfirmar={() => void excluirTicket()}
          aoFechar={() => setDialogo(null)}
        />
      ) : null}
    </div>
  );
}
