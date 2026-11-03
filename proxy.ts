import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ?? "nexo-assist-jwt-secret-2024-supersecret-fallback"
);

async function getSession(req: NextRequest) {
  const token = req.cookies.get("session")?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as { userId: string; role: string };
  } catch {
    return null;
  }
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const session = await getSession(request);

  if (pathname.startsWith("/chat")) {
    if (!session) return NextResponse.redirect(new URL("/login", request.url));
    if (session.role !== "EMPLOYEE") return NextResponse.redirect(new URL("/login", request.url));
  }

  if (pathname.startsWith("/console")) {
    if (!session) return NextResponse.redirect(new URL("/login", request.url));
    if (session.role !== "ANALYST") return NextResponse.redirect(new URL("/login", request.url));
  }

  if (pathname.startsWith("/api/analyst")) {
    if (!session || session.role !== "ANALYST") {
      return Response.json({ error: "Acesso negado" }, { status: 403 });
    }
  }

  if (pathname.startsWith("/api/conversations")) {
    if (!session) {
      return Response.json({ error: "Não autenticado" }, { status: 401 });
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/chat/:path*", "/console/:path*", "/api/analyst/:path*", "/api/conversations/:path*"],
};
