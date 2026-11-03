import { db } from "../../../src/lib/db";
import { getSession } from "../../../src/lib/auth";

export async function GET(request: Request) {
  const session = await getSession(request);
  if (!session) return Response.json({ error: "Não autenticado" }, { status: 401 });

  const conversations = await db.conversation.findMany({
    where: { employeeId: session.userId },
    orderBy: { updatedAt: "desc" },
    include: {
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  return Response.json({ conversations });
}

export async function POST(request: Request) {
  const session = await getSession(request);
  if (!session) return Response.json({ error: "Não autenticado" }, { status: 401 });

  const conversation = await db.conversation.create({
    data: { employeeId: session.userId },
  });

  return Response.json({ conversation }, { status: 201 });
}
