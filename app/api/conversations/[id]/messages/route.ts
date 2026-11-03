import { db } from "../../../../../src/lib/db";
import { getSession } from "../../../../../src/lib/auth";
import { runAgent } from "../../../../../src/features/chat/agent";
import type { StreamEvent } from "../../../../../src/types";

export const maxDuration = 60;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession(request);
  if (!session) return Response.json({ error: "Não autenticado" }, { status: 401 });

  const { id: conversationId } = await params;
  const { message } = await request.json();

  if (!message?.trim()) {
    return Response.json({ error: "Mensagem não pode ser vazia" }, { status: 400 });
  }

  const conversation = await db.conversation.findFirst({
    where: { id: conversationId, employeeId: session.userId },
    include: {
      messages: { orderBy: { createdAt: "asc" }, take: 50 },
    },
  });

  if (!conversation) return Response.json({ error: "Conversa não encontrada" }, { status: 404 });

  if (conversation.status === "WAITING_ANALYST" || conversation.status === "IN_PROGRESS") {
    return Response.json(
      { error: "Esta conversa está com um analista. Aguarde o retorno." },
      { status: 403 }
    );
  }

  if (conversation.messageCount >= 30) {
    return Response.json(
      { error: "Limite de 30 mensagens por sessão atingido. Inicie uma nova conversa." },
      { status: 429 }
    );
  }

  const user = await db.user.findUnique({
    where: { id: session.userId },
    select: { name: true, email: true },
  });

  if (!user) return Response.json({ error: "Usuário não encontrado" }, { status: 404 });

  const history = conversation.messages.map((m) => ({
    role: m.role === "USER" ? ("user" as const) : ("assistant" as const),
    content: m.content,
  }));

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: StreamEvent) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      };

      try {
        await runAgent({
          conversationId,
          userId: session.userId,
          userName: user.name,
          userEmail: user.email,
          userMessage: message,
          history,
          onEvent: send,
        });
        send({ type: "done" });
      } catch (err) {
        send({ type: "error", message: err instanceof Error ? err.message : "Erro interno" });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
