# Nexo Assist

Service desk de TI com agente de IA. Funcionários descrevem seus problemas em linguagem natural; o agente consulta chamados, busca na central de ajuda, abre tickets e transfere para analistas humanos quando necessário.

---

## Como rodar

### Pré-requisitos

- Node.js 18+
- PostgreSQL rodando localmente (ou uma string de conexão externa)

### 1. Instalar dependências

```bash
npm install
```

### 2. Configurar variáveis de ambiente

Crie um arquivo `.env` na raiz do projeto:

```env
DATABASE_URL="postgresql://usuario:senha@localhost:5432/nexo_assist"
ANTHROPIC_API_KEY="sk-ant-..."
JWT_SECRET="uma-chave-secreta-qualquer"
```

### 3. Rodar as migrations e seed

```bash
npx prisma migrate dev
npx prisma db seed
```

O seed cria dois usuários prontos para uso:

| E-mail | Senha | Perfil |
|--------|-------|--------|
| `pedro.silva@nexo.com` | `123456` | Funcionário |
| `ana.lima@nexo.com` | `123456` | Analista |

### 4. Iniciar o servidor de desenvolvimento

```bash
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000).

---

## Visão geral da arquitetura

```
Browser
  │
  ├── /chat          → Funcionário (SSE streaming + polling 4 s)
  ├── /console       → Analista    (polling 8 s)
  └── /login
  │
  ▼
Next.js 16 App Router (full-stack)
  │
  ├── app/api/conversations/[id]/messages  → dispara o agente de IA
  ├── app/api/conversations/[id]/reply     → resposta do funcionário ao analista
  ├── app/api/analyst/conversations/…      → endpoints exclusivos para analistas
  └── app/api/auth/…                       → JWT em cookie httpOnly
  │
  ├── src/features/chat/agent.ts           → loop de tool-use do Claude
  ├── src/features/tickets/service.ts      → CRUD de chamados + cálculo SLA
  ├── src/features/tickets/helpCenter.ts   → busca na central de ajuda
  └── src/lib/db.ts                        → instância Prisma 7 (PostgreSQL)
```

**Camadas principais:**

| Camada | Tecnologia | Responsabilidade |
|--------|-----------|-----------------|
| UI | React + Tailwind CSS 4 | Renderização; sem lógica de negócio |
| Hooks | `useChat`, `useConsole` | Estado, efeitos e chamadas de API isolados da UI |
| API Routes | Next.js Route Handlers | Validação, auth e orquestração |
| Agente | Anthropic SDK + Claude Haiku 5.5 | Raciocínio e execução de ferramentas |
| Dados | Prisma 7 + PostgreSQL | Persistência de conversas, mensagens e chamados |
| Auth | `jose` (JWT) + `bcrypt` | Sessão stateless em cookie httpOnly |

**Fluxo de uma mensagem:**

1. Funcionário escreve → POST para `/api/conversations/[id]/messages`
2. O servidor abre um `ReadableStream` (SSE) e chama `runAgent()`
3. O agente faz um loop com o Claude: texto streaming → `text_delta` → browser renderiza em tempo real
4. Se o modelo decide usar ferramentas, executa cada uma (DB / busca) e devolve os resultados ao modelo
5. Ao terminar, salva `USER` + `ASSISTANT` no banco com metadados (ações, rascunho, decision)
6. O browser recebe o evento `done` e encerra a leitura

---

## Como o agente decide o que fazer

O agente usa um **loop manual de tool-use** com 7 ferramentas registradas no SDK da Anthropic:

| Ferramenta | Quando o modelo a usa |
|-----------|----------------------|
| `search_help_center` | Dúvida ou problema que pode ser resolvido com documentação |
| `list_my_tickets` | Funcionário quer ver status dos chamados ou o contexto precisa de histórico |
| `get_ticket` | Precisa de detalhes de um chamado específico |
| `create_ticket_draft` | Identificou necessidade de abrir chamado — **sempre antes de `create_ticket`** |
| `create_ticket` | Após o funcionário confirmar o rascunho |
| `update_ticket` | Chamado existente precisa de atualização |
| `transfer_to_analyst` | Solicitado, caso crítico, SLA vencido ou incerteza do agente |

**Como a decisão acontece:**

```
mensagem do usuário + histórico (até 50 msgs)
        ↓
  system prompt com regras do service desk
        ↓
  Claude Haiku decide: responder direto OU chamar ferramenta(s)
        ↓
  tool_use → executa → devolve resultado → Claude decide próximo passo
        ↓
  stop_reason === "end_turn" → resposta final
