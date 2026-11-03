import { db } from "../../../../src/lib/db";
import { getSession } from "../../../../src/lib/auth";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession(request);
  if (!session) return Response.json({ error: "Não autenticado" }, { status: 401 });

  const { id } = await params;

  const conversation = await db.conversation.findFirst({
    where: { id, employeeId: session.userId },
    include: {
      messages: { orderBy: { createdAt: "asc" } },
      analyst: { select: { id: true, name: true, email: true } },
    },
  });

  if (!conversation) return Response.json({ error: "Conversa não encontrada" }, { status: 404 });

  return Response.json({ conversation });
}
