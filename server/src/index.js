import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// Credenciais locais ficam em .env (fora do Git); veja .env.example. Sem .env, segue com o ambiente atual.
try { process.loadEnvFile(join(dirname(fileURLToPath(import.meta.url)), "..", "..", ".env")); } catch { /* sem .env */ }

const { criarApp } = await import("./app.js");

const porta = Number(process.env.API_PORT ?? process.env.PORT ?? 3001);
const banco = process.env.BANCO ?? join(dirname(fileURLToPath(import.meta.url)), "..", "dados", "app.sqlite");
const { servidor, automacao } = criarApp({ banco });
servidor.listen(porta, "127.0.0.1", () => console.log(`API em http://127.0.0.1:${porta}/api`));

// Etapa 03: traz da issue as mensagens do N1 para o chat (só com AGENT_RUNTIME=github-native e credencial).
if (automacao.cfg.ligado) {
  console.log(`Automação: github-native${automacao.cfg.dryRun ? " (AGENT_DRY_RUN)" : ""}${automacao.cfg.token ? "" : ", sem GITHUB_ISSUES_TOKEN"}`);
  if (automacao.cfg.token) setInterval(() => void automacao.sincronizarTodos(), 60_000).unref();
}
