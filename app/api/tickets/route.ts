import { getSession } from "../../../src/lib/auth";
import { listTickets } from "../../../src/features/tickets/service";

export async function GET(request: Request) {
  const session = await getSession(request);
  if (!session) return Response.json({ error: "Não autenticado" }, { status: 401 });

  const tickets = await listTickets(session.userId);
  return Response.json({ tickets });
}
