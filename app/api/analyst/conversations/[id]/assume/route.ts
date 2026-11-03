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

  const conversation = await db.conversation.findUnique({ where: { id } });
  if (!conversation) return Response.json({ error: "Conversa não encontrada" }, { status: 404 });

  const updated = await db.conversation.update({
    where: { id },
    data: { status: "IN_PROGRESS", analystId: session.userId },
  });

  await db.message.create({
    data: {
      conversationId: id,
      role: "SYSTEM",
      content: `Analista assumiu o atendimento. Agent pausado.`,
    },
  });

  return Response.json({ conversation: updated });
}
