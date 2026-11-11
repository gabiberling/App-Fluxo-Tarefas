import { Icone } from "./Icone.jsx";

/** Logo do produto no topo da lateral. */
export function Marca() {
  return (
    <a className="marca" href="/" aria-label="Fluxo, voltar ao início" style={{ textDecoration: "none" }}>
      <span className="marca-simbolo" aria-hidden="true">
        <Icone nome="colunas" tamanho={18} />
      </span>
      <span className="marca-nome">Fluxo</span>
    </a>
  );
}

const AREAS = [
  { id: "quadros", rotulo: "Quadros", href: "/quadro", icone: "colunas" },
  { id: "atendimento", rotulo: "Atendimento", href: "/atendimento", icone: "suporte" },
];

/** Menu principal da lateral: troca entre as áreas do sistema. */
export function Navegacao({ atual }) {
  return (
    <nav className="nav" aria-label="Áreas do sistema">
      {AREAS.map((a) => (
        <a key={a.id} className="nav-link" href={a.href} aria-current={a.id === atual ? "page" : undefined}>
          <Icone nome={a.icone} tamanho={18} />
          {a.rotulo}
        </a>
      ))}
    </nav>
  );
}
