import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App.jsx";
import "./estilos.css";
import { Landing } from "./Landing.jsx";
import "./landing.css";

import { Atendimento } from "./Atendimento.jsx";
import "./atendimento.css";

const caminho = window.location.pathname;
const Tela = caminho === "/" ? Landing : caminho.startsWith("/atendimento") ? Atendimento : App;

createRoot(document.getElementById("raiz")).render(<StrictMode><Tela /></StrictMode>);
