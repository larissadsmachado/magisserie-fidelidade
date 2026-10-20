import {
  clearFailedAttempts,
  constantTimeEqual,
  getClientIp,
  getDatabase,
  hashCustomerPin,
  isRateLimited,
  rateLimitKey,
  recordFailedAttempt,
} from "../../../lib/access";

export const dynamic = "force-dynamic";
const noStore = { "Cache-Control": "no-store" };

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Informe WhatsApp e PIN." }, { status: 400 });
  }

  const data = body && typeof body === "object" ? body as Record<string, unknown> : {};
  const phone = typeof data.phone === "string" ? data.phone.replace(/\D/g, "") : "";
  const pin = typeof data.pin === "string" ? data.pin : "";
  if (phone.length < 10 || phone.length > 13 || !/^\d{6}$/.test(pin)) {
    return Response.json({ error: "WhatsApp ou PIN inválido." }, { status: 401, headers: noStore });
  }

  try {
    const db = getDatabase();
    const [phoneKey, ipKey] = await Promise.all([
      rateLimitKey("customer-phone", phone),
      rateLimitKey("customer-ip", getClientIp(request)),
    ]);
    const rateKeys = [phoneKey, ipKey];
    if (await isRateLimited(db, rateKeys)) {
      return Response.json(
        { error: "Muitas tentativas. Aguarde 15 minutos e tente novamente." },
        { status: 429, headers: noStore },
      );
    }

    const customer = await db
      .prepare("SELECT id, name, phone, pin_hash FROM customers WHERE phone = ?")
      .bind(phone)
      .first<{ id: string; name: string; phone: string; pin_hash: string | null }>();
    const suppliedHash = await hashCustomerPin(
      customer?.id ?? "unknown-customer",
      customer?.phone ?? phone,
      pin,
    );
    if (!customer?.pin_hash || !constantTimeEqual(suppliedHash, customer.pin_hash)) {
      await recordFailedAttempt(db, rateKeys);
      return Response.json(
        { error: "WhatsApp ou PIN inválido." },
        { status: 401, headers: noStore },
      );
    }

    await clearFailedAttempts(db, rateKeys);
    const [balance, events] = await Promise.all([
      db
        .prepare("SELECT COALESCE(SUM(delta), 0) AS balance FROM events WHERE customer = ?")
        .bind(customer.id)
        .first<{ balance: number }>(),
      db
        .prepare("SELECT id, type, created, delta FROM events WHERE customer = ? ORDER BY created DESC")
        .bind(customer.id)
        .all(),
    ]);
    return Response.json(
      {
        customer: { name: customer.name, balance: balance?.balance ?? 0 },
        events: events.results,
      },
      { headers: noStore },
    );
  } catch (error) {
    console.error("Customer card lookup failed:", error);
    return Response.json(
      { error: "Não foi possível consultar o cartão agora. Tente novamente." },
      { status: 500, headers: noStore },
    );
  }
}
