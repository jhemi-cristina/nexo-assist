import { db } from "../../../../../../src/lib/db";
import { getSession } from "../../../../../../src/lib/auth";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession(request);
  if (!session || session.role !== "ANALYST") {
    return Response.json({ error: "Acesso negado" }, { status: 403 });
  }

  const { id } = await params;
  const { message } = await request.json();

  if (!message?.trim()) {
    return Response.json({ error: "Mensagem não pode ser vazia" }, { status: 400 });
  }

  const conversation = await db.conversation.findUnique({ where: { id } });
  if (!conversation) return Response.json({ error: "Conversa não encontrada" }, { status: 404 });

  if (conversation.status !== "IN_PROGRESS" || conversation.analystId !== session.userId) {
    return Response.json({ error: "Você não está atendendo esta conversa" }, { status: 403 });
  }

  const msg = await db.message.create({
    data: {
      conversationId: id,
      role: "ANALYST",
      content: message,
    },
  });

  await db.conversation.update({
    where: { id },
    data: { updatedAt: new Date() },
  });

  return Response.json({ message: msg });
}
