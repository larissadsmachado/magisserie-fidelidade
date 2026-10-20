import { env } from "cloudflare:workers";
import {
  AuthConfigurationError,
  clearAdminCookie,
  clearFailedAttempts,
  createAdminCookie,
  getClientIp,
  getDatabase,
  isAdmin,
  isRateLimited,
  rateLimitKey,
  recordFailedAttempt,
  verifyAdminPassword,
} from "../../../lib/access";

export const dynamic = "force-dynamic";
const noStore = { "Cache-Control": "no-store" };

export async function GET(request: Request) {
  try {
    return Response.json(
      { authenticated: await isAdmin(request) },
      { headers: noStore },
    );
  } catch (error) {
    if (error instanceof AuthConfigurationError) {
      return Response.json({ error: error.message }, { status: 503, headers: noStore });
    }
    console.error("Admin session check failed.");
    return Response.json({ error: "Não foi possível verificar a autenticação." }, { status: 500, headers: noStore });
  }
}

export async function POST(request: Request) {
  try {
    const db = getDatabase();
    const ipKey = await rateLimitKey("admin-ip", getClientIp(request));
    if (await isRateLimited(db, [ipKey])) {
      return Response.json(
        { error: "Muitas tentativas. Aguarde 15 minutos e tente novamente." },
        { status: 429, headers: noStore },
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return Response.json({ error: "Requisição inválida." }, { status: 400 });
    }
    const password =
      body && typeof body === "object" && "password" in body &&
      typeof body.password === "string"
        ? body.password
        : "";

    if (!password || !(await verifyAdminPassword(password))) {
      await recordFailedAttempt(db, [ipKey]);
      return Response.json(
        { error: "Senha incorreta." },
        { status: 401, headers: noStore },
      );
    }

    await clearFailedAttempts(db, [ipKey]);
    return Response.json(
      { authenticated: true },
      { headers: { ...noStore, "Set-Cookie": await createAdminCookie(request) } },
    );
  } catch (error) {
    if (error instanceof AuthConfigurationError) {
      return Response.json({ error: error.message }, { status: 503, headers: noStore });
    }
    console.error("Admin login failed.");
    const configured = Boolean(env.ADMIN_PASSWORD && env.AUTH_SECRET);
    return Response.json(
      { error: configured ? "Não foi possível entrar. Tente novamente." : "A autenticação não está configurada." },
      { status: configured ? 500 : 503, headers: noStore },
    );
  }
}

export async function DELETE(request: Request) {
  return Response.json(
    { authenticated: false },
    { headers: { ...noStore, "Set-Cookie": clearAdminCookie(request) } },
  );
}
