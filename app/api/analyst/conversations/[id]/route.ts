import { db } from "../../../../../src/lib/db";
import { getSession } from "../../../../../src/lib/auth";
import { listTickets } from "../../../../../src/features/tickets/service";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession(request);
  if (!session || session.role !== "ANALYST") {
    return Response.json({ error: "Acesso negado" }, { status: 403 });
  }

  const { id } = await params;

  const conversation = await db.conversation.findUnique({
    where: { id },
    include: {
      employee: { select: { id: true, name: true, email: true } },
      analyst: { select: { id: true, name: true, email: true } },
      messages: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!conversation) return Response.json({ error: "Conversa não encontrada" }, { status: 404 });

  const tickets = await listTickets(conversation.employeeId);

  return Response.json({ conversation, tickets });
}
