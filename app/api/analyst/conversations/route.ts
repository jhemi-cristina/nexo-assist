import { db } from "../../../../src/lib/db";
import { getSession } from "../../../../src/lib/auth";

export async function GET(request: Request) {
  const session = await getSession(request);
  if (!session || session.role !== "ANALYST") {
    return Response.json({ error: "Acesso negado" }, { status: 403 });
  }

  const url = new URL(request.url);
  const filter = url.searchParams.get("filter") ?? "all";

  const whereMap: Record<string, object> = {
    all: { status: { in: ["WAITING_ANALYST", "IN_PROGRESS"] } },
    waiting: { status: "WAITING_ANALYST" },
    mine: { status: "IN_PROGRESS", analystId: session.userId },
    closed: { status: "CLOSED" },
  };

  const conversations = await db.conversation.findMany({
    where: whereMap[filter] ?? whereMap.all,
    orderBy: { updatedAt: "desc" },
    include: {
      employee: { select: { id: true, name: true, email: true } },
      analyst: { select: { id: true, name: true, email: true } },
      messages: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });

  return Response.json({ conversations });
}
