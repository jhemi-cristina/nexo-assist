import Anthropic from "@anthropic-ai/sdk";
import { db } from "../../lib/db";
import { MessageRole } from "../../generated/prisma/client";
import {
  listTickets,
  getTicket,
  createTicket,
  updateTicket,
  checkDuplicate,
  priorityDeadlineLabel,
} from "../tickets/service";
import { searchArticles } from "../tickets/helpCenter";
import type { AgentAction, AgentDecision, StreamEvent, TicketDraft } from "../../types";

const client = new Anthropic();

const TOOLS: Anthropic.Tool[] = [
  {
    name: "search_help_center",
    description: "Busca artigos na central de ajuda da Nexo sobre problemas de TI. Use quando o funcionário tem uma dúvida ou problema que pode ser resolvido com documentação.",
    input_schema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Termos de busca para encontrar artigos relevantes" },
      },
      required: ["query"],
    },
  },
  {
    name: "list_my_tickets",
    description: "Lista todos os chamados do funcionário atual, incluindo status, prioridade e prazos SLA.",
    input_schema: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  {
    name: "get_ticket",
    description: "Obtém detalhes completos de um chamado específico do funcionário.",
    input_schema: {
      type: "object",
      properties: {
        ticketId: { type: "string", description: "ID do chamado" },
      },
      required: ["ticketId"],
    },
  },
  {
    name: "create_ticket_draft",
    description: "Cria um rascunho de chamado para mostrar ao funcionário antes de confirmar a abertura. SEMPRE use esta ferramenta antes de create_ticket para mostrar o rascunho ao usuário.",
    input_schema: {
      type: "object",
      properties: {
        title: { type: "string", description: "Título conciso do chamado" },
        description: { type: "string", description: "Descrição detalhada do problema ou solicitação" },
        type: { type: "string", enum: ["INC", "REQ"], description: "INC para incidente (algo parou), REQ para requisição (pedido)" },
        category: { type: "string", enum: ["Acesso", "Rede e VPN", "Hardware", "Software", "E-mail", "Outros"] },
        priority: { type: "string", enum: ["Crítica", "Alta", "Média", "Baixa"] },
        affectedUsers: { type: "number", description: "Número de pessoas afetadas" },
      },
      required: ["title", "description", "type", "category", "priority", "affectedUsers"],
    },
  },
  {
    name: "create_ticket",
    description: "Cria um chamado no sistema após o funcionário confirmar o rascunho.",
    input_schema: {
      type: "object",
      properties: {
        title: { type: "string" },
        description: { type: "string" },
        type: { type: "string", enum: ["INC", "REQ"] },
        category: { type: "string" },
        priority: { type: "string" },
        affectedUsers: { type: "number" },
      },
      required: ["title", "description", "type", "category", "priority", "affectedUsers"],
    },
  },
  {
    name: "update_ticket",
    description: "Atualiza um chamado existente com novas informações.",
    input_schema: {
      type: "object",
      properties: {
        ticketId: { type: "string" },
        description: { type: "string", description: "Nova informação a adicionar" },
        status: { type: "string", enum: ["OPEN", "IN_PROGRESS", "WAITING_ANALYST", "RESOLVED", "CLOSED"] },
      },
      required: ["ticketId"],
    },
  },
  {
    name: "transfer_to_analyst",
    description: "Transfere a conversa para um analista humano. Use quando o funcionário solicita, em casos críticos, chamados vencidos ou quando você não tem segurança.",
    input_schema: {
      type: "object",
      properties: {
        reason: { type: "string", description: "Motivo da transferência" },
      },
      required: ["reason"],
    },
  },
];

function buildSystemPrompt(userName: string, userEmail: string): string {
  const now = new Date();
  return `Você é o Nexo Assist, o agente de atendimento do service desk de TI da Nexo.
Você atende funcionários da Nexo que têm problemas de TI.
Data/hora atual: ${now.toLocaleString("pt-BR")}

REGRAS DO SERVICE DESK:
- Tipos de chamado: INC (incidente - algo parou) ou REQ (requisição - pedido de acesso, equipamento, software)
- Categorias: Acesso, Rede e VPN, Hardware, Software, E-mail, Outros
- Prioridades: Crítica (1h), Alta (4h úteis), Média (3 dias úteis), Baixa (5 dias úteis)
- Todo chamado precisa: título, descrição, tipo, categoria, prioridade, quantas pessoas afetadas
- SEMPRE mostre um rascunho via create_ticket_draft e aguarde confirmação antes de usar create_ticket
- Sem duplicidade: se já existe chamado aberto sobre o mesmo problema, atualize-o em vez de criar novo
- Chamados resolvidos há até 7 dias podem ser reabertos
- Transferência: quando solicitado pelo usuário, em casos críticos, chamados vencidos, ou quando você não tem segurança
- Privacidade: só mostre chamados do próprio funcionário - nunca exponha dados de outros
- Escopo: apenas assuntos de TI. Para RH, financeiro, facilities, redirecione educadamente
- LIMITE: máximo 30 mensagens por sessão

FORMATO DAS SUAS RESPOSTAS:
- Seja conciso e direto
- Use português brasileiro informal mas profissional
- Ao listar chamados, organize por status e prioridade
- Ao propor rascunho, explique o que vai criar e por quê classificou assim
- Ofereça opções rápidas quando pertinente

Funcionário: ${userName}
Email: ${userEmail}`;
}

