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
    data: { status: "CLOSED", closedAt: new Date() },
  });

  await db.message.create({
    data: {
      conversationId: id,
      role: "SYSTEM",
      content: "Atendimento encerrado pelo analista.",
    },
  });

  return Response.json({ conversation: updated });
}
