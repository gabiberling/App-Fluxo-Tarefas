# Progresso: automação do atendimento

## Decisão: Claude Code no lugar do GitHub Copilot (11/11/2026)

A conta não tem plano pago do Copilot, e o cloud agent não vem no plano Free. Os prompts da aula citam o Copilot; nesta cópia, o equivalente é feito com o Claude Code:

| Na aula (Copilot) | Nesta cópia (Claude Code) |
|---|---|
| `.github/agents/*.agent.md` | Mantidos como a aula pede, com um espelho em `.claude/agents/*.md` para o Claude Code executar |
| Copilot cloud agent nas Actions | Claude Code GitHub Actions (`@claude` em issue ou PR), instalado com `/install-github-app` |
| Secret `COPILOT_AGENT_TOKEN` | Secret `ANTHROPIC_API_KEY` ou um token da assinatura do Claude |
| Agente executando a tarefa | O Claude Code executa o agente localmente, com ticket fictício |

Cada etapa registra aqui o que foi adaptado. O que depender de automação no GitHub fica como pendência até o secret ser configurado.

## Etapa 00: preparar o projeto e o acesso (11/11/2026)

**Cópia do projeto**
- URL: https://github.com/gabiberling/App-Fluxo-Tarefas (pública; visibilidade não alterada)
- Origem: cópia do App Fluxo Tarefas V1 (https://github.com/bittencourtthulio/App-Fluxo-Tarefas-V1), com a área de atendimento já adicionada. Não é um fork no GitHub.
- Pasta local: `d:\ProjetoGTIA`, branch `main` sincronizada com `origin/main`.
- Node v24.14.0 e npm 11.9.0 (o projeto exige Node 22.13 ou mais novo).
- Comandos do `package.json`: `dev`, `preflight`, `start`, `test`, `build`.

**Abrir o app**
- Comando: `npm run dev`
- Interface em http://127.0.0.1:5173 (o atendimento fica em `/atendimento`), API em http://127.0.0.1:3001/api. Se essas portas estiverem ocupadas, o comando escolhe as próximas livres e mostra os endereços no terminal.
- Conferido: a interface `/atendimento` respondeu 200 e `/api/boards` listou os quadros.

**Build**
- Comando: `npm run build`
- Resultado: ok (`✓ built`), com a saída gerada em `dist/`.
- `npm install`: dependências já atualizadas, 0 vulnerabilidades.

**Dados locais preservados**
- O banco SQLite em `server/dados/app.sqlite` não foi alterado nem apagado (a pasta está no `.gitignore`).
- Não há `.env` no projeto.

**Acesso ao GitHub**
- `gh` logado na conta dona do repositório.
- Actions habilitadas no repositório (`allowed_actions: all`).
- Copilot cloud agent: sem acesso. O Copilot não aparece entre os responsáveis que podem ser atribuídos no repositório, e `gh agent-task list` retornou `403 Forbidden`. Por isso, a decisão foi usar o Claude Code (veja acima).
- Claude Code GitHub Actions: **pendente**. O repositório ainda não tem workflow nem secret; a instalação vem numa etapa futura.

**Credenciais (separadas, valores nunca registrados aqui)**
- Backend local: uma credencial própria do app, em `.env` local (fora do Git), quando for necessária.
- Actions: um secret só para o agente, cadastrado só nas configurações do repositório no GitHub. Na aula ele se chama `COPILOT_AGENT_TOKEN`; aqui será o secret do Claude. Ainda não foi criado: hoje o repositório não tem nenhum secret.

## Etapa 01: definir contexto e limites (11/11/2026)

- `docs/automacao-atendimento/PRODUTO.md`: o que o app faz, como usar e o que ele não tem.
- `docs/automacao-atendimento/POLITICA-DE-AUTONOMIA.md`: os agentes podem responder dúvidas de uso, pedir esclarecimento e fazer pequenas mudanças no quadro de tarefas; a política lista os caminhos que podem e os que não podem mudar.
- `automacao/commercial-catalog.json`: só recursos reais; preço, planos e prazos ficam `null`, porque não existem no app.
- Conferido: os caminhos citados existem, os rótulos citados existem na interface, o JSON é válido e não há segredos nos arquivos.
- Adaptação para o Claude Code: `.claude/` foi incluído na política como caminho que o agente de produto não muda.

**Não feito até a etapa 01, de propósito**
- Nenhuma configuração remota, nenhum arquivo em `.github/agents/` e nenhum ticket de teste.
- Demonstrações futuras devem usar somente dados fictícios.

## Etapa 02: criar a equipe de agents (11/11/2026)

- Seis perfis da aula em `.github/agents/`: `coordenador`, `n1`, `comercial`, `po`, `desenvolvedor` e `revisor` (`.agent.md`), com frontmatter `name`, `description`, `target: github-copilot` e `tools`, sem modelo fixado. Os caminhos apontam para a base da etapa 01.
- O relatório JSON fica definido no coordenador: `requestId`, `outcome`, `publicText`, `agents`, `allowedFiles`, `criteria` e `updates`. Não havia controlador no projeto, então não houve contrato prévio a alinhar.
- Adaptação para o Claude Code:
  - Os especialistas foram espelhados em `.claude/agents/*.md`. Cada espelho manda ler o `.agent.md` correspondente, que continua sendo a única fonte das regras.
  - No Claude Code, um subagent não chama outro. Por isso o Coordenador virou o comando `/coordenador` (`.claude/commands/coordenador.md`), que roda na sessão principal e invoca os especialistas pela ferramenta Agent.
  - `report_progress` não existe no Claude Code; o comando regrava o relatório em `resultPath`, que por padrão fica em `automacao/resultados/`.
- Conferido: frontmatter completo em todos os arquivos, `tools` do Copilot em JSON válido, os cinco especialistas existem nos dois formatos e não há segredos.
- Ainda não executado: nenhum pedido foi rodado pela equipe, nem pelo Copilot nem pelo Claude Code. Os subagents novos só aparecem numa nova sessão do Claude Code.
