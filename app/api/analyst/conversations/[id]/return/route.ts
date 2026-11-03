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

  const updated = await db.conversation.update({
    where: { id },
    data: { status: "ACTIVE", mode: "AGENT", analystId: null },
  });

  await db.message.create({
    data: {
      conversationId: id,
      role: "SYSTEM",
      content: "Atendimento devolvido ao Nexo Assist. O agente retomou a conversa.",
    },
  });

  return Response.json({ conversation: updated });
}