function actionLabel(toolName: string, input: Record<string, unknown>, result?: unknown): AgentAction {
  const labels: Record<string, string> = {
    search_help_center: "Consultou a central de ajuda",
    list_my_tickets: "Consultou seus chamados",
    get_ticket: "Verificou detalhes do chamado",
    create_ticket_draft: "Preparou rascunho do chamado",
    create_ticket: "Abriu novo chamado",
    update_ticket: "Atualizou chamado",
    transfer_to_analyst: "Transferiu para analista",
  };

  let detail = "";
  if (toolName === "search_help_center") {
    detail = `Busca: "${input.query}"`;
  } else if (toolName === "list_my_tickets") {
    const r = result as unknown[];
    detail = r ? `${r.length} chamado(s) encontrado(s)` : "Listando chamados";
  } else if (toolName === "get_ticket") {
    detail = `ID: ${input.ticketId}`;
  } else if (toolName === "create_ticket_draft") {
    detail = `${input.type} · ${input.category} · ${input.priority}`;
  } else if (toolName === "create_ticket") {
    const r = result as { number?: string } | null;
    detail = r?.number ? `Chamado ${r.number} aberto` : "Chamado criado";
  } else if (toolName === "update_ticket") {
    detail = `ID: ${input.ticketId}`;
  } else if (toolName === "transfer_to_analyst") {
    detail = String(input.reason ?? "");
  }

  return { label: labels[toolName] ?? toolName, detail, tool: toolName };
}

