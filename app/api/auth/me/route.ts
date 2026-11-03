import { db } from "../../../../src/lib/db";
import { getSession } from "../../../../src/lib/auth";

export async function GET(request: Request) {
  const session = await getSession(request);
  if (!session) return Response.json({ error: "Não autenticado" }, { status: 401 });

  const user = await db.user.findUnique({
    where: { id: session.userId },
    select: { id: true, name: true, email: true, role: true },
  });

  if (!user) return Response.json({ error: "Usuário não encontrado" }, { status: 404 });

  return Response.json({ user });
}