```

O system prompt define explicitamente as regras de classificação:
- **Tipo:** INC (algo parou) vs. REQ (pedido)
- **Prioridade:** Crítica 1 h → Baixa 5 dias úteis (SLA calculado com horas úteis reais)
- **Escopo:** apenas TI — para RH, financeiro ou facilities, redireciona educadamente
- **Privacidade:** o agente só acessa dados do funcionário autenticado

---

## Como a qualidade das decisões foi garantida

**1. Criação de chamado em duas fases**
O modelo é instruído a chamar `create_ticket_draft` antes de `create_ticket`. O rascunho aparece na tela para o funcionário revisar e confirmar. Isso evita abertura acidental e dá transparência sobre o que o agente classificou.

**2. Detecção de duplicatas**
Antes de criar um chamado, `checkDuplicate` verifica se já existe outro aberto com título e categoria similares. Se houver, o agente sugere atualizar o existente em vez de criar um novo.

**3. Isolamento por usuário**
Todas as consultas no banco incluem `userId` como filtro obrigatório. O agente nunca expõe dados de outros funcionários; a camada de API valida a sessão antes de qualquer operação.

**4. Transparência das ações**
Cada ferramenta executada gera um `AgentAction` (label + detalhe) que aparece na interface acima da resposta, mostrando exatamente o que o agente fez (ex.: "Consultou seus chamados · 3 encontrados").

**5. Limite de sessão e transferência de fallback**
O agente tem 30 mensagens por sessão para evitar loops infinitos. A ferramenta `transfer_to_analyst` existe como válvula de segurança para casos que saem do escopo ou da confiança do modelo.

**6. Histórico de contexto**
As últimas 50 mensagens são enviadas em cada requisição, permitindo ao agente recuperar decisões anteriores e evitar contradições (ex.: não abrir chamado duplicado se já criou um na mesma sessão).

---

## Principais trade-offs

**Polling vs. WebSocket para mensagens do analista**
Escolhi polling simples (4 s no chat do funcionário, 8 s no console) para não adicionar um servidor de WebSocket. O custo é pequena latência de até 4 s na entrega da mensagem. WebSocket ou SSE bidirecional seria a evolução natural.

**Claude Haiku vs. modelos maiores**
Haiku foi escolhido pela velocidade e custo. Em um service desk a primeira resposta rápida importa mais do que raciocínio profundo. O trade-off é que problemas com ambiguidade alta podem precisar de mais turnos de esclarecimento.

**Loop de tool-use síncrono dentro do SSE**
Todo o processamento — incluindo múltiplas chamadas de ferramentas — acontece dentro de um único request HTTP com streaming. Isso simplifica a implementação mas limita chamadas lentas (ex.: se a busca na central demorar, o stream fica preso). A alternativa seria persistir o estado do agente entre requests.

**Busca na central de ajuda por palavras-chave**
A pesquisa atual é textual (filtro em banco). Isso é rápido e sem dependências externas, mas não captura semântica (ex.: "notebook lento" não bate com "otimização de desempenho"). Embeddings e busca vetorial resolveriam isso.

**JWT sem invalidação proativa**
Tokens JWT têm expiração mas não são invalidados no logout de forma proativa (não há blocklist). Se o token vazar antes de expirar, ele continuaria válido. Uma solução seria Redis com lista de tokens revogados.

---

## O que faria com mais tempo

**Qualidade do agente**
- Suite de testes automatizados para o loop de tool-use: cenários fixos com entrada/saída esperada, medindo taxa de acerto na classificação (tipo, categoria, prioridade) e falsos positivos na criação de chamados
- Compressão do histórico: após N mensagens, gerar um resumo da sessão e substituir as mensagens antigas pelo resumo, mantendo contexto sem estourar o limite de tokens
- Busca vetorial na central de ajuda com embeddings (pgvector no próprio PostgreSQL)

**Tempo real**
- Substituir o polling por SSE do servidor → cliente para o console do analista, eliminando a latência de 4–8 s
- Notificações push (Web Push API) quando um novo chamado chega para o analista

**Produto**
- Dashboard de métricas para o time: taxa de resolução pelo agente, chamados por categoria, aderência ao SLA, mensagens médias por resolução
- Histórico de chamados com filtros e busca no frontend
- Suporte a anexos (screenshots, logs) nas mensagens
- Notificação por e-mail quando o status de um chamado muda

**Infraestrutura**
- CI/CD com testes e lint automáticos em cada PR
- Rate limiting por usuário na API do agente
- Observabilidade: traces das chamadas ao Claude com custo e latência por sessão