export async function runAgent(params: {
  conversationId: string;
  userId: string;
  userName: string;
  userEmail: string;
  userMessage: string;
  history: Array<{ role: "user" | "assistant"; content: string }>;
  onEvent: (event: StreamEvent) => void;
}): Promise<void> {
  const { conversationId, userId, userName, userEmail, userMessage, history, onEvent } = params;

  const messages: Anthropic.MessageParam[] = [
    ...history.map((h) => ({ role: h.role, content: h.content })),
    { role: "user", content: userMessage },
  ];

  const actions: AgentAction[] = [];
  let fullText = "";
  let pendingDraft: TicketDraft | null = null;
  let transferred = false;

  const loop = async (msgs: Anthropic.MessageParam[]): Promise<void> => {
    const stream = client.messages.stream({
      model: "claude-haiku-5-5",
      max_tokens: 4096,
      system: buildSystemPrompt(userName, userEmail),
      tools: TOOLS,
      messages: msgs,
    });

    let currentText = "";

    for await (const event of stream) {
      if (event.type === "content_block_delta") {
        if (event.delta.type === "text_delta") {
          currentText += event.delta.text;
          fullText += event.delta.text;
          onEvent({ type: "text_delta", delta: event.delta.text });
        }
      }
    }

    const finalMsg = await stream.finalMessage();

    if (finalMsg.stop_reason === "tool_use") {
      const toolUseBlocks = finalMsg.content.filter(
        (b): b is Anthropic.ToolUseBlock => b.type === "tool_use"
      );

      const toolResults: Anthropic.ToolResultBlockParam[] = [];

      for (const toolUse of toolUseBlocks) {
        const input = toolUse.input as Record<string, unknown>;
        let result: unknown;

        try {
          if (toolUse.name === "search_help_center") {
            result = await searchArticles(String(input.query));
          } else if (toolUse.name === "list_my_tickets") {
            result = await listTickets(userId);
          } else if (toolUse.name === "get_ticket") {
            result = await getTicket(String(input.ticketId), userId);
            if (!result) result = { error: "Chamado não encontrado ou sem permissão" };
          } else if (toolUse.name === "create_ticket_draft") {
            const deadline = priorityDeadlineLabel(input.priority as never);
            const draft: TicketDraft = {
              title: String(input.title),
              description: String(input.description),
              type: input.type as "INC" | "REQ",
              category: String(input.category),
              priority: String(input.priority),
              affectedUsers: Number(input.affectedUsers) || 1,
              priorityDeadline: deadline,
            };
            pendingDraft = draft;
            onEvent({ type: "ticket_draft", draft });
            result = { draft, message: "Rascunho criado. Aguardando confirmação do funcionário." };
          } else if (toolUse.name === "create_ticket") {
            const duplicate = await checkDuplicate(userId, String(input.title), String(input.category));
            if (duplicate && !["RESOLVED", "CLOSED"].includes(duplicate.status)) {
              result = {
                error: `Já existe um chamado aberto similar: ${duplicate.number} - ${duplicate.title}. Considere atualizar esse chamado.`,
              };
            } else {
              result = await createTicket(
                {
                  title: String(input.title),
                  description: String(input.description),
                  type: String(input.type),
                  category: String(input.category),
                  priority: String(input.priority),
                  affectedUsers: Number(input.affectedUsers) || 1,
                },
                userId
              );
            }
          } else if (toolUse.name === "update_ticket") {
            result = await updateTicket(String(input.ticketId), userId, {
              description: input.description ? String(input.description) : undefined,
              status: input.status ? String(input.status) : undefined,
            });
            if (!result) result = { error: "Chamado não encontrado ou sem permissão" };
          } else if (toolUse.name === "transfer_to_analyst") {
            await db.conversation.update({
              where: { id: conversationId },
              data: { status: "WAITING_ANALYST", mode: "ANALYST" },
            });
            transferred = true;
            result = { success: true, message: "Conversa transferida para analista. O agente está pausado." };
          }
        } catch (err) {
          result = { error: `Erro ao executar ferramenta: ${err instanceof Error ? err.message : String(err)}` };
        }

        const action = actionLabel(toolUse.name, input, result);
        actions.push(action);

        toolResults.push({
          type: "tool_result",
          tool_use_id: toolUse.id,
          content: JSON.stringify(result),
        });
      }

      if (actions.length > 0) {
        onEvent({ type: "actions", actions: [...actions] });
      }

      if (!transferred) {
        const newMsgs: Anthropic.MessageParam[] = [
          ...msgs,
          { role: "assistant", content: finalMsg.content },
          { role: "user", content: toolResults },
        ];
        await loop(newMsgs);
      }
    }
  };

  await loop(messages);

  // Generate quick replies based on context
  const quickReplies: string[] = [];
  if (pendingDraft) {
    quickReplies.push("Confirmar e abrir chamado", "Editar informações", "Cancelar");
  } else if (!transferred && fullText.length > 0) {
    if (fullText.toLowerCase().includes("chamado")) {
      quickReplies.push("Ver meus chamados", "Falar com analista");
    } else {
      quickReplies.push("Abrir um chamado", "Falar com analista", "Tenho outra dúvida");
    }
  }

  if (quickReplies.length > 0) {
    onEvent({ type: "quick_replies", replies: quickReplies });
  }

  // Generate decision summary
  const decision: AgentDecision = {
    understood: userMessage.length > 80 ? userMessage.slice(0, 80) + "..." : userMessage,
    action: actions.length > 0 ? actions.map((a) => a.label).join(", ") : "Respondeu diretamente",
    confidence: actions.length > 0 ? 0.9 : 0.8,
    reasoning: buildReasoning(actions, transferred, pendingDraft),
  };

  onEvent({ type: "decision", decision });

  // Save messages to DB
  await db.message.create({
    data: {
      conversationId,
      role: MessageRole.USER,
      content: userMessage,
    },
  });

  await db.message.create({
    data: {
      conversationId,
      role: MessageRole.ASSISTANT,
      content: fullText,
      metadata: {
        actions,
        decision,
        draft: pendingDraft ?? undefined,
      },
    },
  });

  await db.conversation.update({
    where: { id: conversationId },
    data: { messageCount: { increment: 2 }, updatedAt: new Date() },
  });
}

function buildReasoning(actions: AgentAction[], transferred: boolean, draft: TicketDraft | null): string {
  if (transferred) {
    return "A conversa foi transferida para um analista humano conforme solicitado ou por necessidade do caso.";
  }
  if (draft) {
    return `Identifiquei a necessidade de abrir um chamado ${draft.type} na categoria ${draft.category} com prioridade ${draft.priority}. Apresentei o rascunho para confirmação antes de criar.`;
  }
  if (actions.some((a) => a.tool === "search_help_center")) {
    return "Consultei a central de ajuda para encontrar documentação relevante que pode resolver a dúvida sem necessidade de chamado.";
  }
  if (actions.some((a) => a.tool === "list_my_tickets")) {
    return "Consultei os chamados do funcionário para fornecer informações atualizadas sobre o status e prazos.";
  }
  return "Respondi com base no conhecimento disponível e nas regras do service desk.";
}
