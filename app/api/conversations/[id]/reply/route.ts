import { db } from "../../../../../src/lib/db";
import { getSession } from "../../../../../src/lib/auth";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession(request);
  if (!session) return Response.json({ error: "Não autenticado" }, { status: 401 });

  const { id } = await params;
  const { message } = await request.json();

  if (!message?.trim()) {
    return Response.json({ error: "Mensagem não pode ser vazia" }, { status: 400 });
  }

  const conversation = await db.conversation.findFirst({
    where: { id, employeeId: session.userId },
  });

  if (!conversation) return Response.json({ error: "Conversa não encontrada" }, { status: 404 });

  if (conversation.status !== "WAITING_ANALYST" && conversation.status !== "IN_PROGRESS") {
    return Response.json({ error: "Conversa não está com um analista" }, { status: 403 });
  }

  const msg = await db.message.create({
    data: {
      conversationId: id,
      role: "USER",
      content: message,
    },
  });

  await db.conversation.update({
    where: { id },
    data: { updatedAt: new Date() },
  });

  return Response.json({ message: msg });
}
