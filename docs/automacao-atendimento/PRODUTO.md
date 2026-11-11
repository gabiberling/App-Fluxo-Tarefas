# Fluxo: o que o app faz e como usar

Fluxo é um quadro de tarefas no estilo Kanban com uma área de atendimento. Ele roda localmente: interface em React/Vite, API em Node e banco SQLite. Para detalhes técnicos e rotas da API, veja o `README.md` na raiz.

## Quadros (`/quadro`)
- **Quadro:** um espaço por projeto. Na lateral, use **+** para criar, o lápis para renomear e a lixeira para excluir. Excluir um quadro apaga as listas e os cartões dele.
- **Lista:** são as colunas do quadro, como "A fazer" ou "Fazendo". Use **Adicionar lista**; no menu **⋮** da lista há **Renomear lista** e **Excluir lista** (que apaga os cartões dela).
- **Cartão:** use **Adicionar cartão** na lista. Cada cartão tem título e descrição opcional. No menu **⋮** do cartão há **Editar cartão**, **Mover para** (outra lista) e **Excluir cartão**. Também dá para arrastar o cartão com o mouse.

## Atendimento (`/atendimento`)
- **Novo ticket** abre uma janela com **Título** e **Descrição**. O ticket vira uma conversa e também um cartão na coluna "Novos" do quadro **Atendimento**.
- Na conversa, a pessoa responde pela caixa de mensagem: Enter envia, Shift+Enter quebra a linha. Há **Marcar como resolvido** ou **Reabrir**, **Ver no quadro** e, no menu **⋮**, **Renomear** e **Excluir**.
- Respostas do suporte entram pela API (`POST /api/tickets/:id/messages` com `role: "agent"`). A tela confere respostas novas a cada 5 segundos.

## O que o app não tem hoje
- Login na interface: as rotas de login existem na API, mas as telas não pedem login.
- Compartilhamento de quadros entre pessoas, exportação, anexos, etiquetas e datas de entrega.

## Como rodar
- `npm install` e depois `npm run dev`. A interface abre em http://127.0.0.1:5173 e a API em http://127.0.0.1:3001/api; se as portas estiverem ocupadas, o comando usa outras e mostra os endereços.
- `npm run build` gera a interface; `npm test` roda os testes.
