import { db } from "../../../../src/lib/db";
import { verifyPassword, createToken } from "../../../../src/lib/auth";

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return Response.json({ error: "Email e senha são obrigatórios" }, { status: 400 });
    }

    const user = await db.user.findUnique({ where: { email } });

    if (!user) {
      return Response.json({ error: "Credenciais inválidas" }, { status: 401 });
    }

    const valid = await verifyPassword(password, user.password);
    if (!valid) {
      return Response.json({ error: "Credenciais inválidas" }, { status: 401 });
    }

    const token = await createToken({ userId: user.id, role: user.role });

    const response = Response.json({
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });

    response.headers.set(
      "Set-Cookie",
      `session=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${7 * 24 * 3600}`
    );

    return response;
  } catch {
    return Response.json({ error: "Erro interno" }, { status: 500 });
  }
}
