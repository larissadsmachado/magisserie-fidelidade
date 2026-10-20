import { env } from "cloudflare:workers";

const ADMIN_COOKIE = "magisserie_admin";
const SESSION_SECONDS = 60 * 60 * 8;
const FAILURE_LIMIT = 5;
const FAILURE_WINDOW_SECONDS = 15 * 60;
const encoder = new TextEncoder();

export function getDatabase(): D1Database {
  if (!env.DB) throw new Error("Cloudflare D1 binding `DB` is unavailable.");
  return env.DB;
}

function getSecret(): string {
  const secret = env.AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("Set AUTH_SECRET to a random value of at least 32 characters.");
  }
  return secret;
}

async function hmac(message: string): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(getSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(message)));
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export function constantTimeEqual(left: string, right: string): boolean {
  const a = encoder.encode(left);
  const b = encoder.encode(right);
  let difference = a.length ^ b.length;
  const length = Math.max(a.length, b.length);
  for (let index = 0; index < length; index++) {
    difference |= (a[index] ?? 0) ^ (b[index] ?? 0);
  }
  return difference === 0;
}

function readCookie(request: Request, name: string): string | null {
  const header = request.headers.get("Cookie");
  if (!header) return null;
  for (const part of header.split(";")) {
    const [key, ...value] = part.trim().split("=");
    if (key === name) return value.join("=");
  }
  return null;
}

export async function isAdmin(request: Request): Promise<boolean> {
  const value = readCookie(request, ADMIN_COOKIE);
  if (!value) return false;
  const [expiryText, signature, extra] = value.split(".");
  if (!expiryText || !signature || extra) return false;
  const expiry = Number(expiryText);
  if (!Number.isSafeInteger(expiry) || expiry <= Math.floor(Date.now() / 1000)) {
    return false;
  }
  const expected = toBase64Url(await hmac(`admin-session:${expiry}`));
  return constantTimeEqual(signature, expected);
}

export async function createAdminCookie(request: Request): Promise<string> {
  const expiry = Math.floor(Date.now() / 1000) + SESSION_SECONDS;
  const signature = toBase64Url(await hmac(`admin-session:${expiry}`));
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  return `${ADMIN_COOKIE}=${expiry}.${signature}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${SESSION_SECONDS}${secure}`;
}

export function clearAdminCookie(request: Request): string {
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  return `${ADMIN_COOKIE}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${secure}`;
}

export async function verifyAdminPassword(password: string): Promise<boolean> {
  const configured = env.ADMIN_PASSWORD;
  if (!configured || configured.length < 16) {
    throw new Error("Set ADMIN_PASSWORD to a value of at least 16 characters.");
  }
  const [providedDigest, configuredDigest] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(password)),
    crypto.subtle.digest("SHA-256", encoder.encode(configured)),
  ]);
  return constantTimeEqual(
    toBase64Url(new Uint8Array(providedDigest)),
    toBase64Url(new Uint8Array(configuredDigest)),
  );
}

export async function hashCustomerPin(customerId: string, phone: string, pin: string) {
  return toBase64Url(await hmac(`customer-pin:${customerId}:${phone}:${pin}`));
}

export function generateCustomerPin(): string {
  const range = 900_000;
  const limit = 0x1_0000_0000 - (0x1_0000_0000 % range);
  const sample = new Uint32Array(1);
  do {
    crypto.getRandomValues(sample);
  } while (sample[0] >= limit);
  return String(100_000 + (sample[0] % range)).padStart(6, "0");
}

export async function rateLimitKey(scope: string, value: string): Promise<string> {
  return toBase64Url(await hmac(`rate-limit:${scope}:${value}`));
}

export async function isRateLimited(
  db: D1Database,
  identifiers: string[],
): Promise<boolean> {
  const now = Math.floor(Date.now() / 1000);
  for (const identifier of identifiers) {
    const row = await db
      .prepare("SELECT attempts, reset_at FROM access_attempts WHERE identifier = ?")
      .bind(identifier)
      .first<{ attempts: number; reset_at: number }>();
    if (row && row.attempts >= FAILURE_LIMIT && row.reset_at > now) return true;
  }
  return false;
}

export async function recordFailedAttempt(
  db: D1Database,
  identifiers: string[],
): Promise<void> {
  const now = Math.floor(Date.now() / 1000);
  const statements = [
    db.prepare("DELETE FROM access_attempts WHERE reset_at <= ?").bind(now - 86_400),
    ...identifiers.map((identifier) =>
      db
        .prepare(
          `INSERT INTO access_attempts (identifier, attempts, reset_at)
           VALUES (?, 1, ?)
           ON CONFLICT(identifier) DO UPDATE SET
             attempts = CASE WHEN reset_at <= ? THEN 1 ELSE attempts + 1 END,
             reset_at = CASE WHEN reset_at <= ? THEN ? ELSE reset_at END`,
        )
        .bind(identifier, now + FAILURE_WINDOW_SECONDS, now, now, now + FAILURE_WINDOW_SECONDS),
    ),
  ];
  await db.batch(statements);
}

export async function clearFailedAttempts(
  db: D1Database,
  identifiers: string[],
): Promise<void> {
  if (!identifiers.length) return;
  const placeholders = identifiers.map(() => "?").join(", ");
  await db
    .prepare(`DELETE FROM access_attempts WHERE identifier IN (${placeholders})`)
    .bind(...identifiers)
    .run();
}

export function getClientIp(request: Request): string {
  return request.headers.get("cf-connecting-ip") ?? "local";
}
