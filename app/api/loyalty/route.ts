import {
  generateCustomerPin,
  getDatabase,
  hashCustomerPin,
  isAdmin,
} from "../../lib/access";

export const dynamic = "force-dynamic";
const noStore = { "Cache-Control": "no-store" };

function unauthorized() {
  return Response.json({ error: "Acesso administrativo necessário." }, { status: 401, headers: noStore });
}

export async function GET(request: Request) {
  try {
    if (!(await isAdmin(request))) return unauthorized();
    const db = getDatabase();
    const [customers, events] = await Promise.all([
      db
        .prepare(
          "SELECT c.id, c.name, c.phone, COALESCE(SUM(e.delta), 0) AS balance FROM customers c LEFT JOIN events e ON c.id = e.customer GROUP BY c.id ORDER BY c.created DESC",
        )
        .all(),
      db.prepare("SELECT * FROM events ORDER BY created DESC").all(),
    ]);
    return Response.json(
      { customers: customers.results, events: events.results },
      { headers: noStore },
    );
  } catch (error) {
    console.error("Admin loyalty data load failed:", error);
    return Response.json({ error: "Não foi possível carregar os dados do clube." }, { status: 500, headers: noStore });
  }
}

export async function POST(request: Request) {
  try {
    if (!(await isAdmin(request))) return unauthorized();
  } catch (error) {
    console.error("Admin authorization failed:", error);
    return Response.json({ error: "A autenticação não está configurada." }, { status: 503, headers: noStore });
  }

  let data: Record<string, unknown>;
  try {
    const body: unknown = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return Response.json({ error: "Requisição inválida." }, { status: 400, headers: noStore });
    }
    data = body as Record<string, unknown>;
  } catch {
    return Response.json({ error: "Requisição inválida." }, { status: 400, headers: noStore });
  }

  try {
    const db = getDatabase();
    const now = new Date().toISOString();

    if (data.action === "create") {
      const name = typeof data.name === "string" ? data.name.trim().slice(0, 100) : "";
      const phone = typeof data.phone === "string" ? data.phone.replace(/\D/g, "") : "";
      if (!name || !/^\d{11}$/.test(phone)) {
        return Response.json({ error: "Informe nome e WhatsApp válido." }, { status: 400, headers: noStore });
      }
      const exists = await db
        .prepare("SELECT id FROM customers WHERE phone = ?")
        .bind(phone)
        .first();
      if (exists) {
        return Response.json({ error: "Este WhatsApp já está cadastrado." }, { status: 409, headers: noStore });
      }

      const id = crypto.randomUUID();
      const pin = generateCustomerPin();
      const pinHash = await hashCustomerPin(id, phone, pin);
      await db
        .prepare("INSERT INTO customers (id, name, phone, created, pin_hash) VALUES (?, ?, ?, ?, ?)")
        .bind(id, name, phone, now, pinHash)
        .run();
      return Response.json({ ok: true, id, pin }, { headers: noStore });
    }

    const id = typeof data.id === "string" ? data.id : "";
    const customer = await db.prepare("SELECT id, phone FROM customers WHERE id = ?").bind(id).first<{
      id: string;
      phone: string;
    }>();
    if (!customer) {
      return Response.json({ error: "Cliente não encontrado." }, { status: 404, headers: noStore });
    }

    if (data.action === "reset-pin") {
      const pin = generateCustomerPin();
      const pinHash = await hashCustomerPin(customer.id, customer.phone, pin);
      await db
        .prepare("UPDATE customers SET pin_hash = ? WHERE id = ?")
        .bind(pinHash, customer.id)
        .run();
      return Response.json({ ok: true, pin }, { headers: noStore });
    }

    const type =
      data.action === "stamp"
        ? "stamp"
        : data.action === "redeem"
          ? "redeem"
          : data.action === "undo"
            ? "undo"
            : "";
    if (!type) {
      return Response.json({ error: "Ação inválida." }, { status: 400, headers: noStore });
    }

    const delta = type === "stamp" ? 1 : type === "redeem" ? -10 : -1;
    const minimum = type === "redeem" ? 10 : type === "undo" ? 1 : 0;
    const result = await db
      .prepare(
        "INSERT INTO events (id, customer, type, created, delta) SELECT ?, ?, ?, ?, ? WHERE (SELECT COALESCE(SUM(delta), 0) FROM events WHERE customer = ?) >= ?",
      )
      .bind(crypto.randomUUID(), id, type, now, delta, id, minimum)
      .run();
    if (!result.meta.changes) {
      return Response.json({ error: "Saldo insuficiente para esta ação." }, { status: 400, headers: noStore });
    }
    return Response.json({ ok: true }, { headers: noStore });
  } catch (error) {
    console.error("Admin loyalty update failed:", error);
    return Response.json({ error: "Não foi possível salvar. Tente novamente." }, { status: 500, headers: noStore });
  }
}
